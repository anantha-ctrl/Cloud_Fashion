<?php
class AdminCustomerController
{
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
                    COUNT(o.id) AS order_count,
                    COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END),0) AS total_spent
             FROM users u LEFT JOIN orders o ON o.user_id=u.id
             WHERE u.role='customer'
             GROUP BY u.id ORDER BY u.created_at DESC"
        )->fetchAll();
        Response::success($rows);
    }

    public function show(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $db = db();
        $stmt = $db->prepare("SELECT id, name, email, phone, status, created_at FROM users WHERE id=? AND role='customer'");
        $stmt->execute([$id]);
        $customer = $stmt->fetch();
        if (!$customer) {
            Response::error('Customer not found', 404);
        }
        $orders = $db->prepare('SELECT id, order_number, total, status, payment_status, placed_at FROM orders WHERE user_id=? ORDER BY placed_at DESC');
        $orders->execute([$id]);
        $customer['orders'] = $orders->fetchAll();
        Response::success($customer);
    }
}
