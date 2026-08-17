<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class StateTransaction implements ClientInstruction
{
    /** @var list<ClientInstruction> */
    public array $actions;

    public function __construct(ClientInstruction ...$actions)
    {
        if ($actions === []) throw new \InvalidArgumentException('A state transaction cannot be empty.');
        $this->actions = array_values($actions);
    }

    public function json(): string
    {
        return json_encode([
            'type' => 'transaction',
            'actions' => array_map(
                static fn (ClientInstruction $action): array => json_decode($action->json(), true, 512, JSON_THROW_ON_ERROR),
                $this->actions,
            ),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
