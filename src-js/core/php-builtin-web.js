import {arrayEntries, arrayKind, makeArray, isPhpArray} from './php-arrays.js';
import {isPhpObject} from './php-object-values.js';
import {runObjects} from './php-builtin-objects.js';
import {phpString, phpType} from './php-values.js';
import {bytes, text, byteString, bounded, failure, work, limit} from './php-builtin-support.js';

export const webNames = ['parse_url', 'http_build_query', 'urlencode', 'urldecode', 'rawurlencode', 'rawurldecode', 'base64_encode', 'base64_decode'];
const encode = (value, raw) => [...bytes(value)].map((n) => n >= 65 && n <= 90 || n >= 97 && n <= 122 || n >= 48 && n <= 57 || [45,46,95].includes(n) || raw && n === 126 ? String.fromCharCode(n) : !raw && n === 32 ? '+' : '%' + n.toString(16).toUpperCase().padStart(2, '0')).join('');
const decode = (value, raw) => {const input = bytes(value), output = []; for (let i = 0; i < input.length; i++) {if (input[i] === 37 && i + 2 < input.length && /^[\da-f]{2}$/i.test(String.fromCharCode(input[i+1], input[i+2]))) {output.push(parseInt(String.fromCharCode(input[i+1], input[i+2]), 16)); i += 2;} else output.push(!raw && input[i] === 43 ? 32 : input[i]);} return text(Uint8Array.from(output));};
const base64 = (value, strict) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  if (strict) {const stripped = value.replace(/[\t\n\r ]/g, ''); if (!/^[A-Za-z0-9+/]*={0,2}$/.test(stripped)) return false; const first = stripped.indexOf('='), size = first < 0 ? stripped.length : first; if (size % 4 === 1 || first >= 0 && (stripped.length % 4 !== 0 || size % 4 === 0)) return false;}
  let buffer = 0, bits = 0; const output = [];
  for (const char of value) {const n = alphabet.indexOf(char); if (n < 0) continue; buffer = (buffer << 6) | n; bits += 6; if (bits >= 8) {bits -= 8; output.push((buffer >> bits) & 255);}}
  return text(Uint8Array.from(output));
};
// PHP parses partial URLs without resolving them against a browser base URL.
const parseUrl = (input) => {
  const out = {}, clean = (value) => value.replace(/[\x00-\x1f\x7f]/g, '_');
  let rest = input, authority = false;
  const colon = rest.indexOf(':'), scheme = colon > 0 && /^[a-z0-9+.-]+$/i.test(rest.slice(0, colon));
  const portLike = colon >= 0 && /^\d{1,5}(?:\/|$)/.test(rest.slice(colon + 1));
  if (scheme && !portLike) {out.scheme = clean(rest.slice(0, colon)); rest = rest.slice(colon + 1); if (rest.startsWith('//')) {authority = true; rest = rest.slice(2);} }
  else if (portLike) authority = true;
  else if (rest.startsWith('//')) {authority = true; rest = rest.slice(2);}
  if (authority) {
    const end = rest.search(/[/?#]/), hostPart = end < 0 ? rest : rest.slice(0,end); rest = end < 0 ? '' : rest.slice(end);
    let host = hostPart; const at = host.lastIndexOf('@');
    if (at >= 0) {const credentials = host.slice(0,at), separator = credentials.indexOf(':'); out.user = clean(separator < 0 ? credentials : credentials.slice(0,separator)); if (separator >= 0) out.pass = clean(credentials.slice(separator+1)); host = host.slice(at+1);}
    const close = host.indexOf(']'), portAt = host[0] === '[' && close >= 0 ? (host[close+1] === ':' ? close+1 : -1) : host.lastIndexOf(':');
    if (portAt >= 0) {const raw = host.slice(portAt+1); if (raw !== '' && (!/^\d{1,5}$/.test(raw) || Number(raw)>65535)) return false; if (raw !== '') out.port = Number(raw); host = host.slice(0,portAt);}
    if (host === '' && (out.scheme || '').toLowerCase() !== 'file') return false;
    if (host !== '') out.host = clean(host);
    if ((out.scheme || '').toLowerCase() === 'file' && /^\/[a-z]:/i.test(rest)) rest = rest.slice(1);
  }
  const fragment = rest.indexOf('#'); if (fragment >= 0) {out.fragment = clean(rest.slice(fragment+1)); rest = rest.slice(0,fragment);}
  const query = rest.indexOf('?'); if (query >= 0) {out.query = clean(rest.slice(query+1)); rest = rest.slice(0,query);}
  if (rest !== '' || !authority && !Object.hasOwn(out,'scheme') && !Object.hasOwn(out,'query') && !Object.hasOwn(out,'fragment')) out.path = clean(rest);
  return makeArray(['scheme','host','port','user','pass','path','query','fragment'].filter((key) => Object.hasOwn(out,key)).map((key) => [key,out[key]]));
};
export const runWeb = (name, items, context) => {
  if (!webNames.includes(name)) return null;
  const [a,b,c,d] = items.map((item) => item.value); let value;
  if (typeof a === 'string') work(context, bytes(a).length);
  if (name === 'urlencode' || name === 'rawurlencode') value = encode(a, name === 'rawurlencode');
  else if (name === 'urldecode' || name === 'rawurldecode') value = decode(a, name === 'rawurldecode');
  else if (name === 'base64_encode') value = btoa(byteString(a));
  else if (name === 'base64_decode') value = base64(a,b);
  else if (name === 'parse_url') {if (b < -1 || b > 7) throw failure('ValueError','parse_url(): Argument #2 ($component) must be a valid URL component identifier'); value = parseUrl(a); if (b !== -1 && value !== false) value = value[['scheme','host','port','user','pass','path','query','fragment'][b]] ?? null;}
  else {
    const parts = [], seen = new Set(), raw = d === 2, separator = c ?? context.source?.argSeparatorOutput ?? '&'; let size = 0;
    const walk = (input, prefix = null, depth = 0) => {
      if (depth > 64) throw limit('http_build_query(): frontend nesting exceeds 64 levels');
      if (seen.has(input)) return;
      seen.add(input);
      try {
        const values = isPhpObject(input) ? runObjects('get_object_vars', [{value:input,kind:'object'}], {...context, readOnly:false, objectScope:null}).value : input;
        for (const [key, part] of arrayEntries(values)) {
          work(context); const field = prefix === null ? (typeof key === 'number' ? b + key : key) : prefix + '[' + key + ']';
          if (isPhpArray(part) || isPhpObject(part)) {walk(part,field,depth+1);continue;}
          if (part === null || typeof part === 'function' || part instanceof Error) continue;
          const text = typeof part === 'boolean' ? (part ? '1' : '0') : phpString(part,arrayKind(values,key),context);
          const pair = encode(field,raw) + '=' + encode(text,raw); size += bytes(pair).length + (parts.length ? bytes(separator).length : 0);
          if (size > 1048576) throw limit('http_build_query(): result exceeds 1 MiB'); parts.push(pair);
        }
      } finally {seen.delete(input);}
    };
    walk(a); value = parts.join(separator);
  }
  if (typeof value === 'string') bounded(value);
  return {value,kind:phpType(value)};
};
