<?php

declare(strict_types=1);

namespace AML\Engine;

final class StateNamespace
{
    /** @var list<string> */
    private static array $stack = [];

    /** @var array<string, int> */
    private static array $counters = [];

    public static function enter(string $component): string
    {
        $name = trim((string) preg_replace('/[^a-zA-Z0-9_]+/', '.', $component), '.');
        $index = (self::$counters[$name] ?? 0) + 1;
        self::$counters[$name] = $index;
        $scope = 'components.' . $name . '.i' . $index;
        self::$stack[] = $scope;
        return $scope;
    }

    public static function leave(): void
    {
        array_pop(self::$stack);
    }

    public static function reset(): void
    {
        self::$stack = [];
        self::$counters = [];
    }

    /** @return list<string> */
    public static function suspend(): array
    {
        $previous = self::$stack;
        self::$stack = [];
        return $previous;
    }

    /** @param list<string> $stack */
    public static function restore(array $stack): void
    {
        self::$stack = $stack;
    }

    public static function qualify(string $path): string
    {
        self::assertSafe($path);
        $scope = self::$stack[array_key_last(self::$stack)] ?? null;
        return $scope === null || str_starts_with($path, 'components.') ? $path : $scope . '.' . $path;
    }

    public static function assertSafe(string $path): void
    {
        if (preg_match('/^[a-zA-Z_][a-zA-Z0-9_.-]*$/', $path) !== 1) {
            throw new \InvalidArgumentException("Invalid client state path: {$path}");
        }
        foreach (explode('.', $path) as $segment) {
            if ($segment === '') throw new \InvalidArgumentException("Invalid client state path: {$path}");
            if (in_array(strtolower($segment), ['__proto__', 'prototype', 'constructor'], true)) {
                throw new \InvalidArgumentException("Reserved client state segment: {$segment}");
            }
        }
    }
}
