import unicode from './unicode-data.json' with {type: 'json'};
import {arrayEntries, isPhpArray} from './php-arrays.js';
import {phpType} from './php-values.js';
import {bounded, bytes, text, failure, limit, arrayLimit, work} from './php-builtin-support.js';
import {warn} from './diagnostics.js';

const valueError = (message) => {throw failure('ValueError', message);};
const lookup = (ranges, point) => {
  let low = 0, high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1, range = ranges[middle];
    if (point < range[0]) high = middle - 1;
    else if (point > range[1]) low = middle + 1;
    else return range;
  }
  return null;
};
const property = (name, char) => lookup(unicode[name], char.codePointAt(0)) !== null;
const mapped = (char, mode) => {
  const point = char.codePointAt(0), table = unicode.cases[mode];
  if (table.special[point] !== undefined) return table.special[point];
  const range = lookup(table.ranges, point);
  return range ? String.fromCodePoint(point + range[2]) : table.base === null ? char : mapped(char, table.base);
};
const wellFormed = (input) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(input);
const characters = (input, context) => {
  bounded(input); work(context, input.length);
  if (!wellFormed(input)) throw Object.assign(new RangeError('Frontend text contains an unpaired Unicode surrogate'), {code: 'PHP_INVALID_UTF8'});
  return Array.from(input);
};
const width = (chars) => chars.reduce((total, char) => total + (property('wide', char) ? 2 : 1), 0);
const caseConvert = (chars, mode, context) => {
  if (mode < 0 || mode > 7) valueError('mb_convert_case(): invalid case mode');
  const contextual = (mode === 1 || mode === 2) && (context.source?.phpVersion ?? 80400) >= 80300 && chars.includes('Σ');
  if (mode !== 2 && mode !== 6 && !contextual) return bounded(chars.map((char) => mapped(char, mode)).join(''));
  let titleMode = false, previous = [];
  const cased = (char) => property('cased', char) || property('casedIgnorable', char);
  // Precompute the cross-buffer look-ahead so long combining sequences stay linear.
  const ahead = new Uint8Array(contextual ? chars.length + 1 : 0); let nextCased = false;
  for (let i = contextual ? chars.length - 1 : -1; i >= 0; i--) {
    if (cased(chars[i])) nextCased = true;
    else if (!property('ignorable', chars[i])) nextCased = false;
    ahead[i] = Number(nextCased);
  }
  const parts = [];
  // Match PHP 8.3/8.4's 64-code-point input buffer and the surviving tail of
  // its previous converted buffer, including sigma after long combining runs.
  for (let start = 0; start < chars.length; start += 64) {
    const end = Math.min(chars.length, start + 64), converted = [];
    for (let index = start; index < end; index++) {
      const char = chars[index], effective = mode === 2 || mode === 6 ? titleMode ? mode === 2 ? 1 : 5 : mode : mode;
      let output = mapped(char, effective);
      if (char === 'Σ' && effective === 1 && contextual) {
        let before = index - 1;
        while (before >= start && property('ignorable', chars[before])) before--;
        let beforeCased = before >= start && cased(chars[before]);
        if (before < start) {
          for (let i = previous.length - 1; i >= converted.length; i--) {
            if (cased(previous[i])) {beforeCased = true; break;}
            if (!property('ignorable', previous[i])) break;
          }
        }
        let after = index + 1;
        while (after < end && property('ignorable', chars[after])) after++;
        const afterCased = after < end ? cased(chars[after]) : ahead[end];
        if (beforeCased && !afterCased) output = 'ς';
      }
      converted.push(...output);
      if (!property('ignorable', char)) titleMode = cased(char);
    }
    parts.push(converted.join('')); previous = converted;
  }
  return bounded(parts.join(''));
};
const position = (haystack, needle, offset, reverse, insensitive, name) => {
  if (offset < -haystack.length || offset > haystack.length) valueError(`${name}(): offset must be contained in the haystack`);
  const start = offset < 0 ? haystack.length + offset : offset;
  const chars = insensitive ? haystack.map((char) => mapped(char, 7)) : haystack;
  const input = chars.join(''), search = (insensitive ? needle.map((char) => mapped(char, 7)) : needle).join('');
  const byteStart = chars.slice(0, start).join('').length;
  const found = reverse ? input.lastIndexOf(search, offset < 0 ? byteStart : input.length) : input.indexOf(search, byteStart);
  if (found < 0 || reverse && offset >= 0 && found < byteStart) return false;
  return Array.from(input.slice(0, found)).length;
};

