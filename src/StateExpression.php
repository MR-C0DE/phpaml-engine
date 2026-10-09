<?php

declare(strict_types=1);

namespace AML\Engine;

/** A safe, serializable state expression evaluated by AML Engine. */
final readonly class StateExpression
{
    private const OPERATIONS = ['add', 'subtract'];

    public function __construct(
        public string $operation,
        public mixed $left,
        public mixed $right,
    ) {
        if (!in_array($operation, self::OPERATIONS, true)) {
            throw new \InvalidArgumentException("Unsupported AML state expression: {$operation}");
        }
    }

    public function plus(mixed $value): self
    {
        return new self('add', $this, $value);
    }

    public function minus(mixed $value): self
    {
        return new self('subtract', $this, $value);
    }

    /** @return array{\$expression: array{operation: string, left: mixed, right: mixed}} */
    public function payload(): array
    {
        return [
            '$expression' => [
                'operation' => $this->operation,
                'left' => $this->left,
                'right' => $this->right,
            ],
        ];
    }
}
