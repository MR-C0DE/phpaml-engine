<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class ConditionalAction implements ClientInstruction
{
    private ?string $state;
    private mixed $left;

    public function __construct(
        string|StateRef|StateExpression $state,
        private string $operator,
        private mixed $value,
        private ClientInstruction $then,
        private ?ClientInstruction $otherwise = null,
    ) {
        $this->state = is_string($state) ? StateNamespace::qualify($state) : null;
        $this->left = is_string($state) ? null : $state;
        if (!in_array($operator, ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'truthy', 'falsy'], true)) {
            throw new \InvalidArgumentException("Unsupported condition operator: {$operator}");
        }
    }

    public function json(): string
    {
        $payload = [
            'type' => 'condition',
            'operator' => $this->operator,
            'value' => self::normalize($this->value),
            'then' => json_decode($this->then->json(), true, 512, JSON_THROW_ON_ERROR),
            'otherwise' => $this->otherwise === null ? null : json_decode($this->otherwise->json(), true, 512, JSON_THROW_ON_ERROR),
        ];
        if ($this->state !== null) $payload['state'] = $this->state;
        else $payload['left'] = self::normalize($this->left);
        return json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private static function normalize(mixed $value): mixed
    {
        if ($value instanceof StateRef) return ['$state' => $value->name];
        if ($value instanceof StateExpression) return self::normalize($value->payload());
        if ($value instanceof StateConditional) return self::normalize($value->payload());
        if (!is_array($value)) return $value;
        return array_map(self::normalize(...), $value);
    }
}
