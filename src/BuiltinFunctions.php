<?php

declare(strict_types=1);

namespace AML\Engine;

/** Closed list shared by View's compiler and its PHP simulator. */
final class BuiltinFunctions
{
    public const UTILITY = ['is_callable', 'function_exists', 'call_user_func', 'call_user_func_array', 'filter_var', 'filter_var_array'];
    public const INTROSPECTION = [
        'is_object', 'get_class', 'get_parent_class', 'get_called_class',
        'class_exists', 'enum_exists', 'interface_exists', 'method_exists', 'property_exists',
        'is_a', 'is_subclass_of', 'get_object_vars', 'get_class_methods',
    ];

    public const NAMES = [
        'ctype_alnum', 'ctype_alpha', 'ctype_cntrl', 'ctype_graph', 'ctype_lower', 'ctype_print', 'ctype_punct', 'ctype_space', 'ctype_upper', 'ctype_xdigit',
        'hash', 'hash_hmac', 'hash_equals', 'hash_algos', 'hash_hmac_algos',
        ...self::UTILITY,
        'get_debug_type', 'settype', 'get_defined_vars', 'compact', 'extract', 'rand', 'mt_rand', 'srand', 'mt_srand', 'getrandmax', 'mt_getrandmax',
        'preg_replace_callback_array', 'serialize', 'unserialize',
        ...self::INTROSPECTION,
        'parse_url', 'http_build_query', 'urlencode', 'urldecode', 'rawurlencode', 'rawurldecode', 'base64_encode', 'base64_decode',
        'grapheme_strlen', 'grapheme_substr', 'grapheme_str_split', 'grapheme_strpos', 'grapheme_stripos', 'grapheme_strrpos', 'grapheme_strripos', 'grapheme_strstr', 'grapheme_stristr', 'grapheme_extract',
        'numfmt_create', 'numfmt_format', 'numfmt_format_currency', 'numfmt_get_attribute', 'numfmt_set_attribute', 'numfmt_get_text_attribute', 'numfmt_set_text_attribute',
        'normalizer_normalize', 'normalizer_is_normalized', 'normalizer_get_raw_decomposition',
        'func_get_args', 'func_num_args', 'func_get_arg',
        'iterator_to_array', 'iterator_count', 'iterator_apply',
        'json_encode', 'json_decode', 'json_validate', 'json_last_error', 'json_last_error_msg',
        'preg_match', 'preg_match_all', 'preg_replace', 'preg_replace_callback', 'preg_filter', 'preg_split', 'preg_grep', 'preg_quote', 'preg_last_error', 'preg_last_error_msg',
        'time', 'microtime', 'date', 'gmdate', 'strtotime', 'mktime', 'gmmktime', 'checkdate', 'getdate', 'date_default_timezone_get', 'date_default_timezone_set',
        'date_create', 'date_create_immutable', 'date_format', 'date_timestamp_get', 'date_timestamp_set', 'date_modify', 'date_timezone_get', 'date_timezone_set', 'timezone_open', 'timezone_name_get', 'timezone_offset_get',
        'date_create_from_format', 'date_create_immutable_from_format', 'date_get_last_errors', 'date_diff', 'date_add', 'date_sub', 'date_interval_format',
        'strlen', 'str_contains', 'str_starts_with', 'str_ends_with', 'substr',
        'str_replace', 'explode', 'implode', 'strtolower', 'strtoupper',
        'ucfirst', 'lcfirst', 'ucwords', 'trim', 'ltrim', 'rtrim',
        'is_numeric', 'ctype_digit', 'abs', 'ceil', 'floor', 'round',
        'intdiv', 'random_int', 'number_format',
        'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'base_convert',
        'bindec', 'cos', 'cosh', 'decbin', 'dechex', 'decoct', 'deg2rad', 'exp', 'expm1',
        'fdiv', 'fmod', 'fpow', 'hexdec', 'hypot', 'is_finite', 'is_infinite', 'is_nan',
        'log', 'log10', 'log1p', 'max', 'min', 'octdec', 'pi', 'pow', 'rad2deg',
        'sin', 'sinh', 'sqrt', 'tan', 'tanh',
        'addcslashes', 'addslashes', 'bin2hex', 'chop', 'chr', 'chunk_split',
        'convert_uudecode', 'convert_uuencode', 'count_chars', 'crc32',
        'get_html_translation_table', 'hex2bin', 'html_entity_decode', 'htmlentities',
        'htmlspecialchars', 'htmlspecialchars_decode', 'join', 'levenshtein',
        'md5', 'metaphone', 'nl2br', 'ord', 'parse_str', 'printf', 'quoted_printable_decode',
        'quoted_printable_encode', 'quotemeta', 'sha1', 'similar_text', 'soundex',
        'sprintf', 'sscanf', 'str_decrement', 'str_getcsv', 'str_increment',
        'str_ireplace', 'str_pad', 'str_repeat', 'str_rot13', 'str_shuffle',
        'str_split', 'str_word_count', 'strcasecmp', 'strchr', 'strcmp', 'strcspn',
        'strip_tags', 'stripcslashes', 'stripos', 'stripslashes', 'stristr',
        'strnatcasecmp', 'strnatcmp', 'strncasecmp', 'strncmp', 'strpbrk', 'strpos',
        'strrchr', 'strrev', 'strripos', 'strrpos', 'strspn', 'strstr', 'strtok',
        'strtr', 'substr_compare', 'substr_count', 'substr_replace', 'vprintf', 'vsprintf', 'wordwrap',
        'array_all', 'array_any', 'array_change_key_case', 'array_chunk', 'array_column',
        'array_combine', 'array_count_values', 'array_diff', 'array_diff_assoc', 'array_diff_key',
        'array_diff_uassoc', 'array_diff_ukey', 'array_fill', 'array_fill_keys', 'array_filter',
        'array_find', 'array_find_key', 'array_flip', 'array_intersect', 'array_intersect_assoc',
        'array_intersect_key', 'array_intersect_uassoc', 'array_intersect_ukey', 'array_is_list',
        'array_key_exists', 'array_key_first', 'array_key_last', 'array_keys', 'array_map',
        'array_merge', 'array_merge_recursive', 'array_multisort', 'array_pad', 'array_pop',
        'array_product', 'array_push', 'array_rand', 'array_reduce', 'array_replace',
        'array_replace_recursive', 'array_reverse', 'array_search', 'array_shift', 'array_slice',
        'array_splice', 'array_sum', 'array_udiff', 'array_udiff_assoc', 'array_udiff_uassoc',
        'array_uintersect', 'array_uintersect_assoc', 'array_uintersect_uassoc', 'array_unique',
        'array_unshift', 'array_values', 'array_walk', 'array_walk_recursive', 'arsort', 'asort',
        'count', 'current', 'end', 'in_array', 'key', 'key_exists', 'krsort', 'ksort',
        'natcasesort', 'natsort', 'next', 'pos', 'prev', 'range', 'reset', 'rsort',
        'shuffle', 'sizeof', 'sort', 'uasort', 'uksort', 'usort',
        'print_r', 'var_export', 'gettype', 'intval', 'floatval', 'doubleval', 'strval', 'boolval',
        'is_array', 'is_bool', 'is_float', 'is_double', 'is_int', 'is_integer',
        'is_long', 'is_null', 'is_scalar', 'is_string', 'is_countable', 'is_iterable',
        'mb_strlen', 'mb_substr', 'mb_strpos', 'mb_strrpos', 'mb_stripos', 'mb_strripos',
        'mb_strstr', 'mb_stristr', 'mb_strrchr', 'mb_strrichr', 'mb_substr_count',
        'mb_strtolower', 'mb_strtoupper', 'mb_convert_case', 'mb_str_split', 'mb_strcut',
        'mb_strwidth', 'mb_strimwidth', 'mb_ord', 'mb_chr', 'mb_check_encoding', 'mb_scrub',
        'mb_str_pad', 'mb_ucfirst', 'mb_lcfirst', 'mb_trim', 'mb_ltrim', 'mb_rtrim',
        'bcadd', 'bcsub', 'bcmul', 'bcdiv', 'bcmod', 'bcdivmod', 'bcpowmod', 'bcpow',
        'bcsqrt', 'bccomp', 'bcscale', 'bcfloor', 'bcceil', 'bcround',
    ];

