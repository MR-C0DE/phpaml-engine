<?php

declare(strict_types=1);

namespace AML\Engine;

final class EngineRuntime
{
    public const VERSION = '0.1.0-beta.2';

    /**
     * Compatibility bridge for applications that still embed the engine.
     *
     * New integrations should serve assets/engine.js as a versioned external
     * asset so browsers can cache it and strict CSP deployments need no inline
     * script allowance.
     */
    public static function script(?string $nonce = null, bool $minified = false): string
    {
        if ($nonce !== null && preg_match('/^[A-Za-z0-9+\/_-]{8,256}={0,2}$/', $nonce) !== 1) {
            throw new \InvalidArgumentException('Invalid Content Security Policy nonce.');
        }

        $runtime = file_get_contents(self::assetPath($minified));
        if ($runtime === false) {
            throw new \RuntimeException('Unable to load the PHPAML Engine browser runtime.');
        }

        $nonceAttribute = $nonce === null
            ? ''
            : ' nonce="' . htmlspecialchars($nonce, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '"';

        return '<script' . $nonceAttribute . ' data-aml-engine>' . "\n" . $runtime . '</script>';
    }

    public static function assetPath(bool $minified = false): string
    {
        return dirname(__DIR__) . '/assets/' . self::assetFilename($minified);
    }

    public static function assetFilename(bool $minified = false): string
    {
        return 'engine-' . self::VERSION . ($minified ? '.min' : '') . '.js';
    }

    public static function externalScript(string $publicBase = '/_aml', bool $minified = true): string
    {
        if ($publicBase === ''
            || !str_starts_with($publicBase, '/')
            || str_starts_with($publicBase, '//')
            || str_contains($publicBase, '\\')
            || preg_match('/[\x00-\x1F\x7F?#]/', $publicBase) === 1) {
            throw new \InvalidArgumentException('The PHPAML Engine public asset base must be a same-origin path.');
        }

        $source = rtrim($publicBase, '/') . '/' . self::assetFilename($minified);

        return '<script defer src="'
            . htmlspecialchars($source, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            . '" data-aml-engine></script>';
    }
}
