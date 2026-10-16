<?php

declare(strict_types=1);

// Refresh the checked-in browser signatures with PHP 8.4; no application code runs.
require __DIR__ . '/../src/BuiltinFunctions.php';
$result = [];
foreach (AML\Engine\BuiltinFunctions::NAMES as $name) {
    if (!function_exists($name)) throw new RuntimeException("Use PHP 8.4 to export {$name}");
    $result[$name] = [];
    foreach ((new ReflectionFunction($name))->getParameters() as $parameter) {
        $type = (string) $parameter->getType() ?: 'mixed';
        $type = str_replace(in_array($name, ['count', 'sizeof', 'http_build_query'], true) ? [] : (in_array($name, AML\Engine\BuiltinFunctions::INTROSPECTION, true) ? ['Countable|', 'RoundingMode|'] : ['Countable|', 'object|', 'RoundingMode|']), '', $type);
        $entry = ['name' => $parameter->getName(), 'types' => $type];
        if ($parameter->isDefaultValueAvailable()) {
            $default = $parameter->getDefaultValue();
            if ($default instanceof UnitEnum) $default = $name === 'bcround' ? ['roundingMode' => $default->name] : 1;
            $entry['default'] = is_int($default) ? max(-9007199254740991, min(9007199254740991, $default)) : $default;
        } elseif ($parameter->isOptional() && !$parameter->isVariadic()) $entry['optional'] = true;
        if ($parameter->isVariadic()) $entry['variadic'] = true;
        if ($parameter->isPassedByReference()) $entry['reference'] = true;
        $result[$name][] = $entry;
    }
}
file_put_contents(__DIR__ . '/../src-js/core/builtin-signatures.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
