<?php
class ReviewController
{
    public function index(array $p): void
    {
        $stmt = db()->prepare(
            "SELECT r.id, r.rating, r.title, r.comment, r.created_at, u.name AS user_name,
                    EXISTS(
                        SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
                        WHERE o.user_id = r.user_id AND oi.product_id = r.product_id
                          AND o.status <> 'cancelled'
                    ) AS verified
             FROM reviews r JOIN users u ON u.id = r.user_id
             WHERE r.product_id = ? ORDER BY r.created_at DESC"
        );
        $stmt->execute([(int) $p['id']]);
        $rows = array_map(function ($r) {
            $r['verified'] = (bool) $r['verified'];
            return $r;
        }, $stmt->fetchAll());
        Response::success($rows);
    }

    public function store(array $p): void
    {
        $userId = Auth::id();
        $productId = (int) $p['id'];
        $data = Request::body();
        $v = Validator::make($data, ['rating' => 'required|numeric|in:1,2,3,4,5']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $db = db();

        // Only customers who actually purchased the product may review it.
        $bought = $db->prepare(
            "SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = ? AND oi.product_id = ? AND o.status <> 'cancelled' LIMIT 1"
        );
        $bought->execute([$userId, $productId]);
        if (!$bought->fetch()) {
            Response::error('You can review only products you have purchased', 403);
        }

        try {
            $db->prepare(
                'INSERT INTO reviews (product_id, user_id, rating, title, comment)
                 VALUES (?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE rating=VALUES(rating), title=VALUES(title), comment=VALUES(comment)'
            )->execute([
                $productId, $userId, (int) $data['rating'],
                $data['title'] ?? null, $data['comment'] ?? null,
            ]);
        } catch (PDOException $e) {
            Response::error('Could not save review', 400);
        }

        // Recalculate aggregate rating
        $agg = $db->prepare('SELECT COUNT(*) c, AVG(rating) a FROM reviews WHERE product_id=?');
        $agg->execute([$productId]);
        $row = $agg->fetch();
        $db->prepare('UPDATE products SET rating_count=?, rating_avg=? WHERE id=?')
           ->execute([(int) $row['c'], round((float) $row['a'], 2), $productId]);

        Response::success(null, 'Review submitted', 201);
    }
}
