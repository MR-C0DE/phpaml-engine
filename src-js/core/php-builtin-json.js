import {arrayEntries, arrayKind, arrayKey, isPhpArray, makeArray} from './php-arrays.js';
import {invokeCollectionMethod} from './php-object-collections.js';
import {objectData} from './php-object-values.js';
import {makeStdClass} from './php-stdclass.js';
import {dateData, formatDate} from './php-date-values.js';
import {phpType} from './php-values.js';
import {bounded, bytes, failure, limit, work} from './php-builtin-support.js';

const messages = ['No error', 'Maximum stack depth exceeded', 'State mismatch (invalid or malformed JSON)', 'Control character error, possibly incorrectly encoded', 'Syntax error', 'Malformed UTF-8 characters, possibly incorrectly encoded', 'Recursion detected', 'Inf and NaN cannot be JSON encoded', 'Type is not supported', 'The decoded property name is invalid', 'Single unpaired UTF-16 surrogate in unicode escape', 'Non-backed enums have no default serialization'];
const jsonError = (code) => Object.assign(failure('JsonException', messages[code]), {phpCode: code, jsonCodecError: true});
const validDepth = (depth) => {if (depth < 1 || depth > 2147483647) throw failure('ValueError', 'JSON depth must be greater than 0 and at most 2147483647');};
const quote = (value, flags) => {
  let result = JSON.stringify(value).replace(/\//g, flags & 64 ? '/' : '\\/');
  if (flags & 1) result = result.replace(/</g, '\\u003C').replace(/>/g, '\\u003E');
  if (flags & 2) result = result.replace(/&/g, '\\u0026');
  if (flags & 4) result = result.replace(/'/g, '\\u0027');
  if (flags & 8) result = '"' + result.slice(1, -1).replace(/\\"/g, '\\u0022') + '"';
  if (!(flags & 256)) result = result.replace(/[\u0080-\uffff]/g, (char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
  else if (!(flags & 2048)) result = result.replace(/[\u2028\u2029]/g, (char) => '\\u' + char.charCodeAt(0).toString(16));
  return result;
};
const numberText = (value, kind, flags) => {
  if (Object.is(value, -0)) return flags & 1024 ? '-0.0' : '-0';
  let result = String(value);
  // PHP uses scientific notation below 1e-4 and from 1e17 for doubles.
  if (kind === 'double' && value !== 0 && (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e17)) result = value.toExponential();
  result = result.replace(/e([+-]?)(\d+)$/, (_, sign, exponent) => 'e' + (sign || '+') + exponent);
  if (kind === 'double' && result.includes('e') && !result.split('e')[0].includes('.')) result = result.replace('e', '.0e');
  if (kind === 'double' && flags & 1024 && !/[.e]/.test(result)) result += '.0';
  return result;
};

// A bounded parser preserves PHP's integer/float distinction, member order and
// large integer lexemes, which JSON.parse's Number conversion would discard.
const decode = (source, associative, depth, flags, context, validating = false) => {
  let position = 0, nodes = 0;
  const whitespace = () => {while (/[\x20\t\r\n]/.test(source[position] || '') && position < source.length) position++;};
  const string = () => {
    const start = position++;
    while (position < source.length) {
      const char = source[position++];
      if (char === '"') {
        let value; try {value = JSON.parse(source.slice(start, position));} catch {throw jsonError(4);}
        for (let i = 0; i < value.length; i++) {
          const c = value.charCodeAt(i);
          if (c >= 0xd800 && c <= 0xdbff) {const next = value.charCodeAt(++i); if (!(next >= 0xdc00 && next <= 0xdfff)) throw jsonError(10);}
          else if (c >= 0xdc00 && c <= 0xdfff) throw jsonError(10);
        }
        return value;
      }
      if (char.charCodeAt(0) < 32) throw jsonError(3);
      if (char === '\\') position++;
    }
    throw jsonError(4);
  };
  const value = (level = 0) => {
    if (++nodes > 10000) throw limit('Frontend JSON is limited to 10000 values');
    work(context); whitespace(); const char = source[position];
    if (char === '"') return {value: string(), kind: 'string'};
    if (char === '[' || char === '{') {
      if (level + 1 >= depth) throw jsonError(1);
      if (level >= 64) throw limit('Frontend JSON is limited to 64 nested levels');
      const object = char === '{', close = object ? '}' : ']'; position++; whitespace();
      const entries = [], types = new Map();
      if (source[position] !== close) while (true) {
        let key = entries.length;
        if (object) {if (source[position] !== '"') throw jsonError(4); key = string(); whitespace(); if (source[position++] !== ':') throw jsonError(4);}
        const item = value(level + 1);
        if (object && !associative && key.startsWith('\0')) throw jsonError(9);
        if ((!object || associative) && !validating) key = arrayKey(key, context);
        const old = entries.findIndex(([candidate]) => candidate === key);
        if (old >= 0) entries[old] = [key, item.value]; else entries.push([key, item.value]);
        types.set(key, item.kind); whitespace();
        if (source[position] === close) break;
        if ((source[position] === '}' || source[position] === ']') && source[position] !== close) throw jsonError(2);
        if (source[position++] !== ',') throw jsonError(4); whitespace();
      }
      position++;
      return object && !associative ? {value: makeStdClass(entries.map(([key, part]) => [key, {value: part, kind: types.get(key)}])), kind: 'object'} : {value: makeArray(entries, types), kind: 'array'};
    }
    for (const [literal, result, kind] of [['true', true, 'boolean'], ['false', false, 'boolean'], ['null', null, 'NULL']]) if (source.startsWith(literal, position)) {position += literal.length; return {value: result, kind};}
    const match = source.slice(position).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) throw jsonError(4);
    const raw = match[0]; position += raw.length; const integer = !/[.eE]/.test(raw), result = Number(raw);
    if (integer && !Number.isSafeInteger(result)) {
      const big = BigInt(raw), fitsPhp = big >= -9223372036854775808n && big <= 9223372036854775807n;
      if (!fitsPhp && flags & 2) return {value: raw, kind: 'string'};
      if (fitsPhp && !validating) throw limit('JSON integer exceeds frontend safe precision; quote the value in JSON');
    }
    return {value: integer && result === 0 ? 0 : result, kind: integer && Number.isSafeInteger(result) ? 'integer' : 'double'};
  };
  const result = value(); whitespace(); if (position !== source.length) throw jsonError(4); return result;
};

export const runJson = (name, items, context) => {
  if (!name.startsWith('json_')) return null;
  const memory = context.builtinMemory ||= {};
  if (name === 'json_last_error') return {value: memory.jsonError || 0, kind: 'integer'};
  if (name === 'json_last_error_msg') return {value: messages[memory.jsonError || 0], kind: 'string'};
  const encoding = name === 'json_encode', validating = name === 'json_validate';
  const flags = items[encoding ? 1 : validating ? 2 : 3].value, depth = items[encoding ? 2 : 2 - Number(validating)].value;
  if (!encoding) validDepth(depth);
  if (validating && flags !== 0 && flags !== 1048576) throw failure('ValueError', 'json_validate(): flags must be JSON_INVALID_UTF8_IGNORE or 0');
  let partialCode = 0;
  try {
    let result;
    if (!encoding) {
      bounded(items[0].value);
      result = decode(items[0].value, validating || (items[1].value ?? !!(flags & 1)), depth, flags, context, validating);
      if (validating) result = {value: true, kind: 'boolean'};
    } else {
      const seen = memory.jsonEncodingActive ||= new Set(), serializing = memory.jsonSerializing ||= new Set(); let nodes = 0, outputSize = 0;
      const chunk = (text) => {outputSize += bytes(text).length; if (outputSize > 1048576) throw limit('Frontend JSON result exceeds 1 MiB'); return text;};
      const problem = (code, substitute = 'null') => {if (!(flags & 512)) throw jsonError(code); partialCode = code; return substitute;};
      const render = (value, kind, level = 0, skipSerializer = false) => {
        if (++nodes > 10000 || level > 64) throw limit('Frontend JSON exceeds its value or nesting limit');
        work(context);
        if (value == null) return chunk('null');
        if (typeof value === 'boolean') return chunk(value ? 'true' : 'false');
        if (typeof value === 'number') return chunk(Number.isFinite(value) ? numberText(value, kind, flags) : problem(7, '0'));
        if (typeof value === 'string') {
          if (flags & 32 && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value) && Number.isFinite(Number(value))) {
            if (/^[\t\n\r\f\v ]*[+-]?\d+[\t\n\r\f\v ]*$/.test(value) && !Number.isSafeInteger(Number(value))) throw limit('JSON_NUMERIC_CHECK integer exceeds frontend safe precision');
            return chunk(numberText(Number(value), /[.eE]/.test(value) ? 'double' : 'integer', flags));
          }
          return chunk(quote(value, flags));
        }
        const data = objectData(value);
        if (!isPhpArray(value) && !data) return typeof value === 'function' || value instanceof Error ? '{}' : problem(8);
        if (!skipSerializer && data?.definition.ancestors?.some((parent) => parent.toLowerCase() === 'jsonserializable')) {
          if (serializing.has(value) || seen.has(value)) return problem(6);
          if (serializing.size >= 128) throw limit('Frontend JSON serializer chain exceeds 128 objects');
          serializing.add(value);
          try {
            let serialized;
            try {serialized = invokeCollectionMethod(value, 'jsonserialize', [], context);}
            catch (error) {if (error.jsonCodecError) delete error.jsonCodecError; throw error;}
            return render(serialized.value, serialized.kind, level, serialized.value === value);
          } finally {serializing.delete(value);}
        }
        if (!skipSerializer && data?.definition.enumCases) {const backed = data.fields.get('value'); return backed ? render(backed.value, backed.kind, level) : problem(11, '0');}
        if (seen.has(value)) return problem(6);
        if (level + 1 > depth) return problem(1);
        seen.add(value);
        try {
        let entries;
        const date = dateData(value);
        if (date) {
          entries = date.timestamp === undefined ? [['timezone_type', date.zone.type, 'integer'], ['timezone', date.zone.name, 'string']] : [['date', formatDate('Y-m-d H:i:s.u', date, context), 'string'], ['timezone_type', date.zone.type, 'integer'], ['timezone', date.zone.name, 'string']];
        } else if (data) {
          const properties = {}; let definition = data.definition; while (definition) {for (const [key, property] of Object.entries(definition.properties || {})) if (!Object.hasOwn(properties, key)) properties[key] = property; definition = definition.parent ? context.classes?.[definition.parent.toLowerCase()] : null;}
          entries = [...data.fields].filter(([key]) => !key.includes('::$') && (data.definition.name === 'stdClass' || properties[key]?.visibility === 'public')).map(([key, item]) => [key, item.value, item.kind]);
        } else entries = arrayEntries(value).map(([key, part]) => [key, part, arrayKind(value, key)]);
        const list = !data && !(flags & 16) && entries.every(([key], index) => key === index), open = list ? '[' : '{', close = list ? ']' : '}';
        const pretty = !!(flags & 128), indent = '    '.repeat(level + 1);
        chunk(open + close + (entries.length ? ','.repeat(entries.length - 1) + (pretty ? '\n'.repeat(entries.length + 1) + '    '.repeat(level) : '') : ''));
        const parts = entries.map(([key, part, type]) => chunk((pretty ? indent : '') + (list ? '' : quote(String(key), flags) + (pretty ? ': ' : ':'))) + render(part, type, level + 1));
        return open + (parts.length && pretty ? '\n' : '') + parts.join(pretty ? ',\n' : ',') + (parts.length && pretty ? '\n' + '    '.repeat(level) : '') + close;
        } finally {seen.delete(value);}
      };
      if ((context.source?.serializePrecision ?? -1) !== -1) throw limit('Frontend JSON currently requires serialize_precision=-1');
      result = {value: bounded(render(items[0].value, items[0].kind)), kind: 'string'};
    }
    if (!(flags & 4194304) || flags & 512 || partialCode || validating) memory.jsonError = partialCode;
    return result;
  } catch (error) {
    if (!error.jsonCodecError) {if (encoding && (!(flags & 4194304) || flags & 512)) memory.jsonError = partialCode; throw error;}
    if (flags & 4194304 && !validating) throw error;
    memory.jsonError = error.phpCode;
    return {value: encoding || validating ? false : null, kind: encoding || validating ? 'boolean' : 'NULL'};
  }
};
