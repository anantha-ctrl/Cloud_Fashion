<?php
class OrderController
{
    public function index(array $p): void
    {
        $userId = Auth::id();
        $stmt = db()->prepare(
            'SELECT id, order_number, total, status, payment_status, payment_method, placed_at
             FROM orders WHERE user_id=? ORDER BY placed_at DESC'
        );
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();
        foreach ($orders as &$o) {
            $o['total'] = (float) $o['total'];
        }
        Response::success($orders);
    }

    public function show(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=? AND user_id=?');
        $stmt->execute([(int) $p['id'], $userId]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        $items = $db->prepare('SELECT * FROM order_items WHERE order_id=?');
        $items->execute([$order['id']]);
        $order['items'] = $items->fetchAll();
        $order['shipping_address'] = json_decode($order['shipping_address'], true);
        foreach (['subtotal', 'discount', 'shipping_fee', 'total'] as $f) {
            $order[$f] = (float) $order[$f];
        }
        $order['timeline'] = $this->timeline($order['status']);
        Response::success($order);
    }

    /** Place a Cash-on-Delivery order directly. */
    public function placeCod(array $p): void
    {
        $userId = Auth::id();
        $built = self::buildOrderData($userId, Request::body());
        $orderId = self::persistOrder($userId, $built, 'cod', 'pending');
        self::finalizeOrder($userId, $orderId, $built);
        Response::success(['order_id' => $orderId, 'order_number' => $built['order_number']], 'Order placed (COD)', 201);
    }

    public function cancel(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=? AND user_id=?');
        $stmt->execute([(int) $p['id'], $userId]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        if (in_array($order['status'], ['shipped', 'delivered', 'cancelled'], true)) {
            Response::error('Order can no longer be cancelled', 400);
        }
        $db->prepare("UPDATE orders SET status='cancelled' WHERE id=?")->execute([$order['id']]);
        // Restock
        $items = $db->prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=?');
        $items->execute([$order['id']]);
        foreach ($items->fetchAll() as $it) {
            if ($it['variant_id']) {
                $db->prepare('UPDATE product_variants SET stock=stock+? WHERE id=?')->execute([$it['quantity'], $it['variant_id']]);
            }
            if ($it['product_id']) {
                $db->prepare('UPDATE products SET stock=stock+?, sold_count=GREATEST(sold_count-?,0) WHERE id=?')
                   ->execute([$it['quantity'], $it['quantity'], $it['product_id']]);
            }
        }
        Response::success(null, 'Order cancelled');
    }

    // ================= shared order building =================

    /** Builds order line items + totals from the user's cart. */
    public static function buildOrderData(int $userId, array $body): array
    {
        $db = db();
        $stmt = $db->prepare(
            'SELECT ct.quantity, ct.variant_id, p.id AS product_id, p.name, p.price, p.stock,
                    pv.size, pv.color, pv.price_diff, pv.stock AS variant_stock,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM cart ct JOIN products p ON p.id=ct.product_id
             LEFT JOIN product_variants pv ON pv.id=ct.variant_id
             WHERE ct.user_id=?'
        );
        $stmt->execute([$userId]);
        $cart = $stmt->fetchAll();
        if (!$cart) {
            Response::error('Cart is empty', 400);
        }

        $items = [];
        $subtotal = 0;
        foreach ($cart as $c) {
            $available = $c['variant_id'] ? (int) $c['variant_stock'] : (int) $c['stock'];
            if ((int) $c['quantity'] > $available) {
                Response::error("Insufficient stock for {$c['name']}", 400);
            }
            $price = (float) $c['price'] + (float) ($c['price_diff'] ?? 0);
            $line = $price * (int) $c['quantity'];
            $subtotal += $line;
            $items[] = [
                'product_id' => (int) $c['product_id'],
                'variant_id' => $c['variant_id'] ? (int) $c['variant_id'] : null,
                'name'       => $c['name'],
                'image'      => $c['image'],
                'size'       => $c['size'],
                'color'      => $c['color'],
                'price'      => $price,
                'quantity'   => (int) $c['quantity'],
                'line_total' => $line,
            ];
        }

        // Shipping address: explicit object or saved address_id
        $address = $body['shipping_address'] ?? null;
        if (!$address && !empty($body['address_id'])) {
            $a = $db->prepare('SELECT * FROM addresses WHERE id=? AND user_id=?');
            $a->execute([(int) $body['address_id'], $userId]);
            $address = $a->fetch() ?: null;
        }
        if (!$address) {
            Response::error('Shipping address is required', 422);
        }

        $discount = 0;
        $couponCode = null;
        if (!empty($body['coupon_code'])) {
            $res = CouponController::validateCoupon(strtoupper($body['coupon_code']), $subtotal);
            if ($res['valid']) {
                $discount = $res['discount'];
                $couponCode = strtoupper($body['coupon_code']);
            }
        }

        $shipping = ($subtotal - $discount) >= 1999 ? 0 : 79;
        $total = round($subtotal - $discount + $shipping, 2);

        return [
            'order_number' => 'CF' . date('ymd') . strtoupper(substr(uniqid(), -6)),
            'items'        => $items,
            'subtotal'     => round($subtotal, 2),
            'discount'     => $discount,
            'shipping_fee' => $shipping,
            'total'        => $total,
            'coupon_code'  => $couponCode,
            'address'      => $address,
            'address_id'   => $body['address_id'] ?? null,
        ];
    }

    /** Inserts the order + items, returns order id. */
    public static function persistOrder(int $userId, array $d, string $method, string $paymentStatus, ?string $rzpOrderId = null): int
    {
        $db = db();
        $db->prepare(
            'INSERT INTO orders
             (order_number, user_id, address_id, shipping_address, subtotal, discount, shipping_fee, total,
              coupon_code, payment_method, payment_status, razorpay_order_id, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $d['order_number'], $userId, $d['address_id'] ?? null, json_encode($d['address']),
            $d['subtotal'], $d['discount'], $d['shipping_fee'], $d['total'],
            $d['coupon_code'], $method, $paymentStatus, $rzpOrderId, 'pending',
        ]);
        $orderId = (int) $db->lastInsertId();

        $ins = $db->prepare(
            'INSERT INTO order_items
             (order_id, product_id, variant_id, product_name, image_url, size, color, price, quantity, line_total)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        foreach ($d['items'] as $it) {
            $ins->execute([
                $orderId, $it['product_id'], $it['variant_id'], $it['name'], $it['image'],
                $it['size'], $it['color'], $it['price'], $it['quantity'], $it['line_total'],
            ]);
        }
        return $orderId;
    }

    /** Decrements stock, bumps coupon usage, clears cart. Call after payment confirmed (or COD). */
    public static function finalizeOrder(int $userId, int $orderId, array $d): void
    {
        $db = db();
        foreach ($d['items'] as $it) {
            if ($it['variant_id']) {
                $db->prepare('UPDATE product_variants SET stock=GREATEST(stock-?,0) WHERE id=?')
                   ->execute([$it['quantity'], $it['variant_id']]);
            }
            $db->prepare('UPDATE products SET stock=GREATEST(stock-?,0), sold_count=sold_count+? WHERE id=?')
               ->execute([$it['quantity'], $it['quantity'], $it['product_id']]);
        }
        if ($d['coupon_code']) {
            $db->prepare('UPDATE coupons SET used_count=used_count+1 WHERE code=?')->execute([$d['coupon_code']]);
        }
        $db->prepare('DELETE FROM cart WHERE user_id=?')->execute([$userId]);
    }

    private function timeline(string $status): array
    {
        $steps = ['pending', 'processing', 'packed', 'shipped', 'delivered'];
        if ($status === 'cancelled') {
            return [['status' => 'cancelled', 'done' => true]];
        }
        $idx = array_search($status, $steps, true);
        return array_map(fn($s, $i) => ['status' => $s, 'done' => $i <= $idx], $steps, array_keys($steps));
    }
}
