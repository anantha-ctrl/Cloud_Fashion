<?php
/**
 * Mailer with two drivers:
 *   - log  : writes the email to storage/mail.log (great for local dev / OTP testing)
 *   - smtp : sends via SMTP using raw sockets (supports STARTTLS, e.g. Gmail)
 */
class Mailer
{
    public static function send(string $to, string $subject, string $html, ?string $replyTo = null): bool
    {
        $driver = env('MAIL_DRIVER', 'log');
        if ($driver === 'smtp') {
            return self::smtp($to, $subject, $html, $replyTo);
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

    private static function smtp(string $to, string $subject, string $html, ?string $replyTo = null): bool
    {
        $host = env('SMTP_HOST', 'smtp.gmail.com');
        $port = (int) env('SMTP_PORT', 587);
        $user = env('SMTP_USER');
        $pass = env('SMTP_PASS');
        $from = env('MAIL_FROM', $user ?: 'no-reply@cloudfashion.com');
        $fromName = env('MAIL_FROM_NAME', 'Cloud Fashion');

        if (!$user || !$pass) {
            self::log($to, $subject, $html); // not configured yet — don't break the flow
            return false;
        }

        $fp = @fsockopen($port === 465 ? "ssl://$host" : $host, $port, $errno, $errstr, 20);
        if (!$fp) {
            error_log("SMTP connect failed: $errstr ($errno)");
            self::log($to, $subject, $html);
            return false;
        }
        stream_set_timeout($fp, 20);

        // Reads a full (possibly multi-line) SMTP reply and returns its status code.
        $read = function () use ($fp): int {
            $code = 0; $line = '';
            while (($line = fgets($fp, 1024)) !== false) {
                $code = (int) substr($line, 0, 3);
                if (isset($line[3]) && $line[3] === ' ') break; // last line of the reply
            }
            return $code;
        };
        $cmd = function (string $c) use ($fp, $read): int { fwrite($fp, $c . "\r\n"); return $read(); };
        $fail = function (string $stage) use ($fp, $to, $subject, $html) {
            error_log("SMTP failed at: $stage");
            @fwrite($fp, "QUIT\r\n"); fclose($fp);
            self::log($to, $subject, $html); // graceful fallback
            return false;
        };

        if ($read() !== 220) return $fail('greeting');
        if ($cmd("EHLO cloudfashion") !== 250) return $fail('ehlo');
        if ($cmd("STARTTLS") !== 220) return $fail('starttls');
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
            return $fail('tls');
        }
        if ($cmd("EHLO cloudfashion") !== 250) return $fail('ehlo2');
        if ($cmd("AUTH LOGIN") !== 334) return $fail('auth');
        if ($cmd(base64_encode($user)) !== 334) return $fail('user');
        if ($cmd(base64_encode($pass)) !== 235) return $fail('pass (check the App Password)');
        if ($cmd("MAIL FROM:<$from>") !== 250) return $fail('mail from');
        if ($cmd("RCPT TO:<$to>") !== 250) return $fail('rcpt to');
        if ($cmd("DATA") !== 354) return $fail('data');

        $headers  = "From: $fromName <$from>\r\n";
        $headers .= "To: <$to>\r\n";
        if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers .= "Reply-To: <$replyTo>\r\n"; // replies go straight to the sender
        }
        $headers .= "Subject: $subject\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body = str_replace("\n.", "\n..", $html); // dot-stuffing
        if ($cmd($headers . "\r\n" . $body . "\r\n.") !== 250) return $fail('send');

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

    /** Shared shell for transactional emails. */
    private static function shell(string $inner): string
    {
        return "
        <div style='font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:16px'>
            <h2 style='color:#c9a96a;margin:0 0 16px'>Cloud Fashion</h2>
            $inner
            <p style='color:#777;font-size:12px;margin-top:28px'>Cloud Fashion · Premium fashion, curated for you.</p>
        </div>";
    }

    public static function orderPlacedTemplate(string $name, string $orderNumber, float $total): string
    {
        $amt = '₹' . number_format($total, 2);
        return self::shell("
            <p>Hi $name,</p>
            <p>Thanks for your order! We've received <b style='color:#c9a96a'>$orderNumber</b> and it's now being processed.</p>
            <p style='font-size:22px;font-weight:700;margin:18px 0'>$amt</p>
            <p style='color:#aaa'>We'll email you again when it ships. You can track it anytime from your account.</p>");
    }

    public static function orderStatusTemplate(string $name, string $orderNumber, string $status, ?string $carrier = null, ?string $tracking = null): string
    {
        $labels = [
            'processing' => "is now being processed",
            'packed'     => "has been packed and is ready to ship",
            'shipped'    => "has shipped 🚚",
            'delivered'  => "has been delivered ✅",
            'cancelled'  => "has been cancelled",
        ];
        $line = $labels[$status] ?? "status was updated to <b>$status</b>";
        $track = '';
        if ($status === 'shipped' && ($carrier || $tracking)) {
            $track = "<p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px'>"
                . ($carrier ? "Carrier: <b>$carrier</b><br>" : '')
                . ($tracking ? "Tracking #: <b style='color:#c9a96a'>$tracking</b>" : '')
                . "</p>";
        }
        return self::shell("
            <p>Hi $name,</p>
            <p>Your order <b style='color:#c9a96a'>$orderNumber</b> $line.</p>
            $track");
    }

    public static function returnStatusTemplate(string $name, string $orderNumber, string $status, ?string $note = null): string
    {
        $labels = [
            'approved' => "has been <b style='color:#c9a96a'>approved</b>. Please ship the item back as instructed.",
            'rejected' => "could not be approved.",
            'refunded' => "has been <b style='color:#22c55e'>refunded</b> &#10003;. The amount reflects in 5&ndash;7 business days.",
        ];
        $line = $labels[$status] ?? "status was updated to <b>$status</b>.";
        $noteHtml = $note ? "<p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px;color:#ddd'>Note from our team: $note</p>" : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>Your return request for order <b style='color:#c9a96a'>$orderNumber</b> $line</p>
            $noteHtml");
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
