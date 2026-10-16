import {arrayEntries, isPhpArray} from './php-arrays.js';

export const failure = (name, message) => Object.assign(new Error(message), {name});
export const limit = (message) => Object.assign(new RangeError(message), {code: 'PHP_BUILTIN_LIMIT'});
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
export const bytes = (value) => encoder.encode(value);
export const text = (value) => {
  try {return decoder.decode(value);}
  catch {throw Object.assign(new RangeError('This byte operation produced invalid UTF-8; frontend strings must remain valid UTF-8'), {code: 'PHP_INVALID_UTF8'});}
};
export const bounded = (value) => {
  if (value.length > 1048576 || bytes(value).length > 1048576) throw limit('Frontend string result exceeds 1 MiB');
  return value;
};
export const arrayLimit = (size) => {if (size > 10000) throw limit('Frontend arrays are limited to 10000 pieces');};
export const validateResult = (value, depth = 0) => {
  if (depth > 64) throw limit('Frontend builtin result exceeds 64 nested levels');
  if (typeof value === 'string') bounded(value);
  if (isPhpArray(value)) {const entries = arrayEntries(value); arrayLimit(entries.length); for (const [, part] of entries) validateResult(part, depth + 1);}
};
export const asciiUpper = (value) => value.replace(/[a-z]/g, (letter) => letter.toUpperCase());
export const asciiLower = (value) => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
export const work = (context, amount = 1) => {
  const budget = context.builtinBudget ||= {remaining: 1000000};
  if ((budget.remaining -= amount) < 0) throw limit('Frontend builtin work budget exceeded');
};
export const byteString = (value) => {const input = bytes(value); let result = ''; for (let start = 0; start < input.length; start += 8192) result += String.fromCharCode(...input.subarray(start, start + 8192)); return result;};
export const fromByteString = (value) => text(Uint8Array.from(value, (char) => char.charCodeAt(0)));
// Decimal rendering of the actual binary double, with round-to-even ties.
export const fixedDecimal = (value, digits) => {
  const buffer = new DataView(new ArrayBuffer(8)); buffer.setFloat64(0, Math.abs(value));
  const bits = buffer.getBigUint64(0), exponent = Number(bits >> 52n) & 2047;
  const mantissa = (bits & ((1n << 52n) - 1n)) + (exponent ? 1n << 52n : 0n), shift = (exponent || 1) - 1023 - 52;
  let numerator = mantissa * 10n ** BigInt(digits), denominator = 1n;
  if (shift >= 0) numerator <<= BigInt(shift); else denominator <<= BigInt(-shift);
  let integer = numerator / denominator; const remainder = numerator % denominator;
  if (remainder * 2n > denominator || remainder * 2n === denominator && integer % 2n !== 0n) integer++;
  const all = integer.toString().padStart(digits + 1, '0');
  return digits ? all.slice(0, -digits) + '.' + all.slice(-digits) : all;
};
export const naturalCompare = (a, b, insensitive = false) => {
  a = byteString(insensitive ? asciiLower(a) : a); b = byteString(insensitive ? asciiLower(b) : b);
  let i = 0, j = 0;
  while (true) {
    while (/\s/.test(a[i] || '') && i < a.length) i++;
    while (/\s/.test(b[j] || '') && j < b.length) j++;
    if (/[0-9]/.test(a[i] || '') && /[0-9]/.test(b[j] || '')) {
      const x = a.slice(i).match(/^\d+/)[0], y = b.slice(j).match(/^\d+/)[0];
      const difference = x[0] === '0' || y[0] === '0' ? (x < y ? -1 : x > y ? 1 : 0) : x.length - y.length || (x < y ? -1 : x > y ? 1 : 0);
      if (difference) return Math.sign(difference);
      i += x.length; j += y.length; continue;
    }
    if (i === a.length || j === b.length) return Math.sign((i < a.length ? 1 : 0) - (j < b.length ? 1 : 0));
    if (a[i] !== b[j]) return a[i] < b[j] ? -1 : 1;
    i++; j++;
  }
};
