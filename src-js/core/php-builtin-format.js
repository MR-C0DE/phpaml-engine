import {phpString, phpInt, phpFloat, phpType} from './php-values.js';
import {byteString, fromByteString, bounded, failure, limit, fixedDecimal} from './php-builtin-support.js';
import {makeArray} from './php-arrays.js';

export const formatString = (format, args, context) => {
  let position = 0, output = '';
  const argument = (index) => {const item = args[index === undefined ? position++ : index]; if (!item) throw failure('ArgumentCountError', 'sprintf(): too few arguments'); return item;};
  for (let i = 0; i < format.length;) {
    if (format[i] !== '%') {output += format[i++]; continue;}
    if (format[i + 1] === '%') {output += '%'; i += 2; continue;}
    const match = format.slice(i).match(/^%(?:(\d+)\$)?((?:[-+ 0]|'[^])*)(\d+|\*(?:\d+\$)?)?(?:\.(\d*|\*(?:\d+\$)?))?([a-zA-Z])/);
    if (!match) throw failure('ValueError', 'sprintf(): invalid format');
    const [, ordinal, flags, widthText, precisionText, specifier] = match;
    const size = (input, fallback) => {
      if (input === undefined) return fallback;
      if (!input.startsWith('*')) return Number(input);
      const item = argument(input.length > 1 ? Number(input.slice(1, -1)) - 1 : undefined);
      if (item.kind !== 'integer') throw new TypeError('sprintf(): width and precision must be integers');
      return item.value;
    };
    const width = size(widthText, 0), precision = size(precisionText, undefined);
    if (width < 0 || precision < -1) throw failure('ValueError', 'sprintf(): width and precision must be non-negative');
    if (width > 1048576 || precision > 1000) throw limit('sprintf(): width or precision exceeds frontend bounds');
    const item = argument(ordinal ? Number(ordinal) - 1 : undefined), v = item.value;
    let value, numeric = false;
    if (specifier === 's') {value = byteString(phpString(v, item.kind, context)); if (precision !== undefined && precision >= 0) value = value.slice(0, precision);}
    else if (specifier === 'c') value = String.fromCharCode(phpInt(v, context) & 255);
    else if ('bdo uxX'.replaceAll(' ', '').includes(specifier)) {
      const integer = BigInt(phpInt(v, context)); numeric = true;
      value = specifier === 'd' ? integer.toString() : BigInt.asUintN(64, integer).toString({b: 2, o: 8, u: 10, x: 16, X: 16}[specifier]);
      if (specifier === 'X') value = value.toUpperCase();
    } else if ('eEfFgGhH'.includes(specifier)) {
      const number = phpFloat(v, context), p = precision === undefined || precision === -1 ? 6 : precision; numeric = true;
      if (!Number.isFinite(number)) {value = Number.isNaN(number) ? 'NaN' : number < 0 && (context.source?.phpVersion ?? 80400) >= 80400 ? '-INF' : 'INF'; numeric = false;}
      else {
        if (p > 100) throw limit('sprintf(): floating precision is limited to 100 digits');
        if ('fF'.includes(specifier)) value = fixedDecimal(Math.abs(number), p);
        else if ('eE'.includes(specifier)) value = Math.abs(number).toExponential(p);
        else {
          const precision = Math.max(1, p), magnitude = Math.abs(number), exponent = magnitude ? Math.floor(Math.log10(magnitude)) : 0;
          value = exponent < -4 || exponent >= precision ? magnitude.toExponential(precision - 1) : magnitude.toFixed(Math.max(0, precision - exponent - 1));
          value = value.replace(/(\.\d*?[1-9])0+(?=e|$)|\.0+(?=e|$)/, '$1');
          value = value.replace(/^(\d+)e/, '$1.0e');
        }
        if ('EGH'.includes(specifier)) value = value.toUpperCase();
        if (number < 0 || Object.is(number, -0)) value = '-' + value;
      }
    } else throw failure('ValueError', `sprintf(): unknown format specifier ${specifier}`);
    if (numeric && !value.startsWith('-') && flags.includes('+')) value = '+' + value;
    const padding = flags.match(/'([^])/), fill = padding ? byteString(padding[1]).slice(0, 1) : flags.includes('0') && !flags.includes('-') ? '0' : ' ';
    const count = Math.max(0, width - value.length);
    if (flags.includes('-')) value += fill.repeat(count);
    else if (numeric && fill === '0' && /^[+-]/.test(value)) value = value[0] + fill.repeat(count) + value.slice(1);
    else value = fill.repeat(count) + value;
    output += fromByteString(value); i += match[0].length;
    bounded(output);
  }
  return bounded(output);
};

export const scanString = (input, format, references) => {
  input = byteString(input); format = byteString(format);
  let index = 0, cursor = 0, failed = false, assignments = 0;
  const values = [];
  for (; index < format.length;) {
    if (/\s/.test(format[index])) {while (/\s/.test(format[index] || '') && index < format.length) index++; while (/\s/.test(input[cursor] || '') && cursor < input.length) cursor++; continue;}
    if (format[index] !== '%' || format[index + 1] === '%') {
      const literal = format[index] === '%' ? '%' : format[index]; index += literal === '%' ? 2 : 1;
      if (input[cursor] !== literal) failed = true; else cursor++;
      continue;
    }
    const match = format.slice(index).match(/^%(\*)?(\d+)?([cdeEfFgGiosuxXn]|\[(?:\^)?\]?(?:[^\]])*\])/);
    if (!match) throw failure('ValueError', 'sscanf(): invalid format');
    const [, suppress, widthText, type] = match, width = widthText ? Number(widthText) : type === 'c' ? 1 : input.length;
    if (!['c', 'n'].includes(type) && type[0] !== '[') while (/\s/.test(input[cursor] || '') && cursor < input.length) cursor++;
    let value = null, kind = 'NULL', consumed = 0;
    if (!failed) {
      const remaining = input.slice(cursor, cursor + width); let token;
      if (type === 'n') {value = cursor; kind = 'integer';}
      else if (type === 'c') {token = remaining || null; value = token === null ? null : fromByteString(token); kind = 'string';}
      else if (type === 's') {token = remaining.match(/^\S+/)?.[0]; value = token === undefined ? null : fromByteString(token); kind = 'string';}
      else if (type[0] === '[') {const expression = type.slice(1, -1).replaceAll('\\', '\\\\'); token = remaining.match(new RegExp(`^[${expression}]+`))?.[0]; value = token === undefined ? null : fromByteString(token); kind = 'string';}
      else if ('eEfFgG'.includes(type)) {token = remaining.match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i)?.[0]; value = token ? Number(token) : null; kind = 'double';}
      else {
        const regex = type === 'i' ? /^[+-]?(?:0[xX][0-9a-fA-F]+|0[0-7]*|[1-9]\d*)/ : 'xX'.includes(type) ? /^[+-]?(?:0[xX])?[0-9a-fA-F]+/ : type === 'o' ? /^[+-]?[0-7]+/ : /^[+-]?\d+/;
        token = remaining.match(regex)?.[0];
        if (token) {const radix = type === 'o' ? 8 : 'xX'.includes(type) ? 16 : type === 'i' ? /^[-+]?0x/i.test(token) ? 16 : /^[-+]?0/.test(token) ? 8 : 10 : 10; value = parseInt(token, radix); kind = 'integer'; if (!Number.isSafeInteger(value)) throw limit('sscanf(): integer exceeds safe frontend precision');}
      }
      consumed = token?.length || 0;
      if (value === null) failed = true;
      cursor += consumed;
    }
    if (!suppress) {values.push({value, kind: value === null ? 'NULL' : kind}); if (value !== null) assignments++;}
    index += match[0].length;
  }
  if (references.length) {
    if (references.length !== values.length) throw failure('ValueError', 'sscanf(): number of variables must match format');
    values.forEach((item, i) => {if (item.value !== null) references[i].ref.set(item.value, item.kind);});
    return {value: input === '' ? -1 : assignments, kind: 'integer'};
  }
  return {value: input === '' ? null : makeArray(values.map((item, key) => [key, item.value]), new Map(values.map((item, key) => [key, item.kind]))), kind: input === '' ? 'NULL' : 'array'};
};
