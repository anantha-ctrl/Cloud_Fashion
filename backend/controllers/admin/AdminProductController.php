<?php
class AdminProductController
{
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT p.id, p.name, p.slug, p.brand, p.price, p.mrp, p.stock, p.is_active, p.is_featured,
                    p.is_trending, p.rating_avg, p.sold_count, c.name AS category,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.created_at DESC"
        )->fetchAll();
        Response::success($rows);
    }

    public function store(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $v = Validator::make($data, [
            'name'        => 'required|min:2|max:200',
            'category_id' => 'required|numeric',
            'price'       => 'required|numeric',
            'mrp'         => 'required|numeric',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $db = db();
        $slug = AdminCategoryController::slugify($data['name']);
        $db->prepare(
            'INSERT INTO products
             (name, slug, category_id, brand, description, specifications, price, mrp, stock, low_stock_alert,
              is_featured, is_trending, is_active)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $data['name'], $slug, (int) $data['category_id'], $data['brand'] ?? null,
            $data['description'] ?? null,
            isset($data['specifications']) ? json_encode($data['specifications']) : null,
            $data['price'], $data['mrp'], (int) ($data['stock'] ?? 0), (int) ($data['low_stock_alert'] ?? 5),
            !empty($data['is_featured']) ? 1 : 0, !empty($data['is_trending']) ? 1 : 0,
            isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);
        $productId = (int) $db->lastInsertId();

        $this->syncImages($productId, $data['images'] ?? []);
        $this->syncVariants($productId, $data['variants'] ?? []);

        Response::success(['id' => $productId, 'slug' => $slug], 'Product created', 201);
    }

    public function update(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $data = Request::body();
        $db = db();
        $db->prepare(
            'UPDATE products SET name=?, category_id=?, brand=?, description=?, specifications=?,
             price=?, mrp=?, stock=?, low_stock_alert=?, is_featured=?, is_trending=?, is_active=? WHERE id=?'
        )->execute([
            $data['name'], (int) $data['category_id'], $data['brand'] ?? null, $data['description'] ?? null,
            isset($data['specifications']) ? json_encode($data['specifications']) : null,
            $data['price'], $data['mrp'], (int) ($data['stock'] ?? 0), (int) ($data['low_stock_alert'] ?? 5),
            !empty($data['is_featured']) ? 1 : 0, !empty($data['is_trending']) ? 1 : 0,
            isset($data['is_active']) ? (int) $data['is_active'] : 1, $id,
        ]);

        if (isset($data['variants'])) {
            $db->prepare('DELETE FROM product_variants WHERE product_id=?')->execute([$id]);
            $this->syncVariants($id, $data['variants']);
        }
        if (!empty($data['images'])) {
            $this->syncImages($id, $data['images']);
        }
        Response::success(null, 'Product updated');
    }

    public function destroy(array $p): void
    {
        Auth::admin();
        db()->prepare('DELETE FROM products WHERE id=?')->execute([(int) $p['id']]);
        Response::success(null, 'Product deleted');
    }

    /** Accepts base64 data URIs or remote URLs; uploads data URIs to Cloudinary when configured. */
    public function uploadImages(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $images = Request::input('images', []);
        $stored = $this->syncImages($id, $images);
        Response::success($stored, 'Images uploaded');
    }

    public function lowStock(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            'SELECT id, name, stock, low_stock_alert FROM products
             WHERE stock <= low_stock_alert ORDER BY stock ASC'
        )->fetchAll();
        Response::success($rows);
    }

    // ---------- helpers ----------

    private function syncImages(int $productId, array $images): array
    {
        $db = db();
        $stored = [];
        foreach ($images as $i => $img) {
            $url = is_array($img) ? ($img['url'] ?? '') : $img;
            $publicId = null;
            if (str_starts_with($url, 'data:image')) {
                $up = Cloudinary::upload($url);
                if ($up) {
                    $url = $up['url'];
                    $publicId = $up['public_id'];
                }
            }
            if (!$url) {
                continue;
            }
            $db->prepare('INSERT INTO product_images (product_id, image_url, public_id, is_primary, sort_order) VALUES (?,?,?,?,?)')
               ->execute([$productId, $url, $publicId, $i === 0 ? 1 : 0, $i]);
            $stored[] = ['url' => $url, 'public_id' => $publicId];
        }
        return $stored;
    }

    private function syncVariants(int $productId, array $variants): void
    {
        $db = db();
        $stmt = $db->prepare('INSERT INTO product_variants (product_id, size, color, color_hex, sku, price_diff, stock) VALUES (?,?,?,?,?,?,?)');
        foreach ($variants as $v) {
            $stmt->execute([
                $productId, $v['size'] ?? null, $v['color'] ?? null, $v['color_hex'] ?? null,
                $v['sku'] ?? null, (float) ($v['price_diff'] ?? 0), (int) ($v['stock'] ?? 0),
            ]);
        }
    }
}
