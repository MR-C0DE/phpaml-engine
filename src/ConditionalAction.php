<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class ConditionalAction implements ClientInstruction
{
    private string $state;

    public function __construct(
        string $state,
        private string $operator,
        private mixed $value,
        private ClientInstruction $then,
        private ?ClientInstruction $otherwise = null,
    ) {
        $this->state = StateNamespace::qualify($state);
        if (!in_array($operator, ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'truthy', 'falsy'], true)) {
            throw new \InvalidArgumentException("Unsupported condition operator: {$operator}");
        }
    }

    public function json(): string
    {
        return json_encode([
            'type' => 'condition',
            'state' => $this->state,
            'operator' => $this->operator,
            'value' => $this->value,
            'then' => json_decode($this->then->json(), true, 512, JSON_THROW_ON_ERROR),
            'otherwise' => $this->otherwise === null ? null : json_decode($this->otherwise->json(), true, 512, JSON_THROW_ON_ERROR),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
