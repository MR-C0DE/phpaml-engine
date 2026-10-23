import {runSerialization} from './php-serialization.js';
import {runCommon} from './php-builtin-common.js';
import {runRandom} from './php-random.js';
import {runSymbols} from './php-symbols.js';
import {isPhpObject} from './php-object-values.js';
import {runIterators} from './php-spl.js';
import {runUtility} from './php-builtin-utility.js';
import {isIterable, spreadEntries} from './php-iterators.js';
import {isCountable} from './php-object-collections.js';
import {assignType} from './php-types.js';
import {phpType, phpString, phpInt, phpFloat, phpBool} from './php-values.js';
import {arrayEntries, arrayKind, arrayRead, arrayWrite, clonePhp, makeArray} from './php-arrays.js';
import {warn, withSource} from './diagnostics.js';

import specs from './builtin-signatures.json' with {type: 'json'};
import {runMath} from './php-builtin-math.js';
import {runIntl} from './php-intl.js';
import {runGrapheme} from './php-builtin-grapheme.js';
import {runWeb} from './php-builtin-web.js';
import {runDates} from './php-date-values.js';
import {runJson} from './php-builtin-json.js';
import {runRegex} from './php-builtin-regex.js';
import {runStrings} from './php-builtin-strings.js';
import {runMbstring} from './php-builtin-mbstring.js';
import {runBCMath} from './php-builtin-bcmath.js';
import {runFunctionIntrospection} from './php-function-introspection.js';
import {runObjects} from './php-builtin-objects.js';
import {runOutput} from './php-builtin-output.js';
import {roundingMode} from './php-rounding-mode.js';
import {runArrays} from './php-builtin-arrays.js';
import {isFrontendCallable, invokeFunction} from './php-functions.js';
import {validateResult} from './php-builtin-support.js';

export const builtinNames = Object.freeze(Object.keys(specs));
const failure = (name, message) => Object.assign(new Error(message), {name});
const limit = (message) => Object.assign(new RangeError(message), {code: 'PHP_BUILTIN_LIMIT'});
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
const bytes = (value) => encoder.encode(value);
const text = (value) => {
  try {return decoder.decode(value);}
  catch {throw Object.assign(new RangeError('This byte operation produced invalid UTF-8; frontend strings must remain valid UTF-8'), {code: 'PHP_INVALID_UTF8'});}
};
const bounded = (value) => {
  if (value.length > 1048576 || bytes(value).length > 1048576) throw limit('Frontend string result exceeds 1 MiB');
  return value;
};
const asciiUpper = (value) => value.replace(/[a-z]/g, (letter) => letter.toUpperCase());
const asciiLower = (value) => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
const numeric = (value) => typeof value === 'number' || typeof value === 'string' && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);

