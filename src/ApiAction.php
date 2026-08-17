<?php

declare(strict_types=1);

namespace AML\Engine;

final class ApiAction implements ClientInstruction
{
    private ?string $resultState = null;
    private ?string $errorState = null;
    private ?string $loadingState = null;
    private ?string $select = null;

    /** @param array<string, mixed> $data */
    public function __construct(
        private string $method,
        private string $url,
        private array $data = [],
    ) {
        $this->method = strtoupper($this->method);
        if (!in_array($this->method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            throw new \InvalidArgumentException("Unsupported API method: {$this->method}");
        }
        if (!str_starts_with($this->url, '/') || str_starts_with($this->url, '//')) {
            throw new \InvalidArgumentException('AML Engine API actions require a same-origin absolute path.');
        }
    }

    public function storeIn(string $state, ?string $select = null): self
    {
        $clone = clone $this;
        $clone->resultState = self::stateName($state);
        if ($select !== null) StateNamespace::assertSafe($select);
        $clone->select = $select;
        return $clone;
    }

    public function errorIn(string $state): self
    {
        $clone = clone $this;
        $clone->errorState = self::stateName($state);
        return $clone;
    }

    public function loadingIn(string $state): self
    {
        $clone = clone $this;
        $clone->loadingState = self::stateName($state);
        return $clone;
    }

    public function json(): string
    {
        return json_encode([
            'type' => 'api',
            'method' => $this->method,
            'url' => $this->url,
            'data' => self::normalize($this->data),
            'result' => $this->resultState,
            'error' => $this->errorState,
            'loading' => $this->loadingState,
            'select' => $this->select,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private static function normalize(mixed $value): mixed
    {
        if ($value instanceof StateRef) return ['$state' => $value->name];
        if ($value instanceof EventRef) return ['$event' => $value->path];
        if (!is_array($value)) return $value;
        return array_map([self::class, 'normalize'], $value);
    }

    private static function stateName(string $state): string
    {
        return StateNamespace::qualify($state);
    }
}
