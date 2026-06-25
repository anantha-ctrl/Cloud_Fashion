<?php
class AdminReportController
{
    /** Resolve the [from, to] date window from query params (defaults: last 30 days). */
    private static function range(): array
    {
        $from = Request::query('from', date('Y-m-d', strtotime('-29 days')));
        $to   = Request::query('to', date('Y-m-d'));
        return [$from, $to];
    }

    public function sales(array $p): void
    {
        Auth::admin();
        [$from, $to] = self::range();
        $db = db();

        // Daily revenue + orders
        $stmt = $db->prepare(
            "SELECT DATE(placed_at) AS day,
                    COUNT(*) AS orders,
                    SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total ELSE 0 END) AS revenue
             FROM orders WHERE DATE(placed_at) BETWEEN ? AND ?
             GROUP BY day ORDER BY day"
        );
        $stmt->execute([$from, $to]);
        $daily = $stmt->fetchAll();

        $totalRevenue = array_sum(array_map('floatval', array_column($daily, 'revenue')));
        $totalOrders  = array_sum(array_map('intval', array_column($daily, 'orders')));

        // Paid orders count (for average order value)
        $paidStmt = $db->prepare(
            "SELECT COUNT(*) FROM orders WHERE payment_status='paid' AND status<>'cancelled' AND DATE(placed_at) BETWEEN ? AND ?"
        );
        $paidStmt->execute([$from, $to]);
        $paidOrders = (int) $paidStmt->fetchColumn();

        // Items sold (paid orders only)
        $itemsStmt = $db->prepare(
            "SELECT COALESCE(SUM(oi.quantity),0)
             FROM order_items oi JOIN orders o ON o.id=oi.order_id
             WHERE o.payment_status='paid' AND o.status<>'cancelled' AND DATE(o.placed_at) BETWEEN ? AND ?"
        );
        $itemsStmt->execute([$from, $to]);
        $itemsSold = (int) $itemsStmt->fetchColumn();

        // New customers in range
        $custStmt = $db->prepare(
            "SELECT COUNT(*) FROM users WHERE role='customer' AND DATE(created_at) BETWEEN ? AND ?"
        );
        $custStmt->execute([$from, $to]);
        $newCustomers = (int) $custStmt->fetchColumn();

        // Coupons redeemed in range
        $coupStmt = $db->prepare(
            "SELECT COUNT(*) FROM orders WHERE coupon_code IS NOT NULL AND coupon_code<>'' AND DATE(placed_at) BETWEEN ? AND ?"
        );
        $coupStmt->execute([$from, $to]);
        $couponsUsed = (int) $coupStmt->fetchColumn();

        // Orders by status
        $statusStmt = $db->prepare(
            "SELECT status, COUNT(*) AS count FROM orders
             WHERE DATE(placed_at) BETWEEN ? AND ? GROUP BY status ORDER BY count DESC"
        );
        $statusStmt->execute([$from, $to]);
        $statusBreakdown = $statusStmt->fetchAll();

        // Revenue by payment method (paid)
        $payStmt = $db->prepare(
            "SELECT payment_method AS method, COUNT(*) AS orders,
                    SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total ELSE 0 END) AS revenue
             FROM orders WHERE DATE(placed_at) BETWEEN ? AND ?
             GROUP BY payment_method ORDER BY revenue DESC"
        );
        $payStmt->execute([$from, $to]);
        $paymentBreakdown = $payStmt->fetchAll();

        // Revenue by category (paid)
        $catStmt = $db->prepare(
            "SELECT c.name AS category,
                    COALESCE(SUM(oi.quantity),0) AS units,
                    COALESCE(SUM(oi.line_total),0) AS revenue
             FROM order_items oi
             JOIN orders o ON o.id=oi.order_id AND o.payment_status='paid' AND o.status<>'cancelled'
             JOIN products p ON p.id=oi.product_id
             JOIN categories c ON c.id=p.category_id
             WHERE DATE(o.placed_at) BETWEEN ? AND ?
             GROUP BY c.id ORDER BY revenue DESC"
        );
        $catStmt->execute([$from, $to]);
        $categoryBreakdown = $catStmt->fetchAll();

        Response::success([
            'range'              => compact('from', 'to'),
            'daily'              => $daily,
            'total_orders'       => $totalOrders,
            'total_revenue'      => round($totalRevenue, 2),
            'paid_orders'        => $paidOrders,
            'avg_order_value'    => $paidOrders > 0 ? round($totalRevenue / $paidOrders, 2) : 0,
            'items_sold'         => $itemsSold,
            'new_customers'      => $newCustomers,
            'coupons_used'       => $couponsUsed,
            'status_breakdown'   => $statusBreakdown,
            'payment_breakdown'  => $paymentBreakdown,
            'category_breakdown' => $categoryBreakdown,
        ]);
    }

    public function products(array $p): void
    {
        Auth::admin();
        [$from, $to] = self::range();
        $stmt = db()->prepare(
            "SELECT p.id, p.name, p.brand, p.sold_count, p.stock, p.price,
                    COALESCE(SUM(oi.quantity),0) AS units_sold,
                    COALESCE(SUM(oi.line_total),0) AS revenue
             FROM products p
             LEFT JOIN order_items oi ON oi.product_id=p.id
             LEFT JOIN orders o ON o.id=oi.order_id AND o.payment_status='paid' AND o.status<>'cancelled'
                                AND DATE(o.placed_at) BETWEEN ? AND ?
             GROUP BY p.id ORDER BY units_sold DESC, revenue DESC LIMIT 20"
        );
        $stmt->execute([$from, $to]);
        Response::success($stmt->fetchAll());
    }

    public function customers(array $p): void
    {
        Auth::admin();
        [$from, $to] = self::range();
        $stmt = db()->prepare(
            "SELECT u.id, u.name, u.email,
                    COUNT(o.id) AS orders,
                    COALESCE(SUM(CASE WHEN o.payment_status='paid' AND o.status<>'cancelled' THEN o.total ELSE 0 END),0) AS total_spent
             FROM users u JOIN orders o ON o.user_id=u.id
             WHERE u.role='customer' AND DATE(o.placed_at) BETWEEN ? AND ?
             GROUP BY u.id ORDER BY total_spent DESC LIMIT 20"
        );
        $stmt->execute([$from, $to]);
        Response::success($stmt->fetchAll());
    }
}