// Compare half-way boundaries in the original scale, avoiding Math.round's
// asymmetric negative ties and a global epsilon which changes nearby values.
export const phpRound = (value, precision = 0, mode = 1, phpVersion = 80400) => {
  if (![1, 2, 3, 4].includes(mode)) {
    if (phpVersion < 80400) mode = 1;
    else throw failure('ValueError', 'round(): unsupported rounding mode; use PHP_ROUND_HALF_UP/DOWN/EVEN/ODD');
  }
  if (!Number.isFinite(value)) return value;
  if (value === 0) return value;
  if (precision > 308) return value;
  if (precision < -308) return value < 0 ? -0 : 0;
  const scale = 10 ** Math.abs(precision), magnitude = Math.abs(value);
  const restore = (integer) => precision > 0 ? integer / scale : integer * scale;
  if (phpVersion < 80400) {
    // PHP 8.2/8.3 pre-round near ties to 15 significant decimal digits.
    const nearest = (number) => {
      const direction = number < 0 ? -1 : 1;
      let result = number < 0 ? Math.ceil(number - 0.5) : Math.floor(number + 0.5);
      if (number === result - direction * 0.5 && (mode === 2 || mode === 3 && result % 2 !== 0 || mode === 4 && result % 2 === 0)) result -= direction;
      return result;
    };
    let order = Math.floor(Math.log10(magnitude));
    if (magnitude < 10 ** order) order--; // log10 can round just below a power of ten.
    const places = 14 - order;
    let scaled;
    if (places > precision && places - 15 < precision) {
      const factor = 10 ** Math.abs(places);
      scaled = nearest(places >= 0 ? value * factor : value / factor) / 10 ** (places - precision);
    } else {
      scaled = precision >= 0 ? value * scale : value / scale;
      if (Math.abs(scaled) >= 1e15) return value;
    }
    const integer = nearest(scaled);
    return Math.abs(precision) < 23 ? restore(integer) : Number(`${Object.is(integer, -0) ? '-0' : integer}e${-precision}`);
  }
  let whole = Math.floor(precision > 0 ? magnitude * scale : magnitude / scale);
  if (restore(whole + 1) === magnitude) whole++;
  if (whole >= 1e16) return value;
  const half = restore(whole + 0.5);
  if (magnitude > half || magnitude === half && (mode === 1 || mode === 3 && whole % 2 !== 0 || mode === 4 && whole % 2 === 0)) whole++;
  const result = Math.abs(precision) < 23 ? restore(whole) : Number(`${whole}e${-precision}`);
  return (value < 0 ? -1 : 1) * result;
};

const trimBytes = (value, characters, side, context) => {
  const mask = bytes(characters), allowed = new Set();
  for (let i = 0; i < mask.length; i++) {
    if (i + 3 < mask.length && mask[i + 1] === 46 && mask[i + 2] === 46 && mask[i] <= mask[i + 3]) {
      for (let c = mask[i]; c <= mask[i + 3]; c++) allowed.add(c);
      i += 3;
    } else {
      if (mask[i] === 46 && mask[i + 1] === 46) warn(context, `${side}(): Invalid '..'-range in character mask`);
      allowed.add(mask[i]);
    }
  }
  const input = bytes(value); let start = 0, end = input.length;
  if (side !== 'rtrim') while (start < end && allowed.has(input[start])) start++;
  if (side !== 'ltrim') while (end > start && allowed.has(input[end - 1])) end--;
  return text(input.subarray(start, end));
};

export const randomInt = (min, max) => {
  if (min > max) throw failure('ValueError', 'random_int(): Argument #1 ($min) must be less than or equal to argument #2 ($max)');
  if (min === max) return min;
  if (!globalThis.crypto?.getRandomValues) throw failure('Random\\RandomException', 'Secure browser randomness is unavailable');
  const span = BigInt(max) - BigInt(min) + 1n, space = 1n << 64n, ceiling = space - space % span;
  const buffer = new Uint32Array(2);
  for (let attempt = 0; attempt < 128; attempt++) {
    globalThis.crypto.getRandomValues(buffer);
    const sample = BigInt(buffer[0]) << 32n | BigInt(buffer[1]);
    if (sample < ceiling) return Number(BigInt(min) + sample % span);
  }
  throw failure('Random\\RandomException', 'Secure random sampling failed');
};

