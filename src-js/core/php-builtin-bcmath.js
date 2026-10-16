import {failure, limit, work} from './php-builtin-support.js';
import {phpType} from './php-values.js';

// Decimal values never pass through Number: n * 10^-s, with a signed BigInt n.
const MAX_DIGITS = 4096, MAX_SCALE = 1000, MAX_INTERMEDIATE = 16384;
const abs = (n) => n < 0n ? -n : n;
const digits = (n) => abs(n).toString().length;
const invalid = (message) => {throw failure('ValueError', message);};
const zeroDivision = () => {throw failure('DivisionByZeroError', 'Division by zero');};
const size = (n) => {if (n > MAX_INTERMEDIATE) throw limit('BCMath intermediate exceeds 16384 decimal digits');};
const scaleOf = (scale) => {
  if (scale < 0 || scale > 2147483647) invalid('BCMath scale must be between 0 and 2147483647');
  if (scale > MAX_SCALE) throw limit('Frontend BCMath scale is limited to 1000');
  return scale;
};
const power10 = (exponent, context) => {size(exponent + 1); work(context, exponent + 1); return 10n ** BigInt(exponent);};
const parse = (value, name, context) => {
  if (value.length > MAX_DIGITS + 2) throw limit('Frontend BCMath operands are limited to 4096 decimal digits');
  work(context, value.length + 1);
  // PHP's BCMath parser reads a C string: the first NUL terminates the operand.
  const nul = value.indexOf('\0'); if (nul !== -1) value = value.slice(0, nul);
  // An absolute end assertion also rejects a final newline (JS '$' alone does not).
  if (!/^[+-]?\d*(?:\.\d*)?(?![\s\S])/.test(value)) invalid(`${name}(): argument is not a well-formed BCMath numeric string`);
  const negative = value[0] === '-', parts = value.replace(/^[+-]/, '').split('.');
  if (parts.join('').length > MAX_DIGITS) throw limit('Frontend BCMath operands are limited to 4096 decimal digits');
  const fraction = (parts[1] || '').replace(/0+$/, ''), raw = (parts[0] + fraction).replace(/^0+/, '') || '0';
  return {n: BigInt((negative ? '-' : '') + raw), s: fraction.length};
};
const multiply = (a, b, context) => {
  const x = digits(a), y = digits(b); size(x + y); work(context, Math.ceil(x * y / 64));
  return a * b;
};
const divide = (a, b, context) => {
  if (b === 0n) zeroDivision();
  work(context, Math.ceil(digits(a) * digits(b) / 64)); return a / b;
};
const shift = (n, places, context) => {
  if (n === 0n || places === 0) return n;
  if (places < 0) return -places >= digits(n) ? 0n : divide(n, power10(-places, context), context);
  size(digits(n) + places); return multiply(n, power10(places, context), context);
};
const fixed = (n, scale) => {
  const negative = n < 0n, raw = abs(n).toString().padStart(scale + 1, '0');
  size(raw.length);
  return (negative ? '-' : '') + (scale ? raw.slice(0, -scale) + '.' + raw.slice(-scale) : raw);
};
const format = (a, scale, context) => fixed(shift(a.n, scale - a.s, context), scale);
const align = (a, b, context) => {
  const scale = Math.max(a.s, b.s);
  return [shift(a.n, scale - a.s, context), shift(b.n, scale - b.s, context), scale];
};
const quotient = (a, b, scale, context) => {
  const places = b.s - a.s + scale;
  return places >= 0 ? divide(shift(a.n, places, context), b.n, context) : divide(a.n, shift(b.n, -places, context), context);
};
const integerRoot = (n, context) => {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  while (true) {const next = (x + divide(n, x, context)) >> 1n; if (next >= x) return x; x = next;}
};
const round = (a, precision, mode, context) => {
  if (Math.abs(precision) > MAX_SCALE) throw limit('Frontend BCMath rounding precision is limited to ±1000');
  if (precision >= a.s) return format(a, precision, context);
  const factor = power10(a.s - precision, context), truncated = divide(a.n, factor, context), remainder = abs(a.n % factor);
  const comparison = remainder * 2n - factor;
  const increase = remainder !== 0n && (mode === 'AwayFromZero' || mode === 'NegativeInfinity' && a.n < 0n || mode === 'PositiveInfinity' && a.n > 0n
    || mode.startsWith('Half') && (comparison > 0n || comparison === 0n && (mode === 'HalfAwayFromZero' || mode === 'HalfEven' && truncated % 2n !== 0n || mode === 'HalfOdd' && truncated % 2n === 0n)));
  const rounded = truncated + (increase ? a.n < 0n ? -1n : 1n : 0n);
  return precision < 0 ? fixed(shift(rounded, -precision, context), 0) : fixed(rounded, precision);
};

