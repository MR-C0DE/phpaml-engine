<?php

declare(strict_types=1);

namespace AML\Engine;

final class FileAction implements ClientInstruction
{
    private ?string $source;
    private ?string $result = null;
    private ?string $error = null;
    private ?string $loading = null;
    private int $index = 0;
    private int $maxBytes = 1_048_576;
    private string $delimiter = ',';
    private bool $pretty = true;
    private bool $spreadsheetSafe = true;

    public function __construct(private string $operation, private string $format, ?string $input = null, private mixed $value = null, private string $filename = 'document.txt')
    {
        if (!in_array($operation, ['read', 'download'], true) || !in_array($format, ['text', 'json', 'csv'], true)) throw new \InvalidArgumentException('Unknown browser file operation or format.');
        if ($filename === '' || strlen($filename) > 240 || in_array($filename, ['.', '..'], true) || preg_match('~[\\\\/:*?"<>|\x00-\x1F\x7F]~', $filename) || preg_match('/[. ]$/', $filename)) throw new \InvalidArgumentException('A download filename must be a plain filename, without a path or control characters.');
        $this->source = $input === null ? null : BrowserFiles::source($input);
    }

    public function storeIn(string $state): self
    {
        if ($this->operation !== 'read') throw new \LogicException('Only a file read can store a result.');
        $clone = clone $this; $clone->result = StateNamespace::qualify($state); return $clone;
    }
    public function errorIn(string $state): self { $clone = clone $this; $clone->error = StateNamespace::qualify($state); return $clone; }
    public function loadingIn(string $state): self { $clone = clone $this; $clone->loading = StateNamespace::qualify($state); return $clone; }
    public function fileAt(int $index): self
    {
        if ($index < 0 || $index > 999 || $this->operation !== 'read') throw new \InvalidArgumentException('File index must be between 0 and 999 for a read.');
        $clone = clone $this; $clone->index = $index; return $clone;
    }
    public function maxBytes(int $bytes): self
    {
        if ($bytes < 1 || $bytes > 16_777_216) throw new \InvalidArgumentException('File size limit must be between 1 and 16777216 bytes.');
        $clone = clone $this; $clone->maxBytes = $bytes; return $clone;
    }
    public function separator(string $separator): self
    {
        if ($this->format !== 'csv' || strlen($separator) !== 1 || !preg_match('/^[\x20-\x7E\t]$/', $separator) || $separator === '"') throw new \InvalidArgumentException('CSV separator must be one printable ASCII character (except a quote) or a tab.');
        $clone = clone $this; $clone->delimiter = $separator; return $clone;
    }
    public function pretty(bool $enabled = true): self { $clone = clone $this; $clone->pretty = $enabled; return $clone; }
    public function spreadsheetSafe(bool $enabled = true): self { $clone = clone $this; $clone->spreadsheetSafe = $enabled; return $clone; }

    public function json(): string
    {
        if ($this->operation === 'read' && $this->result === null) throw new \LogicException('A browser file read requires storeIn().');
        $targets = array_values(array_filter([$this->result, $this->error, $this->loading], static fn ($target) => $target !== null));
        foreach ($targets as $i => $target) foreach (array_slice($targets, $i + 1) as $other) {
            if ($target === $other || str_starts_with($target, $other . '.') || str_starts_with($other, $target . '.')) throw new \InvalidArgumentException('File result, error and loading state paths must not overlap.');
        }
        return json_encode([
            'type' => 'file', 'operation' => $this->operation, 'format' => $this->format,
            'source' => $this->source, 'index' => $this->index, 'result' => $this->result,
            'error' => $this->error, 'loading' => $this->loading, 'maxBytes' => $this->maxBytes,
            'separator' => $this->delimiter, 'pretty' => $this->pretty, 'spreadsheetSafe' => $this->spreadsheetSafe,
            'filename' => $this->filename, 'value' => self::normalize($this->value),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private static function normalize(mixed $value, int $depth = 0): array
    {
        if ($depth > 64) throw new \InvalidArgumentException('File data exceeds 64 nesting levels.');
        if ($value instanceof StateRef || $value instanceof StateExpression || $value instanceof StateConditional || $value instanceof EventRef) {
            return ['expression' => json_decode(ConsoleAction::log($value)->json(), true, 512, JSON_THROW_ON_ERROR)['values'][0]];
        }
        if (is_array($value)) {
            $items = [];
            foreach ($value as $key => $item) {
                if (in_array(strtolower((string) $key), ['__proto__', 'prototype', 'constructor'], true)) throw new \InvalidArgumentException("Reserved client data key: {$key}");
                $items[$key] = self::normalize($item, $depth + 1);
            }
            return ['items' => $items];
        }
        if (!is_scalar($value) && $value !== null) throw new \InvalidArgumentException('File data must contain scalar values, arrays or state expressions.');
        if ((is_int($value) && abs($value) > 9_007_199_254_740_991) || (is_float($value) && !is_finite($value))) throw new \InvalidArgumentException('File data contains a number that cannot be represented safely in the browser.');
        return ['literal' => $value];
    }
}