const formatNumber = (value, decimals, decimal, thousands, context) => {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? 'nan' : 'inf';
  if (decimals > 1000) throw limit('number_format(): frontend decimal precision is limited to 1000');
  if ((context.source?.phpVersion ?? 80400) < 80300) decimals = Math.max(0, decimals);
  const rounded = phpRound(value, decimals, 1, context.source?.phpVersion), digits = Math.max(0, decimals);
  // Format the actual binary double, including its low digits, as PHP does.
  // BigInt avoids toFixed's 100-digit limit and exponential output at 1e21.
  const buffer = new DataView(new ArrayBuffer(8)); buffer.setFloat64(0, Math.abs(rounded));
  const bits = buffer.getBigUint64(0), exponent = Number(bits >> 52n) & 2047;
  const mantissa = (bits & ((1n << 52n) - 1n)) + (exponent ? 1n << 52n : 0n);
  const shift = (exponent || 1) - 1023 - 52;
  let numerator = mantissa * 10n ** BigInt(digits), denominator = 1n;
  if (shift >= 0) numerator <<= BigInt(shift); else denominator <<= BigInt(-shift);
  let integer = numerator / denominator; const remainder = numerator % denominator;
  if (remainder * 2n > denominator || remainder * 2n === denominator && integer % 2n !== 0n) integer++;
  const all = integer.toString().padStart(digits + 1, '0');
  let whole = digits ? all.slice(0, -digits) : all;
  const decimalPart = digits ? all.slice(-digits) : '';
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, () => thousands ?? ',');
  return bounded((rounded < 0 ? '-' : '') + whole + (digits ? (decimal ?? '.') + decimalPart : ''));
};

