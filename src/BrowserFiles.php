<?php

declare(strict_types=1);

namespace AML\Engine;

/** Local browser files selected by the user; no server filesystem or HTTP request. */
final class BrowserFiles
{
    public static function readText(?string $input = null): FileAction { return new FileAction('read', 'text', $input); }
    public static function readJson(?string $input = null): FileAction { return new FileAction('read', 'json', $input); }
    public static function readCsv(?string $input = null, string $separator = ','): FileAction { return (new FileAction('read', 'csv', $input))->separator($separator); }
    public static function downloadText(mixed $value, string $filename = 'document.txt'): FileAction { return new FileAction('download', 'text', value: $value, filename: $filename); }
    public static function downloadJson(mixed $value, string $filename = 'data.json'): FileAction { return new FileAction('download', 'json', value: $value, filename: $filename); }
    public static function downloadCsv(mixed $rows, string $filename = 'data.csv', string $separator = ','): FileAction { return (new FileAction('download', 'csv', value: $rows, filename: $filename))->separator($separator); }

    /** Shared with View's FileInput to isolate identically named component inputs. */
    public static function source(string $input): string
    {
        if ($input === '' || strlen($input) > 256 || preg_match('/[\x00-\x1F\x7F]/', $input)) throw new \InvalidArgumentException('A browser file input needs a nonempty name of at most 256 bytes.');
        return StateNamespace::qualify('__files') . ':' . $input;
    }
}
