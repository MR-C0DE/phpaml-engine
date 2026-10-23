<?php
declare(strict_types=1);

// Test-only application. This router never serves arbitrary filesystem paths.
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) { http_response_code(403); exit; }
$engine = getenv('PHPAML_ENGINE_ROOT') ?: dirname(__DIR__, 2);
$view = getenv('PHPAML_VIEW_ROOT') ?: dirname($engine) . '/phpaml-view';
require $view . '/tests/bootstrap.php';
ini_set('display_errors', '0');

use AML\Engine\EngineRuntime;
use AML\View\{FileApplication, PageMetadata, Renderer};
use function AML\View\{Element, Iframe, Link, Script, Text};

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
if (getenv('PHPAML_LAB_DIAGNOSTIC') !== '1' || $path === '/production') {
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
}
if ($path === '/favicon.ico') { http_response_code(204); return; }
if ($path === '/ready') { echo 'ready'; return; }
if ($path === '/safe.js') { header('Content-Type: text/javascript'); echo 'window.labSafeScript = true;'; return; }
if (str_starts_with($path, '/_aml/')) {
    $asset = EngineRuntime::publicAssetPath(substr($path, 6));
    if ($asset === null) { http_response_code(404); echo 'Not found'; return; }
    header('Content-Type: ' . (str_ends_with($asset, '.map') ? 'application/json' : 'text/javascript'));
    readfile($asset); return;
}
if ($path === '/api/relay' || $path === '/navigation-relay') {
    // Owned second loopback origin: measures whether Engine enforces its boundary.
    header('Location: ' . getenv('PHPAML_LAB_RECEIVER') . ($path === '/api/relay' ? '/capture' : '/foreign-page'), true, 307);
    return;
}
if ($path === '/api/local-relay') { header('Location: /api/save', true, 307); return; }
if ($path === '/api/save') {
    header('Content-Type: application/json');
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"method"}'; return; }
    // Deliberately synthetic token, never a real session or credential.
    if (!hash_equals('lab-synthetic-csrf', (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
        http_response_code(419); echo '{"error":"csrf"}'; return;
    }
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) { http_response_code(413); echo '{"error":"size"}'; return; }
    try { $input = json_decode((string) file_get_contents('php://input'), true, 16, JSON_THROW_ON_ERROR); }
    catch (JsonException) { http_response_code(400); echo '{"error":"json"}'; return; }
    if (!is_array($input) || !is_string($input['message'] ?? null) || strlen($input['message']) > 2048) {
        http_response_code(422); echo '{"error":"input"}'; return;
    }
    echo json_encode(['message' => $input['message']], JSON_THROW_ON_ERROR); return;
}
if (!in_array($path, ['/', '/probe', '/production'], true)) { http_response_code(404); echo 'Not found'; return; }
try {
    $app = new FileApplication(__DIR__ . '/views', namespace: 'SecurityLab');
    $html = $app->mount('/')->rootHtml();
    $value = is_string($_GET['value'] ?? null) ? $_GET['value'] : '';
    if ($path === '/probe') {
        // These are real public View entry points, fed only synthetic test inputs.
        $preview = match ($_GET['surface'] ?? '') {
            'text' => Text($value)->id('preview'),
            'attribute' => Text('Preview')->attribute('title', $value)->id('preview'),
            'link' => Link('Ouvrir', '/')->attribute('href', $value)->id('preview')->nativeNavigation(),
            'frame' => Iframe($value, 'Preview')->id('preview'),
            'document' => Iframe('/ready', 'Preview')->attribute('srcdoc', $value)->id('preview'),
            'tag' => Element($value, Text('Preview')),
            'script' => Script('/safe.js')->attribute('src', $value),
            default => throw new InvalidArgumentException('Unknown surface'),
        };
        $html .= (new Renderer())->render($preview);
    }
    $runtime = ($_GET['runtime'] ?? 'full') === 'modules';
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="csrf-token" content="lab-synthetic-csrf">'
        . (new PageMetadata('Laboratoire PHPAML'))->render()
        . '</head><body>' . $html . Link('Navigation de test', '/navigation-relay')->render(new AML\View\RenderContext())
        . EngineRuntime::externalScript(modular: $runtime) . '</body></html>';
} catch (InvalidArgumentException) {
    http_response_code(422); header('Content-Type: text/plain; charset=utf-8'); echo 'Entrée refusée.';
} catch (Throwable) {
    http_response_code(500); header('Content-Type: text/plain; charset=utf-8'); echo 'Application indisponible.';
}
