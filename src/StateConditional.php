<?php

declare(strict_types=1);

namespace AML\Engine;

/** A safe conditional value evaluated from reactive state by AML Engine. */
final readonly class StateConditional
{
    public function __construct(
        public mixed $left,
        public string $operator,
        public mixed $right,
        public mixed $then,
        public mixed $otherwise,
    ) {
        if (!in_array($operator, ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'truthy', 'falsy'], true)) {
            throw new \InvalidArgumentException("Unsupported conditional value operator: {$operator}");
        }
    }

    /** @return array{\$conditional: array{left: mixed, operator: string, right: mixed, then: mixed, otherwise: mixed}} */
    public function payload(): array
    {
        return ['$conditional' => [
            'left' => $this->left,
            'operator' => $this->operator,
            'right' => $this->right,
            'then' => $this->then,
            'otherwise' => $this->otherwise,
        ]];
    }
}
