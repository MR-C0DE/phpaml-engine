<?php

declare(strict_types=1);

namespace AML\Engine;

/** Dependencies of compiled frontend instructions; never evaluates user code. */
final class FrontendModules
{
    public static function required(array $instruction): array
    {
        static $catalogue = null, $callbacks = null, $functions = [], $classes = [];
        $catalogue ??= json_decode((string) file_get_contents(dirname(__DIR__) . '/src-js/modules/catalogue.json'), true, 512, JSON_THROW_ON_ERROR);
        $callbacks ??= json_decode((string) file_get_contents(dirname(__DIR__) . '/src-js/modules/callables.json'), true, 512, JSON_THROW_ON_ERROR);
        $needed = [];
        $add = static function (string $name) use (&$add, &$needed, $catalogue): void {
            if (!isset($catalogue[$name]) || isset($needed[$name])) return;
            $needed[$name] = true;
            foreach ($catalogue[$name]['dependencies'] as $dependency) $add($dependency);
        };
        if ($functions === []) foreach ($catalogue as $module => $definition) {
            foreach ($definition['functions'] as $name) $functions[$name] = $module;
            foreach ($definition['classes'] as $name) $classes[$name] = $module;
        }
        $all = static function () use ($catalogue, $add): void {foreach ($catalogue as $name => $definition) if (($definition['kind'] ?? 'php') !== 'browser') $add($name);};
        $builtin = static function (mixed $name, array $arguments = []) use ($functions, $callbacks, $add, $all): void {
            if (!is_string($name)) return;
            $name = strtolower(ltrim($name, '\\'));
            if (isset($functions[$name])) $add($functions[$name]);
            if (isset($callbacks[$name])) foreach ($arguments as $argument) if (!empty($argument['spread'])) $all();
            foreach ($callbacks[$name] ?? [] as $parameter) {
                $index = $parameter['index'] < 0 ? count($arguments) + $parameter['index'] : $parameter['index'];
                $argument = $arguments[$index] ?? [];
                foreach ($arguments as $candidate) if (isset($candidate['name']) && $candidate['name'] === $parameter['name']) $argument = $candidate;
                $value = $argument['value'] ?? null;
                if (is_string($value) && isset($functions[strtolower(ltrim($value, '\\'))])) $add($functions[strtolower(ltrim($value, '\\'))]);
                elseif (is_array($value) && !in_array($value['$expression']['operation'] ?? '', ['closure', 'functionRef'], true)) $all();
            }
            if (in_array($name, ['filter_var', 'filter_var_array'], true)) {
                $add('regex');
                $optionsIndex = $name === 'filter_var_array' ? 1 : 2;
                foreach ($arguments as $index => $argument) if (!empty($argument['spread']) || $index === $optionsIndex || ($argument['name'] ?? '') === 'options') $all();
            }
        };
        $visit = static function (array $node) use (&$visit, $add, $all, $builtin, $classes): void {
            if (($node['type'] ?? null) === 'file') $add('files');
            if (($node['type'] ?? null) === 'api') $add('browser');
            foreach (['nativeDate' => 'date', 'nativeIntl' => 'intl', 'nativeSpl' => 'spl', 'nativeReflection' => 'reflection'] as $flag => $module) if (!empty($node[$flag])) $add($module);
            if (isset($node['builtin'])) $builtin($node['builtin']);
            $expression = $node['$expression'] ?? null;
            if (is_array($expression)) {
                $operation = $expression['operation'] ?? ''; $left = $expression['left'] ?? null; $right = $expression['right'] ?? null;
                if ($operation === 'builtin' || $operation === 'call' && is_string($left)) $builtin($left, $right['arguments'] ?? []);
                if ($operation === 'call' && !is_string($left) && !in_array($left['$expression']['operation'] ?? '', ['closure', 'functionRef'], true)) $all();
                if ($operation === 'eval' && empty($right['program'])) $all();
                if ($operation === 'splMethod') $add('spl');
                if (is_string($left) && in_array($operation, ['objectNew', 'objectCall', 'objectConstant', 'objectStaticProperty', 'isObject'], true) && isset($classes[strtolower(ltrim($left, '\\'))])) $add($classes[strtolower(ltrim($left, '\\'))]);
            }
            foreach ($node as $value) if (is_array($value)) $visit($value);
        };
        $visit($instruction);
        return array_values(array_filter(array_keys($catalogue), static fn ($name) => isset($needed[$name])));
    }
}
