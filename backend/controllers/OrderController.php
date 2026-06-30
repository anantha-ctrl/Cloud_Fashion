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

        // Attach this customer's existing review (if any) per product, so the UI
        // can prefill the form / show a "reviewed" state. Reviews open only once
        // the order is delivered.
        $rev = $db->prepare('SELECT rating, title, comment FROM reviews WHERE product_id=? AND user_id=?');
        foreach ($order['items'] as &$it) {
            if (!empty($it['product_id'])) {
                $rev->execute([(int) $it['product_id'], $userId]);
                $r = $rev->fetch();
                $it['my_review'] = $r ? ['rating' => (int) $r['rating'], 'title' => $r['title'], 'comment' => $r['comment']] : null;
            } else {
                $it['my_review'] = null;
            }
        }
        unset($it);

        $order['shipping_address'] = json_decode($order['shipping_address'], true);
        foreach (['subtotal', 'discount', 'shipping_fee', 'total'] as $f) {
            $order[$f] = (float) $order[$f];
        }
        $order['timeline'] = $this->timeline($order['status']);

        // Return/refund request for this order (if any).
        $ret = $db->prepare('SELECT status, reason, admin_note, created_at FROM returns WHERE order_id=?');
        $ret->execute([$order['id']]);
        $order['return'] = $ret->fetch() ?: null;

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
        self::restockOrder($db, (int) $order['id']);
        Response::success(null, 'Order cancelled');
    }

    /** Return every item of an order to stock and decrement sold counts. */
    public static function restockOrder(PDO $db, int $orderId): void
    {
        $items = $db->prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=?');
        $items->execute([$orderId]);
        foreach ($items->fetchAll() as $it) {
            if ($it['variant_id']) {
                $db->prepare('UPDATE product_variants SET stock=stock+? WHERE id=?')->execute([$it['quantity'], $it['variant_id']]);
            }
            if ($it['product_id']) {
                $db->prepare('UPDATE products SET stock=stock+?, sold_count=GREATEST(sold_count-?,0) WHERE id=?')
                   ->execute([$it['quantity'], $it['quantity'], $it['product_id']]);
            }
        }
    }

    // ================= shipping =================

    const FREE_SHIPPING_MIN = 1999; // default; overridable via store settings
    const BASE_SHIPPING = 79;        // default; overridable via store settings

    public static function freeShippingMin(): float
    {
        return (float) Setting::get('store_free_shipping_min', self::FREE_SHIPPING_MIN);
    }

    public static function baseShipping(): float
    {
        return (float) Setting::get('store_base_shipping', self::BASE_SHIPPING);
    }

    /** True when the user has never placed a (non-cancelled) order. */
    public static function isFirstOrder(int $userId): bool
    {
        $stmt = db()->prepare("SELECT COUNT(*) FROM orders WHERE user_id=? AND status<>'cancelled'");
        $stmt->execute([$userId]);
        return ((int) $stmt->fetchColumn()) === 0;
    }

    /**
     * Shipping rule:
     *   - First order   -> always FREE (welcome perk)
     *   - Repeat orders -> FREE only above the threshold, otherwise a flat fee
     */
    public static function shippingFee(int $userId, float $payable): float
    {
        if (self::isFirstOrder($userId)) {
            return 0.0;
        }
        return $payable >= self::freeShippingMin() ? 0.0 : self::baseShipping();
    }

    /** Lightweight info for the checkout page to display the correct shipping. */
    public function shippingInfo(array $p): void
    {
        $userId = Auth::id();
        Response::success([
            'is_first_order'    => self::isFirstOrder($userId),
            'free_shipping_min' => self::freeShippingMin(),
            'base_shipping'     => self::baseShipping(),
        ]);
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
            $res = CouponController::validateCoupon(strtoupper($body['coupon_code']), $subtotal, $userId);
            if (!$res['valid']) {
                Response::error($res['message'], 422); // reject the order rather than silently dropping the coupon
            }
            $discount = $res['discount'];
            $couponCode = strtoupper($body['coupon_code']);
        }

        $shipping = self::shippingFee($userId, $subtotal - $discount);

        // Loyalty redemption: points -> rupees at the configured point value.
        $pointsRedeem = LoyaltyController::clampRedeem(
            $userId, (int) ($body['points_redeem'] ?? 0), $subtotal - $discount
        );
        $pointsValue = LoyaltyController::redeemValue($pointsRedeem);

        $total = round($subtotal - $discount - $pointsValue + $shipping, 2);

        return [
            'order_number'  => 'CF' . date('ymd') . strtoupper(substr(uniqid(), -6)),
            'items'         => $items,
            'subtotal'      => round($subtotal, 2),
            'discount'      => $discount,
            'shipping_fee'  => $shipping,
            'points_used'   => $pointsRedeem,
            'points_earned' => LoyaltyController::pointsFor($subtotal),
            'total'         => $total,
            'coupon_code'   => $couponCode,
            'address'       => $address,
            'address_id'    => $body['address_id'] ?? null,
        ];
    }

    /** Inserts the order + items atomically, returns order id. */
    public static function persistOrder(int $userId, array $d, string $method, string $paymentStatus, ?string $rzpOrderId = null): int
    {
        $db = db();
        $db->beginTransaction();
        try {
            $db->prepare(
                'INSERT INTO orders
                 (order_number, user_id, address_id, shipping_address, subtotal, discount, shipping_fee, total,
                  points_used, points_earned, coupon_code, payment_method, payment_status, razorpay_order_id, status)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([
                $d['order_number'], $userId, $d['address_id'] ?? null, json_encode($d['address']),
                $d['subtotal'], $d['discount'], $d['shipping_fee'], $d['total'],
                $d['points_used'] ?? 0, $d['points_earned'] ?? 0,
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
            $db->commit();
            return $orderId;
        } catch (\Throwable $e) {
            // Roll back so a failed items insert never leaves an orphan order
            // (which would otherwise consume the customer's "first order" status).
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
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

        // ---- Loyalty & referrals ----
        // Redeem the points the customer applied, then credit points earned.
        if (!empty($d['points_used'])) {
            LoyaltyController::award($db, $userId, -(int) $d['points_used'], 'redeem', $orderId, 'Redeemed at checkout');
        }
        if (!empty($d['points_earned'])) {
            LoyaltyController::award($db, $userId, (int) $d['points_earned'], 'earn', $orderId, 'Earned on order ' . $d['order_number']);
        }
        // Reward the referrer on this customer's FIRST order.
        $orderCount = (int) $db->query("SELECT COUNT(*) FROM orders WHERE user_id=" . (int) $userId . " AND status<>'cancelled'")->fetchColumn();
        if ($orderCount === 1) {
            $rb = $db->prepare('SELECT referred_by FROM users WHERE id=?');
            $rb->execute([$userId]);
            $referrerId = (int) $rb->fetchColumn();
            if ($referrerId) {
                LoyaltyController::award($db, $referrerId, LoyaltyController::config()['loyalty_referral_bonus'], 'referral', $orderId, 'Friend placed their first order');
            }
        }

        // Send order-confirmation email (best effort; never breaks the flow).
        $u = $db->prepare('SELECT name, email FROM users WHERE id=?');
        $u->execute([$userId]);
        if ($user = $u->fetch()) {
            Mailer::send(
                $user['email'],
                'Cloud Fashion · Order ' . $d['order_number'] . ' confirmed',
                Mailer::orderPlacedTemplate($user['name'], $d['order_number'], (float) $d['total'])
            );
        }
    }

    /** Re-add a past order's items back into the cart. */
    public function reorder(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $ord = $db->prepare('SELECT id FROM orders WHERE id=? AND user_id=?');
        $ord->execute([(int) $p['id'], $userId]);
        if (!$ord->fetch()) {
            Response::error('Order not found', 404);
        }
        $items = $db->prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=?');
        $items->execute([(int) $p['id']]);

        $added = 0;
        $skipped = 0;
        foreach ($items->fetchAll() as $it) {
            // Skip products that no longer exist or are inactive.
            $pr = $db->prepare('SELECT stock, is_active FROM products WHERE id=?');
            $pr->execute([$it['product_id']]);
            $prod = $pr->fetch();
            if (!$prod || !$prod['is_active']) { $skipped++; continue; }

            // Upsert into cart (merge quantity if the same line already exists).
            $existing = $db->prepare(
                'SELECT id, quantity FROM cart WHERE user_id=? AND product_id=? AND ' .
                ($it['variant_id'] ? 'variant_id=?' : 'variant_id IS NULL')
            );
            $existing->execute($it['variant_id'] ? [$userId, $it['product_id'], $it['variant_id']] : [$userId, $it['product_id']]);
            if ($row = $existing->fetch()) {
                $db->prepare('UPDATE cart SET quantity=quantity+? WHERE id=?')->execute([(int) $it['quantity'], $row['id']]);
            } else {
                $db->prepare('INSERT INTO cart (user_id, product_id, variant_id, quantity) VALUES (?,?,?,?)')
                   ->execute([$userId, $it['product_id'], $it['variant_id'], (int) $it['quantity']]);
            }
            $added++;
        }

        Response::success(['added' => $added, 'skipped' => $skipped],
            $added ? "$added item(s) added to cart" . ($skipped ? ", $skipped unavailable" : '') : 'No items could be re-added');
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
