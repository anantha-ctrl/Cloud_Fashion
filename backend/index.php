<?php
/**
 * Front controller / router for the Cloud Fashion API.
 */
require_once __DIR__ . '/bootstrap.php';

// ---- CORS ----
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if (Request::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Lightweight router supporting {param} placeholders.
 */
class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, $handler): void
    {
        $this->routes[] = compact('method', 'pattern', 'handler');
    }

    public function get(string $p, $h): void    { $this->add('GET', $p, $h); }
    public function post(string $p, $h): void   { $this->add('POST', $p, $h); }
    public function put(string $p, $h): void    { $this->add('PUT', $p, $h); }
    public function patch(string $p, $h): void  { $this->add('PATCH', $p, $h); }
    public function delete(string $p, $h): void { $this->add('DELETE', $p, $h); }

    public function dispatch(string $method, string $uri): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            $regex = '#^' . preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $route['pattern']) . '$#';
            if (preg_match($regex, $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                if (is_callable($route['handler'])) {
                    $route['handler']($params);
                } else {
                    [$class, $action] = explode('@', $route['handler']);
                    (new $class())->$action($params);
                }
                return;
            }
        }
        Response::error('Route not found: ' . $method . ' ' . $uri, 404);
    }
}

// Resolve the path relative to /backend
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = '/CloudFashion/backend';
if (str_starts_with($uri, $base)) {
    $uri = substr($uri, strlen($base));
}
$uri = '/' . trim($uri, '/');
$uri = $uri === '/index.php' ? '/' : $uri;

$router = new Router();
require_once __DIR__ . '/routes.php';
$router->dispatch(Request::method(), $uri);
