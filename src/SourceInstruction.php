<?php

declare(strict_types=1);

namespace AML\Engine;

/** Associates a compiled instruction with its PHP origin. */
final readonly class SourceInstruction implements ClientInstruction
{
    public function __construct(public ClientInstruction $action, public array $source) {}

    public function json(): string
    {
        return json_encode([
            ...json_decode($this->action->json(), true, 512, JSON_THROW_ON_ERROR),
            'phpSource' => $this->source,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    }
}
