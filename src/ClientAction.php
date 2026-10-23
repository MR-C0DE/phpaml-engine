<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class ClientAction implements ClientInstruction
{
    public string $target;

    private function __construct(
        public string $type,
        string|StateRef $target,
        public mixed $value = null,
    ) {
        $this->target = $target instanceof StateRef ? $target->name : StateNamespace::qualify($target);
    }

    public static function increment(string|StateRef $target, int|float $by = 1): self
    {
        return new self('increment', $target, $by);
    }

    public static function decrement(string|StateRef $target, int|float $by = 1): self
    {
        return new self('decrement', $target, $by);
    }

    public static function set(string|StateRef $target, mixed $value): self
    {
        return new self('set', $target, $value);
    }

    public static function toggle(string|StateRef $target): self
    {
        return new self('toggle', $target);
    }

    public static function append(string|StateRef $target, mixed $value): self
    {
        return new self('append', $target, $value);
    }

    public static function prepend(string|StateRef $target, mixed $value): self
    {
        return new self('prepend', $target, $value);
    }

    public static function removeAt(string|StateRef $target, int|StateRef $index): self
    {
        return new self('remove-at', $target, $index);
    }

    public static function removePath(string|StateRef $target): self
    {
        return new self('remove-path', $target);
    }

    public static function removeBy(string|StateRef $target, string $key, mixed $value): self
    {
        StateNamespace::assertSafe($key);
        return new self('remove-by', $target, ['key' => $key, 'value' => $value]);
    }

    /** @param array<string, mixed> $changes */
    public static function updateBy(string|StateRef $target, string $key, mixed $value, array $changes): self
    {
        StateNamespace::assertSafe($key);
        return new self('update-by', $target, ['key' => $key, 'value' => $value, 'changes' => $changes]);
    }

    public static function sortBy(string|StateRef $target, string $key, string $direction = 'asc'): self
    {
        StateNamespace::assertSafe($key);
        if (!in_array(strtolower($direction), ['asc', 'desc'], true)) {
            throw new \InvalidArgumentException("Invalid collection sort direction: {$direction}");
        }
        return new self('sort-by', $target, ['key' => $key, 'direction' => strtolower($direction)]);
    }

    public static function reverse(string|StateRef $target): self
    {
        return new self('reverse', $target);
    }

    public static function filterBy(string|StateRef $target, string $key, mixed $value, bool $keepMatches = true): self
    {
        StateNamespace::assertSafe($key);
        return new self('filter-by', $target, [
            'key' => $key,
            'value' => $value,
            'keepMatches' => $keepMatches,
        ]);
    }

    public static function move(string|StateRef $target, int|StateRef $from, int|StateRef $to): self
    {
        return new self('move', $target, ['from' => $from, 'to' => $to]);
    }

    /** @param array<string, mixed> $changes */
    public static function merge(string|StateRef $target, array $changes): self
    {
        return new self('merge', $target, $changes);
    }

    public static function clear(string|StateRef $target): self
    {
        return new self('clear', $target);
    }

    public function json(): string
    {
        return json_encode(
            ['type' => $this->type, 'target' => $this->target, 'value' => self::normalize($this->value)],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );
    }

    private static function normalize(mixed $value): mixed
    {
        if ($value instanceof StateRef) return ['$state' => $value->name];
        if ($value instanceof StateExpression) return self::normalize($value->payload());
        if ($value instanceof StateConditional) return self::normalize($value->payload());
        if ($value instanceof EventRef) return ['$event' => $value->path];
        if (!is_array($value)) return $value;
        $normalized = [];
        foreach ($value as $key => $item) {
            if (is_string($key) && in_array(strtolower($key), ['__proto__', 'prototype', 'constructor'], true)) {
                throw new \InvalidArgumentException("Reserved client data key: {$key}");
            }
            $normalized[$key] = self::normalize($item);
        }
        return $normalized;
    }
}
