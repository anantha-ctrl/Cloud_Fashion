<?php
/**
 * Mailer with two drivers:
 *   - log  : writes the email to storage/mail.log (great for local dev / OTP testing)
 *   - smtp : sends via SMTP using raw sockets (supports STARTTLS, e.g. Gmail)
 */
class Mailer
{
    public static function send(string $to, string $subject, string $html): bool
    {
        $driver = env('MAIL_DRIVER', 'log');
        if ($driver === 'smtp') {
            return self::smtp($to, $subject, $html);
        }
        return self::log($to, $subject, $html);
    }

    private static function log(string $to, string $subject, string $html): bool
    {
        $dir = __DIR__ . '/../storage';
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $entry = '[' . date('Y-m-d H:i:s') . "] TO: $to | SUBJECT: $subject\n$html\n" . str_repeat('-', 60) . "\n";
        return (bool) file_put_contents($dir . '/mail.log', $entry, FILE_APPEND);
    }

    private static function smtp(string $to, string $subject, string $html): bool
    {
        $host = env('SMTP_HOST');
        $port = (int) env('SMTP_PORT', 587);
        $user = env('SMTP_USER');
        $pass = env('SMTP_PASS');
        $from = env('MAIL_FROM', 'no-reply@cloudfashion.com');
        $fromName = env('MAIL_FROM_NAME', 'Cloud Fashion');

        $fp = @fsockopen($host, $port, $errno, $errstr, 15);
        if (!$fp) {
            self::log($to, $subject, $html); // fallback so flow never breaks
            return false;
        }
        $read = function () use ($fp) { return fgets($fp, 515); };
        $cmd  = function (string $c) use ($fp, $read) { fputs($fp, $c . "\r\n"); return $read(); };

        $read();
        $cmd("EHLO cloudfashion");
        $cmd("STARTTLS");
        stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        $cmd("EHLO cloudfashion");
        $cmd("AUTH LOGIN");
        $cmd(base64_encode($user));
        $cmd(base64_encode($pass));
        $cmd("MAIL FROM:<$from>");
        $cmd("RCPT TO:<$to>");
        $cmd("DATA");
        $headers  = "From: $fromName <$from>\r\n";
        $headers .= "To: <$to>\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $cmd($headers . "\r\n" . $html . "\r\n.");
        $cmd("QUIT");
        fclose($fp);
        return true;
    }

    public static function otpTemplate(string $name, string $otp): string
    {
        return "
        <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:16px'>
            <h2 style='color:#c9a96a'>Cloud Fashion</h2>
            <p>Hi $name,</p>
            <p>Your verification code is:</p>
            <div style='font-size:34px;letter-spacing:10px;font-weight:700;color:#c9a96a;margin:18px 0'>$otp</div>
            <p style='color:#aaa'>This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
        </div>";
    }

    public static function resetTemplate(string $name, string $link): string
    {
        return "
        <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:16px'>
            <h2 style='color:#c9a96a'>Cloud Fashion</h2>
            <p>Hi $name,</p>
            <p>Click below to reset your password (valid 30 minutes):</p>
            <a href='$link' style='display:inline-block;margin-top:12px;padding:12px 22px;background:#c9a96a;color:#000;border-radius:10px;text-decoration:none;font-weight:700'>Reset Password</a>
        </div>";
    }
}
