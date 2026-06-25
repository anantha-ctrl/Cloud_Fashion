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
        // Replace the image set (delete then re-insert) so re-saving doesn't
        // pile up duplicate rows. Only touch images when the client sent them.
        if (isset($data['images'])) {
            $db->prepare('DELETE FROM product_images WHERE product_id=?')->execute([$id]);
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

    /** Bulk activate / deactivate / delete by ids. */
    public function bulk(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $ids = array_values(array_filter(array_map('intval', (array) ($data['ids'] ?? []))));
        $action = $data['action'] ?? '';
        if (!$ids) {
            Response::error('No products selected', 422);
        }
        $in = implode(',', array_fill(0, count($ids), '?'));
        if ($action === 'delete') {
            db()->prepare("DELETE FROM products WHERE id IN ($in)")->execute($ids);
        } elseif ($action === 'activate' || $action === 'deactivate') {
            $val = $action === 'activate' ? 1 : 0;
            db()->prepare("UPDATE products SET is_active=$val WHERE id IN ($in)")->execute($ids);
        } else {
            Response::error('Invalid bulk action', 422);
        }
        Response::success(['affected' => count($ids)], 'Bulk action applied');
    }

    /**
     * Bulk-create products from parsed CSV rows.
     * Each row: name, category (name or slug), brand, price, mrp, stock,
     *           low_stock_alert, description, image (url), active.
     * Returns how many were created and per-row errors for the rest.
     */
    public function import(array $p): void
    {
        Auth::admin();
        $rows = Request::input('rows', []);
        if (!is_array($rows) || !$rows) {
            Response::error('No rows to import. Check your CSV file.', 422);
        }

        $db = db();

        // Build a category lookup keyed by lowercased name AND slug.
        $catMap = [];
        foreach ($db->query('SELECT id, name, slug FROM categories')->fetchAll() as $c) {
            $catMap[strtolower(trim($c['name']))] = (int) $c['id'];
            $catMap[strtolower(trim($c['slug']))] = (int) $c['id'];
        }

        $ins = $db->prepare(
            'INSERT INTO products (name, slug, category_id, brand, description, price, mrp, stock, low_stock_alert, is_active)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        $imgIns = $db->prepare(
            'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?,?,1,0)'
        );
        $catIns = $db->prepare(
            'INSERT INTO categories (name, slug, is_active) VALUES (?,?,1)'
        );

        $created = 0;
        $newCategories = [];
        $errors = [];

        foreach ($rows as $i => $r) {
            $line = (int) $i + 2; // +1 for header row, +1 for 1-based
            $name = trim((string) ($r['name'] ?? ''));
            $catRaw = trim((string) ($r['category'] ?? ''));
            $price = $r['price'] ?? '';

            if ($name === '' || $price === '' || !is_numeric($price)) {
                $errors[] = "Row $line: 'name' and a numeric 'price' are required";
                continue;
            }
            if ($catRaw === '') {
                $errors[] = "Row $line: 'category' is required";
                continue;
            }
            // Auto-create the category on the fly if it doesn't exist yet,
            // then reuse it for any later rows with the same category.
            $catId = $catMap[strtolower($catRaw)] ?? null;
            if (!$catId) {
                $catSlug = AdminCategoryController::uniqueCategorySlug($catRaw);
                $catIns->execute([$catRaw, $catSlug]);
                $catId = (int) $db->lastInsertId();
                $catMap[strtolower($catRaw)] = $catId;
                $catMap[strtolower($catSlug)] = $catId;
                $newCategories[] = $catRaw;
            }

            $mrp = (isset($r['mrp']) && is_numeric($r['mrp']) && $r['mrp'] !== '') ? (float) $r['mrp'] : (float) $price;
            $active = 1;
            if (isset($r['active']) && $r['active'] !== '') {
                $active = in_array(strtolower((string) $r['active']), ['1', 'yes', 'true', 'active', 'y'], true) ? 1 : 0;
            }

            try {
                $ins->execute([
                    $name,
                    $this->uniqueSlug($name),
                    $catId,
                    ($r['brand'] ?? '') !== '' ? $r['brand'] : null,
                    ($r['description'] ?? '') !== '' ? $r['description'] : null,
                    (float) $price,
                    $mrp,
                    (int) ($r['stock'] ?? 0),
                    (int) ($r['low_stock_alert'] ?? 5),
                    $active,
                ]);
                $pid = (int) $db->lastInsertId();

                $img = trim((string) ($r['image'] ?? ''));
                if ($img !== '') {
                    $imgIns->execute([$pid, $img]);
                }
                $created++;
            } catch (Throwable $e) {
                $errors[] = "Row $line: " . $e->getMessage();
            }
        }

        Response::success(
            [
                'created'        => $created,
                'failed'         => count($errors),
                'new_categories' => array_values(array_unique($newCategories)),
                'errors'         => array_slice($errors, 0, 20),
            ],
            "Imported $created product(s)" . ($errors ? ', ' . count($errors) . ' skipped' : '')
        );
    }

    /** Generate a slug that is guaranteed unique in the products table. */
    private function uniqueSlug(string $name): string
    {
        $base = AdminCategoryController::slugify($name);
        $slug = $base;
        $db = db();
        $check = $db->prepare('SELECT COUNT(*) FROM products WHERE slug=?');
        $n = 2;
        $check->execute([$slug]);
        while ((int) $check->fetchColumn() > 0) {
            $slug = $base . '-' . $n++;
            $check->execute([$slug]);
        }
        return $slug;
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

    /** Full inventory: every product with live stock + threshold. */
    public function inventory(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT p.id, p.name, p.brand, p.stock, p.low_stock_alert, p.sold_count, p.is_active,
                    c.name AS category,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p JOIN categories c ON c.id = p.category_id
             ORDER BY p.stock ASC, p.name"
        )->fetchAll();
        Response::success($rows);
    }

    /** Quick stock / threshold update from the inventory screen. */
    public function updateStock(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $stock = max(0, (int) ($data['stock'] ?? 0));
        if (isset($data['low_stock_alert'])) {
            db()->prepare('UPDATE products SET stock=?, low_stock_alert=? WHERE id=?')
                ->execute([$stock, max(0, (int) $data['low_stock_alert']), (int) $p['id']]);
        } else {
            db()->prepare('UPDATE products SET stock=? WHERE id=?')->execute([$stock, (int) $p['id']]);
        }
        Response::success(null, 'Stock updated');
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
