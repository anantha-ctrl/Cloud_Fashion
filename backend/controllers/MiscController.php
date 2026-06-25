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

    /** Public list of active, non-expired coupons (for the offers banner). */
    public function offers(array $p): void
    {
        $rows = db()->query(
            "SELECT code, type, value, min_order, max_discount, first_order_only, expires_at
             FROM coupons
             WHERE is_active = 1
               AND (expires_at IS NULL OR expires_at > NOW())
               AND (usage_limit IS NULL OR used_count < usage_limit)
             ORDER BY value DESC"
        )->fetchAll();
        Response::success($rows);
    }

    /** Public homepage banners. */
    public function banners(array $p): void
    {
        $rows = db()->query(
            'SELECT id, title, subtitle, cta_label, cta_link, image_url
             FROM banners WHERE is_active = 1 ORDER BY sort_order, id'
        )->fetchAll();
        Response::success($rows);
    }

    /** Register interest in an out-of-stock product. */
    public function notifyStock(array $p): void
    {
        $data = Request::body();
        $productId = (int) ($data['product_id'] ?? 0);
        $email = $data['email'] ?? null;
        if (!$productId || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Valid product and email are required', 422);
        }
        db()->prepare(
            'INSERT IGNORE INTO stock_notifications (product_id, email) VALUES (?,?)'
        )->execute([$productId, $email]);
        Response::success(null, "We'll email you when it's back in stock");
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
