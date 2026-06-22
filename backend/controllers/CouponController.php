<?php
class CouponController
{
    public function apply(array $p): void
    {
        Auth::id();
        $code = strtoupper(trim((string) Request::input('code')));
        $subtotal = (float) Request::input('subtotal', 0);
        $coupon = self::validateCoupon($code, $subtotal);
        if (!$coupon['valid']) {
            Response::error($coupon['message'], 400);
        }
        Response::success([
            'code'     => $code,
            'discount' => $coupon['discount'],
            'type'     => $coupon['coupon']['type'],
        ], 'Coupon applied');
    }

    /** Reusable validation used by checkout too. */
    public static function validateCoupon(string $code, float $subtotal): array
    {
        $stmt = db()->prepare('SELECT * FROM coupons WHERE code=? AND is_active=1');
        $stmt->execute([$code]);
        $c = $stmt->fetch();
        if (!$c) {
            return ['valid' => false, 'message' => 'Invalid coupon code'];
        }
        if ($c['expires_at'] && strtotime($c['expires_at']) < time()) {
            return ['valid' => false, 'message' => 'Coupon has expired'];
        }
        if ($c['usage_limit'] !== null && (int) $c['used_count'] >= (int) $c['usage_limit']) {
            return ['valid' => false, 'message' => 'Coupon usage limit reached'];
        }
        if ($subtotal < (float) $c['min_order']) {
            return ['valid' => false, 'message' => 'Minimum order of ₹' . (int) $c['min_order'] . ' required'];
        }
        if ($c['type'] === 'percentage') {
            $discount = $subtotal * ((float) $c['value'] / 100);
            if ($c['max_discount'] !== null) {
                $discount = min($discount, (float) $c['max_discount']);
            }
        } else {
            $discount = (float) $c['value'];
        }
        $discount = round(min($discount, $subtotal), 2);
        return ['valid' => true, 'discount' => $discount, 'coupon' => $c];
    }
}
