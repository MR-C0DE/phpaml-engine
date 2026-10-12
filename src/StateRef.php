<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class StateRef
{
    public string $name;

    private function __construct(string $name, public mixed $initial)
    {
        $this->name = StateNamespace::qualify($name);
    }

    public static function to(string $name, mixed $initial = null): self
    {
        return new self($name, $initial);
    }

    public function plus(mixed $value): StateExpression
    {
        return new StateExpression('add', $this, $value);
    }

    public function minus(mixed $value): StateExpression
    {
        return new StateExpression('subtract', $this, $value);
    }

    public function times(mixed $value): StateExpression { return new StateExpression('multiply', $this, $value); }
    public function dividedBy(mixed $value): StateExpression { return new StateExpression('divide', $this, $value); }
    public function modulo(mixed $value): StateExpression { return new StateExpression('modulo', $this, $value); }
    public function concat(mixed $value): StateExpression { return new StateExpression('concat', $this, $value); }
    public function prefixedBy(mixed $value): StateExpression { return new StateExpression('concat', $value, $this); }
    public function negated(): StateExpression { return new StateExpression('not', $this, null); }

    public function choose(mixed $then, mixed $otherwise): StateConditional
    {
        return new StateConditional($this, 'truthy', true, $then, $otherwise);
    }
}
