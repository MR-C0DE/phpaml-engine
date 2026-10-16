<?php

declare(strict_types=1);

namespace AML\Engine;

/** Structured PHP control flow; payloads contain expressions and instructions, never source code. */
final readonly class FlowAction implements ClientInstruction
{
    public function __construct(public string $type, public array $payload)
    {
        if (!in_array($type, ['loop', 'switch', 'foreach-local', 'destructure', 'return', 'function-declare', 'try'], true)) {
            throw new \InvalidArgumentException("Unsupported control flow: {$type}");
        }
    }

    public function json(): string
    {
        return json_encode(['type' => $this->type, ...self::normalize($this->payload)], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }

    private static function normalize(mixed $value): mixed
    {
        if ($value instanceof ClientInstruction) return json_decode($value->json(), true, 512, JSON_THROW_ON_ERROR);
        if ($value instanceof StateRef) return ['$state' => $value->name];
        if ($value instanceof StateExpression || $value instanceof StateConditional) return self::normalize($value->payload());
        if (is_array($value)) return array_map(self::normalize(...), $value);
        return $value;
    }
}
