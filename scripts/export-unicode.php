<?php

declare(strict_types=1);

// Regenerate with PHP 8.4 + mbstring. Tables are checked in; browsers need no extension.
// Probe mbstring itself, including its word boundaries, rather than the host ICU/JS version.
if (PHP_VERSION_ID < 80400 || !extension_loaded('mbstring')) throw new RuntimeException('Use PHP 8.4 with mbstring');
$bases = [4, 5, 6, 7, null, null, 4, 5];
$data = ['php' => PHP_VERSION, 'cases' => array_map(static fn ($base) => ['base' => $base, 'ranges' => [], 'special' => []], $bases), 'cased' => [], 'casedIgnorable' => [], 'ignorable' => [], 'wide' => [], 'trim' => []];
function rangePoint(array &$ranges, int $point, ?int $delta = null): void
{
    $last = count($ranges) - 1;
    if ($last >= 0 && $ranges[$last][1] === $point - 1 && ($delta === null || $ranges[$last][2] === $delta)) $ranges[$last][1] = $point;
    else $ranges[] = $delta === null ? [$point, $point] : [$point, $point, $delta];
}
for ($point = 0; $point <= 0x10ffff; $point++) {
    if ($point >= 0xd800 && $point <= 0xdfff) continue;
    $char = mb_chr($point, 'UTF-8');
    $conversions = [];
    for ($mode = 0; $mode < 8; $mode++) $conversions[$mode] = mb_convert_case($char, $mode, 'UTF-8');
    for ($mode = 0; $mode < 8; $mode++) {
        $converted = $conversions[$mode];
        // Full/simple and title/fold modes share most mappings. Keep only deltas.
        if ($converted === ($bases[$mode] === null ? $char : $conversions[$bases[$mode]])) continue;
        if (mb_strlen($converted, 'UTF-8') === 1) rangePoint($data['cases'][$mode]['ranges'], $point, mb_ord($converted, 'UTF-8') - $point);
        else $data['cases'][$mode]['special'][$point] = $converted;
    }
    // Cased+ignorable characters are deliberately classified as ignorable: both
    // title mode and contextual sigma skip them before examining a cased letter.
    if (str_ends_with(mb_convert_case($char . 'B', MB_CASE_TITLE, 'UTF-8'), 'b')) rangePoint($data['cased'], $point);
    elseif (str_ends_with(mb_convert_case('A' . $char . 'B', MB_CASE_TITLE, 'UTF-8'), 'b')) {
        rangePoint($data['ignorable'], $point);
        // Across its 64-code-point conversion buffer, PHP checks Cased before
        // Case_Ignorable. Probe that branch to retain the property intersection.
        if (mb_substr(mb_strtolower(str_repeat('A', 63) . 'Σ' . $char, 'UTF-8'), 63, 1, 'UTF-8') === 'σ') rangePoint($data['casedIgnorable'], $point);
    }
    if (mb_strwidth($char, 'UTF-8') === 2) rangePoint($data['wide'], $point);
    if (mb_trim($char, null, 'UTF-8') === '') rangePoint($data['trim'], $point);
}
file_put_contents(__DIR__ . '/../src-js/core/unicode-data.json', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
echo 'Exported Unicode tables from PHP ', PHP_VERSION, ".\n";
