import {isPhpObject} from './php-object-values.js';
import {arrayEntries, arrayKind, isPhpArray} from './php-arrays.js';
import {phpType, phpString, floatString} from './php-values.js';
import {isRoundingMode} from './php-rounding-mode.js';
import {bytes, limit, work} from './php-builtin-support.js';

// PHP's explicit significant-digit precision rounds ties to even and retains
// low digits that would disappear if the formatted value were parsed again.
const preciseFloat = (value, precision) => {
  if (precision === -1 || !Number.isFinite(value) || value === 0) return floatString(value);
  let exponent = Number(Math.abs(value).toExponential().split('e')[1]);
  const buffer = new DataView(new ArrayBuffer(8)); buffer.setFloat64(0, Math.abs(value));
  const bits = buffer.getBigUint64(0), binaryExponent = Number(bits >> 52n) & 2047;
  let numerator = (bits & ((1n << 52n) - 1n)) + (binaryExponent ? 1n << 52n : 0n), denominator = 1n;
  const shift = (binaryExponent || 1) - 1023 - 52, places = precision - exponent - 1;
  if (shift >= 0) numerator <<= BigInt(shift); else denominator <<= BigInt(-shift);
  if (places >= 0) numerator *= 10n ** BigInt(places); else denominator *= 10n ** BigInt(-places);
  let integer = numerator / denominator; const remainder = numerator % denominator;
  if (remainder * 2n > denominator || remainder * 2n === denominator && integer % 2n !== 0n) integer++;
  let digits = integer.toString();
  if (digits.length > precision) exponent++;
  digits = digits.replace(/0+$/, '');
  const sign = value < 0 ? '-' : '';
  if (exponent < -4 || exponent >= precision) return sign + digits[0] + '.' + (digits.slice(1) || '0') + 'E' + (exponent >= 0 ? '+' : '') + exponent;
  const point = exponent + 1;
  return sign + (point <= 0 ? '0.' + '0'.repeat(-point) + digits : point >= digits.length ? digits.padEnd(point, '0') : digits.slice(0, point) + '.' + digits.slice(point));
};

// Build bounded output before logging, so a failed conversion has no partial output.
export const runOutput = (name, items, context) => {
  if (!['print_r', 'var_export'].includes(name)) return null;
  const returning = items[1].value;
  if (context.readOnly && !returning) throw new Error('Reactive text requires return: true for print_r() and var_export()');
  const exporting = name === 'var_export', parts = []; let length = 0;
  const append = (text) => {
    const size = bytes(text).length; work(context, size);
    if ((length += size) > 1048576) throw limit('Frontend output exceeds 1 MiB');
    parts.push(text);
  };
  const quote = (value) => "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\0/g, "' . \"\\0\" . '") + "'";
  const render = (value, kind, depth = 0) => {
    if (depth > 64) throw limit('Frontend output exceeds 64 nested levels');
    work(context);
    if (isRoundingMode(value)) {
      append(exporting ? `\\RoundingMode::${value.name}` : `RoundingMode Enum\n${' '.repeat(depth * 8)}(\n${' '.repeat(depth * 8 + 4)}[name] => ${value.name}\n${' '.repeat(depth * 8)})\n`);
    } else if (value instanceof Error || isPhpObject(value) || typeof value === 'function') {
      throw new TypeError(`${name}(): frontend output supports scalars, arrays and RoundingMode; exception and closure internals are not available`);
    } else if (isPhpArray(value)) {
      const entries = arrayEntries(value);
      if (entries.length > 10000) throw limit('Frontend output arrays are limited to 10000 entries');
      if (exporting) {
        append('array (\n');
        for (const [key, item] of entries) {
          append(' '.repeat(depth * 2 + 2) + (typeof key === 'string' ? quote(key) : String(key)) + ' => ');
          if (isPhpArray(item) || isRoundingMode(item)) append('\n' + ' '.repeat(depth * 2 + 2));
          render(item, arrayKind(value, key), depth + 1); append(',\n');
        }
        append(' '.repeat(depth * 2) + ')');
      } else {
        append('Array\n' + ' '.repeat(depth * 8) + '(\n');
        for (const [key, item] of entries) {
          append(' '.repeat(depth * 8 + 4) + `[${key}] => `);
          render(item, arrayKind(value, key), depth + 1); append('\n');
        }
        append(' '.repeat(depth * 8) + ')\n');
      }
    } else if (kind === 'double') {
      const precision = exporting ? context.source?.serializePrecision ?? -1 : context.source?.precision ?? 14;
      if (precision !== -1 && (!Number.isInteger(precision) || precision < 1 || precision > 100)) throw limit('Frontend output precision must be -1 or between 1 and 100');
      let result = preciseFloat(value, precision);
      if (exporting && Number.isFinite(value) && !/[.E]/.test(result)) result += '.0';
      append(result);
    } else if (exporting) {
      append(kind === 'NULL' ? 'NULL' : kind === 'boolean' ? (value ? 'true' : 'false') : kind === 'string' ? quote(value) : String(value));
    } else append(phpString(value, kind, context));
  };
  render(items[0].value, items[0].kind ?? phpType(items[0].value));
  const output = parts.join('');
  if (returning) return {value: output, kind: 'string'};
  if (output !== '') console.log(output);
  return exporting ? {value: null, kind: 'NULL'} : {value: true, kind: 'boolean'};
};
