<?php
class ProductController
{
    /** Product listing with search, filters, sort, pagination. */
    public function index(array $p): void
    {
        $db = db();
        $where = ['p.is_active = 1'];
        $args = [];

        if ($q = Request::query('search')) {
            $where[] = '(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
            $like = "%$q%";
            array_push($args, $like, $like, $like);
        }
        if ($cat = Request::query('category')) {
            $where[] = 'c.slug = ?';
            $args[] = $cat;
        }
        if ($brand = Request::query('brand')) {
            $brands = explode(',', $brand);
            $where[] = 'p.brand IN (' . implode(',', array_fill(0, count($brands), '?')) . ')';
            $args = array_merge($args, $brands);
        }
        if (($min = Request::query('min_price')) !== null && $min !== '') {
            $where[] = 'p.price >= ?';
            $args[] = (float) $min;
        }
        if (($max = Request::query('max_price')) !== null && $max !== '') {
            $where[] = 'p.price <= ?';
            $args[] = (float) $max;
        }
        // Size / color filter via variants
        $joinVar = '';
        if (($size = Request::query('size')) || ($color = Request::query('color'))) {
            $joinVar = 'JOIN product_variants pv ON pv.product_id = p.id';
            if ($size) {
                $sizes = explode(',', $size);
                $where[] = 'pv.size IN (' . implode(',', array_fill(0, count($sizes), '?')) . ')';
                $args = array_merge($args, $sizes);
            }
            if ($color) {
                $colors = explode(',', $color);
                $where[] = 'pv.color IN (' . implode(',', array_fill(0, count($colors), '?')) . ')';
                $args = array_merge($args, $colors);
            }
        }

        $sortMap = [
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'popularity' => 'p.sold_count DESC',
            'rating'     => 'p.rating_avg DESC',
            'newest'     => 'p.created_at DESC',
        ];
        $order = $sortMap[Request::query('sort', 'newest')] ?? 'p.created_at DESC';

        $page    = max(1, (int) Request::query('page', 1));
        $perPage = min(48, max(1, (int) Request::query('per_page', 12)));
        $offset  = ($page - 1) * $perPage;

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(DISTINCT p.id) FROM products p
                     JOIN categories c ON c.id = p.category_id $joinVar WHERE $whereSql";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($args);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT DISTINCT p.*, c.name AS category_name, c.slug AS category_slug,
                   (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC, sort_order LIMIT 1) AS image
                FROM products p
                JOIN categories c ON c.id = p.category_id $joinVar
                WHERE $whereSql
                ORDER BY $order
                LIMIT $perPage OFFSET $offset";
        $stmt = $db->prepare($sql);
        $stmt->execute($args);

        Response::success([
            'products' => array_map([$this, 'castProduct'], $stmt->fetchAll()),
            'pagination' => [
                'page' => $page, 'per_page' => $perPage,
                'total' => $total, 'pages' => (int) ceil($total / $perPage),
            ],
        ]);
    }

    public function show(array $p): void
    {
        $db = db();
        $stmt = $db->prepare(
            'SELECT p.*, c.name AS category_name, c.slug AS category_slug
             FROM products p JOIN categories c ON c.id=p.category_id
             WHERE p.slug=? AND p.is_active=1'
        );
        $stmt->execute([$p['slug']]);
        $product = $stmt->fetch();
        if (!$product) {
            Response::error('Product not found', 404);
        }
        $product = $this->castProduct($product);

        $imgs = $db->prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id=? ORDER BY is_primary DESC, sort_order');
        $imgs->execute([$product['id']]);
        $product['images'] = $imgs->fetchAll();

        $vars = $db->prepare('SELECT id, size, color, color_hex, price_diff, stock FROM product_variants WHERE product_id=?');
        $vars->execute([$product['id']]);
        $product['variants'] = $vars->fetchAll();
        $product['sizes']  = array_values(array_unique(array_filter(array_column($product['variants'], 'size'))));
        $product['colors'] = $this->uniqueColors($product['variants']);

        Response::success($product);
    }

    public function related(array $p): void
    {
        $db = db();
        $stmt = $db->prepare('SELECT id, category_id FROM products WHERE slug=?');
        $stmt->execute([$p['slug']]);
        $base = $stmt->fetch();
        if (!$base) {
            Response::success([]);
        }
        $rel = $db->prepare(
            "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p WHERE p.category_id=? AND p.id<>? AND p.is_active=1
             ORDER BY p.sold_count DESC LIMIT 8"
        );
        $rel->execute([$base['category_id'], $base['id']]);
        Response::success(array_map([$this, 'castProduct'], $rel->fetchAll()));
    }

    public function featured(array $p): void   { $this->collection('is_featured=1'); }
    public function trending(array $p): void   { $this->collection('is_trending=1'); }
    public function newArrivals(array $p): void{ $this->collection('1=1', 'created_at DESC'); }
    public function bestSellers(array $p): void { $this->collection('1=1', 'sold_count DESC'); }

    private function collection(string $cond, string $order = 'created_at DESC'): void
    {
        $limit = min(20, max(1, (int) Request::query('limit', 8)));
        $sql = "SELECT p.*, c.slug AS category_slug,
                   (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
                FROM products p JOIN categories c ON c.id=p.category_id
                WHERE p.is_active=1 AND $cond ORDER BY $order LIMIT $limit";
        $rows = db()->query($sql)->fetchAll();
        Response::success(array_map([$this, 'castProduct'], $rows));
    }

    private function castProduct(array $row): array
    {
        foreach (['price', 'mrp', 'rating_avg'] as $f) {
            if (isset($row[$f])) {
                $row[$f] = (float) $row[$f];
            }
        }
        foreach (['id', 'stock', 'rating_count', 'sold_count', 'category_id'] as $f) {
            if (isset($row[$f])) {
                $row[$f] = (int) $row[$f];
            }
        }
        if (isset($row['specifications']) && is_string($row['specifications'])) {
            $row['specifications'] = json_decode($row['specifications'], true);
        }
        if (isset($row['mrp'], $row['price']) && $row['mrp'] > 0) {
            $row['discount_pct'] = (int) round(100 * ($row['mrp'] - $row['price']) / $row['mrp']);
        }
        return $row;
    }

    private function uniqueColors(array $variants): array
    {
        $seen = [];
        foreach ($variants as $v) {
            if ($v['color'] && !isset($seen[$v['color']])) {
                $seen[$v['color']] = ['color' => $v['color'], 'hex' => $v['color_hex']];
            }
        }
        return array_values($seen);
    }
}
