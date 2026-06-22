<?php
class AdminOrderController
{
    public function index(array $p): void
    {
        Auth::admin();
        $where = '1=1';
        $args = [];
        if ($status = Request::query('status')) {
            $where .= ' AND o.status=?';
            $args[] = $status;
        }
        $stmt = db()->prepare(
            "SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.payment_method, o.placed_at,
                    u.name AS customer, u.email
             FROM orders o JOIN users u ON u.id=o.user_id
             WHERE $where ORDER BY o.placed_at DESC"
        );
        $stmt->execute($args);
        Response::success($stmt->fetchAll());
    }

    public function updateStatus(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $status = Request::input('status');
        $allowed = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            Response::error('Invalid status', 422);
        }
        $db = db();
        $db->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$status, $id]);
        if ($status === 'delivered') {
            $db->prepare("UPDATE orders SET payment_status='paid' WHERE id=? AND payment_method='cod'")->execute([$id]);
        }
        Response::success(null, 'Order status updated');
    }
}
