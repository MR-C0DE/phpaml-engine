<?php

declare(strict_types=1);

namespace AML\Engine;

final class StateNamespace
{
    /** @var array<string, array{stack: list<string>, counters: array<string, int>}> */
    private static array $contexts = [];

    public static function enter(string $component): string
    {
        $context = &self::context();
        $name = trim((string) preg_replace('/[^a-zA-Z0-9_]+/', '.', $component), '.');
        $index = ($context['counters'][$name] ?? 0) + 1;
        $context['counters'][$name] = $index;
        $scope = 'components.' . $name . '.i' . $index;
        $context['stack'][] = $scope;
        return $scope;
    }

    public static function leave(): void
    {
        $context = &self::context();
        array_pop($context['stack']);
    }

    public static function reset(): void
    {
        self::$contexts[self::executionId()] = ['stack' => [], 'counters' => []];
    }

    public static function isolated(callable $callback): mixed
    {
        $id = self::executionId();
        $hadPrevious = array_key_exists($id, self::$contexts);
        $previous = self::$contexts[$id] ?? null;
        self::$contexts[$id] = ['stack' => [], 'counters' => []];
        try {
            return $callback();
        } finally {
            if ($hadPrevious && $previous !== null) {
                self::$contexts[$id] = $previous;
            } else {
                unset(self::$contexts[$id]);
            }
        }
    }

    /** @return list<string> */
    public static function suspend(): array
    {
        $context = &self::context();
        $previous = $context['stack'];
        $context['stack'] = [];
        return $previous;
    }

    /** @param list<string> $stack */
    public static function restore(array $stack): void
    {
        $context = &self::context();
        $context['stack'] = $stack;
    }

    public static function qualify(string $path): string
    {
        self::assertSafe($path);
        $context = &self::context();
        $scope = $context['stack'][array_key_last($context['stack'])] ?? null;
        return $scope === null || str_starts_with($path, 'components.') ? $path : $scope . '.' . $path;
    }

    /** @return array{stack: list<string>, counters: array<string, int>} */
    private static function &context(): array
    {
        $id = self::executionId();
        self::$contexts[$id] ??= ['stack' => [], 'counters' => []];
        return self::$contexts[$id];
    }

    private static function executionId(): string
    {
        $fiber = \Fiber::getCurrent();
        return $fiber === null ? 'main' : 'fiber:' . spl_object_id($fiber);
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
