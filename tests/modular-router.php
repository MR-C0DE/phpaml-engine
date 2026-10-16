<?php
declare(strict_types=1);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
if ($path === '/__aml_test_empty') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico">';
    return true;
}
if (str_starts_with($path, '/_aml/')) {
    require_once (getenv('PHPAML_ENGINE_ROOT') ?: dirname(__DIR__)) . '/src/EngineRuntime.php';
    $asset = AML\Engine\EngineRuntime::publicAssetPath(substr($path, 6));
    if ($asset !== null) {
        header('Content-Type: ' . (str_ends_with($asset, '.map') ? 'application/json' : 'text/javascript; charset=utf-8'));
        readfile($asset);
        return true;
    }
    http_response_code(404);
    return true;
}
return false;