    public const HASH_ALGORITHMS = ['md5', 'sha1', 'ripemd160', 'sha224', 'sha256', 'sha384', 'sha512', 'sha512/224', 'sha512/256'];

    public static function validateOutputValue(mixed $value, int $depth = 0): void
    {
        if ($depth > 64) throw new \RangeException('Frontend output exceeds 64 nested levels');
        if (is_object($value) && !($value instanceof \UnitEnum && $value::class === 'RoundingMode')) throw new \TypeError('Frontend output supports scalars, arrays and RoundingMode; exception and closure internals are not available');
        if (is_resource($value)) throw new \TypeError('Frontend output cannot contain PHP resources');
        if (is_string($value) && strlen($value) > 1048576) throw new \RangeException('Frontend output exceeds 1 MiB');
        if (is_array($value)) {
            if (count($value) > 10000) throw new \RangeException('Frontend output arrays are limited to 10000 entries');
            foreach ($value as $part) self::validateOutputValue($part, $depth + 1);
        }
    }

    public static function reference(string $name, string|int $argument): bool
    {
        if (!in_array($name, self::NAMES, true) || !function_exists($name)) return false;
        $parameters = (new \ReflectionFunction($name))->getParameters();
        foreach ($parameters as $index => $parameter) {
            if ($argument === $parameter->getName() || is_int($argument) && ($argument === $index || $parameter->isVariadic() && $argument >= $index)) return $parameter->isPassedByReference();
        }
        return false;
    }

