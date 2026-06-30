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

        $name    = trim($data['name']);
        $email   = trim($data['email']);
        $subject = trim($data['subject'] ?? '') ?: 'New message';
        $message = trim($data['message']);

        // 1) Persist so the team never loses a message (visible in Admin → Messages).
        db()->prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)')
            ->execute([$name, $email, $subject, $message]);

        // 2) Notify the store inbox. Reply-To = customer so a reply reaches them.
        $inbox = Setting::get('store_contact_to') ?: env('MAIL_FROM', 'support@cloudfashion.com');
        $e = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        Mailer::send(
            $inbox,
            'Contact form: ' . $subject,
            "<p><b>{$e($name)}</b> &lt;{$e($email)}&gt;</p>"
              . '<p><b>Subject:</b> ' . $e($subject) . '</p>'
              . '<p>' . nl2br($e($message)) . '</p>',
            $email
        );
        Response::success(null, 'Message sent. We will get back to you soon.');
    }

    /** GET /api/store-info — public store config (contact, announcement, socials…). */
    public function storeInfo(array $p): void
    {
        Response::success([
            'name'              => Setting::get('store_name', 'Cloud Fashion'),
            'email'             => Setting::get('store_contact_email', 'support@cloudfashion.com'),
            'phone'             => Setting::get('store_contact_phone', '+91 98765 43210'),
            'address'           => Setting::get('store_address', 'Bengaluru, India'),
            'announcement'      => Setting::get('store_announcement', ''),
            'free_shipping_min' => (int) Setting::get('store_free_shipping_min', 1999),
            'instagram'         => Setting::get('store_instagram', ''),
            'facebook'          => Setting::get('store_facebook', ''),
            'twitter'           => Setting::get('store_twitter', ''),
            'whatsapp'          => Setting::get('store_whatsapp', ''),
        ]);
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
