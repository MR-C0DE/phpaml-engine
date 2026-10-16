<?php
declare(strict_types=1);
// Closed native date methods; reflection only, no application code executes.
$definitions = [];
foreach (['DateTime', 'DateTimeImmutable', 'DateTimeZone', 'DateTimeInterface', 'DateInterval', 'DatePeriod', 'InternalIterator', 'stdClass'] as $name) {
    $class = new ReflectionClass($name); $methods = []; $functions = []; $constants = [];
    foreach ($class->getConstants() as $key => $value) if (is_scalar($value)) $constants[$key] = ['owner' => $name, 'visibility' => 'public', 'value' => $value];
    $allowed = match ($name) {
        'DateTimeZone' => ['__construct', 'getName', 'getOffset'],
        'DateInterval' => ['__construct', 'format'],
        'DatePeriod' => ['createFromISO8601String', '__construct', 'getStartDate', 'getEndDate', 'getDateInterval', 'getRecurrences', 'getIterator'],
        'InternalIterator' => ['current', 'key', 'next', 'valid', 'rewind'],
        default => ['__construct', 'format', 'getTimestamp', 'getOffset', 'getTimezone', 'setTimestamp', 'setTimezone', 'modify', 'setDate', 'setTime', 'createFromInterface', 'createFromMutable', 'createFromImmutable', 'createFromFormat', 'getLastErrors', 'add', 'sub', 'diff'],
    };
    foreach ($allowed as $methodName) {
        if (!$class->hasMethod($methodName)) continue;
        $method = $class->getMethod($methodName); $id = '@date:' . strtolower($name . '::' . $methodName); $parameters = [];
        foreach ($method->getParameters() as $parameter) {
            $type = strtolower((string) $parameter->getType());
            $parameters[] = ['id' => 'v' . bin2hex($parameter->getName()), 'name' => $parameter->getName(), 'reference' => false, 'variadic' => false,
                'rule' => $type ? ['types' => explode('|', ltrim($type, '?')), 'nullable' => $parameter->allowsNull()] : null,
                ...($parameter->isDefaultValueAvailable() ? ['default' => $parameter->getDefaultValue()] : ($parameter->isOptional() ? ['default' => $parameter->getName() === 'options' ? 0 : null] : []))];
        }
        $methods[strtolower($methodName)] = ['name' => $methodName, 'id' => $id, 'owner' => $name, 'static' => $method->isStatic(), 'visibility' => 'public', 'abstract' => false, 'final' => false];
        $functions[$id] = ['name' => $name . '::' . $methodName, 'parameters' => $parameters, 'declared' => true, 'returnType' => null, 'nativeDate' => ['class' => $name, 'method' => strtolower($methodName)], 'body' => ['type' => 'sequence', 'actions' => []]];
    }
    $properties = [];
    foreach ($name === 'DateInterval' ? ['y','m','d','h','i','s','f','invert','days','from_string'] : ($name === 'DatePeriod' ? ['start','current','end','interval','recurrences','include_start_date','include_end_date'] : []) as $property) $properties[$property] = ['name' => $property, 'owner' => $name, 'visibility' => 'public', 'readonly' => $name === 'DatePeriod', 'rule' => null];
    $definitions[strtolower($name)] = ['class' => ['name' => $name, 'parent' => null, 'ancestors' => array_values($class->getInterfaceNames()), 'interface' => $class->isInterface(), 'abstract' => $class->isInterface() || $name === 'InternalIterator', 'final' => $class->isFinal(), 'properties' => $properties, 'staticProperties' => [], 'constants' => $constants, 'methods' => $methods, 'nativeDate' => $name !== 'stdClass'], 'functions' => $functions];
}
file_put_contents(__DIR__ . '/../src-js/core/date-definitions.json', json_encode($definitions, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