const run = (name, items, context) => {
  const [a, b, c, d] = items.map((item) => item.value);
  if (name === 'gettype') return {value: items[0].kind, kind: 'string'};
  if (name === 'strval') return {value: phpString(a, items[0].kind, context), kind: 'string'};
  if (name === 'boolval') return {value: phpBool(a), kind: 'boolean'};
  if (name === 'floatval' || name === 'doubleval') return {value: phpFloat(a), kind: 'double'};
  if (name === 'intval') {
    let value = phpInt(a);
    if (typeof a === 'string' && b !== 10) {
      let raw = a.trimStart(), sign = 1, radix = b;
      if (/^[+-]/.test(raw)) {if (raw[0] === '-') sign = -1; raw = raw.slice(1);}
      if (radix === 0) radix = /^0x/i.test(raw) ? 16 : /^0b/i.test(raw) ? 2 : raw[0] === '0' ? 8 : 10;
      if (radix === 16 && /^0x/i.test(raw) || radix === 2 && /^0b/i.test(raw)) raw = raw.slice(2);
      value = radix < 2 || radix > 36 ? 0 : sign * (parseInt(raw, radix) || 0);
      if (!Number.isSafeInteger(value)) throw limit('intval(): integer exceeds frontend safe precision');
    }
    return {value, kind: 'integer'};
  }
  const predicateTypes = {is_array: ['array'], is_bool: ['boolean'], is_float: ['double'], is_double: ['double'], is_int: ['integer'], is_integer: ['integer'], is_long: ['integer'], is_null: ['NULL'], is_scalar: ['boolean', 'integer', 'double', 'string'], is_string: ['string']};
  if (Object.hasOwn(predicateTypes, name)) return {value: predicateTypes[name].includes(items[0].kind), kind: 'boolean'};
  if (name === 'strlen') return {value: bytes(a).length, kind: 'integer'};
  if (name === 'str_contains') return {value: a.includes(b), kind: 'boolean'};
  if (name === 'str_starts_with') return {value: a.startsWith(b), kind: 'boolean'};
  if (name === 'str_ends_with') return {value: a.endsWith(b), kind: 'boolean'};
  let result;
  if (name === 'substr') {
    const input = bytes(a), start = b < 0 ? Math.max(0, input.length + b) : Math.min(b, input.length);
    const end = c == null ? input.length : c < 0 ? Math.max(start, input.length + c) : Math.min(input.length, start + c);
    result = text(input.subarray(start, end));
  } else if (['trim', 'ltrim', 'rtrim'].includes(name)) result = trimBytes(a, b, name, context);
  else if (name === 'strtolower') result = asciiLower(a);
  else if (name === 'strtoupper') result = asciiUpper(a);
  else if (name === 'ucfirst') result = asciiUpper(a.slice(0, 1)) + a.slice(1);
  else if (name === 'lcfirst') result = asciiLower(a.slice(0, 1)) + a.slice(1);
  else if (name === 'ucwords') {
    const input = bytes(a), separators = new Set(bytes(b)); let capital = true;
    for (let i = 0; i < input.length; i++) {const original = input[i]; if (capital && original >= 97 && original <= 122) input[i] -= 32; capital = separators.has(original);}
    result = text(input);
  } else if (name === 'str_replace') {
    if (typeof a === 'string' && typeof b !== 'string') throw new TypeError('str_replace(): replace must be a string when search is a string');
    const searches = typeof a === 'string' ? [a] : arrayEntries(a).map(([key, value]) => phpString(value, arrayKind(a, key), context));
    const replacements = typeof b === 'string' ? null : arrayEntries(b).map(([key, value]) => phpString(value, arrayKind(b, key), context));
    let count = 0;
    const replace = (value, kind) => {
      let current = phpString(value, kind, context);
      searches.forEach((search, index) => {
        if (search === '') return;
        const replacement = replacements ? replacements[index] ?? '' : b;
        const pieces = current.split(search);
        if (pieces.length > 100000) throw limit('str_replace(): too many replacements in one operation');
        count += pieces.length - 1;
        if (current.length + (pieces.length - 1) * (replacement.length - search.length) > 1048576) throw limit('Frontend string result exceeds 1 MiB');
        current = bounded(pieces.join(replacement));
      });
      return current;
    };
    result = typeof c === 'string' ? replace(c, 'string') : makeArray(arrayEntries(c).map(([key, value]) => [key, replace(value, arrayKind(c, key))]));
    items[3].ref?.set(count, 'integer');
  } else if (name === 'explode') {
    if (a === '') throw failure('ValueError', 'explode(): separator cannot be empty');
    const parts = []; let offset = 0, found;
    const maximum = c > 0 ? c : c === 0 ? 1 : Infinity;
    while (parts.length + 1 < maximum && (found = b.indexOf(a, offset)) !== -1) {
      if (parts.length >= 9999) throw limit('explode(): frontend arrays are limited to 10000 pieces');
      parts.push(b.slice(offset, found)); offset = found + a.length;
    }
    parts.push(b.slice(offset));
    result = c < 0 ? parts.slice(0, Math.max(0, parts.length + c)) : parts;
  } else if (name === 'implode') {
    const collection = b ?? (typeof a === 'object' ? a : null), separator = typeof a === 'string' ? a : '';
    if (collection === null || typeof a !== 'string' && b !== null) throw new TypeError('implode(): expected an array, or a string separator and an array');
    const parts = arrayEntries(collection).map(([key, value]) => phpString(value, arrayKind(collection, key), context));
    if (parts.reduce((length, value) => length + value.length, 0) + Math.max(0, parts.length - 1) * separator.length > 1048576) throw limit('Frontend string result exceeds 1 MiB');
    result = parts.join(separator);
  } else if (name === 'is_numeric') result = numeric(a);
  else if (name === 'random_int') return {value: randomInt(a, b), kind: 'integer'};
  else if (name === 'intdiv') {
    if (b === 0) throw failure('DivisionByZeroError', 'Division by zero');
    return {value: Number(BigInt(a) / BigInt(b)), kind: 'integer'};
  } else if (name === 'abs') return {value: Math.abs(a), kind: items[0].kind};
  else if (name === 'ceil') return {value: Math.ceil(a), kind: 'double'};
  else if (name === 'floor') return {value: Math.floor(a), kind: 'double'};
  else if (name === 'round') return {value: phpRound(a, b, c, context.source?.phpVersion), kind: 'double'};
  else if (name === 'number_format') result = formatNumber(a, b, c, d, context);
  else return null;
  return {value: typeof result === 'string' ? bounded(result) : result, kind: phpType(result)};
};

const parameterAt = (parameters, index, name) => name === undefined
  ? parameters[index] || (parameters.at(-1)?.variadic ? parameters.at(-1) : null)
  : parameters.find((parameter) => parameter.name === name) || (parameters.at(-1)?.variadic ? parameters.at(-1) : null);

