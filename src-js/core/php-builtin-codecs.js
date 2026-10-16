import {hashAlgorithms} from './php-builtin-common.js';
import entities from './html-entities.json' with {type: 'json'};
import {arrayEntries, arrayKind, arrayKey, arrayWrite, makeArray, isPhpArray} from './php-arrays.js';
import {phpType, phpString} from './php-values.js';
import {byteString, fromByteString, bytes, text, bounded, asciiUpper, failure, limit, work} from './php-builtin-support.js';
import {warn} from './diagnostics.js';

const entityTable = (table, flags, encoding) => {
  if (encoding !== null && encoding !== undefined && !/^utf-?8$/i.test(encoding)) throw new RangeError('Frontend HTML entities support UTF-8 encoding only');
  const base = entities[flags & 48], quotes = flags & 3;
  if (!base || ![0, 1].includes(table)) throw failure('ValueError', 'Invalid HTML translation table');
  return Object.fromEntries(Object.entries(base).filter(([char]) => (table === 1 || ['&', '<', '>', '"', "'"].includes(char)) && (char !== '"' || quotes & 2) && (char !== "'" || quotes === 3)));
};
const decodeEntities = (input, flags, encoding, special = false) => {
  const table = entityTable(special ? 0 : 1, flags, encoding), reverse = Object.fromEntries(Object.entries(table).map(([key, value]) => [value, key]));
  return input.replace(/&(?:#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (entity) => {
    if (reverse[entity] !== undefined) return reverse[entity];
    if (!special && (flags & 48) === 48 && Object.hasOwn(entities.aliases, entity)) {
      const value = entities.aliases[entity];
      return value === '"' && !(flags & 2) || value === "'" && (flags & 3) !== 3 ? entity : value;
    }
    if (!entity.startsWith('&#')) return entity;
    const code = entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1));
    if (code < 1 || code > 0x10ffff || code >= 0xd800 && code <= 0xdfff || code === 34 && !(flags & 2) || code === 39 && (flags & 3) !== 3) return entity;
    const doctype = flags & 48;
    if (code < 32 && ![9, 10, 13].includes(code) || (doctype === 0 || doctype === 48) && code >= 127 && code <= 159 || doctype === 48 && code === 13
      || doctype !== 0 && (code & 0xffff) >= 0xfffe || doctype === 48 && code >= 0xfdd0 && code <= 0xfdef) return entity;
    if (special && ![34, 39, 38, 60, 62].includes(code)) return entity;
    return String.fromCodePoint(code);
  });
};
export const runStringCodecs = (name, items, context) => {
  const [a, b, c, d] = items.map((item) => item.value), result = (value, kind = phpType(value)) => ({value, kind});
  if (name === 'md5' || name === 'sha1') {const digest = hashAlgorithms[name](bytes(a)); return result(b ? text(digest) : Array.from(digest, (part) => part.toString(16).padStart(2, '0')).join(''));}
  if (name === 'crc32') {let crc = -1; for (const byte of bytes(a)) {crc ^= byte; for (let i = 0; i < 8; i++) crc = crc & 1 ? crc >>> 1 ^ 0xedb88320 : crc >>> 1;} return result((crc ^ -1) >>> 0);}
  if (name === 'get_html_translation_table') return result(makeArray(Object.entries(entityTable(a, b, c))));
  if (name === 'html_entity_decode') return result(decodeEntities(a, b, c));
  if (name === 'htmlspecialchars_decode') return result(decodeEntities(a, b, 'UTF-8', true));
  if (name === 'htmlspecialchars' || name === 'htmlentities') {
    const table = entityTable(name === 'htmlspecialchars' ? 0 : 1, b, c);
    const parts = a.split(/(&(?:#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);)/g);
    const replace = (value) => {let output = ''; const chars = [...value]; for (let i = 0; i < chars.length; i++) {const double = chars[i] + (chars[i + 1] || ''); if (table[double]) {output += table[double]; i++;} else output += table[chars[i]] ?? chars[i];} return output;};
    return result(parts.map((part) => !d && /^&/.test(part) && decodeEntities(part, b | 3, c) !== part ? part : replace(part)).join(''));
  }
  if (name === 'convert_uuencode') {
    const input = bytes(a), encode = (n) => String.fromCharCode(n ? n + 32 : 96), lines = [];
    for (let offset = 0; offset < input.length; offset += 45) {
      const line = input.subarray(offset, offset + 45); let output = encode(line.length);
      for (let i = 0; i < line.length; i += 3) {const x = line[i], y = line[i + 1] || 0, z = line[i + 2] || 0; output += encode(x >> 2) + encode((x << 4 | y >> 4) & 63) + encode((y << 2 | z >> 6) & 63) + encode(z & 63);}
      lines.push(output);
    }
    return result(lines.join('\n') + (lines.length ? '\n' : '') + '`\n');
  }
  if (name === 'convert_uudecode') {
    const output = []; let valid = false;
    for (const line of a.split(/\r?\n/)) {
      if (!line.length) continue; const length = (line.charCodeAt(0) - 32) & 63; if (length === 0) {valid = true; break;}
      if (length > 45 || line.length < 1 + Math.ceil(length / 3) * 4) {warn(context, 'convert_uudecode(): parameter is not a valid uuencoded string'); return result(false);}
      const current = [];
      for (let i = 1; i < line.length; i += 4) {const x = (line.charCodeAt(i) - 32) & 63, y = (line.charCodeAt(i + 1) - 32) & 63, z = (line.charCodeAt(i + 2) - 32) & 63, w = (line.charCodeAt(i + 3) - 32) & 63; current.push((x << 2 | y >> 4) & 255, (y << 4 | z >> 2) & 255, (z << 6 | w) & 255);}
      output.push(...current.slice(0, length)); valid = true;
    }
    if (!valid) {warn(context, 'convert_uudecode(): parameter is not a valid uuencoded string'); return result(false);}
    return result(text(Uint8Array.from(output)));
  }
  if (name === 'quoted_printable_decode') return result(fromByteString(byteString(a).replace(/=[\t ]*(?:\r\n|\r|\n)|=([0-9a-f]{2})/gi, (_, hex) => hex ? String.fromCharCode(parseInt(hex, 16)) : '')));
  if (name === 'quoted_printable_encode') {
    const input = bytes(a), lines = []; let line = '';
    for (let i = 0; i < input.length; i++) {
      const byte = input[i];
      if (byte === 13 && input[i + 1] === 10) {lines.push(line); line = ''; i++; continue;}
      const next = input[i + 1], encoded = byte === 61 || byte < 32 && byte !== 9 || byte > 126 || byte === 32 && (next === 13 || next === undefined) ? '=' + byte.toString(16).padStart(2, '0').toUpperCase() : String.fromCharCode(byte);
      if (line.length + encoded.length > 75) {lines.push(line + '='); line = '';}
      line += encoded;
    }
    lines.push(line); return result(lines.join('\r\n'));
  }
  if (name === 'soundex') {
    const letters = asciiUpper(a).replace(/[^A-Z]/g, ''); if (!letters) return result('0000');
    const codes = '01230120022455012623010202'; let output = letters[0], previous = codes[letters.charCodeAt(0) - 65];
    for (const letter of letters.slice(1)) {const code = codes[letter.charCodeAt(0) - 65]; if (code !== previous && code !== '0') output += code; previous = code; if (output.length === 4) break;}
    return result(output.padEnd(4, '0'));
  }
  if (name === 'similar_text') {
    const x = byteString(a), y = byteString(b);
    const compare = (left, right, depth = 0) => {
      if (depth > 128) throw limit('similar_text(): recursion limit exceeded');
      let size = 0, p = 0, q = 0;
      for (let i = 0; i < left.length; i++) for (let j = 0; j < right.length; j++) {work(context); let k = 0; while (i + k < left.length && j + k < right.length && left[i + k] === right[j + k]) {work(context); k++;} if (k > size) {size = k; p = i; q = j;}}
      return size ? size + (p && q ? compare(left.slice(0, p), right.slice(0, q), depth + 1) : 0) + (p + size < left.length && q + size < right.length ? compare(left.slice(p + size), right.slice(q + size), depth + 1) : 0) : 0;
    };
    const count = compare(x, y); items[2].ref?.set(x.length + y.length ? 200 * count / (x.length + y.length) : 0, 'double'); return result(count);
  }
  if (name === 'strtok') {
    const storage = context.builtinMemory ||= {};
    if (b !== null) storage.tokenizer = {input: byteString(a), offset: 0};
    const current = storage.tokenizer; if (!current) return result(false);
    const chars = new Set(byteString(b === null ? a : b));
    while (current.offset < current.input.length && chars.has(current.input[current.offset])) current.offset++;
    const start = current.offset; while (current.offset < current.input.length && !chars.has(current.input[current.offset])) current.offset++;
    return result(start >= current.input.length ? false : fromByteString(current.input.slice(start, current.offset++)));
  }
  if (name === 'wordwrap') {
    if (!c.length || b < 0 || b === 0 && d) throw failure('ValueError', 'wordwrap(): invalid width or empty break');
    const lines = byteString(a).split(byteString(c)), output = [];
    for (let line of lines) {
      while (line.length > b) {
        let cut = line.lastIndexOf(' ', b); if (cut <= 0) cut = d ? b : line.indexOf(' ', b);
        if (cut < 0 || cut === 0) break; output.push(line.slice(0, cut)); line = line.slice(cut + (line[cut] === ' ' ? 1 : 0));
      }
      output.push(line);
    }
    return result(fromByteString(output.join(byteString(c))));
  }
  if (name === 'strip_tags') {
    const allowed = new Set((isPhpArray(b) ? arrayEntries(b).map(([, value]) => phpString(value)) : typeof b === 'string' ? [...b.matchAll(/<([a-z0-9]+)>/gi)].map((match) => match[1]) : []).map((tag) => tag.toLowerCase()));
    let output = '', i = 0;
    while (i < a.length) {
      if (a[i] === '\0') {i++; continue;}
      if (a[i] !== '<' || /\s/.test(a[i + 1] || '')) {output += a[i++]; continue;}
      const start = i; let quote = '', depth = 0;
      if (a.startsWith('<!--', i)) {const end = a.indexOf('-->', i + 4); i = end < 0 ? a.length : end + 3; continue;}
      while (i < a.length) {const char = a[i++]; if (quote) {if (char === quote) quote = '';} else if (char === '"' || char === "'") quote = char; else if (char === '<') depth++; else if (char === '>' && --depth <= 0) break;}
      const tag = a.slice(start, i), name = tag.match(/^<\/?([a-z0-9]+)/i)?.[1]?.toLowerCase(); if (name && allowed.has(name)) output += tag;
    }
    return result(output);
  }
  if (name === 'str_word_count') {
    if (![0, 1, 2].includes(b)) throw failure('ValueError', 'str_word_count(): format must be 0, 1 or 2');
    const input = byteString(a), mask = byteString(c ?? ''), extra = new Set(), words = []; let start = -1;
    for (let i = 0; i < mask.length; i++) {
      if (mask.slice(i + 1, i + 3) === '..' && mask[i + 3] && mask[i] <= mask[i + 3]) {for (let code = mask.charCodeAt(i); code <= mask.charCodeAt(i + 3); code++) extra.add(String.fromCharCode(code)); i += 3;}
      else extra.add(mask[i]);
    }
    for (let i = 0; i <= input.length; i++) {
      const char = input[i], valid = char !== undefined && (/[a-zA-Z]/.test(char) || extra.has(char) || (char === "'" || char === '-') && i > 0 && i < input.length - 1);
      if (valid && start < 0) start = i;
      if (!valid && start >= 0) {words.push([start, fromByteString(input.slice(start, i))]); start = -1;}
    }
    return result(b === 0 ? words.length : b === 1 ? words.map(([, word]) => word) : makeArray(words));
  }
  if (name === 'str_getcsv') {
    if (!items[3].provided && (context.source?.phpVersion ?? 80400) >= 80400) warn(context, 'str_getcsv(): the escape parameter must be provided explicitly', 'PHP_DEPRECATED');
    if (bytes(b).length !== 1 || bytes(c).length !== 1 || d !== '' && bytes(d).length !== 1) throw failure('ValueError', 'str_getcsv(): delimiter, enclosure and escape must be single bytes');
    if (a === '') return result([null]);
    // PHP tolerates unfinished fields; the local file CSV API intentionally validates complete files.
    const values = []; let field = '', quoted = false, start = true;
    for (let i = 0; i < a.length; i++) {const char = a[i];
      if (quoted) {if (d && char === d && a[i + 1] === c) {field += char + a[++i];} else if (char === c) {if (a[i + 1] === c) {field += c; i++;} else quoted = false;} else field += char;}
      else if (start && char === c) {field = ''; quoted = true; start = false;}
      else if (char === b) {values.push(field); field = ''; start = true;}
      else if (char === '\r' || char === '\n') break;
      else {field += char; if (!/\s/.test(char)) start = false;}
    }
    values.push(field); return result(values);
  }
  if (name === 'parse_str') {
    let output = makeArray(); const parts = a.split('&'); if (parts.length > 1000) throw limit('parse_str(): input exceeds 1000 variables');
    const decode = (value) => fromByteString(byteString(value).replaceAll('+', ' ').replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
    for (const part of parts) {
      if (!part) continue; const equal = part.indexOf('='), raw = decode(equal < 0 ? part : part.slice(0, equal)), value = decode(equal < 0 ? '' : part.slice(equal + 1));
      const match = raw.match(/^([^\[]+)((?:\[[^\]]*\])*)/); if (!match) continue;
      const keys = [match[1].trimStart().replace(/[ .]/g, '_'), ...[...match[2].matchAll(/\[([^\]]*)\]/g)].map((m) => m[1])]; if (keys.length > 64) throw limit('parse_str(): nesting exceeds 64 levels');
      const write = (array, index) => {array = isPhpArray(array) ? array : makeArray(); const key = keys[index]; return arrayWrite(array, key, index === keys.length - 1 ? value : write(array[key], index + 1), index === keys.length - 1 ? 'string' : 'array', context, key === '');};
      output = write(output, 0);
    }
    items[1].ref.set(output, 'array'); return result(null);
  }
  return null;
};
