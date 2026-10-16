<?php
declare(strict_types=1);

$application = $argv[1] ?? throw new RuntimeException('Expected an isolated Composer application path.');
require $application . '/vendor/autoload.php';
$vendor = realpath($application . '/vendor') . DIRECTORY_SEPARATOR;
foreach ([AML\Engine\EngineRuntime::class, AML\Engine\FrontendModules::class, AML\View\Page::class, AML\View\Renderer::class] as $class) {
    $file = (new ReflectionClass($class))->getFileName();
    if (!str_starts_with(realpath($file), $vendor)) throw new RuntimeException('Class escaped the distributed installation: ' . $class);
}
$engine = dirname((new ReflectionClass(AML\Engine\EngineRuntime::class))->getFileName(), 2);
$manifest = json_decode(file_get_contents($engine . '/assets/public-assets.json'), true, 512, JSON_THROW_ON_ERROR);
foreach ($manifest as $file) {
    $path = AML\Engine\EngineRuntime::publicAssetPath($file);
    if ($path === null || !is_file($path)) throw new RuntimeException('Missing distributed asset: ' . $file);
    if (!str_starts_with(realpath($path), $vendor)) throw new RuntimeException('Distributed asset escaped the installation: ' . $file);
}
foreach ([true, false] as $minified) {
    foreach ([AML\Engine\EngineRuntime::assetFilename($minified), AML\Engine\EngineRuntime::evalAssetFilename($minified), AML\Engine\EngineRuntime::moduleAssetFilename($minified)] as $file) {
        if (!in_array($file, $manifest, true)) throw new RuntimeException('Runtime entry missing from the manifest: ' . $file);
    }
}
$build = json_decode(file_get_contents($engine . '/assets/module-build.json'), true, 512, JSON_THROW_ON_ERROR);
foreach ($build as $graph) foreach ($graph['outputs'] as $file => $output) {
    if (!in_array(substr($file, strlen('assets/')), $manifest, true)) throw new RuntimeException('Module output missing from the manifest: ' . $file);
    foreach ($output['imports'] ?? [] as $import) if (empty($import['external']) && !isset($graph['outputs'][$import['path']])) throw new RuntimeException('Broken distributed module graph: ' . $import['path']);
}
if (AML\Engine\EngineRuntime::publicAssetPath('../composer.json') !== null) throw new RuntimeException('Unsafe public asset path.');
$expected = ['unicode', 'intl', 'bcmath', 'regex', 'date', 'spl', 'reflection'];
if (AML\Engine\FrontendModules::required(['$expression' => ['operation' => 'eval', 'left' => ['$state' => 'code']]]) !== $expected) throw new RuntimeException('Distributed PHP dependency catalogue is incomplete.');
foreach (glob($engine . '/assets/engine-*.js') as $path) if (!str_contains(basename($path), AML\Engine\EngineRuntime::VERSION)) throw new RuntimeException('Obsolete runtime included in the release archive: ' . basename($path));
echo count($manifest) . " distributed assets verified through Composer autoload.\n";
