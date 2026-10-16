<?php

declare(strict_types=1);

namespace AML\Engine;

/** An assignment in the private frame of one frontend handler invocation. */
final readonly class LocalAction implements ClientInstruction
{
    public function __construct(public string $name, public mixed $value)
    {
        if (preg_match('/^v[0-9a-f]+$/D', $name) !== 1) {
            throw new \InvalidArgumentException('Invalid frontend local identifier.');
        }
    }

    public function json(): string
    {
        return json_encode(['type' => 'local-set', 'name' => $this->name, 'value' => self::normalize($this->value)], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
    /** @internal Shared serialization for local and discarded expressions. */
    public static function normalize(mixed $value): mixed
    {
        if ($value instanceof StateRef) return ['$state' => $value->name];
        if ($value instanceof StateExpression || $value instanceof StateConditional) return self::normalize($value->payload());
        if (!is_array($value)) return $value;
        foreach ($value as $key => $item) {
            if (is_string($key) && in_array(strtolower($key), ['__proto__', 'prototype', 'constructor'], true)) {
                throw new \InvalidArgumentException("Reserved client data key: {$key}");
            }
            $value[$key] = self::normalize($item);
        }
        return $value;
    }
}