export const invokeBuiltin = (name, argumentsList, state, context) => {
  name = name.replace(/^\\/, '').toLowerCase();
  if (context.readOnly && ['random_int', 'str_shuffle', 'shuffle', 'array_rand', 'printf', 'vprintf', 'strtok'].includes(name)) throw new Error('Reactive text cannot run output, randomness or stateful tokenization');
  const parameters = Object.hasOwn(specs, name) ? specs[name] : null;
  if (!parameters) throw new Error(`Unsupported frontend builtin: ${name}`);
  const assigned = new Map(), rest = []; let position = 0, named = false;
  for (const argument of argumentsList) {
    let index;
    if (Object.hasOwn(argument, 'name')) {
      named = true; index = parameters.findIndex((p) => p.name === argument.name);
      if (index < 0) {
        if (!parameters.at(-1)?.variadic) throw new Error(`Unknown named parameter $${argument.name}`);
        if (rest.some((item) => item.name === argument.name)) throw new Error(`Named parameter $${argument.name} overwrites previous argument`);
        rest.push(argument); continue;
      }
    } else {
      if (named) throw new Error('Cannot use positional argument after named argument');
      index = position++;
    }
    if (index >= parameters.length || parameters[index]?.variadic) {rest.push(argument); continue;}
    if (assigned.has(index)) throw new Error(`Named parameter $${parameters[index].name} overwrites previous argument`);
    assigned.set(index, argument);
  }
  if (rest.length && !parameters.at(-1)?.variadic) throw failure('ArgumentCountError', `${name}(): too many arguments`);
  const convert = (item, parameter) => {
    const {name: label, types} = parameter;
    const referenceRequired = parameter.reference && !(name === 'array_multisort' && typeof item.value === 'number');
    if (referenceRequired && !item.ref) throw new Error(`${name}(): Argument $${label} cannot be passed by reference`);
    const nullable = types.startsWith('?') || types.split('|').includes('null'), choices = types.replace('?', '').split('|');
    if (item.value == null && !nullable && !choices.includes('mixed') && context.source?.strictTypes === false && choices.some((type) => ['int', 'float', 'string', 'bool'].includes(type))) {
      warn(context, `${name}(): Passing null to parameter $${label} is deprecated`, 'PHP_DEPRECATED');
      item = {...item, value: choices.includes('string') ? '' : 0, kind: choices.includes('string') ? 'string' : 'integer'};
    }
    if (choices.includes('callable') && item.value !== null) {
      if (!isFrontendCallable(item.value, context)) throw new TypeError(`${name}(): Argument $${label} must be a compiled callable`);
      return {...item, provided: true};
    }
    try {return {...item, ...assignType({types: choices, nullable}, item.value, item.kind, context.source?.strictTypes ?? true, context), provided: true};}
    catch (error) {if (error instanceof TypeError) throw new TypeError(`${name}(): Argument $${label} must be ${types}, ${item.kind} given`); throw error;}
  };
  const items = [];
  parameters.forEach((parameter, index) => {
    if (parameter.variadic) {items.push(...rest.map((item) => convert(item, parameter))); return;}
    const item = assigned.get(index);
    if (item) {items.push(convert(item, parameter)); return;}
    if (!Object.hasOwn(parameter, 'default') && !parameter.optional) throw failure('ArgumentCountError', `${name}(): missing argument $${parameter.name}`);
    const value = parameter.types === 'RoundingMode' && parameter.default?.roundingMode ? roundingMode(parameter.default.roundingMode) : parameter.default;
    items.push({value, kind: phpType(value), provided: false});
  });
  if (/^array_(?:u?diff|u?intersect)/.test(name)) {
    const callbacks = Number(name.startsWith('array_u')) + Number(/uassoc|ukey/.test(name));
    for (const item of callbacks ? items.slice(-callbacks) : []) if (!isFrontendCallable(item.value, context)) throw new TypeError(`${name}(): comparison must be a compiled callable`);
  }
  // Overload defaults and aliases are normalized only after PHP argument binding.
  if (name === 'array_keys' && !items[1].provided) items[1].value = undefined;
  const canonical = {chop: 'rtrim', join: 'implode', strchr: 'strstr', key_exists: 'array_key_exists', sizeof: 'count', pos: 'current'}[name] || name;
  const invoke = (callback, args) => invokeFunction(callback, args, state, {...context, source: {...context.source, strictTypes: false}});
  const result = runCommon(canonical, items, context) || runSerialization(canonical, items, state, context) || runRandom(canonical, items, context) || runSymbols(canonical, items, state, context) || runUtility(canonical, items, state, context) || (canonical === 'is_iterable' ? {value: isIterable(items[0].value), kind: 'boolean'} : null) || (canonical === 'is_countable' ? {value: isCountable(items[0].value), kind: 'boolean'} : null) || run(canonical, items, context) || runIntl(canonical, items, context) || runGrapheme(canonical, items, context) || runWeb(canonical, items, context) || runDates(canonical, items, context) || runJson(canonical, items, context) || runRegex(canonical, items, context, invoke) || runIterators(canonical, items, context, invoke) || runFunctionIntrospection(canonical, items, context) || runObjects(canonical, items, context) || runOutput(canonical, items, context) || runMath(canonical, items, context) || runBCMath(canonical, items, context, parameters) || runMbstring(canonical, items, context, parameters) || runStrings(canonical, items, context) || runArrays(canonical, items, context, invoke);
  if (!result) throw new Error(`Unsupported frontend builtin: ${name}`);
  validateResult(result.value);
  return result;
};

