<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class NavigationAction implements ClientInstruction
{
    public function __construct(public string $destination, public bool $replace = false)
    {
        if ($destination === '' || preg_match('/[\x00-\x1F\x7F]/', $destination) === 1) {
            throw new \InvalidArgumentException('Navigation destination must be a safe non-empty URL.');
        }
        if (preg_match('/^([a-z][a-z0-9+.-]*):/i', $destination, $match) === 1
            && !in_array(strtolower($match[1]), ['http', 'https'], true)) {
            throw new \InvalidArgumentException('Navigation only supports relative, HTTP, and HTTPS URLs.');
        }
    }

    public function json(): string
    {
        return json_encode([
            'type' => 'navigate',
            'destination' => $this->destination,
            'replace' => $this->replace,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
