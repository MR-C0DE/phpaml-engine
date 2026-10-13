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

    public static function each(
        mixed $source,
        string $value,
        ?string $key,
        ClientInstruction $action,
        int $limit = 1000,
    ): ForEachAction {
        return new ForEachAction($source, $value, $key, $action, $limit);
    }

    public static function breakLoop(): LoopControlAction
    {
        return new LoopControlAction('break');
    }

    public static function continueLoop(): LoopControlAction
    {
        return new LoopControlAction('continue');
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

    public static function whenValue(
        mixed $left,
        string $operator,
        mixed $value,
        ClientInstruction $then,
        ?ClientInstruction $otherwise = null,
    ): ConditionalAction {
        return new ConditionalAction($left, $operator, $value, $then, $otherwise);
    }
}
