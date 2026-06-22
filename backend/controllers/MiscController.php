<?php
class MiscController
{
    public function newsletter(array $p): void
    {
        $email = Request::input('email');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Valid email required', 422);
        }
        db()->prepare('INSERT IGNORE INTO newsletter (email) VALUES (?)')->execute([$email]);
        Response::success(null, 'Subscribed to newsletter');
    }

    public function contact(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, [
            'name'    => 'required|min:2',
            'email'   => 'required|email',
            'message' => 'required|min:5',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        Mailer::send(
            env('MAIL_FROM', 'support@cloudfashion.com'),
            'Contact form: ' . ($data['subject'] ?? 'New message'),
            "<p><b>{$data['name']}</b> ({$data['email']})</p><p>{$data['message']}</p>"
        );
        Response::success(null, 'Message sent. We will get back to you soon.');
    }

    public function recentlyViewed(array $p): void
    {
        $userId = Auth::id();
        $stmt = db()->prepare(
            "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM recently_viewed rv JOIN products p ON p.id=rv.product_id
             WHERE rv.user_id=? AND p.is_active=1 ORDER BY rv.viewed_at DESC LIMIT 10"
        );
        $stmt->execute([$userId]);
        Response::success($stmt->fetchAll());
    }

    public function trackView(array $p): void
    {
        $user = Auth::optional();
        if (!$user) {
            Response::success(null); // anonymous - tracked client-side
        }
        $productId = (int) Request::input('product_id');
        if ($productId) {
            db()->prepare(
                'INSERT INTO recently_viewed (user_id, product_id) VALUES (?,?)
                 ON DUPLICATE KEY UPDATE viewed_at=NOW()'
            )->execute([(int) $user['sub'], $productId]);
        }
        Response::success(null);
    }
}
