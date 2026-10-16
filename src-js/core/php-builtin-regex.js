import {isFrontendCallable} from './php-functions.js';
import {regexVM} from './php-regex-vm.js';
import {arrayEntries, arrayKind, makeArray} from './php-arrays.js';
import {phpString, phpType} from './php-values.js';
import {bytes, byteString, fromByteString, bounded, failure, limit, work} from './php-builtin-support.js';
import {warn} from './diagnostics.js';

const errorMessages = ['No error', 'Internal error', 'Backtrack limit exhausted', 'Recursion limit exhausted', 'Malformed UTF-8 characters, possibly incorrectly encoded', 'The offset did not correspond to the beginning of a valid UTF-8 code point', 'JIT stack limit exhausted'];
const unsupported = (message) => failure('ValueError', 'Frontend PCRE subset: ' + message);

// Deliberately bounded PCRE subset. Reject features whose JavaScript meaning
// differs; repeated groups and backreferences use an explicit work budget.
const pattern = (raw, context) => {
  if (bytes(raw).length > 4096) throw limit('Frontend regex patterns are limited to 4096 bytes');
  if (!raw || /[A-Za-z0-9\\\s]/.test(raw[0])) throw new SyntaxError('Delimiter must not be alphanumeric, backslash, or whitespace');
  const open = raw[0], close = ({'(': ')', '[': ']', '{': '}', '<': '>'})[open] || open;
  let end = -1;
  for (let i = raw.length - 1; i > 0; i--) if (raw[i] === close) {let escapes = 0; for (let j = i - 1; j >= 0 && raw[j] === '\\'; j--) escapes++; if (escapes % 2 === 0) {end = i; break;}}
  if (end < 0) throw new SyntaxError('No ending delimiter found');
  const modifiers = raw.slice(end + 1); if (/[^imsuxAD]/.test(modifiers)) throw unsupported('supported modifiers are i, m, s, u, x, A and D');
  let body = raw.slice(1, end), clean = '', inClass = false, escaped = false, captures = [], group = 0, unbounded = 0, combinations = 1;
  if (modifiers.includes('x')) {
    for (let i = 0; i < body.length; i++) {const c = body[i]; if (c === '\\') {clean += c + (body[++i] || ''); continue;} if (c === '[') inClass = true; if (c === ']') inClass = false; if (!inClass && c === '#') {while (i < body.length && body[i] !== '\n') i++; continue;} if (!inClass && /[\t\n\r\f\v ]/.test(c)) continue; clean += c;}
    body = clean;
  }
  if (/\(\?(?:[a-z-]+[:)]|\(|\||R|[0-9])/.test(body)) throw unsupported('inline modes, conditionals and recursion are unavailable');
  if (/\\(?:[gKCRXhHvVNQEG])|\(\*|\[\[:/.test(body)) throw unsupported('PCRE-only escapes and POSIX classes are unavailable');
  body = body.replace(/\(\?P<([A-Za-z_][A-Za-z0-9_]*)>/g, '(?<$1>');
  inClass = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i]; if (c === '\\') {i++; continue;} if (c === '[') {inClass = true; continue;} if (c === ']') {inClass = false; continue;} if (inClass) continue;
    if (c === '(' && body[i + 1] !== '?') {captures[++group] = null;}
    else if (c === '(' && body.slice(i, i + 3) === '(?<') {const found = body.slice(i).match(/^\(\?<([A-Za-z_][A-Za-z0-9_]*)>/); if (found) captures[++group] = found[1];}
    if (c === '|' || c === '?' && body[i - 1] !== '(' && !'*+}?'.includes(body[i - 1] || '')) combinations *= 2;
    if ('*+'.includes(c) || c === '{') {
      if (c === '{') {const match = body.slice(i).match(/^\{(\d+)(?:,(\d*))?\}/); if (!match) continue; const maximum = match[2] === '' ? Infinity : Number(match[2] ?? match[1]); if (!Number.isFinite(maximum)) unbounded++; else {if (maximum > 1000) throw unsupported('bounded repetitions are limited to 1000'); combinations *= Math.max(1, maximum - Number(match[1]) + 1);} i += match[0].length - 1;}
      else unbounded++;
    }
  }
  if (group > 32) throw unsupported('use at most 32 captures per pattern');
  const advanced=/\)[*+?{]|\(\?[=!>]|\(\?<[=!]|\\[1-9k]|[*+?]\?|[*+?}]\+|\|/.test(body)||unbounded>1||combinations>1000;
  body = body.replace(/\\A/g, '(?<![\\s\\S])').replace(/\\z/g, '(?![\\s\\S])').replace(/\\Z/g, '(?=\\n?(?![\\s\\S]))');
  const unicode = modifiers.includes('u');
  const word = unicode ? '\\p{L}\\p{N}_' + ((context.source?.phpVersion ?? 80400) >= 80400 ? '\\p{Mn}\\p{Pc}' : '') : 'A-Za-z0-9_';
  let rewritten = ''; inClass = false;
  for (let i = 0; i < body.length; i++) {let c = body[i]; if (c === '[') inClass = true; if (c === ']') inClass = false; if (c === '\\' && i + 1 < body.length) {const next = body[++i]; const classes = {s:unicode ? '\\p{Z}\\t\\n\\v\\f\\r' : '\\t\\n\\v\\f\\r ', w:word, d:unicode ? '\\p{Nd}' : '0-9'}; if (classes[next.toLowerCase()]) {if (inClass && next === next.toUpperCase()) throw unsupported('negated shorthand classes inside a character class are unavailable'); rewritten += inClass ? classes[next] : '[' + (next === next.toUpperCase() ? '^' : '') + classes[next.toLowerCase()] + ']';} else if (unicode && !inClass && (next === 'b' || next === 'B')) {const boundary = '(?:(?<=[' + word + '])(?![' + word + '])|(?<![' + word + '])(?=[' + word + ']))'; rewritten += next === 'b' ? boundary : '(?!' + boundary + ')';} else rewritten += '\\' + next; } else if (!inClass && c === '.' && !modifiers.includes('s')) rewritten += '[^\\n]'; else if (!inClass && c === '^' && modifiers.includes('m')) rewritten += '(?:^|(?<=\\n))'; else if (!inClass && c === '$' && modifiers.includes('m')) rewritten += '(?=\\n|(?![\\s\\S]))'; else if (!inClass && c === '$' && modifiers.includes('D') && !modifiers.includes('m')) rewritten += '(?![\\s\\S])'; else if (!inClass && c === '$' && !modifiers.includes('m')) rewritten += '(?=\\n?(?![\\s\\S]))'; else rewritten += c;}
  body = rewritten;
  if (modifiers.includes('A')) body = '^(?:' + body + ')';
  if (!unicode) body = byteString(body);
  const flags='gd'+(unicode?'u':'')+(modifiers.includes('i')?'i':'')+(modifiers.includes('s')?'s':'');
  let regex;try{regex=advanced?regexVM(body,flags,context):new RegExp(body,flags);}catch(error){throw new SyntaxError(error.message);}
  work(context, raw.length); return {regex, unicode, captures};
};
const subject = (raw, compiled, context) => {bounded(raw); if (bytes(raw).length > 16384) throw limit('Frontend regex subjects are limited to 16384 bytes'); work(context, raw.length * 2); return compiled.unicode ? raw : byteString(raw);};
const offsetIndex = (raw, offset, unicode) => {
  const length = bytes(raw).length; if (offset < 0) offset = length + offset;
  if (offset < 0 || offset > length) return -1;
  if (!unicode) return offset;
  let byte = 0, index = 0; for (const char of raw) {if (byte === offset) return index; byte += bytes(char).length; index += char.length;}
  return byte === offset ? index : -2;
};
const capturesArray = (match, compiled, flags, raw) => {
  const entries = []; let end = match.length;
  if (!(flags & 512)) while (end > 1 && match[end - 1] === undefined) end--;
  for (let i = 0; i < end; i++) {
    const present = match[i] !== undefined, value = present ? compiled.unicode ? match[i] : fromByteString(match[i]) : flags & 512 ? null : '';
    const index = present ? match.indices[i][0] : -1, offset = index < 0 ? -1 : compiled.unicode ? bytes(raw.slice(0, index)).length : index;
    const item = flags & 256 ? makeArray([[0, value], [1, offset]]) : value;
    if (compiled.captures[i]) entries.push([compiled.captures[i], item]); entries.push([i, item]);
  }
  return makeArray(entries);
};
const allMatches = (compiled, input, start, context, maximum = 10000) => {
  const matches = []; compiled.regex.lastIndex = start;
  while (matches.length < maximum) {
    const match = compiled.regex.exec(input); if (!match) break;
    matches.push(match); work(context, Math.max(1, match[0].length));
    if (!match[0].length && matches.length < maximum) {
      const position=compiled.regex.lastIndex;
      const retry=compiled.regex.execAt?.(input,position,true);
      if(retry){matches.push(retry);continue;}
      const char=input.codePointAt(position);
      compiled.regex.lastIndex=position+(compiled.unicode&&char>0xffff?2:1);
    }
  }
  if (matches.length >= 10000) throw limit('Frontend regex matches are limited to 10000'); return matches;
};

export const runRegex = (name, items, context, invoke) => {
  if (!name.startsWith('preg_')) return null;
  const memory = context.builtinMemory ||= {}, result = (value) => ({value, kind: phpType(value)}), values = items.map((item) => item.value);
  if (name === 'preg_last_error') return result(memory.pregError || 0);
  if (name === 'preg_last_error_msg') return result(errorMessages[memory.pregError || 0]);
  if (name === 'preg_quote') return result([...values[0]].map((char) => '.\\+*?[]^$(){}=!<>|:-#'.includes(char) || values[1] && char === values[1][0] ? '\\' + char : char).join(''));
  memory.pregError = 0;
  try {
    if (name === 'preg_replace_callback_array') {
      const [callbacks,input,maximum,,flags]=values;
      if(flags & ~(256|512))throw failure('ValueError',name+'(): invalid flags');
      for(const [,callback]of arrayEntries(callbacks))if(!isFrontendCallable(callback,context))throw new TypeError(name+'(): every value must be a valid callback');
      let output=input,total=0;
      for(const [rawPattern,callback] of arrayEntries(callbacks)) {
        if(typeof rawPattern!=='string')throw new TypeError(name+'(): pattern must be a string');
        const args=[{value:rawPattern},{value:callback},{value:output},{value:maximum},{value:0,ref:{set:n=>{total+=n;}}},{value:flags}];
        output=runRegex('preg_replace_callback',args,context,invoke).value;
        if(output===null)break;
      }
      items[3].ref?.set(total,'integer');return result(output);
    }
    if (name === 'preg_match' || name === 'preg_match_all') {
      const [rawPattern, raw, , flags, offset] = values;
      if (flags & ~(256 | 512 | (name === 'preg_match_all' ? 3 : 0)) || name === 'preg_match_all' && (flags & 3) === 3) throw failure('ValueError', `${name}(): invalid flags`);
      const compiled = pattern(rawPattern, context), input = subject(raw, compiled, context), start = offsetIndex(raw, offset, compiled.unicode);
      if (start < 0) {memory.pregError = start === -2 ? 5 : 1; return result(false);}
      const matches = allMatches(compiled, input, start, context, name === 'preg_match' ? 1 : 10000);
      let output;
      if (name === 'preg_match') output = matches.length ? capturesArray(matches[0], compiled, flags, raw) : makeArray();
      else if (flags & 2) output = matches.map((match) => capturesArray(match, compiled, flags, raw));
      else {
        const rows = matches.map((match) => capturesArray(match, compiled, flags | 512, raw)), entries = [];
        for (let i = 0; i <= compiled.captures.length - 1; i++) {const column = rows.map((row) => {const value = row[i]; return flags & 512 ? value : flags & 256 && value[0] === null ? [ '', -1 ] : value === null ? '' : value;}); if (compiled.captures[i]) entries.push([compiled.captures[i], column]); entries.push([i, column]);}
        if (!compiled.captures.length) entries.push([0, rows.map((row) => row[0])]); output = makeArray(entries);
      }
      items[2].ref?.set(output, 'array'); return result(matches.length);
    }
    if (name === 'preg_split') {
      const [rawPattern, raw, maximum, flags] = values;
      if (flags & ~7) throw failure('ValueError', 'preg_split(): invalid flags');
      const compiled = pattern(rawPattern, context), input = subject(raw, compiled, context), matches = allMatches(compiled, input, 0, context), parts = []; let cursor = 0, splits = 0;
      const append = (value, index) => {if (flags & 1 && value === '') return; const text = compiled.unicode ? value : fromByteString(value); const offset = compiled.unicode ? bytes(raw.slice(0, index)).length : index; parts.push(flags & 4 ? [text, offset] : text);};
      for (const match of matches) {if (maximum > 0 && splits >= maximum - 1) break; const previous = parts.length; append(input.slice(cursor, match.index), cursor); if (parts.length > previous) splits++; if (flags & 2) for (let i = 1; i < match.length; i++) if (match[i] !== undefined) append(match[i], match.indices[i][0]); cursor = match.index + match[0].length;}
      append(input.slice(cursor), cursor); return result(parts);
    }
    if (name === 'preg_grep') {
      const [rawPattern, input, flags] = values; if (flags & ~1) throw failure('ValueError', 'preg_grep(): invalid flags'); const compiled = pattern(rawPattern, context), entries = [];
      for (const [key, value] of arrayEntries(input)) {const raw = phpString(value, arrayKind(input, key), context), text = subject(raw, compiled, context); compiled.regex.lastIndex = 0; if (compiled.regex.test(text) !== !!(flags & 1)) entries.push([key, value]);} return result(makeArray(entries));
    }
    if (['preg_replace', 'preg_filter', 'preg_replace_callback'].includes(name)) {
      const [rawPattern, replacement, input, maximum] = values, callback = name === 'preg_replace_callback';
      const patterns = typeof rawPattern === 'string' ? [rawPattern] : arrayEntries(rawPattern).map(([, value]) => value), replacements = typeof replacement === 'string' || callback ? null : arrayEntries(replacement).map(([, value]) => value);
      if (typeof rawPattern === 'string' && replacements) throw new TypeError(`${name}(): replacement must be a string when pattern is a string`);
      const compiled = patterns.map((raw) => pattern(raw, context)); let count = 0;
      const replace = (raw, kind = 'string') => {
        let current = phpString(raw, kind, context), changed = false;
        for (let p = 0; p < compiled.length; p++) {
          const info = compiled[p], text = subject(current, info, context), matches = maximum === 0 ? [] : allMatches(info, text, 0, context, maximum > 0 ? Math.min(10000, maximum) : 10000), chunks = []; let cursor = 0;
          for (const match of matches) {
            chunks.push(text.slice(cursor, match.index)); let insert;
            if (callback) {const returned = invoke(replacement, [{value: capturesArray(match, info, values[5] || 0, current), kind: 'array'}]); insert = phpString(returned.value, returned.kind, context); if (!info.unicode) insert = byteString(insert);}
            else {const rawTemplate = replacements ? phpString(replacements[p] ?? '', undefined, context) : replacement, template = info.unicode ? rawTemplate : byteString(rawTemplate); insert = template.replace(/\\\\|\\\$|\$(?:\{(\d+)\}|(\d{1,2}))|\\(\d{1,2})/g, (token, a, b, c) => token === '\\\\' ? '\\' : token === '\\$' ? '$' : match[Number(a ?? b ?? c)] ?? '');}
            chunks.push(insert); cursor = match.index + match[0].length; count++; changed = true;
          }
          chunks.push(text.slice(cursor)); current = info.unicode ? bounded(chunks.join('')) : bounded(fromByteString(chunks.join('')));
        }
        return {current, changed};
      };
      let output;
      if (typeof input === 'string') {const row = replace(input); output = name === 'preg_filter' && !row.changed ? null : row.current;}
      else {const entries = []; for (const [key, value] of arrayEntries(input)) {const row = replace(value, arrayKind(input, key)); if (name !== 'preg_filter' || row.changed) entries.push([key, row.current]);} output = makeArray(entries);}
      items[4].ref?.set(count, 'integer'); return result(output);
    }
  } catch (error) {
    if(error.pcreError){memory.pregError=error.pcreError;return result(['preg_replace','preg_filter','preg_replace_callback','preg_replace_callback_array'].includes(name)?null:false);}
    if (!(error instanceof SyntaxError)) throw error;
    memory.pregError = 1; warn(context, `${name}(): Compilation failed: ${error.message}`);
    return result(['preg_replace', 'preg_filter', 'preg_replace_callback'].includes(name) ? null : false);
  }
  return null;
};
