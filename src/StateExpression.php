<?php

declare(strict_types=1);

namespace AML\Engine;

/** A safe, serializable state expression evaluated by AML Engine. */
final readonly class StateExpression
{
    private const OPERATIONS = [
        'dynamicLocal', 'enumCase', 'enumCases', 'enumFrom', 'staticLocal',
        'objectClass', 'objectConstant', 'isObject', 'nullsafeChain', 'objectClassName', 'objectDeclare', 'objectNew', 'objectThis', 'objectProperty', 'objectStaticProperty', 'objectCall', 'objectMethodRef', 'objectClone',
        'exception', 'exceptionGet', 'exceptionIs', 'throw', 'assert',
        'assignReference', 'splMethod', 'yield', 'yieldFrom', 'call', 'closure', 'functionRef', 'builtin', 'display', 'roundingMode', 'eval',
        'array', 'match', 'empty', 'compoundAssign', 'appendOffset', 'unsetOffset', 'arrayMutate',
        'keys', 'values',
        'add', 'subtract', 'multiply', 'divide', 'modulo', 'power', 'concat', 'not',
        'bitOr', 'bitAnd', 'bitXor', 'bitNot', 'shiftLeft', 'shiftRight', 'xor',
        'and', 'or', 'coalesce', 'coalesceAssign', 'elvis', 'assign', 'preIncrement', 'postIncrement', 'preDecrement', 'postDecrement', 'incrementValue', 'decrementValue',
        'equal', 'notEqual', 'identical', 'notIdentical', 'less', 'lessEqual', 'greater', 'greaterEqual',
        'count', 'sum', 'contains', 'filter', 'map', 'reduce',
        'find', 'any', 'all', 'column', 'unique', 'sort', 'sortBy', 'compare',
        'reverse', 'slice', 'merge', 'search', 'keyExists', 'isset',
        'ceil', 'floor', 'round', 'min', 'max',
        'toInt', 'toFloat', 'toString', 'toBool', 'toArray', 'toObject', 'gettype', 'offset',
    ];

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

    public function times(mixed $value): self { return new self('multiply', $this, $value); }
    public function dividedBy(mixed $value): self { return new self('divide', $this, $value); }
    public function modulo(mixed $value): self { return new self('modulo', $this, $value); }
    public function concat(mixed $value): self { return new self('concat', $this, $value); }
    public function prefixedBy(mixed $value): self { return new self('concat', $value, $this); }
    public function negated(): self { return new self('not', $this, null); }

    public function choose(mixed $then, mixed $otherwise): StateConditional
    {
        return new StateConditional($this, 'truthy', true, $then, $otherwise);
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
