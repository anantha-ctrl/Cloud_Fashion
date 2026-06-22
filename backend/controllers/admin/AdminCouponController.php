<?php
class AdminCouponController
{
    public function index(array $p): void
    {
        Auth::admin();
        Response::success(db()->query('SELECT * FROM coupons ORDER BY created_at DESC')->fetchAll());
    }

    public function store(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $v = Validator::make($data, [
            'code'  => 'required|min:3|max:40',
            'type'  => 'required|in:percentage,fixed',
            'value' => 'required|numeric',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        try {
            db()->prepare(
                'INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, expires_at, is_active)
                 VALUES (?,?,?,?,?,?,?,?)'
            )->execute([
                strtoupper($data['code']), $data['type'], $data['value'],
                $data['min_order'] ?? 0, $data['max_discount'] ?? null,
                $data['usage_limit'] ?? null, $data['expires_at'] ?? null,
                isset($data['is_active']) ? (int) $data['is_active'] : 1,
            ]);
        } catch (PDOException $e) {
            Response::error('Coupon code already exists', 409);
        }
        Response::success(['id' => (int) db()->lastInsertId()], 'Coupon created', 201);
    }

    public function update(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        db()->prepare(
            'UPDATE coupons SET type=?, value=?, min_order=?, max_discount=?, usage_limit=?, expires_at=?, is_active=? WHERE id=?'
        )->execute([
            $data['type'], $data['value'], $data['min_order'] ?? 0, $data['max_discount'] ?? null,
            $data['usage_limit'] ?? null, $data['expires_at'] ?? null,
            isset($data['is_active']) ? (int) $data['is_active'] : 1, (int) $p['id'],
        ]);
        Response::success(null, 'Coupon updated');
    }

    public function destroy(array $p): void
    {
        Auth::admin();
        db()->prepare('DELETE FROM coupons WHERE id=?')->execute([(int) $p['id']]);
        Response::success(null, 'Coupon deleted');
    }
}
