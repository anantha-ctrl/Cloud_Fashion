<?php
class AdminReportController
{
    public function sales(array $p): void
    {
        Auth::admin();
        $from = Request::query('from', date('Y-m-d', strtotime('-30 days')));
        $to   = Request::query('to', date('Y-m-d'));
        $stmt = db()->prepare(
            "SELECT DATE(placed_at) AS day,
                    COUNT(*) AS orders,
                    SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END) AS revenue
             FROM orders WHERE DATE(placed_at) BETWEEN ? AND ?
             GROUP BY day ORDER BY day"
        );
        $stmt->execute([$from, $to]);
        $rows = $stmt->fetchAll();
        Response::success([
            'range'        => compact('from', 'to'),
            'daily'        => $rows,
            'total_orders' => array_sum(array_column($rows, 'orders')),
            'total_revenue'=> array_sum(array_map('floatval', array_column($rows, 'revenue'))),
        ]);
    }

    public function products(array $p): void
    {
        Auth::admin();
        $top = db()->query(
            "SELECT p.id, p.name, p.brand, p.sold_count, p.stock, p.price,
                    COALESCE(SUM(oi.quantity),0) AS units_sold,
                    COALESCE(SUM(oi.line_total),0) AS revenue
             FROM products p
             LEFT JOIN order_items oi ON oi.product_id=p.id
             LEFT JOIN orders o ON o.id=oi.order_id AND o.payment_status='paid'
             GROUP BY p.id ORDER BY units_sold DESC LIMIT 20"
        )->fetchAll();
        Response::success($top);
    }

    public function customers(array $p): void
    {
        Auth::admin();
        $top = db()->query(
            "SELECT u.id, u.name, u.email,
                    COUNT(o.id) AS orders,
                    COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END),0) AS total_spent
             FROM users u JOIN orders o ON o.user_id=u.id
             WHERE u.role='customer'
             GROUP BY u.id ORDER BY total_spent DESC LIMIT 20"
        )->fetchAll();
        Response::success($top);
    }
}
