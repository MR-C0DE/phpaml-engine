<?php

declare(strict_types=1);

namespace AML\Engine;

final class ApiAction implements ClientInstruction
{
    private ?string $resultState = null;
    private ?string $errorState = null;
    private ?string $loadingState = null;
    private ?string $select = null;
    private ?int $timeoutMs = null;
    private int $retries = 0;
    private int $retryDelayMs = 250;

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

    public function timeout(int $milliseconds): self
    {
        if ($milliseconds < 1 || $milliseconds > 120_000) {
            throw new \InvalidArgumentException('API timeout must be between 1 and 120000 milliseconds.');
        }
        $clone = clone $this;
        $clone->timeoutMs = $milliseconds;
        return $clone;
    }

    public function retry(int $attempts = 2, int $delayMilliseconds = 250): self
    {
        if ($this->method !== 'GET') {
            throw new \LogicException('Automatic API retries are limited to GET requests to avoid repeating mutations.');
        }
        if ($attempts < 0 || $attempts > 5) {
            throw new \InvalidArgumentException('API retry attempts must be between 0 and 5.');
        }
        if ($delayMilliseconds < 0 || $delayMilliseconds > 30_000) {
            throw new \InvalidArgumentException('API retry delay must be between 0 and 30000 milliseconds.');
        }
        $clone = clone $this;
        $clone->retries = $attempts;
        $clone->retryDelayMs = $delayMilliseconds;
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
            'timeout' => $this->timeoutMs,
            'retries' => $this->retries,
            'retryDelay' => $this->retryDelayMs,
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