export const runBCMath = (name, items, context, parameters) => {
  if (!name.startsWith('bc')) return null;
  const [a, b, c] = items.map((item) => item.value), result = (value) => ({value, kind: phpType(value)});
  const memory = context.builtinMemory ||= {};
  const defaultScale = () => memory.bcScale ?? context.source?.bcScale ?? 0;
  if (name === 'bcscale') {
    const previous = scaleOf(defaultScale());
    if (a !== null) {
      if (context.readOnly) throw new Error('Reactive text cannot change bcscale(); pass an explicit scale to the calculation');
      memory.bcScale = scaleOf(a);
    }
    return result(previous);
  }
  const scaleIndex = parameters.findIndex((parameter) => parameter.name === 'scale');
  const scale = scaleIndex < 0 ? 0 : scaleOf(items[scaleIndex].value ?? defaultScale());
  const x = parse(a, name, context);
  if (name === 'bcround') return result(round(x, b, c.name, context));
  if (name === 'bcfloor' || name === 'bcceil') return result(round(x, 0, name === 'bcfloor' ? 'NegativeInfinity' : 'PositiveInfinity', context));
  if (name === 'bcsqrt') {
    if (x.n < 0n) invalid('bcsqrt(): argument must be greater than or equal to 0');
    return result(fixed(integerRoot(shift(x.n, 2 * scale - x.s, context), context), scale));
  }
  const y = parse(b, name, context);
  if (name === 'bccomp') {
    const left = shift(x.n, scale - x.s, context), right = shift(y.n, scale - y.s, context);
    return result(left < right ? -1 : left > right ? 1 : 0);
  }
  if (name === 'bcadd' || name === 'bcsub') {
    const [left, right, s] = align(x, y, context);
    return result(format({n: name === 'bcadd' ? left + right : left - right, s}, scale, context));
  }
  if (name === 'bcmul') return result(format({n: multiply(x.n, y.n, context), s: x.s + y.s}, scale, context));
  if (name === 'bcdiv') return result(fixed(quotient(x, y, scale, context), scale));
  if (name === 'bcmod' || name === 'bcdivmod') {
    const [left, right, s] = align(x, y, context), quotient = divide(left, right, context);
    const remainder = format({n: left % right, s}, scale, context);
    return result(name === 'bcmod' ? remainder : [quotient.toString(), remainder]);
  }
  if (name === 'bcpowmod') {
    const modulus = parse(c, name, context);
    if (x.s || y.s || modulus.s) invalid('bcpowmod(): arguments must have no fractional part');
    if (y.n < 0n) invalid('bcpowmod(): exponent must be greater than or equal to 0');
    if (modulus.n === 0n) zeroDivision();
    let factor = x.n % modulus.n, exponent = y.n, output = 1n % modulus.n;
    while (exponent > 0n) {
      work(context); if (exponent & 1n) output = multiply(output, factor, context) % modulus.n;
      exponent >>= 1n; if (exponent) factor = multiply(factor, factor, context) % modulus.n;
    }
    return result(format({n: output, s: 0}, scale, context));
  }
  if (name === 'bcpow') {
    if (y.s) invalid('bcpow(): exponent must have no fractional part');
    if (y.n < -9223372036854775808n || y.n > 9223372036854775807n) invalid('bcpow(): exponent is out of range');
    if (abs(y.n) > 10000n) throw limit('Frontend bcpow exponent is limited to ±10000');
    if (x.n === 0n && y.n < 0n) {if ((context.source?.phpVersion ?? 80400) >= 80400) zeroDivision(); return result(fixed(0n, scale));}
    let factor = x.n, exponent = abs(y.n), output = 1n;
    const s = x.s * Number(exponent); size(s);
    while (exponent > 0n) {
      work(context); if (exponent & 1n) output = multiply(output, factor, context);
      exponent >>= 1n; if (exponent) factor = multiply(factor, factor, context);
    }
    return result(y.n < 0n ? fixed(quotient({n: 1n, s: 0}, {n: output, s}, scale, context), scale) : format({n: output, s}, scale, context));
  }
  return null;
};
