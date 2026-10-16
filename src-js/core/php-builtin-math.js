import {arrayEntries, arrayKind, isPhpArray} from './php-arrays.js';
import {phpCompare} from './php-operators.js';
import {phpNumber, hasFloatNumericPrefix} from './php-values.js';
import {warn} from './diagnostics.js';
import {failure, limit} from './php-builtin-support.js';

const unary = Object.fromEntries(['acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'cos', 'cosh', 'exp', 'expm1', 'log10', 'log1p', 'sin', 'sinh', 'sqrt', 'tan', 'tanh'].map((name) => [name, Math[name]]));
const baseNumber = (input, base, context) => {
  input = input.trim().toLowerCase();
  if (base === 16 && input.startsWith('0x') || base === 2 && input.startsWith('0b') || base === 8 && input.startsWith('0o')) input = input.slice(2);
  let value = 0n, invalid = false;
  for (const char of input) {
    const digit = '0123456789abcdefghijklmnopqrstuvwxyz'.indexOf(char);
    if (digit < 0 || digit >= base) {invalid = true; continue;}
    value = value * BigInt(base) + BigInt(digit);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw limit('Base conversion exceeds the frontend safe integer range');
  }
  if (invalid) warn(context, 'Invalid characters passed for attempted conversion, these have been ignored', 'PHP_DEPRECATED');
  return Number(value);
};
export const runMath = (name, items, context) => {
  const [a, b, c] = items.map((item) => item.value);
  const floating = (value) => ({value, kind: 'double'});
  if (Object.hasOwn(unary, name)) return floating(unary[name](a));
  if (name === 'atan2') return floating(Math.atan2(a, b));
  if (name === 'hypot') return floating(Math.hypot(a, b));
  if (name === 'deg2rad') return floating(a * (Math.PI / 180));
  if (name === 'rad2deg') return floating(a * (180 / Math.PI));
  if (name === 'pi') return floating(Math.PI);
  if (name === 'log') {if (b <= 0) throw failure('ValueError', 'log(): base must be greater than 0'); return floating(b === Math.E ? Math.log(a) : Math.log(a) / Math.log(b));}
  if (name === 'fdiv') return floating(a / b);
  if (name === 'fmod') return floating(a % b);
  if (name === 'pow' || name === 'fpow') {
    const base = phpNumber(a, context), exponent = phpNumber(b, context);
    const floating = name === 'fpow' || items.some((item) => item.kind === 'double' || hasFloatNumericPrefix(item.value)) || exponent < 0;
    const value = base === 1 || base === -1 && !Number.isFinite(exponent) && !Number.isNaN(exponent) ? 1 : base ** exponent;
    if (!floating && exponent >= 0 && exponent <= 63 && Number.isFinite(value) && !Number.isSafeInteger(value)) {
      const exact = BigInt(base) ** BigInt(exponent);
      if (exact >= -9223372036854775808n && exact <= 9223372036854775807n) throw limit('pow(): integer result exceeds frontend safe precision');
    }
    return {value, kind: !floating && Number.isSafeInteger(value) ? 'integer' : 'double'};
  }
  if (name === 'is_finite') return {value: Number.isFinite(a), kind: 'boolean'};
  if (name === 'is_infinite') return {value: a === Infinity || a === -Infinity, kind: 'boolean'};
  if (name === 'is_nan') return {value: Number.isNaN(a), kind: 'boolean'};
  if (['min', 'max'].includes(name)) {
    const list = items.length === 1 ? isPhpArray(a) ? arrayEntries(a).map(([key, value]) => ({value, kind: arrayKind(a, key)})) : null : items;
    if (!list) throw new TypeError(`${name}(): a single argument must be an array`);
    if (!list.length) throw failure('ValueError', `${name}(): array must not be empty`);
    return list.reduce((best, item) => phpCompare(item.value, best.value, item.kind, best.kind) * (name === 'max' ? 1 : -1) > 0 ? item : best);
  }
  if (['decbin', 'dechex', 'decoct'].includes(name)) return {value: BigInt.asUintN(64, BigInt(a)).toString({decbin: 2, dechex: 16, decoct: 8}[name]), kind: 'string'};
  if (['bindec', 'hexdec', 'octdec'].includes(name)) return {value: baseNumber(a, {bindec: 2, hexdec: 16, octdec: 8}[name], context), kind: 'integer'};
  if (name === 'base_convert') {
    if (b < 2 || b > 36 || c < 2 || c > 36) throw failure('ValueError', 'base_convert(): bases must be between 2 and 36');
    return {value: baseNumber(a, b, context).toString(c), kind: 'string'};
  }
  return null;
};
