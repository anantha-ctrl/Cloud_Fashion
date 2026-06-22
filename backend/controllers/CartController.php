<?php
class CartController
{
    public function index(array $p): void
    {
        Response::success($this->cartFor(Auth::id()));
    }

    public function store(array $p): void
    {
        $userId = Auth::id();
        $data = Request::body();
        $v = Validator::make($data, ['product_id' => 'required|numeric']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $productId = (int) $data['product_id'];
        $variantId = isset($data['variant_id']) && $data['variant_id'] ? (int) $data['variant_id'] : null;
        $qty = max(1, (int) ($data['quantity'] ?? 1));

        $db = db();
        // Stock check
        $stock = $this->availableStock($productId, $variantId);
        if ($stock <= 0) {
            Response::error('Out of stock', 400);
        }

        $db->prepare(
            'INSERT INTO cart (user_id, product_id, variant_id, quantity)
             VALUES (?,?,?,?)
             ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + VALUES(quantity), ?)'
        )->execute([$userId, $productId, $variantId, $qty, $stock]);

        Response::success($this->cartFor($userId), 'Added to cart', 201);
    }

    public function update(array $p): void
    {
        $userId = Auth::id();
        $qty = max(1, (int) Request::input('quantity', 1));
        $db = db();
        $stmt = $db->prepare('SELECT * FROM cart WHERE id=? AND user_id=?');
        $stmt->execute([(int) $p['id'], $userId]);
        $item = $stmt->fetch();
        if (!$item) {
            Response::error('Cart item not found', 404);
        }
        $stock = $this->availableStock((int) $item['product_id'], $item['variant_id'] ? (int) $item['variant_id'] : null);
        $qty = min($qty, max(1, $stock));
        $db->prepare('UPDATE cart SET quantity=? WHERE id=?')->execute([$qty, (int) $p['id']]);
        Response::success($this->cartFor($userId), 'Cart updated');
    }

    public function destroy(array $p): void
    {
        $userId = Auth::id();
        db()->prepare('DELETE FROM cart WHERE id=? AND user_id=?')->execute([(int) $p['id'], $userId]);
        Response::success($this->cartFor($userId), 'Item removed');
    }

    public function clear(array $p): void
    {
        db()->prepare('DELETE FROM cart WHERE user_id=?')->execute([Auth::id()]);
        Response::success(['items' => [], 'summary' => $this->emptySummary()], 'Cart cleared');
    }

    // ---------- shared ----------

    private function cartFor(int $userId): array
    {
        $stmt = db()->prepare(
            "SELECT ct.id, ct.quantity, ct.variant_id,
                    p.id AS product_id, p.name, p.slug, p.price, p.mrp, p.stock,
                    pv.size, pv.color, pv.price_diff, pv.stock AS variant_stock,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM cart ct
             JOIN products p ON p.id=ct.product_id
             LEFT JOIN product_variants pv ON pv.id=ct.variant_id
             WHERE ct.user_id=? ORDER BY ct.created_at DESC"
        );
        $stmt->execute([$userId]);
        $items = $stmt->fetchAll();

        $subtotal = 0;
        foreach ($items as &$it) {
            $price = (float) $it['price'] + (float) ($it['price_diff'] ?? 0);
            $it['unit_price'] = $price;
            $it['line_total'] = $price * (int) $it['quantity'];
            $it['price'] = (float) $it['price'];
            $it['mrp'] = (float) $it['mrp'];
            $it['quantity'] = (int) $it['quantity'];
            $subtotal += $it['line_total'];
        }
        unset($it);

        $shipping = $subtotal >= 1999 || $subtotal == 0 ? 0 : 79;
        return [
            'items'   => $items,
            'summary' => [
                'subtotal'     => round($subtotal, 2),
                'shipping_fee' => $shipping,
                'total'        => round($subtotal + $shipping, 2),
                'count'        => array_sum(array_column($items, 'quantity')),
            ],
        ];
    }

    private function availableStock(int $productId, ?int $variantId): int
    {
        if ($variantId) {
            $stmt = db()->prepare('SELECT stock FROM product_variants WHERE id=? AND product_id=?');
            $stmt->execute([$variantId, $productId]);
            return (int) $stmt->fetchColumn();
        }
        $stmt = db()->prepare('SELECT stock FROM products WHERE id=?');
        $stmt->execute([$productId]);
        return (int) $stmt->fetchColumn();
    }

    private function emptySummary(): array
    {
        return ['subtotal' => 0, 'shipping_fee' => 0, 'total' => 0, 'count' => 0];
    }
}
