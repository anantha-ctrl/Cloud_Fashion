<?php
/**
 * Authentication middleware.
 */
class Auth
{
    /** Returns the authenticated user payload or sends 401. */
    public static function user(): array
    {
        $token = Request::bearerToken();
        if (!$token) {
            Response::error('Authentication required', 401);
        }
        $payload = Jwt::decode($token);
        if (!$payload) {
            Response::error('Invalid or expired token', 401);
        }
        return $payload;
    }

    public static function id(): int
    {
        return (int) self::user()['sub'];
    }

    /** Requires the user to have the admin role. */
    public static function admin(): array
    {
        $user = self::user();
        if (($user['role'] ?? '') !== 'admin') {
            Response::error('Admin access required', 403);
        }
        return $user;
    }

    /** Optional auth - returns user payload or null without erroring. */
    public static function optional(): ?array
    {
        $token = Request::bearerToken();
        if (!$token) {
            return null;
        }
        return Jwt::decode($token);
    }
}
