<?php

declare(strict_types=1);

namespace AML\Engine;

final readonly class EffectPlan
{
    public function __construct(
        public string $mode,
        public ClientInstruction $action,
        public ?int $delay = null,
        public ?string $target = null,
        public ?string $event = null,
        public ?ClientInstruction $cleanup = null,
    ) {
        if (!in_array($mode, ['run', 'timeout', 'interval', 'listener'], true)) {
            throw new \InvalidArgumentException("Unsupported effect mode: {$mode}");
        }
        if (in_array($mode, ['timeout', 'interval'], true) && ($delay === null || $delay < 1 || $delay > 86_400_000)) {
            throw new \InvalidArgumentException('Effect delay must be between 1 and 86400000 milliseconds.');
        }
        if ($mode === 'run' && ($delay !== null || $target !== null || $event !== null)) {
            throw new \InvalidArgumentException('A run effect cannot declare timer or listener options.');
        }
        if (in_array($mode, ['timeout', 'interval'], true) && ($target !== null || $event !== null)) {
            throw new \InvalidArgumentException('A timer effect cannot declare listener options.');
        }
        if ($mode === 'listener') {
            if ($delay !== null) throw new \InvalidArgumentException('A listener effect cannot declare a delay.');
            if (!in_array($target, ['window', 'document'], true)) {
                throw new \InvalidArgumentException('Effect listeners may target window or document.');
            }
            if ($event === null || preg_match('/^[a-z][a-z0-9:-]{0,63}$/', $event) !== 1) {
                throw new \InvalidArgumentException("Invalid effect event: {$event}");
            }
        }
        if ($cleanup !== null) {
            $payload = json_decode($cleanup->json(), true, 512, JSON_THROW_ON_ERROR);
            if (self::containsApi($payload)) {
                throw new \InvalidArgumentException('Effect cleanup must remain a local client action.');
            }
        }
    }

    public function withCleanup(ClientInstruction $action): self
    {
        return new self($this->mode, $this->action, $this->delay, $this->target, $this->event, $action);
    }

    /** @return array<string, mixed> */
    public function payload(): array
    {
        return [
            'mode' => $this->mode,
            'action' => json_decode($this->action->json(), true, 512, JSON_THROW_ON_ERROR),
            'delay' => $this->delay,
            'target' => $this->target,
            'event' => $this->event,
            'cleanup' => $this->cleanup === null ? null : json_decode($this->cleanup->json(), true, 512, JSON_THROW_ON_ERROR),
        ];
    }

    /** @param array<string, mixed> $action */
    private static function containsApi(array $action): bool
    {
        if (($action['type'] ?? null) === 'api') return true;
        foreach (['actions'] as $key) {
            foreach (($action[$key] ?? []) as $child) {
                if (is_array($child) && self::containsApi($child)) return true;
            }
        }
        foreach (['then', 'otherwise'] as $key) {
            if (is_array($action[$key] ?? null) && self::containsApi($action[$key])) return true;
        }
        return false;
    }
}
