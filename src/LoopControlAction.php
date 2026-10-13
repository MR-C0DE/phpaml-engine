<?php

declare(strict_types=1);

namespace AML\Engine;

/** A structured break or continue signal, valid inside a frontend foreach. */
final readonly class LoopControlAction implements ClientInstruction
{
    public function __construct(private string $operation)
    {
        if (!in_array($operation, ['break', 'continue'], true)) {
            throw new \InvalidArgumentException("Unsupported loop control operation: {$operation}");
        }
    }

    public function json(): string
    {
        return json_encode(
            ['type' => 'loop-control', 'operation' => $this->operation],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );
    }
}
