<?php

declare(strict_types=1);

namespace AML\Engine;

/** Locals never enter component state, storage, or another event's scope. */
final readonly class LocalScope implements ClientInstruction
{
    public function __construct(public ClientInstruction $action, public array $functions = [], public array $classes = [], public ?string $serviceScope = null) {}

    public function json(): string
    {
        $payload = [
            'type' => 'local-scope',
            ...($this->serviceScope === null ? [] : ['serviceScope' => $this->serviceScope]),
            'action' => json_decode($this->action->json(), true, 512, JSON_THROW_ON_ERROR),
            ...($this->functions === [] ? [] : ['functions' => $this->functions]),
            ...($this->classes === [] ? [] : ['classes' => $this->classes]),
        ];
        $modules = FrontendModules::required($payload);
        return json_encode([...$payload, ...($modules === [] ? [] : ['phpModules' => $modules])], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
}
