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
                    o.carrier, o.tracking_number, u.name AS customer, u.email
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
        $carrier = trim((string) Request::input('carrier', '')) ?: null;
        $tracking = trim((string) Request::input('tracking_number', '')) ?: null;
        $allowed = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            Response::error('Invalid status', 422);
        }
        $db = db();

        // Update status; set carrier/tracking when provided (e.g. on "shipped").
        if ($carrier !== null || $tracking !== null) {
            $db->prepare('UPDATE orders SET status=?, carrier=?, tracking_number=? WHERE id=?')
               ->execute([$status, $carrier, $tracking, $id]);
        } else {
            $db->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$status, $id]);
        }
        if ($status === 'delivered') {
            $db->prepare("UPDATE orders SET payment_status='paid' WHERE id=? AND payment_method='cod'")->execute([$id]);
        }

        // Notify the customer by email about the status change.
        $info = $db->prepare(
            'SELECT o.order_number, o.carrier, o.tracking_number, u.name, u.email
             FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?'
        );
        $info->execute([$id]);
        if ($row = $info->fetch()) {
            Mailer::send(
                $row['email'],
                "Cloud Fashion · Order {$row['order_number']} update",
                Mailer::orderStatusTemplate($row['name'], $row['order_number'], $status, $row['carrier'], $row['tracking_number'])
            );
        }

        Response::success(null, 'Order status updated');
    }
}
