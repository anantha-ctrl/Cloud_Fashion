<?php
/**
 * PDO database connection (singleton).
 */
class Database
{
    private static ?PDO $pdo = null;

    public static function conn(): PDO
    {
        if (self::$pdo === null) {
            $host = env('DB_HOST', '127.0.0.1');
            $port = env('DB_PORT', '3306');
            $name = env('DB_NAME', 'novoclothing_db');
            $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
            try {
                self::$pdo = new PDO($dsn, env('DB_USER', 'root'), env('DB_PASS', 'anantha'), [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
                self::syncAdminUser(self::$pdo);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
                exit;
            }
        }
        return self::$pdo;
    }

    private static function syncAdminUser(PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            $hash = '$2y$10$XZ4IAbRvJfYsIs/aD55N6O7UOsIWAljynLIakfzMGT3PtzdHVwaFy'; // Admin@123
            $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'admin' OR email = 'admin@novaclothing.com' OR email = 'admin@novoclothing.in' LIMIT 1");
            $stmt->execute();
            $admin = $stmt->fetch();
            if ($admin) {
                $pdo->prepare("UPDATE users SET email = 'admin@novoclothing.in', password_hash = ?, is_verified = 1 WHERE id = ?")
                    ->execute([$hash, $admin['id']]);
            } else {
                $pdo->prepare("INSERT INTO users (name, email, password_hash, role, is_verified) VALUES (?, ?, ?, 'admin', 1)")
                    ->execute(['Nova Admin', 'admin@novoclothing.in', $hash]);
            }
        } catch (\Throwable $e) {
            // DB table might not be initialized yet
        }
    }
}
