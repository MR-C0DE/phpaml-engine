import {dateDebugEntries} from './php-date-values.js';
import {objectToString, magicMember, callMagic} from './php-magic.js';
import {isPhpObject, objectData} from './php-object-values.js';
import {arrayEntries, arrayKind, isPhpArray} from './php-arrays.js';
import {warn} from './diagnostics.js';
import {formatThrowable} from './php-exceptions.js';
import {isRoundingMode} from './php-rounding-mode.js';

const numericPrefix = (value) => value.match(/^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
export const hasFloatNumericPrefix = (value) => typeof value === 'string' && /[.eE]/.test(numericPrefix(value)?.[0] || '');

// PHP scalar conversions used by compiled frontend code. No source is evaluated.
export const phpBool = (value) => value instanceof Error || isPhpObject(value) || !(value == null || value === false || value === 0 || value === '' || value === '0'
  || (typeof value === 'object' && value !== null && Object.keys(value).length === 0));

export const floatString = (value, precision = null) => {
  if (Object.is(value, -0)) return '-0';
  if (!Number.isFinite(value)) return Number.isNaN(value) ? 'NAN' : value < 0 ? '-INF' : 'INF';
  const rounded = precision === null ? value : Number(value.toPrecision(precision));
  const [significand, exponentText] = rounded.toExponential().split('e');
  const exponent = Number(exponentText);
  if (exponent < -4 || exponent >= (precision ?? 17)) {
    const fraction = significand.includes('.') ? significand : significand + '.0';
    return `${fraction}E${exponent < 0 ? '' : '+'}${exponent}`;
  }
  return String(rounded);
};

export const phpString = (value, type = phpType(value), context = null) => {
  if (isPhpObject(value)) return objectToString(value, context);
  if (isRoundingMode(value)) throw new TypeError('Object of class RoundingMode could not be converted to string');
  if (value instanceof Error) return formatThrowable(value);
  if (typeof value === 'function') throw new TypeError('Object of class Closure could not be converted to string');
  if (value == null || value === false) return '';
  if (value === true) return '1';
  if (typeof value === 'object') { warn(context, 'Array to string conversion'); return 'Array'; }
  if (type === 'double') return floatString(value, 14);
  return String(value);
};

export const phpFloat = (value) => {
  if (typeof value === 'string') {
    const prefix = numericPrefix(value);
    return prefix ? Number(prefix[0]) : 0;
  }
  if (typeof value === 'object' && value !== null) return phpBool(value) ? 1 : 0;
  return Number(value ?? 0);
};

export const phpInt = (value) => {
  const result = Math.trunc(phpFloat(value));
  if (!Number.isFinite(result)) return 0;
  if (!Number.isSafeInteger(result)) throw new RangeError('Frontend integer exceeds JavaScript safe integer precision');
  return result;
};

export const phpNumber = (value, context = null) => {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return Number(value ?? 0);
  if (typeof value === 'string') {
    const match = numericPrefix(value);
    if (match) {
      if (value.slice(match[0].length).trim() !== '') warn(context, 'A non-numeric value encountered');
      return Number(match[0]);
    }
  }
  throw new TypeError(`Unsupported operand type: ${phpType(value)}`);
};

export const phpArithmetic = (operation, left, right, floatResult, context = null) => {
  let a = phpNumber(left, context), b = phpNumber(right, context);
  if (operation === 'modulo') {
    for (const number of [a, b]) if (!Number.isInteger(number)) warn(context, 'Implicit conversion from float to int loses precision', 'PHP_DEPRECATED');
    a = phpInt(a); b = phpInt(b);
  }
  if (['divide', 'modulo'].includes(operation) && b === 0) {
    const error = new Error('Division by zero in AML state expression');
    error.name = 'DivisionByZeroError';
    throw error;
  }
  const result = operation === 'add' ? a + b : operation === 'subtract' ? a - b : operation === 'multiply' ? a * b : operation === 'divide' ? a / b : operation === 'power' ? a ** b : a % b;
  if (!floatResult && Number.isInteger(result) && !Number.isSafeInteger(result)) throw new RangeError('Frontend integer exceeds JavaScript safe integer precision');
  return operation === 'modulo' && Object.is(result, -0) ? 0 : result;
};

export const phpType = (value) => value == null ? 'NULL'
  : value instanceof Error || isPhpObject(value) || isRoundingMode(value) ? 'object'
  : typeof value === 'boolean' ? 'boolean'
  : typeof value === 'function' ? 'object'
  : typeof value === 'string' ? 'string'
  : typeof value === 'number' ? (Number.isInteger(value) ? 'integer' : 'double')
  : 'array';

export const phpDump = (value, type = phpType(value), depth = 0, budget = {remaining: 10000, seen: new WeakSet()}, context = null) => {
  if (--budget.remaining < 0 || depth > 64) throw new RangeError('Frontend dump exceeds its nesting or value limit');
  if (isPhpObject(value)) {
    if (budget.seen.has(value)) return '*RECURSION*\n';
    budget.seen.add(value);
    const data = objectData(value), indent = '  '.repeat(depth);
    if (data.definition.enum) return `enum(${data.definition.name}::${data.fields.get('name').value})\n`;
    try {
      let entries = dateDebugEntries(value, context || {}) || [...data.fields];
      const hook = context && magicMember(data.definition.name, '__debuginfo', context);
      if (hook) {
        const debug = callMagic(value, data.definition.name, hook, [], context.objectState || {}, context).value;
        if (debug != null && !isPhpArray(debug)) throw new TypeError('__debugInfo() must return an array or null');
        entries = debug == null ? [] : arrayEntries(debug).map(([key, item]) => [key, {value: item, kind: arrayKind(debug, key)}]);
      }
      return `object(${data.definition.name}) (${entries.length}) {\n` + entries.map(([key, item]) => `${indent}  [${typeof key === 'number' ? key : `"${key}"`}]=>\n${indent}  ${phpDump(item.value, item.kind, depth + 1, budget, context)}`).join('') + `${indent}}\n`;
    }
    finally {budget.seen.delete(value);}
  }
  if (isRoundingMode(value)) return `enum(RoundingMode::${value.name})\n`;
  if (value instanceof Error) return formatThrowable(value) + '\n';
  if (type === 'NULL') return 'NULL\n';
  if (type === 'boolean') return `bool(${value ? 'true' : 'false'})\n`;
  if (type === 'integer') return `int(${value})\n`;
  if (type === 'double') return `float(${floatString(value)})\n`;
  if (type === 'string') return `string(${new TextEncoder().encode(value).length}) "${value}"\n`;
  const indent = '  '.repeat(depth);
  const entries = arrayEntries(value || []);
  return `array(${entries.length}) {\n` + entries.map(([key, item]) =>
    `${indent}  [${typeof key === 'number' ? key : `"${key}"`}]=>\n${indent}  ${phpDump(item, arrayKind(value, key), depth + 1, budget, context)}`,
  ).join('') + `${indent}}\n`;
};
