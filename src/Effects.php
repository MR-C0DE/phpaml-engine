<?php

declare(strict_types=1);

namespace AML\Engine;

final class Effects
{
    public static function run(ClientInstruction $action): EffectPlan
    {
        return new EffectPlan('run', $action);
    }

    public static function timeout(int $milliseconds, ClientInstruction $action): EffectPlan
    {
        return new EffectPlan('timeout', $action, delay: $milliseconds);
    }

    public static function interval(int $milliseconds, ClientInstruction $action): EffectPlan
    {
        return new EffectPlan('interval', $action, delay: $milliseconds);
    }

    public static function onWindow(string $event, ClientInstruction $action): EffectPlan
    {
        return new EffectPlan('listener', $action, target: 'window', event: $event);
    }

    public static function onDocument(string $event, ClientInstruction $action): EffectPlan
    {
        return new EffectPlan('listener', $action, target: 'document', event: $event);
    }
}
