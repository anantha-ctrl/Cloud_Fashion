<?php
class AdminDashboardController
{
    public function stats(array $p): void
    {
        Auth::admin();
        $db = db();

        // Revenue = online paid orders + in-store paid bills (counter/POS).
        $onlineSales  = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND status<>'cancelled'")->fetchColumn();
        $counterSales = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM bills WHERE status='paid'")->fetchColumn();
        $counterBills = (int) $db->query("SELECT COUNT(*) FROM bills WHERE status='paid'")->fetchColumn();
        $totalSales   = $onlineSales + $counterSales;
        $totalOrders = (int) $db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $totalCustomers = (int) $db->query("SELECT COUNT(*) FROM users WHERE role='customer'")->fetchColumn();
        $totalProducts = (int) $db->query('SELECT COUNT(*) FROM products')->fetchColumn();

        // Monthly revenue (last 6 months) — online orders + counter bills merged,
        // over a continuous 6-month skeleton so the chart never has gaps.
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $k = date('Y-m', strtotime("first day of -$i month"));
            $months[$k] = ['month' => $k, 'revenue' => 0.0, 'orders' => 0, 'counter' => 0.0];
        }
        foreach ($db->query(
            "SELECT DATE_FORMAT(placed_at,'%Y-%m') AS m,
                    SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total ELSE 0 END) AS rev,
                    COUNT(*) AS ords
             FROM orders WHERE placed_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY m"
        )->fetchAll() as $r) {
            if (isset($months[$r['m']])) { $months[$r['m']]['revenue'] += (float) $r['rev']; $months[$r['m']]['orders'] += (int) $r['ords']; }
        }
        foreach ($db->query(
            "SELECT DATE_FORMAT(created_at,'%Y-%m') AS m, SUM(CASE WHEN status='paid' THEN total ELSE 0 END) AS rev
             FROM bills WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY m"
        )->fetchAll() as $r) {
            if (isset($months[$r['m']])) { $months[$r['m']]['revenue'] += (float) $r['rev']; $months[$r['m']]['counter'] += (float) $r['rev']; }
        }
        $monthly = array_values($months);

        $statusBreakdown = $db->query(
            'SELECT status, COUNT(*) AS count FROM orders GROUP BY status'
        )->fetchAll();

        $recentOrders = $db->query(
            "SELECT o.id, o.order_number, o.total, o.status, o.placed_at, u.name AS customer
             FROM orders o JOIN users u ON u.id=o.user_id
             ORDER BY o.placed_at DESC LIMIT 8"
        )->fetchAll();

        $lowStock = (int) $db->query('SELECT COUNT(*) FROM products WHERE stock <= low_stock_alert')->fetchColumn();

        // Extra KPIs — today's revenue also spans both channels.
        $todayOnline = (float) $db->query(
            "SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND status<>'cancelled' AND DATE(placed_at)=CURDATE()"
        )->fetchColumn();
        $todayCounter = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM bills WHERE status='paid' AND DATE(created_at)=CURDATE()")->fetchColumn();
        $todaySales = $todayOnline + $todayCounter;
        $pendingOrders = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();
        $paidOrders = (int) $db->query("SELECT COUNT(*) FROM orders WHERE payment_status='paid' AND status<>'cancelled'")->fetchColumn();
        $avgOrderValue = $paidOrders > 0 ? round($onlineSales / $paidOrders, 2) : 0;
        $newCustomers7d = (int) $db->query(
            "SELECT COUNT(*) FROM users WHERE role='customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        )->fetchColumn();

        // Top selling products — units + revenue across online orders AND counter bills.
        $topProducts = $db->query(
            "SELECT p.id, p.name, p.brand, p.price,
                    COALESCE(SUM(s.units),0) AS units_sold,
                    COALESCE(SUM(s.rev),0)   AS revenue,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p
             JOIN (
                 SELECT oi.product_id AS pid, SUM(oi.quantity) AS units, SUM(oi.line_total) AS rev
                   FROM order_items oi JOIN orders o ON o.id=oi.order_id
                   WHERE o.payment_status='paid' AND o.status<>'cancelled' GROUP BY oi.product_id
                 UNION ALL
                 SELECT bi.product_id AS pid, SUM(bi.quantity) AS units, SUM(bi.line_total) AS rev
                   FROM bill_items bi JOIN bills b ON b.id=bi.bill_id
                   WHERE b.status='paid' GROUP BY bi.product_id
             ) s ON s.pid = p.id
             GROUP BY p.id HAVING units_sold > 0 ORDER BY units_sold DESC, revenue DESC LIMIT 5"
        )->fetchAll();

        // Newest customers
        $recentCustomers = $db->query(
            "SELECT id, name, email, created_at FROM users
             WHERE role='customer' ORDER BY created_at DESC LIMIT 5"
        )->fetchAll();

        Response::success([
            'cards' => [
                'total_sales'      => round($totalSales, 2),
                'total_orders'     => $totalOrders,
                'total_customers'  => $totalCustomers,
                'total_products'   => $totalProducts,
                'low_stock'        => $lowStock,
                'today_sales'      => round($todaySales, 2),
                'pending_orders'   => $pendingOrders,
                'avg_order_value'  => $avgOrderValue,
                'new_customers_7d' => $newCustomers7d,
                'online_sales'     => round($onlineSales, 2),
                'counter_sales'    => round($counterSales, 2),
                'counter_bills'    => $counterBills,
            ],
            'monthly_sales'    => $monthly,
            'status_breakdown' => $statusBreakdown,
            'recent_orders'    => $recentOrders,
            'top_products'     => $topProducts,
            'recent_customers' => $recentCustomers,
        ]);
    }

    /**
     * Live admin notifications aggregated from the database.
     * Each item carries a stable `key` so its read / dismissed state can be
     * persisted per admin in the notification_states table.
     */
    public function notifications(array $p): void
    {
        $admin = Auth::admin();
        $db = db();
        $items = [];

        // Pending orders that need processing
        $orders = $db->query(
            "SELECT order_number, total, placed_at FROM orders
             WHERE status='pending' ORDER BY placed_at DESC LIMIT 6"
        )->fetchAll();
        foreach ($orders as $o) {
            $items[] = [
                'key'   => 'order:' . $o['order_number'],
                'type'  => 'order',
                'title' => 'New order ' . $o['order_number'],
                'desc'  => '₹' . number_format((float) $o['total']) . ' · awaiting processing',
                'time'  => $o['placed_at'],
                'link'  => '/admin/orders',
            ];
        }

        // Low / out of stock
        $low = $db->query(
            'SELECT id, name, stock FROM products WHERE stock <= low_stock_alert ORDER BY stock ASC LIMIT 6'
        )->fetchAll();
        foreach ($low as $l) {
            $items[] = [
                'key'   => 'stock:' . $l['id'] . ':' . (int) $l['stock'],
                'type'  => 'stock',
                'title' => ((int) $l['stock'] === 0) ? 'Out of stock' : 'Low stock',
                'desc'  => $l['name'] . ' · ' . (int) $l['stock'] . ' left',
                'time'  => null,
                'link'  => '/admin/inventory',
            ];
        }

        // New customers (last 7 days)
        $cust = $db->query(
            "SELECT id, name, created_at FROM users
             WHERE role='customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY created_at DESC LIMIT 5"
        )->fetchAll();
        foreach ($cust as $c) {
            $items[] = [
                'key'   => 'customer:' . $c['id'],
                'type'  => 'customer',
                'title' => 'New customer',
                'desc'  => $c['name'] . ' just joined',
                'time'  => $c['created_at'],
                'link'  => '/admin/customers',
            ];
        }

        // Back-in-stock requests waiting
        $restock = (int) $db->query('SELECT COUNT(*) FROM stock_notifications WHERE notified=0')->fetchColumn();
        if ($restock > 0) {
            $items[] = [
                'key'   => 'restock:' . $restock,
                'type'  => 'restock',
                'title' => 'Restock requests',
                'desc'  => $restock . ' customer(s) waiting for restocks',
                'time'  => null,
                'link'  => '/admin/inventory',
            ];
        }

        // Merge persisted read / dismissed state for this admin
        $states = [];
        $st = $db->prepare('SELECT notif_key, status FROM notification_states WHERE admin_id=?');
        $st->execute([(int) $admin['sub']]);
        foreach ($st->fetchAll() as $row) {
            $states[$row['notif_key']] = $row['status'];
        }

        $visible = [];
        $unread = 0;
        foreach ($items as $it) {
            $status = $states[$it['key']] ?? null;
            if ($status === 'dismissed') {
                continue; // deleted by the admin — hide it
            }
            $it['read'] = ($status === 'read');
            if (!$it['read']) {
                $unread++;
            }
            $visible[] = $it;
        }

        Response::success([
            'count' => $unread,      // badge shows unread only
            'total' => count($visible),
            'items' => $visible,
        ]);
    }

    /** Persist a read / unread / dismissed state for a single notification key. */
    public function setNotificationState(array $p): void
    {
        $admin = Auth::admin();
        $key    = trim((string) Request::input('key', ''));
        $status = (string) Request::input('status', '');

        if ($key === '' || !in_array($status, ['read', 'unread', 'dismissed'], true)) {
            Response::error('Invalid notification state', 422);
        }

        $db = db();
        if ($status === 'unread') {
            // Clearing the read state = remove any stored row
            $del = $db->prepare('DELETE FROM notification_states WHERE admin_id=? AND notif_key=?');
            $del->execute([(int) $admin['sub'], $key]);
        } else {
            $up = $db->prepare(
                'INSERT INTO notification_states (admin_id, notif_key, status) VALUES (?,?,?)
                 ON DUPLICATE KEY UPDATE status=VALUES(status)'
            );
            $up->execute([(int) $admin['sub'], $key, $status]);
        }

        Response::success(['ok' => true]);
    }

    /** Mark every currently-visible notification as read. */
    public function markAllRead(array $p): void
    {
        $admin = Auth::admin();
        $keys = Request::input('keys', []);
        if (!is_array($keys) || !$keys) {
            Response::success(['ok' => true]);
            return;
        }
        $db = db();
        $up = $db->prepare(
            'INSERT INTO notification_states (admin_id, notif_key, status) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE status=VALUES(status)'
        );
        foreach ($keys as $k) {
            $k = trim((string) $k);
            if ($k !== '') {
                $up->execute([(int) $admin['sub'], $k, 'read']);
            }
        }
        Response::success(['ok' => true]);
    }
}
