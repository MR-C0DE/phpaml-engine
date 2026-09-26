<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class ConsoleAction implements ClientInstruction
{
    /** @param list<mixed> $values */
    private function __construct(
        public string $level,
        public array $values,
    ) {
        if (!in_array($level, ['log', 'warn', 'error'], true)) {
            throw new \InvalidArgumentException("Unsupported console level: {$level}");
        }
    }

    public static function log(mixed ...$values): self
    {
        return new self('log', $values);
    }

    public static function warning(mixed ...$values): self
    {
        return new self('warn', $values);
    }

    public static function error(mixed ...$values): self
    {
        return new self('error', $values);
    }

    public function json(): string
    {
        return json_encode(
            ['type' => 'console', 'level' => $this->level, 'values' => self::normalize($this->values)],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );
    }

    private static function normalize(mixed $value): mixed
    {
        if ($value instanceof StateRef) return ['$state' => $value->name];
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
