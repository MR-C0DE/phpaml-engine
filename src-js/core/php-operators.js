import {isPhpObject, objectData} from './php-object-values.js';
import {arrayEntries, arrayKind} from './php-arrays.js';
import {phpBool, phpType, phpString, phpNumber, phpArithmetic} from './php-values.js';
import {bytes, text} from './php-builtin-support.js';
import {warn} from './diagnostics.js';
import {isRoundingMode} from './php-rounding-mode.js';
import {dateStorage} from './php-date-values.js';

export const numericString = (value) => typeof value === 'string' && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);
export const compareStrings = (left, right) => {
  const a = new TextEncoder().encode(left), b = new TextEncoder().encode(right);
  for (let index = 0; index < Math.min(a.length, b.length); index++) if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
};

const compareNumbers = (left, right, leftType, rightType) => {
  const operand = (value, kind) => {
    if (typeof value === 'number') return kind === 'integer' && Number.isSafeInteger(value) ? BigInt(value) : value;
    if (/^[\t\n\r\f\v ]*[+-]?\d+[\t\n\r\f\v ]*$/.test(value)) {
      const integer = BigInt(value.trim());
      if (integer >= -9223372036854775808n && integer <= 9223372036854775807n) return integer;
    }
    return Number(value);
  };
  let a = operand(left, leftType), b = operand(right, rightType);
  // PHP compares an int and a float as floats. Two integer strings stay exact.
  if (typeof a !== 'bigint' || typeof b !== 'bigint') {a = Number(a); b = Number(b);}
  return Number.isNaN(a) || Number.isNaN(b) ? NaN : a === b ? 0 : a < b ? -1 : 1;
};

export const phpIdentical = (left, right, leftType = phpType(left), rightType = phpType(right)) => {
  if (leftType !== rightType) return false;
  if (isPhpObject(left) || isPhpObject(right) || isRoundingMode(left) || isRoundingMode(right)) return left === right;
  if (left instanceof Error || right instanceof Error) return left === right;
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const a = arrayEntries(left), b = arrayEntries(right);
    return a.length === b.length && a.every(([key, value], index) => key === b[index][0] && phpIdentical(value, b[index][1], arrayKind(left, key), arrayKind(right, b[index][0])));
  }
  return left === right;
};

// PHP 8 scalar comparison rules: numeric strings, bool/null conversion and UTF-8 byte ordering.
let objectComparisonDepth = 0;
export const phpCompare = (left, right, leftType = phpType(left), rightType = phpType(right)) => {
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    const a = phpBool(left), b = phpBool(right); return a === b ? 0 : a ? 1 : -1;
  }
  if (left == null || right == null) {
    if (typeof left === 'string' || typeof right === 'string') return compareStrings(left ?? '', right ?? '');
    const a = phpBool(left), b = phpBool(right); return a === b ? 0 : a ? 1 : -1;
  }
  if (isPhpObject(left) || isPhpObject(right)) {
    const dateLeft = dateStorage.get(left), dateRight = dateStorage.get(right);
    if (dateLeft || dateRight) {
      if (dateLeft && dateLeft.timestamp === undefined || dateRight && dateRight.timestamp === undefined) throw new TypeError('Use === or compare explicit fields for DateInterval, DatePeriod, DateTimeZone and InternalIterator');
      if (dateLeft && dateRight) return dateLeft.timestamp === dateRight.timestamp
        ? Math.sign(dateLeft.microsecond - dateRight.microsecond)
        : dateLeft.timestamp < dateRight.timestamp ? -1 : 1;
    }
    if (left === right) return 0;
    if (!isPhpObject(left) || !isPhpObject(right)) throw new TypeError('Compare service objects with other service objects or use ===');
    const a = objectData(left), b = objectData(right);
    if (a.definition.enum || b.definition.enum) return NaN;
    if (a.definition.name !== b.definition.name) return NaN;
    if (++objectComparisonDepth > 128) {objectComparisonDepth--; throw new Error('Recursive object comparison limit exceeded');}
    try {
      if (a.fields.size !== b.fields.size) return a.fields.size < b.fields.size ? -1 : 1;
      for (const [key, item] of a.fields) {const other = b.fields.get(key); if (!other) return 1; const result = phpCompare(item.value, other.value, item.kind, other.kind); if (result !== 0) return result;}
      return 0;
    } finally {objectComparisonDepth--;}
  }
  if (left instanceof Error || right instanceof Error) {
    if (left === right) return 0;
    throw new TypeError('Use === or compare Throwable messages/codes instead of ordering or loosely comparing exceptions.');
  }
  if (isRoundingMode(left) || isRoundingMode(right)) return left === right ? 0 : NaN;
  if (typeof left === 'object' || typeof right === 'object') {
    if (typeof left !== 'object') return -1;
    if (typeof right !== 'object') return 1;
    const a = arrayEntries(left).map(([key]) => key), b = arrayEntries(right).map(([key]) => key);
    if (a.length !== b.length) return a.length < b.length ? -1 : 1;
    for (const key of a) {
      if (!Object.hasOwn(right, key)) return 1;
      const result = phpCompare(left[key], right[key], arrayKind(left, key), arrayKind(right, key)); if (result !== 0) return result;
    }
    return 0;
  }
  if (typeof left === 'string' && typeof right === 'string') {
    if (numericString(left) && numericString(right)) return compareNumbers(left, right, leftType, rightType);
    else return compareStrings(left, right);
  } else if (typeof left === 'number' && typeof right === 'string') {
    if (numericString(right)) return compareNumbers(left, right, leftType, rightType); else return compareStrings(phpString(left, leftType), right);
  } else if (typeof left === 'string' && typeof right === 'number') {
    if (numericString(left)) return compareNumbers(left, right, leftType, rightType); else return compareStrings(left, phpString(right, rightType));
  }
  return compareNumbers(left, right, leftType, rightType);
};