    public static function hasReferences(string $name): bool
    {
        if (!function_exists($name)) return false;
        foreach ((new \ReflectionFunction($name))->getParameters() as $parameter) if ($parameter->isPassedByReference()) return true;
        return false;
    }

    /** The browser's mbstring subset deliberately keeps strings in UTF-8. */
    public static function validateUnicodeCall(string $name, array $arguments, array $source = []): void
    {
        if (!str_starts_with($name, 'mb_')) return;
        if (!function_exists($name)) throw new \LogicException("{$name}() requires ext-mbstring and a PHP version providing this function");
        foreach ((new \ReflectionFunction($name))->getParameters() as $index => $parameter) {
            if ($parameter->getName() !== 'encoding') continue;
            $encoding = $arguments['encoding'] ?? $arguments[$index] ?? $source['mbEncoding'] ?? 'UTF-8';
            if (is_string($encoding) && !in_array(strtoupper($encoding), ['UTF-8', 'UTF8'], true)) throw new \ValueError("{$name}(): frontend Unicode functions support UTF-8 only; received {$encoding}");
        }
        if ($name === 'mb_check_encoding' && ($arguments['value'] ?? $arguments[0] ?? null) === null) throw new \ValueError('mb_check_encoding(): pass a string or array; PHP request-wide encoding checks are unavailable in the browser');
    }

    /** Bound native simulator allocations before entering the PHP extension. */
    public static function validateDecimalCall(string $name, array $arguments, int $defaultScale = 0, bool $strict = true): void
    {
        if (!function_exists($name)) throw new \LogicException("{$name}() requires ext-bcmath and a PHP version providing this function");
        $values = [];
        foreach ((new \ReflectionFunction($name))->getParameters() as $index => $parameter) {
            $key = $parameter->getName();
            $value = $arguments[$key] ?? $arguments[$index] ?? ($key === 'scale' ? $defaultScale : null);
            if (!$strict && in_array($key, ['scale', 'precision'], true) && (is_bool($value) || is_float($value) || is_string($value) && is_numeric($value))) $value = (int) $value;
            if (!$strict && in_array($key, ['num', 'num1', 'num2', 'exponent', 'modulus'], true) && is_scalar($value)) $value = (string) $value;
            $values[$key] = $value;
            if ($key === 'scale' && is_int($value)) {
                if ($value < 0 || $value > 2147483647) throw new \ValueError('BCMath scale must be between 0 and 2147483647');
                if ($value > 1000) throw new \RangeException('Frontend BCMath scale is limited to 1000');
            }
            if ($key === 'precision' && is_int($value) && abs($value) > 1000) throw new \RangeException('Frontend BCMath rounding precision is limited to ±1000');
            if (in_array($key, ['num', 'num1', 'num2', 'exponent', 'modulus'], true) && is_string($value)
                && (strlen($value) > 4098 || strlen(str_replace(['+', '-', '.'], '', $value)) > 4096)) throw new \RangeException('Frontend BCMath operands are limited to 4096 decimal digits');
        }
        // Apply PHP's C-string boundary before checking power sizes, too.
        foreach (['num', 'num1', 'num2', 'exponent', 'modulus'] as $key) if (is_string($values[$key] ?? null)) $values[$key] = explode("\0", $values[$key], 2)[0];
        if ($name === 'bcpow' && is_string($values['exponent'] ?? null) && preg_match('/^[+-]?\d*(?:\.0*)?$/D', $values['exponent'])) {
            $exponent = $values['exponent'];
            if (bccomp($exponent, '-9223372036854775808', 0) < 0 || bccomp($exponent, '9223372036854775807', 0) > 0) throw new \ValueError('bcpow(): exponent is out of range');
            if (abs((int) $exponent) > 10000) throw new \RangeException('Frontend bcpow exponent is limited to ±10000');
            if (is_string($values['num'] ?? null)) {
                $number = rtrim(str_contains($values['num'], '.') ? rtrim($values['num'], '0') : $values['num'], '.');
                if (strlen(ltrim($number, '+-0')) * abs((int) $exponent) > 16384) throw new \RangeException('BCMath intermediate exceeds 16384 decimal digits');
            }
        }
        if ($name === 'bcpowmod' && is_string($values['exponent'] ?? null) && is_string($values['modulus'] ?? null)) {
            $digits = strlen(ltrim($values['modulus'], '+-0'));
            if (strlen(ltrim($values['exponent'], '+0')) * 4 * $digits * $digits / 64 > 1000000) throw new \RangeException('Frontend BCMath work budget exceeded');
        }
    }
}
