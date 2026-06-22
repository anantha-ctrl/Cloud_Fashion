<?php
/**
 * Cloudinary uploader using signed REST API (no SDK required).
 */
class Cloudinary
{
    /**
     * Upload a local file path or data URI to Cloudinary.
     * Returns ['url' => ..., 'public_id' => ...] or null on failure.
     */
    public static function upload(string $file, string $folder = 'cloudfashion'): ?array
    {
        $cloud  = env('CLOUDINARY_CLOUD_NAME');
        $key    = env('CLOUDINARY_API_KEY');
        $secret = env('CLOUDINARY_API_SECRET');
        if (!$cloud || !$key || !$secret) {
            return null;
        }

        $timestamp = time();
        $params = ['folder' => $folder, 'timestamp' => $timestamp];
        ksort($params);
        $toSign = urldecode(http_build_query($params));
        $signature = sha1($toSign . $secret);

        $post = [
            'file'      => self::resolveFile($file),
            'api_key'   => $key,
            'timestamp' => $timestamp,
            'folder'    => $folder,
            'signature' => $signature,
        ];

        $ch = curl_init("https://api.cloudinary.com/v1_1/$cloud/image/upload");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $post,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($res, true);
        if (!isset($data['secure_url'])) {
            return null;
        }
        return ['url' => $data['secure_url'], 'public_id' => $data['public_id']];
    }

    private static function resolveFile(string $file): \CURLFile|string
    {
        // Accept a real uploaded tmp path or a data URI string.
        if (is_file($file)) {
            return new \CURLFile($file);
        }
        return $file; // base64 data URI
    }

    public static function destroy(string $publicId): bool
    {
        $cloud  = env('CLOUDINARY_CLOUD_NAME');
        $key    = env('CLOUDINARY_API_KEY');
        $secret = env('CLOUDINARY_API_SECRET');
        if (!$cloud || !$key || !$secret) {
            return false;
        }
        $timestamp = time();
        $signature = sha1("public_id=$publicId&timestamp=$timestamp" . $secret);
        $ch = curl_init("https://api.cloudinary.com/v1_1/$cloud/image/destroy");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => compact('publicId') + [
                'public_id' => $publicId, 'api_key' => $key,
                'timestamp' => $timestamp, 'signature' => $signature,
            ],
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
        return str_contains((string) $res, 'ok');
    }
}