export const phpMatches = (operator, left, right, leftType = phpType(left), rightType = phpType(right)) => {
  if (operator === 'truthy') return phpBool(left);
  if (operator === 'falsy') return !phpBool(left);
  if (['eq', 'identical'].includes(operator)) return phpIdentical(left, right, leftType, rightType);
  if (['neq', 'notIdentical'].includes(operator)) return !phpIdentical(left, right, leftType, rightType);
  const comparison = phpCompare(left, right, leftType, rightType);
  if (['looseEq', 'equal'].includes(operator)) return comparison === 0;
  if (['looseNeq', 'notEqual'].includes(operator)) return comparison !== 0;
  if (['gt', 'greater'].includes(operator)) return comparison > 0;
  if (['gte', 'greaterEqual'].includes(operator)) return comparison >= 0;
  if (['lt', 'less'].includes(operator)) return comparison < 0;
  if (['lte', 'lessEqual'].includes(operator)) return comparison <= 0;
  throw new Error(`Unknown PHP comparison: ${operator}`);
};

export const phpIncrement = (value, kind, direction, context = null) => {
  const deprecated = (message) => {if ((context?.source?.phpVersion ?? 80400) >= 80300) warn(context, message, 'PHP_DEPRECATED');};
  if (typeof value === 'boolean' || value == null && direction < 0) {
    deprecated(`${direction > 0 ? 'Increment' : 'Decrement'} on type ${value == null ? 'null' : 'bool'} has no effect`);
    return {value, kind};
  }
  if (value == null) return {value: 1, kind: 'integer'};
  if (typeof value === 'number' || numericString(value)) {
    const floating = kind === 'double' || typeof value === 'string' && /[.eE]/.test(value);
    const next = phpArithmetic('add', phpNumber(value), direction, floating, context);
    return {value: next, kind: floating ? 'double' : 'integer'};
  }
  if (typeof value !== 'string') throw new TypeError('Cannot increment or decrement an array or object');
  if (value === '') {
    deprecated('Increment/decrement on empty string is deprecated');
    return direction > 0 ? {value: '1', kind: 'string'} : {value: -1, kind: 'integer'};
  }
  if (direction < 0) {deprecated('Decrement on non-numeric string has no effect and is deprecated'); return {value, kind};}
  if (!/^[a-zA-Z0-9]+$/.test(value)) deprecated('Increment on non-alphanumeric string is deprecated');
  const chars = [...value]; let carry = true, prefix = '1';
  for (let index = chars.length - 1; index >= 0 && carry; index--) {
    const c = chars[index];
    if (c === '9') {chars[index] = '0'; prefix = '1';}
    else if (c === 'z') {chars[index] = 'a'; prefix = 'a';}
    else if (c === 'Z') {chars[index] = 'A'; prefix = 'A';}
    else if (/[a-yA-Y0-8]/.test(c)) {chars[index] = String.fromCharCode(c.charCodeAt(0) + 1); carry = false;}
    else carry = false;
  }
  return {value: (carry ? prefix : '') + chars.join(''), kind: 'string'};
};

// PHP shifts use signed 64-bit integers. Guard the narrower frontend exact range.
export const phpBitwise = (operation, left, right, context) => {
  if (operation === 'bitNot' && typeof left === 'string') return text(bytes(left).map((value) => (~value) & 255));
  if (operation === 'bitNot' && typeof left !== 'number') throw new TypeError('Cannot perform bitwise not on this value');
  const integer = (value) => {
    const number = phpNumber(value, context);
    if (!Number.isFinite(number) || !Number.isSafeInteger(Math.trunc(number))) throw new RangeError('Bitwise operand exceeds safe frontend integer precision');
    if (!Number.isInteger(number)) warn(context, 'Implicit conversion from float to int loses precision', 'PHP_DEPRECATED');
    return BigInt(Math.trunc(number));
  };
  const a = integer(left);
  let result;
  if (operation === 'bitNot') result = ~a;
  else {
    const b = integer(right);
    if (['bitAnd', 'bitOr', 'bitXor'].includes(operation)) result = operation === 'bitAnd' ? a & b : operation === 'bitOr' ? a | b : a ^ b;
    else {
    if (b < 0n) throw Object.assign(new Error('Bit shift by negative number'), {name: 'ArithmeticError'});
    result = b >= 64n ? (operation === 'shiftRight' && a < 0n ? -1n : 0n) : operation === 'shiftLeft' ? BigInt.asIntN(64, a << b) : a >> b;
    }
  }
  const value = Number(result);
  if (!Number.isSafeInteger(value)) throw new RangeError('Bitwise result exceeds safe frontend integer precision');
  return value;
};
