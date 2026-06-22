<?php
class CategoryController
{
    public function index(array $p): void
    {
        $stmt = db()->query(
            'SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id=c.id AND is_active=1) AS product_count
             FROM categories c WHERE is_active=1 ORDER BY name'
        );
        Response::success($stmt->fetchAll());
    }

    public function show(array $p): void
    {
        $stmt = db()->prepare('SELECT * FROM categories WHERE slug=? AND is_active=1');
        $stmt->execute([$p['slug']]);
        $cat = $stmt->fetch();
        if (!$cat) {
            Response::error('Category not found', 404);
        }
        Response::success($cat);
    }
}
