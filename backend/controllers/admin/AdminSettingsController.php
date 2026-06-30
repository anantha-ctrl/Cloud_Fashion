<?php
/** Store-wide settings (contact details, message inbox) — admin editable. */
class AdminSettingsController
{
    // key => validate-as ('email' keys are validated as addresses; others free text).
    const FIELDS = [
        'store_name'              => 'text',
        'store_contact_email'     => 'email',
        'store_contact_phone'     => 'text',
        'store_address'           => 'text',
        'store_contact_to'        => 'email',
        'store_announcement'      => 'text',
        'store_free_shipping_min' => 'number',
        'store_base_shipping'     => 'number',
        'store_instagram'         => 'text',
        'store_facebook'          => 'text',
        'store_twitter'           => 'text',
        'store_whatsapp'          => 'text',
    ];

    /** GET /api/admin/settings — current store settings. */
    public function index(array $p): void
    {
        Auth::admin();
        $vals = Setting::many('store_');
        $out = [];
        foreach (self::FIELDS as $key => $_) {
            $out[$key] = $vals[$key] ?? '';
        }
        Response::success($out);
    }

    /** PUT /api/admin/settings — save changed store settings. */
    public function update(array $p): void
    {
        Auth::admin();
        $body = Request::body();
        foreach (self::FIELDS as $key => $type) {
            if (!array_key_exists($key, $body)) {
                continue;
            }
            $val = trim((string) $body[$key]);
            if ($type === 'email' && $val !== '' && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                Response::error('Invalid email for ' . str_replace('_', ' ', $key), 422);
            }
            if ($type === 'number') {
                $val = (string) max(0, (int) $val);
            }
            Setting::set($key, $val);
        }
        $vals = Setting::many('store_');
        $out = [];
        foreach (self::FIELDS as $key => $_) {
            $out[$key] = $vals[$key] ?? '';
        }
        Response::success($out, 'Settings saved');
    }
}