export const runMbstring = (name, items, context, parameters) => {
  if (!name.startsWith('mb_')) return null;
  const encoding = items[parameters.findIndex((parameter) => parameter.name === 'encoding')]?.value ?? context.source?.mbEncoding ?? 'UTF-8';
  if (!['UTF-8', 'UTF8'].includes(encoding.toUpperCase())) valueError(`${name}(): frontend Unicode functions support UTF-8 only; received ${encoding}`);
  const [a, b, c, d] = items.map((item) => item.value);
  const result = (value) => ({value, kind: phpType(value)});
  if (name === 'mb_chr') return result(a < 0 || a > 0x10ffff || a >= 0xd800 && a <= 0xdfff ? false : String.fromCodePoint(a));
  if (name === 'mb_check_encoding') {
    if (a === null) valueError('mb_check_encoding(): pass a string or array; PHP request-wide encoding checks are unavailable in the browser');
    const check = (value, depth = 0) => {
      work(context); if (depth > 64) throw limit('Unicode validation exceeds the nesting limit');
      if (typeof value === 'string') {work(context, value.length); return wellFormed(value);}
      return !isPhpArray(value) || arrayEntries(value).every(([key, item]) => check(key, depth + 1) && check(item, depth + 1));
    };
    return result(check(a));
  }
  if (name === 'mb_scrub') {
    work(context, a.length);
    // Valid UTF-8 is the frontend string contract. A lone browser UTF-16 surrogate
    // has no PHP UTF-8 representation; use the configured substitution character.
    const substitution = context.source?.mbSubstitute ?? 63;
    return result(bounded(a.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/gu, substitution === 'none' ? '' : String.fromCodePoint(typeof substitution === 'number' ? substitution : 63))));
  }
  const chars = characters(a, context), size = chars.length;
  if (name === 'mb_strlen') return result(size);
  if (name === 'mb_ord') {if (!size) valueError('mb_ord(): string must not be empty'); return result(chars[0].codePointAt(0));}
  if (name === 'mb_substr') {
    const start = b < 0 ? Math.max(0, size + b) : Math.min(size, b);
    return result(chars.slice(start, c === null ? size : c < 0 ? Math.max(start, size + c) : start + c).join(''));
  }
  if (['mb_strtolower', 'mb_strtoupper', 'mb_convert_case'].includes(name)) return result(caseConvert(chars, name === 'mb_convert_case' ? b : name === 'mb_strtolower' ? 1 : 0, context));
  if (name === 'mb_ucfirst' || name === 'mb_lcfirst') return result(size ? mapped(chars[0], name === 'mb_ucfirst' ? 2 : 1) + chars.slice(1).join('') : '');
  if (name === 'mb_str_split') {
    if (b < 1) valueError('mb_str_split(): length must be greater than 0');
    arrayLimit(Math.ceil(size / b)); const parts = [];
    for (let i = 0; i < size; i += b) parts.push(chars.slice(i, i + b).join(''));
    return result(parts);
  }
  if (name === 'mb_strwidth') return result(width(chars));
  if (name === 'mb_strimwidth') {
    if (b < -size || b > size) valueError('mb_strimwidth(): start must be contained in string');
    const start = b < 0 ? size + b : b, tail = chars.slice(start), marker = characters(d, context);
    if (c < 0 && (context.source?.phpVersion ?? 80400) >= 80300) warn(context, 'mb_strimwidth(): passing a negative width is deprecated', 'PHP_DEPRECATED');
    const maximum = c < 0 ? width(tail) + c : c;
    if (maximum < 0) valueError('mb_strimwidth(): width must be contained in string');
    if (width(tail) <= maximum) return result(tail.join(''));
    const available = Math.max(0, maximum - width(marker)); let used = 0, end = 0;
    while (end < tail.length) {const next = property('wide', tail[end]) ? 2 : 1; if (used + next > available) break; used += next; end++;}
    return result(bounded(tail.slice(0, end).join('') + d));
  }
  if (name === 'mb_strcut') {
    const input = bytes(a); let start = b < 0 ? Math.max(0, input.length + b) : Math.min(input.length, b);
    const length = c === null ? input.length : c < 0 ? Math.max(0, input.length - start + c) : c;
    while (start > 0 && (input[start] & 0xc0) === 0x80) start--;
    let end = Math.min(input.length, start + length);
    while (end > start && (input[end] & 0xc0) === 0x80) end--;
    return result(text(input.subarray(start, end)));
  }
  if (name === 'mb_str_pad') {
    const missing = b - size; if (missing <= 0) return result(a);
    if (!c.length) valueError('mb_str_pad(): pad string must not be empty');
    if (![0, 1, 2].includes(d)) valueError('mb_str_pad(): invalid pad type');
    if (b > 1048576) throw limit('Unicode padding exceeds 1 MiB');
    const padding = characters(c, context), left = d === 0 ? missing : d === 2 ? Math.floor(missing / 2) : 0;
    const fill = (count) => {
      const repetitions = Math.floor(count / padding.length), tail = padding.slice(0, count % padding.length).join('');
      if (bytes(c).length * repetitions + bytes(tail).length > 1048576) throw limit('Unicode padding exceeds 1 MiB');
      return c.repeat(repetitions) + tail;
    };
    return result(bounded(fill(left) + a + fill(missing - left)));
  }
  if (['mb_trim', 'mb_ltrim', 'mb_rtrim'].includes(name)) {
    const mask = b === null ? null : new Set(characters(b, context));
    const trim = (char) => mask ? mask.has(char) : property('trim', char);
    let start = 0, end = size;
    if (name !== 'mb_rtrim') while (start < end && trim(chars[start])) start++;
    if (name !== 'mb_ltrim') while (end > start && trim(chars[end - 1])) end--;
    return result(chars.slice(start, end).join(''));
  }
  const needle = characters(b, context);
  if (!size && (context.source?.phpVersion ?? 80400) < 80300 && ['mb_stripos', 'mb_strripos', 'mb_stristr', 'mb_strrichr'].includes(name)) return result(false);
  if (name === 'mb_substr_count') {
    if (!needle.length) valueError('mb_substr_count(): needle must not be empty');
    let start = 0, count = 0, found;
    while ((found = a.indexOf(b, start)) !== -1) {count++; start = found + b.length;}
    return result(count);
  }
  if (['mb_strpos', 'mb_strrpos', 'mb_stripos', 'mb_strripos'].includes(name)) return result(position(chars, needle, c, name.startsWith('mb_strr'), name.includes('ipos'), name));
  const reverse = name === 'mb_strrchr' || name === 'mb_strrichr';
  const found = position(chars, needle, 0, reverse, name === 'mb_stristr' || name === 'mb_strrichr', name);
  return result(found === false ? false : (c ? chars.slice(0, found) : chars.slice(found)).join(''));
};
