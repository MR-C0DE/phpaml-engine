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
}
