<?php
declare(strict_types=1);

// Test adapter: the example keeps its production default. Both CI modes use
// the same application, changing only its existing Engine integration tag.
$viewRoot = getenv('PHPAML_VIEW_ROOT') ?: dirname(__DIR__, 2) . '/phpaml-view';
$public = $viewRoot . '/examples/aml-tasks/public';
if ($autoload = getenv('PHPAML_INSTALLED_AUTOLOAD')) require_once $autoload;
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
if ($path !== '/' && is_file($public . $path)) return false;
ob_start(static function (string $html): string {
    return getenv('PHPAML_BROWSER_RUNTIME') === 'full'
        ? str_replace(AML\Engine\EngineRuntime::externalScript(modular: true), AML\Engine\EngineRuntime::externalScript(), $html)
        : $html;
});
require $public . '/index.php';
