<?php
class AdminDashboardController
{
    public function stats(array $p): void
    {
        Auth::admin();
        $db = db();

        // Revenue counts paid orders only, and never cancelled (refunded) ones.
        $totalSales = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND status<>'cancelled'")->fetchColumn();
        $totalOrders = (int) $db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $totalCustomers = (int) $db->query("SELECT COUNT(*) FROM users WHERE role='customer'")->fetchColumn();
        $totalProducts = (int) $db->query('SELECT COUNT(*) FROM products')->fetchColumn();

        // Monthly revenue (last 6 months)
        $monthly = $db->query(
            "SELECT DATE_FORMAT(placed_at,'%Y-%m') AS month,
                    SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total ELSE 0 END) AS revenue,
                    COUNT(*) AS orders
             FROM orders
             WHERE placed_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY month ORDER BY month"
        )->fetchAll();

        $statusBreakdown = $db->query(
            'SELECT status, COUNT(*) AS count FROM orders GROUP BY status'
        )->fetchAll();

        $recentOrders = $db->query(
            "SELECT o.id, o.order_number, o.total, o.status, o.placed_at, u.name AS customer
             FROM orders o JOIN users u ON u.id=o.user_id
             ORDER BY o.placed_at DESC LIMIT 8"
        )->fetchAll();

        $lowStock = (int) $db->query('SELECT COUNT(*) FROM products WHERE stock <= low_stock_alert')->fetchColumn();

        // Extra KPIs
        $todaySales = (float) $db->query(
            "SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND status<>'cancelled' AND DATE(placed_at)=CURDATE()"
        )->fetchColumn();
        $pendingOrders = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();
        $paidOrders = (int) $db->query("SELECT COUNT(*) FROM orders WHERE payment_status='paid' AND status<>'cancelled'")->fetchColumn();
        $avgOrderValue = $paidOrders > 0 ? round($totalSales / $paidOrders, 2) : 0;
        $newCustomers7d = (int) $db->query(
            "SELECT COUNT(*) FROM users WHERE role='customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        )->fetchColumn();

        // Top selling products (paid orders)
        $topProducts = $db->query(
            "SELECT p.id, p.name, p.brand, p.price,
                    COALESCE(SUM(oi.quantity),0) AS units_sold,
                    COALESCE(SUM(oi.line_total),0) AS revenue,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p
             LEFT JOIN order_items oi ON oi.product_id=p.id
             LEFT JOIN orders o ON o.id=oi.order_id AND o.payment_status='paid' AND o.status<>'cancelled'
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
