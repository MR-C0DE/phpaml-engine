<?php

declare(strict_types=1);

namespace AML\Engine;

/** Evaluate a PHP expression whose result is discarded. */
final readonly class ExpressionAction implements ClientInstruction
{
    public function __construct(public mixed $value) {}

    public function json(): string
    {
        return json_encode(['type' => 'evaluate', 'value' => LocalAction::normalize($this->value)], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
}
