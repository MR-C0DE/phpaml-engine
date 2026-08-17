<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class EventRef
{
    public string $path;

    private function __construct(string $path)
    {
        StateNamespace::assertSafe($path);
        $allowed = ['type', 'detail', 'key', 'code', 'repeat', 'button', 'clientX', 'clientY', 'value', 'checked'];
        $root = explode('.', $path, 2)[0];
        if (!in_array($root, $allowed, true)) {
            throw new \InvalidArgumentException("Unsupported browser event path: {$path}");
        }
        $this->path = $path;
    }

    public static function to(string $path): self
    {
        return new self($path);
    }
}
