<?php
/**
 * Authentication & profile.
 */
class AuthController
{
    public function register(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, [
            'name'     => 'required|min:2|max:120',
            'email'    => 'required|email',
            'password' => 'required|min:6|confirmed',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $db = db();
        $exists = $db->prepare('SELECT id, is_verified FROM users WHERE email = ?');
        $exists->execute([$data['email']]);
        if ($row = $exists->fetch()) {
            if ((int) $row['is_verified'] === 1) {
                Response::error('Email already registered', 409);
            }
            $userId = (int) $row['id'];
            $db->prepare('UPDATE users SET name=?, password_hash=? WHERE id=?')
               ->execute([$data['name'], password_hash($data['password'], PASSWORD_BCRYPT), $userId]);
        } else {
            $stmt = $db->prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?,?,?,?)');
            $stmt->execute([
                $data['name'], $data['email'], $data['phone'] ?? null,
                password_hash($data['password'], PASSWORD_BCRYPT),
            ]);
            $userId = (int) $db->lastInsertId();
        }

        $this->issueOtp($userId, $data['name'], $data['email']);
        Response::success(['email' => $data['email']], 'Registered. OTP sent to email.', 201);
    }

    public function verifyOtp(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, ['email' => 'required|email', 'otp' => 'required']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $db = db();
        $user = $this->userByEmail($data['email']);
        if (!$user) {
            Response::error('User not found', 404);
        }
        $stmt = $db->prepare(
            "SELECT * FROM auth_tokens WHERE user_id=? AND type='email_otp' AND used=0
             AND expires_at > NOW() ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute([$user['id']]);
        $token = $stmt->fetch();
        if (!$token || !hash_equals($token['token'], (string) $data['otp'])) {
            Response::error('Invalid or expired OTP', 400);
        }

        $db->prepare('UPDATE auth_tokens SET used=1 WHERE id=?')->execute([$token['id']]);
        $db->prepare('UPDATE users SET is_verified=1 WHERE id=?')->execute([$user['id']]);

        Response::success($this->authPayload($user), 'Email verified successfully');
    }

    public function resendOtp(array $p): void
    {
        $email = Request::input('email');
        $user = $this->userByEmail($email);
        if (!$user) {
            Response::error('User not found', 404);
        }
        $this->issueOtp((int) $user['id'], $user['name'], $user['email']);
        Response::success(null, 'OTP resent');
    }

    public function login(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, ['email' => 'required|email', 'password' => 'required']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $user = $this->userByEmail($data['email']);
        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid credentials', 401);
        }
        if ($user['status'] === 'blocked') {
            Response::error('Your account has been blocked', 403);
        }
        if ((int) $user['is_verified'] === 0) {
            $this->issueOtp((int) $user['id'], $user['name'], $user['email']);
            Response::error('Please verify your email. A new OTP has been sent.', 403, ['needs_verification' => true]);
        }

        Response::success($this->authPayload($user), 'Login successful');
    }

    public function logout(array $p): void
    {
        // Stateless JWT - client simply discards the token.
        Response::success(null, 'Logged out');
    }

    public function forgotPassword(array $p): void
    {
        $email = Request::input('email');
        $user = $this->userByEmail($email);
        // Always respond success to avoid user enumeration.
        if ($user) {
            $token = bin2hex(random_bytes(24));
            db()->prepare(
                "INSERT INTO auth_tokens (user_id, token, type, expires_at)
                 VALUES (?,?,'password_reset', DATE_ADD(NOW(), INTERVAL 30 MINUTE))"
            )->execute([$user['id'], $token]);
            $link = rtrim(env('FRONTEND_URL'), '/') . "/reset-password?token=$token&email=" . urlencode($email);
            Mailer::send($email, 'Reset your Cloud Fashion password', Mailer::resetTemplate($user['name'], $link));
        }
        Response::success(null, 'If the email exists, a reset link has been sent.');
    }

    public function resetPassword(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, [
            'email'    => 'required|email',
            'token'    => 'required',
            'password' => 'required|min:6|confirmed',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $db = db();
        $user = $this->userByEmail($data['email']);
        if (!$user) {
            Response::error('Invalid reset request', 400);
        }
        $stmt = $db->prepare(
            "SELECT * FROM auth_tokens WHERE user_id=? AND token=? AND type='password_reset'
             AND used=0 AND expires_at > NOW() LIMIT 1"
        );
        $stmt->execute([$user['id'], $data['token']]);
        $token = $stmt->fetch();
        if (!$token) {
            Response::error('Invalid or expired reset token', 400);
        }
        $db->prepare('UPDATE users SET password_hash=? WHERE id=?')
           ->execute([password_hash($data['password'], PASSWORD_BCRYPT), $user['id']]);
        $db->prepare('UPDATE auth_tokens SET used=1 WHERE id=?')->execute([$token['id']]);
        Response::success(null, 'Password reset successful');
    }

    public function me(array $p): void
    {
        $id = Auth::id();
        $stmt = db()->prepare('SELECT id, name, email, phone, role, avatar_url, created_at FROM users WHERE id=?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('User not found', 404);
        }
        Response::success($user);
    }

    public function updateProfile(array $p): void
    {
        $id = Auth::id();
        $data = Request::body();
        $v = Validator::make($data, ['name' => 'required|min:2|max:120']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        db()->prepare('UPDATE users SET name=?, phone=? WHERE id=?')
            ->execute([$data['name'], $data['phone'] ?? null, $id]);
        $this->me($p);
    }

    public function changePassword(array $p): void
    {
        $id = Auth::id();
        $data = Request::body();
        $v = Validator::make($data, [
            'current_password' => 'required',
            'password'         => 'required|min:6|confirmed',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id=?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row || !password_verify($data['current_password'], $row['password_hash'])) {
            Response::error('Current password is incorrect', 400);
        }
        db()->prepare('UPDATE users SET password_hash=? WHERE id=?')
            ->execute([password_hash($data['password'], PASSWORD_BCRYPT), $id]);
        Response::success(null, 'Password changed');
    }

    // ---------- helpers ----------

    private function issueOtp(int $userId, string $name, string $email): void
    {
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        db()->prepare(
            "INSERT INTO auth_tokens (user_id, token, type, expires_at)
             VALUES (?,?,'email_otp', DATE_ADD(NOW(), INTERVAL 10 MINUTE))"
        )->execute([$userId, $otp]);
        Mailer::send($email, 'Your Cloud Fashion verification code', Mailer::otpTemplate($name, $otp));
    }

    private function userByEmail(?string $email): ?array
    {
        if (!$email) {
            return null;
        }
        $stmt = db()->prepare('SELECT * FROM users WHERE email=?');
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }

    private function authPayload(array $user): array
    {
        $token = Jwt::encode(['sub' => (int) $user['id'], 'role' => $user['role'], 'name' => $user['name']]);
        return [
            'token' => $token,
            'user'  => [
                'id'    => (int) $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role'],
                'phone' => $user['phone'],
            ],
        ];
    }
}
