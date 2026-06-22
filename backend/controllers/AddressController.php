<?php
class AddressController
{
    public function index(array $p): void
    {
        $stmt = db()->prepare('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id DESC');
        $stmt->execute([Auth::id()]);
        Response::success($stmt->fetchAll());
    }

    public function store(array $p): void
    {
        $userId = Auth::id();
        $data = Request::body();
        $v = Validator::make($data, [
            'full_name' => 'required|min:2',
            'phone'     => 'required|min:8',
            'line1'     => 'required',
            'city'      => 'required',
            'state'     => 'required',
            'pincode'   => 'required',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $db = db();
        $isDefault = !empty($data['is_default']) ? 1 : 0;
        if ($isDefault) {
            $db->prepare('UPDATE addresses SET is_default=0 WHERE user_id=?')->execute([$userId]);
        }
        $db->prepare(
            'INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, pincode, country, is_default)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $userId, $data['full_name'], $data['phone'], $data['line1'], $data['line2'] ?? null,
            $data['city'], $data['state'], $data['pincode'], $data['country'] ?? 'India', $isDefault,
        ]);
        Response::success(['id' => (int) $db->lastInsertId()], 'Address added', 201);
    }

    public function update(array $p): void
    {
        $userId = Auth::id();
        $id = (int) $p['id'];
        $data = Request::body();
        $db = db();
        $own = $db->prepare('SELECT id FROM addresses WHERE id=? AND user_id=?');
        $own->execute([$id, $userId]);
        if (!$own->fetch()) {
            Response::error('Address not found', 404);
        }
        if (!empty($data['is_default'])) {
            $db->prepare('UPDATE addresses SET is_default=0 WHERE user_id=?')->execute([$userId]);
        }
        $db->prepare(
            'UPDATE addresses SET full_name=?, phone=?, line1=?, line2=?, city=?, state=?, pincode=?, country=?, is_default=?
             WHERE id=? AND user_id=?'
        )->execute([
            $data['full_name'], $data['phone'], $data['line1'], $data['line2'] ?? null,
            $data['city'], $data['state'], $data['pincode'], $data['country'] ?? 'India',
            !empty($data['is_default']) ? 1 : 0, $id, $userId,
        ]);
        Response::success(null, 'Address updated');
    }

    public function destroy(array $p): void
    {
        db()->prepare('DELETE FROM addresses WHERE id=? AND user_id=?')->execute([(int) $p['id'], Auth::id()]);
        Response::success(null, 'Address removed');
    }
}