export const evaluateBuiltin = (expression, state, context, resolve, kindOf, reference) => {
  const name = expression.left, parameters = Object.hasOwn(specs, name) ? specs[name] : null;
  const data = {...context, source: expression.right.source || context.source};
  context.builtinBudget ||= {remaining: 1000000}; data.builtinBudget = context.builtinBudget;
  context.builtinMemory ||= {}; data.builtinMemory = context.builtinMemory;
  try {
    if (!parameters) throw new Error(`Unsupported frontend builtin: ${name}`);
    const args = []; let position = 0;
    for (const argument of expression.right.arguments) {
      const target = argument.value, assignable = target?.$local || target?.$state || ['componentInput', 'dynamicLocal', 'offset', 'appendOffset', 'objectProperty', 'objectStaticProperty'].includes(target?.$expression?.operation);
      if (argument.spread) {
        const parent = assignable ? reference(target, state, data, false, false, true) : null;
        let array = parent ? parent.get().value : resolve(target, state, data);
        if (isPhpObject(array)) {
          for (const {key, item} of spreadEntries(array, data)) {args.push({...item, ...(key.kind === 'string' ? {name: key.value} : {})}); if (key.kind !== 'string') position++;}
          continue;
        }
        for (const [key, value] of arrayEntries(array)) {
          args.push({...(typeof key === 'string' ? {name: key} : {}), value: clonePhp(value), kind: arrayKind(array, key), ref: {
            get: () => arrayRead(parent ? parent.get().value : array, key, data),
            set: (value, kind) => {array = arrayWrite(parent ? parent.get().value : array, key, value, kind, data); parent?.set(array, 'array'); return {value, kind};},
          }});
          if (typeof key !== 'string') position++;
        }
      } else {
        const parameter = parameterAt(parameters, position, argument.name);
        let ref = parameter?.reference && assignable ? reference(target, state, data) : null;
        ref = ref?.indirect?.() || ref;
        const item = ref ? (ref.acquire?.() || ref.get(true)) : {value: resolve(target, state, data)};
        args.push({...argument, ...item, kind: item.kind || kindOf(target, state, data, item.value), ref});
        if (argument.name === undefined) position++;
      }
    }
    return invokeBuiltin(name, args, state, data);
  } catch (error) {throw withSource(error, data.source, data.trace);}
};
