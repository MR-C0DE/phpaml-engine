<?php

declare(strict_types=1);

namespace AML\Engine;

final class Actions
{
    public static function sequence(ClientInstruction ...$actions): ActionSequence
    {
        return new ActionSequence(...$actions);
    }

    public static function transaction(ClientInstruction ...$actions): StateTransaction
    {
        return new StateTransaction(...$actions);
    }

    public static function when(
        string $state,
        string $operator,
        mixed $value,
        ClientInstruction $then,
        ?ClientInstruction $otherwise = null,
    ): ConditionalAction {
        return new ConditionalAction($state, $operator, $value, $then, $otherwise);
    }
}
