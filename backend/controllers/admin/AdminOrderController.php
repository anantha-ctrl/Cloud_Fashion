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
            "SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.payment_method,
                    o.payment_approval, o.payment_txn_id, o.payment_note, o.placed_at,
                    o.carrier, o.tracking_number, u.name AS customer, u.email, u.phone
             FROM orders o JOIN users u ON u.id=o.user_id
             WHERE $where ORDER BY o.placed_at DESC"
        );
        $stmt->execute($args);
        Response::success($stmt->fetchAll());
    }

    /** GET /api/admin/orders/{id}/payment — the UPI proof (txn id + screenshot). */
    public function paymentProof(array $p): void
    {
        Auth::admin();
        $stmt = db()->prepare(
            'SELECT o.id, o.order_number, o.total, o.payment_method, o.payment_status, o.payment_approval,
                    o.payment_txn_id, o.payment_screenshot, o.payment_note, o.payment_reviewed_at,
                    u.name AS customer, u.email, u.phone
             FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?'
        );
        $stmt->execute([(int) $p['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Order not found', 404);
        }
        $row['total'] = (float) $row['total'];
        Response::success($row);
    }

    /**
     * PUT /api/admin/orders/{id}/payment — approve or reject a manual UPI payment.
     * Approve => confirm the order (stock/points committed, customer emailed).
     * Reject  => mark failed with a note (customer emailed to re-submit).
     */
    public function reviewPayment(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $action = Request::input('action');
        $note = trim((string) Request::input('note', '')) ?: null;
        if (!in_array($action, ['approve', 'reject'], true)) {
            Response::error('Invalid action', 422);
        }

        $db = db();
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        if ($order['payment_method'] !== 'upi') {
            Response::error('This order is not a UPI payment', 400);
        }
        if ($order['payment_approval'] === 'approved') {
            Response::error('Payment already approved', 400);
        }

        $info = $db->prepare('SELECT name, email FROM users WHERE id=?');
        $info->execute([(int) $order['user_id']]);
        $user = $info->fetch() ?: ['name' => 'Customer', 'email' => ''];

        if ($action === 'approve') {
            $db->prepare(
                "UPDATE orders
                 SET payment_approval='approved', payment_status='paid', status='processing',
                     payment_note=?, payment_reviewed_at=NOW()
                 WHERE id=?"
            )->execute([$note, $id]);
            // Commit stock, coupon usage, loyalty points + send the confirmation email.
            OrderController::finalizeFromDb($id);
            Response::success(null, 'Payment approved — order confirmed');
        }

        // Reject: mark failed. Stock was never decremented, so nothing to restock.
        $db->prepare(
            "UPDATE orders
             SET payment_approval='rejected', payment_status='failed',
                 payment_note=?, payment_reviewed_at=NOW()
             WHERE id=?"
        )->execute([$note, $id]);

        if ($user['email']) {
            Mailer::send(
                $user['email'],
                Mailer::brand() . " · Payment could not be verified — Order {$order['order_number']}",
                Mailer::upiRejectedTemplate($user['name'], $order['order_number'], $note)
            );
        }
        Response::success(null, 'Payment rejected — customer notified');
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
                Mailer::brand() . " · Order {$row['order_number']} update",
                Mailer::orderStatusTemplate($row['name'], $row['order_number'], $status, $row['carrier'], $row['tracking_number'])
            );
        }

        Response::success(null, 'Order status updated');
    }
}
