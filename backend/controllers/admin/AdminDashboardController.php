<?php
class AdminDashboardController
{
    public function stats(array $p): void
    {
        Auth::admin();
        $db = db();

        $totalSales = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'")->fetchColumn();
        $totalOrders = (int) $db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $totalCustomers = (int) $db->query("SELECT COUNT(*) FROM users WHERE role='customer'")->fetchColumn();
        $totalProducts = (int) $db->query('SELECT COUNT(*) FROM products')->fetchColumn();

        // Monthly revenue (last 6 months)
        $monthly = $db->query(
            "SELECT DATE_FORMAT(placed_at,'%Y-%m') AS month,
                    SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END) AS revenue,
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

        Response::success([
            'cards' => [
                'total_sales'     => round($totalSales, 2),
                'total_orders'    => $totalOrders,
                'total_customers' => $totalCustomers,
                'total_products'  => $totalProducts,
                'low_stock'       => $lowStock,
            ],
            'monthly_sales'    => $monthly,
            'status_breakdown' => $statusBreakdown,
            'recent_orders'    => $recentOrders,
        ]);
    }
}
