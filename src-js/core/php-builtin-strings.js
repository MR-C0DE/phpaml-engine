import {arrayEntries, arrayKind, makeArray, arrayWrite, isPhpArray} from './php-arrays.js';
import {phpString, phpType, phpBool} from './php-values.js';
import {randomInt} from './php-builtins.js';
import {warn} from './diagnostics.js';
import {asciiLower, asciiUpper, bytes, text, bounded, byteString, fromByteString, failure, limit, arrayLimit, work, naturalCompare} from './php-builtin-support.js';
import {formatString, scanString} from './php-builtin-format.js';
import {runStringCodecs} from './php-builtin-codecs.js';
import {metaphone} from './php-metaphone.js';

const valueError = (message) => {throw failure('ValueError', message);};
const characterMask = (mask) => {
  const chars = new Set();
  for (let i = 0; i < mask.length; i++) {
    if (mask.slice(i + 1, i + 3) === '..' && mask[i + 3] && mask.charCodeAt(i) <= mask.charCodeAt(i + 3)) {
      for (let c = mask.charCodeAt(i); c <= mask.charCodeAt(i + 3); c++) chars.add(String.fromCharCode(c)); i += 3;
    } else chars.add(mask[i]);
  }
  return chars;
};
const offsetAt = (offset, size) => offset < 0 ? Math.max(0, size + offset) : Math.min(offset, size);
export const runStrings = (name, items, context) => {
  const [a, b, c, d, e] = items.map((item) => item.value);
  const result = (value, kind = phpType(value)) => ({value, kind});
  if (name === 'metaphone') return result(metaphone(a, b, context));
  if (['strpos', 'stripos', 'strrpos', 'strripos'].includes(name)) {
    let input = byteString(a), needle = byteString(b); const offset = c;
    if (offset < -input.length || offset > input.length) valueError(`${name}(): offset must be contained in the haystack`);
    if (name.includes('ipos')) {input = asciiLower(input); needle = asciiLower(needle);}
    const start = offset < 0 ? input.length + offset : offset;
    const position = name.startsWith('strr') ? offset < 0 ? input.lastIndexOf(needle, start) : input.lastIndexOf(needle) : input.indexOf(needle, start);
    return result(position < 0 || name.startsWith('strr') && offset >= 0 && position < start ? false : position);
  }
  if (['strstr', 'stristr', 'strrchr'].includes(name)) {
    const input = byteString(a), needle = byteString(b);
    const position = name === 'strrchr' ? input.lastIndexOf(needle.slice(0, 1)) : (name === 'stristr' ? asciiLower(input).indexOf(asciiLower(needle)) : input.indexOf(needle));
    return result(position < 0 ? false : fromByteString(c ? input.slice(0, position) : input.slice(position)));
  }
  if (['strcmp', 'strcasecmp', 'strncmp', 'strncasecmp', 'strnatcmp', 'strnatcasecmp', 'substr_compare'].includes(name)) {
    let x = byteString(a), y = byteString(b), insensitive = name.includes('casecmp');
    if (name.startsWith('strnat')) return result(naturalCompare(a, b, insensitive));
    if (name === 'substr_compare') {
      if (c > x.length) valueError('substr_compare(): offset must be contained in string');
      if (d !== null && d < 0) valueError('substr_compare(): length must be greater than or equal to 0');
      x = x.slice(offsetAt(c, x.length)); insensitive = e;
      if (d !== null) {x = x.slice(0, d); y = y.slice(0, d);}
    } else if (name === 'strncmp' || name === 'strncasecmp') {if (c < 0) valueError(`${name}(): length must be greater than or equal to 0`); x = x.slice(0, c); y = y.slice(0, c);}
    if (insensitive) {x = asciiLower(x); y = asciiLower(y);}
    return result(x === y ? 0 : x < y ? -1 : 1);
  }
  if (name === 'substr_count') {
    const input = byteString(a), needle = byteString(b);
    if (needle === '') valueError('substr_count(): needle cannot be empty');
    if (c < -input.length || c > input.length) valueError('substr_count(): offset must be contained in haystack');
    const start = c < 0 ? input.length + c : c, length = d === null ? input.length - start : d < 0 ? input.length - start + d : d;
    if (length < 0 || start + length > input.length) valueError('substr_count(): length must be contained in haystack');
    const part = input.slice(start, start + length); let count = 0, offset = 0, found;
    while ((found = part.indexOf(needle, offset)) !== -1) {count++; offset = found + needle.length;}
    return result(count);
  }
  if (name === 'substr_replace') {
    const replace = (value, replacement, start, length) => {
      const input = byteString(value); start = offsetAt(start, input.length);
      const end = length === null ? input.length : length < 0 ? Math.max(start, input.length + length) : Math.min(input.length, start + length);
      return fromByteString(input.slice(0, start) + byteString(replacement) + input.slice(end));
    };
    if (typeof a === 'string') {
      if (isPhpArray(c) || isPhpArray(d)) throw new TypeError('substr_replace(): offset and length must be integers for a string input');
      return result(replace(a, isPhpArray(b) ? arrayEntries(b)[0]?.[1] ?? '' : b, c, d));
    }
    const at = (value, index, fallback) => isPhpArray(value) ? arrayEntries(value)[index]?.[1] ?? fallback : value;
    return result(makeArray(arrayEntries(a).map(([key, value], i) => [key, replace(phpString(value, arrayKind(a, key)), phpString(at(b, i, '')), at(c, i, 0), at(d, i, null))])));
  }
  if (name === 'str_ireplace') {
    if (typeof a === 'string' && isPhpArray(b)) throw new TypeError('str_ireplace(): replace must be a string when search is a string');
    const searches = typeof a === 'string' ? [a] : arrayEntries(a).map(([key, value]) => phpString(value, arrayKind(a, key)));
    const replacements = typeof b === 'string' ? null : arrayEntries(b).map(([key, value]) => phpString(value, arrayKind(b, key)));
    let count = 0;
    const replace = (value, kind) => {
      let input = phpString(value, kind);
      searches.forEach((search, i) => {
        if (!search.length) return;
        const folded = asciiLower(input), needle = asciiLower(search), replacement = replacements ? replacements[i] ?? '' : b;
        const parts = []; let start = 0, found;
        while ((found = folded.indexOf(needle, start)) >= 0) {work(context); parts.push(input.slice(start, found), replacement); count++; start = found + search.length;}
        parts.push(input.slice(start)); if (parts.reduce((n, part) => n + part.length, 0) > 1048576) throw limit('String replacement exceeds 1 MiB'); input = bounded(parts.join(''));
      });
      return input;
    };
    const output = typeof c === 'string' ? replace(c, 'string') : makeArray(arrayEntries(c).map(([key, value]) => [key, replace(value, arrayKind(c, key))]));
    items[3].ref?.set(count, 'integer'); return result(output);
  }
  if (name === 'str_repeat') {if (b < 0) valueError('str_repeat(): times must be greater than or equal to 0'); if (bytes(a).length * b > 1048576) throw limit('String repetition exceeds 1 MiB'); return result(a.repeat(b));}
  if (name === 'str_pad') {
    const input = byteString(a), pad = byteString(c), missing = b - input.length;
    if (missing <= 0) return result(a);
    if (!pad.length || ![0, 1, 2].includes(d)) valueError('str_pad(): invalid pad string or type');
    if (b > 1048576) throw limit('String padding exceeds 1 MiB');
    const fill = (length) => pad.repeat(Math.ceil(length / pad.length)).slice(0, length);
    const left = d === 0 ? missing : d === 2 ? Math.floor(missing / 2) : 0;
    return result(fromByteString(fill(left) + input + fill(missing - left)));
  }
  if (name === 'str_split') {if (b < 1) valueError('str_split(): length must be greater than 0'); const input = bytes(a), parts = []; arrayLimit(Math.ceil(input.length / b)); for (let i = 0; i < input.length; i += b) parts.push(text(input.subarray(i, i + b))); return result(parts);}
  if (name === 'strrev') return result(text(bytes(a).reverse()));
  if (name === 'str_shuffle') {const input = bytes(a); for (let i = input.length - 1; i > 0; i--) {const j = randomInt(0, i); [input[i], input[j]] = [input[j], input[i]];} return result(text(input));}
  if (name === 'str_rot13') return result(a.replace(/[a-zA-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + ((char <= 'Z' ? char <= 'M' : char <= 'm') ? 13 : -13))));
  if (name === 'ord') return result(bytes(a)[0] ?? 0);
  if (name === 'chr') return result(text(Uint8Array.of(a & 255)));
  if (name === 'bin2hex') return result(Array.from(bytes(a), (value) => value.toString(16).padStart(2, '0')).join(''));
  if (name === 'hex2bin') {
    if (a.length % 2 || /[^0-9a-f]/i.test(a)) {warn(context, 'hex2bin(): input must be an even-length hexadecimal string'); return result(false);}
    return result(text(Uint8Array.from(a.match(/../g) || [], (part) => parseInt(part, 16))));
  }
  if (name === 'chunk_split') {if (b < 1) valueError('chunk_split(): length must be greater than 0'); const input = bytes(a), parts = []; if (input.length + Math.max(1, Math.ceil(input.length / b)) * bytes(c).length > 1048576) throw limit('Chunked string exceeds 1 MiB'); for (let i = 0; i < input.length; i += b) parts.push(text(input.subarray(i, i + b)), c); if (!input.length) parts.push(c); return result(bounded(parts.join('')));}
  if (name === 'nl2br') return result(a.replace(/\r\n|\n\r|\r|\n/g, (newline) => (b ? '<br />' : '<br>') + newline));
  if (name === 'addslashes') return result(a.replace(/[\\'"\0]/g, (char) => '\\' + (char === '\0' ? '0' : char)));
  if (name === 'stripslashes') return result(a.replace(/\\([\s\S])|\\$/g, (_, char) => char === '0' ? '\0' : char ?? ''));
  if (name === 'quotemeta') return result(a.replace(/[.\\+*?\[\]^$()]/g, '\\$&'));
  if (name === 'addcslashes') {
    const chars = characterMask(byteString(b));
    return result(fromByteString(byteString(a).split('').map((char) => {
      if (!chars.has(char)) return char;
      const code = char.charCodeAt(0), escape = {7: 'a', 8: 'b', 9: 't', 10: 'n', 11: 'v', 12: 'f', 13: 'r'}[code];
      return '\\' + (escape || (code < 32 || code >= 127 ? code.toString(8).padStart(3, '0') : char));
    }).join('')));
  }
  if (name === 'stripcslashes') return result(fromByteString(byteString(a).replace(/\\(?:x([0-9a-f]{1,2})|([0-7]{1,3})|([\s\S]))/gi, (_, hex, oct, char) => hex ? String.fromCharCode(parseInt(hex, 16)) : oct ? String.fromCharCode(parseInt(oct, 8) & 255) : ({a:'\x07', b:'\b', t:'\t', n:'\n', v:'\v', f:'\f', r:'\r'}[char] ?? char))));
  if (name === 'strspn' || name === 'strcspn') {
    const input = byteString(a), start = offsetAt(c, input.length), end = d === null ? input.length : d < 0 ? Math.max(start, input.length + d) : start + d;
    const mask = new Set(byteString(b)); let length = 0;
    for (const char of input.slice(start, end)) {if (mask.has(char) !== (name === 'strspn')) break; length++;}
    return result(length);
  }
  if (name === 'strpbrk') {if (b === '') valueError('strpbrk(): characters cannot be empty'); const input = byteString(a), chars = new Set(byteString(b)); const index = [...input].findIndex((char) => chars.has(char)); return result(index < 0 ? false : fromByteString(input.slice(index)));}
  if (name === 'count_chars') {
    if (b < 0 || b > 4) valueError('count_chars(): mode must be between 0 and 4');
    const counts = new Uint32Array(256); for (const char of bytes(a)) counts[char]++;
    const pairs = [...counts].map((count, key) => [key, count]).filter(([, count]) => b === 0 || (b === 1 || b === 3 ? count > 0 : count === 0));
    return result(b < 3 ? makeArray(pairs) : text(Uint8Array.from(pairs, ([key]) => key)));
  }
  if (name === 'strtr') {
    if (isPhpArray(b)) {
      const replacements = arrayEntries(b).map(([key, value]) => [String(key), phpString(value, arrayKind(b, key))]).filter(([key]) => {if (!key.length) warn(context, 'strtr(): empty keys are ignored'); return key.length;}).sort((x, y) => y[0].length - x[0].length);
      let output = ''; for (let i = 0; i < a.length;) {work(context, replacements.length); const found = replacements.find(([key]) => a.startsWith(key, i)); output += found ? found[1] : a[i]; i += found ? found[0].length : 1; if (output.length > 1048576) throw limit('String translation exceeds 1 MiB');}
      return result(output);
    }
    if (c === null) throw new TypeError('strtr(): second argument must be an array when third argument is omitted');
    const from = byteString(b), to = byteString(c), map = new Map(); for (let i = 0; i < Math.min(from.length, to.length); i++) map.set(from[i], to[i]);
    return result(fromByteString([...byteString(a)].map((char) => map.get(char) ?? char).join('')));
  }
  if (name === 'str_increment' || name === 'str_decrement') {
    if (!/^[a-zA-Z0-9]+$/.test(a)) valueError(`${name}(): string must be non-empty and alphanumeric`);
    const chars = [...a], increment = name === 'str_increment'; let carry = true;
    for (let i = chars.length - 1; i >= 0 && carry; i--) {
      const char = chars[i], low = /[0-9]/.test(char) ? '0' : /[a-z]/.test(char) ? 'a' : 'A', high = low === '0' ? '9' : low === 'a' ? 'z' : 'Z';
      if (char === (increment ? high : low)) chars[i] = increment ? low : high;
      else {chars[i] = String.fromCharCode(char.charCodeAt(0) + (increment ? 1 : -1)); carry = false;}
    }
    if (carry) {if (increment) chars.unshift(/[0-9]/.test(a[0]) ? '1' : /[a-z]/.test(a[0]) ? 'a' : 'A'); else {if (chars.length === 1) valueError('str_decrement(): string is not decrementable'); chars.shift();}}
    else if (!increment && chars[0] === '0' && chars.length > 1) chars.shift();
    return result(chars.join(''));
  }
  if (name === 'levenshtein') {
    const x = bytes(a), y = bytes(b); work(context, x.length * y.length);
    let row = Array.from({length: y.length + 1}, (_, i) => i * c);
    for (let i = 0; i < x.length; i++) {const next = [(i + 1) * e]; for (let j = 0; j < y.length; j++) next.push(Math.min(row[j + 1] + e, next[j] + c, row[j] + (x[i] === y[j] ? 0 : d))); row = next;}
    return result(row[y.length]);
  }
  if (['sprintf', 'vsprintf', 'printf', 'vprintf'].includes(name)) {
    const values = name[0] === 'v' ? arrayEntries(b).map(([key, value]) => ({value, kind: arrayKind(b, key)})) : items.slice(1);
    const output = formatString(a, values, context);
    if (name.endsWith('printf') && !name.endsWith('sprintf')) {console.log(output); return result(bytes(output).length);}
    return result(output);
  }
  if (name === 'sscanf') return scanString(a, b, items.slice(2), context);
  return runStringCodecs(name, items, context);
};
