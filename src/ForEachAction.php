<?php

declare(strict_types=1);

namespace AML\Engine;

/** Execute one client instruction for every value of a reactive collection. */
final readonly class ForEachAction implements ClientInstruction
{
    public mixed $source;

    public function __construct(
        mixed $source,
        private string $value,
        private ?string $key,
        private ClientInstruction $action,
        private int $limit = 1000,
    ) {
        $this->source = is_string($source) ? StateNamespace::qualify($source) : $source;
        if (!is_string($this->source) && !(is_array($this->source) && isset($this->source['$loop']))) {
            throw new \InvalidArgumentException('Frontend foreach source must be a state path or a scoped loop collection.');
        }
        foreach (array_filter([$value, $key]) as $name) {
            if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name)) {
                throw new \InvalidArgumentException("Invalid frontend foreach variable: {$name}");
            }
        }
        if ($limit < 1 || $limit > 10_000) {
            throw new \InvalidArgumentException('Frontend foreach limit must be between 1 and 10000.');
        }
    }

    public function json(): string
    {
        return json_encode([
            'type' => 'foreach',
            'source' => self::normalize($this->source),
            'value' => $this->value,
            'key' => $this->key,
            'limit' => $this->limit,
            'action' => json_decode($this->action->json(), true, 512, JSON_THROW_ON_ERROR),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private static function normalize(mixed $value): mixed
    {
        if ($value instanceof StateRef) return ['$state' => $value->name];
        if ($value instanceof StateExpression) return self::normalize($value->payload());
        if (!is_array($value)) return $value;
        return array_map(self::normalize(...), $value);
    }
}
