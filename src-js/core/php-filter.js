import {arrayEntries, arrayKind, makeArray, isPhpArray, clonePhp} from './php-arrays.js';
import {isPhpObject, objectData} from './php-object-values.js';
import {magicMember} from './php-magic.js';
import {phpString, phpType, phpInt} from './php-values.js';
import {bytes, fromByteString, byteString, failure, limit, work} from './php-builtin-support.js';

const scalar = 33554432, required = 16777216, force = 67108864, nullable = 134217728, failed = Symbol('filter failure');
const specific = {257:3,258:0,259:8192,272:0,273:786432,274:1048576,275:15728640,276:0,277:1048576,514:60,515:60,516:380,517:0,518:0,519:0,520:28672,522:128,523:0,1024:0};
const unsupported = (message) => failure('ValueError', 'Frontend filter_var(): ' + message);
const trim = (value) => value.replace(/^[\x09-\x0d ]+|[\x09-\x0d ]+$/g, '');
const ipv4 = (value) => /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) && value.split('.').every((n) => Number(n) <= 255);
const ipv6 = (value) => {
  if (!value.includes(':') || /[^\da-fA-F:.]/.test(value)) return null;
  if (value.includes('.')) {const at = value.lastIndexOf(':'), tail = value.slice(at + 1); if (!ipv4(tail)) return null; const n = tail.split('.').map(Number); value = value.slice(0, at + 1) + ((n[0] << 8) + n[1]).toString(16) + ':' + ((n[2] << 8) + n[3]).toString(16);}
  const pieces = value.split('::'); if (pieces.length > 2) return null;
  const left = pieces[0] ? pieces[0].split(':') : [], right = pieces[1] ? pieces[1].split(':') : [];
  if ([...left,...right].some((n) => !/^[\da-fA-F]{1,4}$/.test(n)) || pieces.length === 1 && left.length !== 8 || pieces.length === 2 && left.length + right.length >= 8) return null;
  return [...left.map((n) => parseInt(n,16)),...Array(pieces.length === 2 ? 8-left.length-right.length : 0).fill(0),...right.map((n) => parseInt(n,16))];
};
const domain = (value, host) => {if (!value || bytes(value).length > 253) return false; const labels = value.replace(/\.$/, '').split('.'); return labels.every((part) => part.length > 0 && bytes(part).length <= 63 && (!host || /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(part)));};
const validEmail = (value,flags) => {
  if (bytes(value).length > 254 || /[\x00-\x20\x7f]/.test(value) || !(flags&1048576)&&/[^\x00-\x7f]/.test(value)) return false;
  const at = value.lastIndexOf('@'); if (at < 1 || bytes(value.slice(0,at)).length > 64) return false;
  const local = value.slice(0,at), host = value.slice(at+1);
  if (!(local.startsWith('"')&&local.endsWith('"')?/^"(?:[^"\\\x00-\x20\x7f]|\\[\x21-\x7e])*"$/.test(local):/^[a-z0-9!#$%&'*+/=?^_`{|}~\x80-\uffff-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~\x80-\uffff-]+)*$/i.test(local))) return false;
  if (host[0] === '[' && host.at(-1) === ']') {const address = host.slice(1,-1); return ipv4(address) || !!ipv6(address.replace(/^IPv6:/i, ''));}
  return domain(host, true) && host.includes('.') && !/^\d+$/.test(host.split('.').at(-1)) && !host.endsWith('.');
};
const validUrl = (value, flags) => {
  if(/[^\x00-\x7f]/.test(value))return false;
  if(/^mailto:[^@]+@[^@]+$/i.test(value))return !(flags&262144)&&!(flags&524288);
  if(/^news:[^\s]+$/i.test(value))return !(flags&262144)&&!(flags&524288);
  const match = value.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i); if (!match || /[\x00-\x20\x7f]/.test(value)) return false;
  let authority = match[2]; const at = authority.lastIndexOf('@'); if (at >= 0) {if (!/^[a-z0-9._~!$&'()*+,;=:%-]+$/i.test(authority.slice(0,at))) return false; authority = authority.slice(at+1);}
  let host, port;
  if (authority[0] === '[') {const close = authority.indexOf(']'); if (close < 0 || !ipv6(authority.slice(1,close))) return false; host = authority.slice(0,close+1); if (authority.length > close+1) {if (authority[close+1] !== ':') return false; port = authority.slice(close+2);}}
  else {const parts = authority.split(':'); if (parts.length > 2) return false; [host,port] = parts; if (host && !domain(host,true)) return false;}
  if (!host && match[1].toLowerCase() !== 'file' || port !== undefined && (!/^\d+$/.test(port) || Number(port)>65535)) return false;
  return (!(flags & 262144) || !!match[3]) && (!(flags & 524288) || match[4] !== undefined);
};
export const runFilter = (items, context, invoke, builtin) => {
  const [input, filter, configuration] = items.map((item) => item.value);
  if (!Object.hasOwn(specific, filter)) throw unsupported('unsupported or deprecated filter');
  const flags = isPhpArray(configuration) ? configuration.flags ?? 0 : configuration;
  if (!Number.isInteger(flags) || flags & ~(scalar|required|force|nullable|specific[filter])) throw unsupported('unsupported flags');
  const options = isPhpArray(configuration) ? configuration.options ?? makeArray() : makeArray();
  if (filter !== 1024 && !isPhpArray(options)) throw unsupported('options must be an array');
  for (const key of ['min_range','max_range']) if (filter !== 1024 && options[key] != null && (typeof options[key] !== 'number' || Math.abs(options[key])>Number.MAX_SAFE_INTEGER)) throw limit('Frontend filter_var(): range options exceed exact numeric precision');
  if (filter === 259 && options.decimal != null && (typeof options.decimal !== 'string' || bytes(options.decimal).length !== 1)) throw unsupported('decimal must be one byte');
  if (filter === 259 && options.thousand != null) throw unsupported('custom thousand separators are not supported');
  const fallback = () => filter !== 1024 && Object.hasOwn(options,'default') ? clonePhp(options.default) : flags & nullable ? null : false;
  let returnedKind = null;
  const single = (value, kind) => {
    if (typeof value === 'function' || isPhpObject(value) && !magicMember(objectData(value).definition.name, '__tostring', context)) return failed;
    const text = phpString(value, kind, context);
    if (bytes(text).length > 1048576) throw limit('Frontend filter_var(): input exceeds 1 MiB'); work(context, text.length);
    const raw = trim(text);
    if (filter === 1024) {const result=invoke(options,[{value:text,kind:'string'}],true);returnedKind=result.kind;return result.value;}
    if (filter === 272) {
      if (typeof options.regexp !== 'string') throw failure('ValueError', 'filter_var(): "regexp" option is missing');
      const memory=context.builtinMemory ||= {}, previous=memory.pregError;
      try {const match=builtin('preg_match',[{value:options.regexp,kind:'string'},{value:text,kind:'string'}]); return match.value===1 ? text : failed;}
      finally {memory.pregError=previous;}
    }
    if (filter === 257) {
      let value;
      if (flags & 2 && /^0x[\da-f]+$/i.test(raw)) value = BigInt(raw);
      else if (flags & 1 && /^0(?:o)?[0-7]*$/i.test(raw)) {const digits = raw.replace(/^0o?/i,''); value = BigInt('0o'+(digits||'0'));}
      else if (/^[+-]?(?:0|[1-9]\d*)$/.test(raw)) value = BigInt(raw); else return failed;
      if (value < -9223372036854775808n || value > 18446744073709551615n || !(flags & 3) && value > 9223372036854775807n) return failed;
      if (value > 9223372036854775807n) value -= 18446744073709551616n;
      if (options.min_range != null && value < BigInt(Math.trunc(options.min_range)) || options.max_range != null && value > BigInt(Math.trunc(options.max_range))) return failed;
      if (value < -9007199254740991n || value > 9007199254740991n) throw limit('Frontend filter_var(): integer exceeds exact numeric precision'); return Number(value);
    }
    if (filter === 258) {const value=raw.toLowerCase(); return ['1','true','on','yes'].includes(value) ? true : ['','0','false','off','no'].includes(value) ? false : failed;}
    if (filter === 259) {
      let number = raw; const decimal = options.decimal ?? '.';
      if (decimal !== '.') {if (number.includes('.')) return failed; number = number.replace(decimal,'.');}
      if (flags & 8192 && /[,' ]/.test(number)) {if (!/^[+-]?\d{1,3}(?:([,'])\d{3})(?:\1\d{3})*(?:\.\d*)?(?:e[+-]?\d+)?$/i.test(number)) return failed; number = number.replace(/[,' ]/g,'');}
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(number)) return failed;
      const value = Number(number); if (!Number.isFinite(value) || /e-/i.test(number) && value === 0 || options.min_range != null && value < options.min_range || options.max_range != null && value > options.max_range) return failed; returnedKind='double'; return value;
    }
    if (filter === 274) return validEmail(text,flags) ? text : failed;
    if (filter === 273) return validUrl(text,flags) ? text : failed;
    if (filter === 277) return domain(text,flags&1048576) ? text : failed;
    if (filter === 276) return /^(?:[\da-f]{2}([:-]))(?:[\da-f]{2}\1){4}[\da-f]{2}$/i.test(text) || /^(?:[\da-f]{4}\.){2}[\da-f]{4}$/i.test(text) ? text : failed;
    if (filter === 275) {
      const v4=ipv4(text), v6=ipv6(text); if (!v4&&!v6 || flags&1048576&&!v4 || flags&2097152&&!v6) return failed;
      if (v4) {const [a,b]=text.split('.').map(Number); if (flags&8388608&&(a===10||a===172&&b>=16&&b<=31||a===192&&b===168) || flags&4194304&&(a===0||a===127||a===169&&b===254||a>=240)) return failed;}
      else if (flags&8388608&&(v6[0]&0xfe00)===0xfc00 || flags&4194304&&(text.includes('.')||v6.slice(0,5).every((n)=>n===0)&&v6[5]===65535||v6.slice(0,7).every((n)=>n===0)&&v6[7]<=1||(v6[0]&0xffc0)===0xfe80)) return failed;
      return text;
    }
    let rawBytes = byteString(text);
    if (flags&4) rawBytes=rawBytes.replace(/[\x00-\x1f]/g,''); if (flags&8) rawBytes=rawBytes.replace(/[\x7f-\xff]/g,'');
    if (filter===517) return text.replace(/[^a-z0-9!#$%&'*+\-/=?^_`{|}~@.\[\]]/gi,'');
    if (filter===518) return text.replace(/[^a-z0-9$\-_.+!*'(),{}|\\^~\[\]`<>#%";/?:@&=]/gi,'');
    if (filter===519) return text.replace(/[^0-9+-]/g,'');
    if (filter===520) return [...text].filter((c)=>/[0-9+-]/.test(c)||c==='.'&&(flags&4096)||c===','&&(flags&8192)||/[eE]/.test(c)&&(flags&16384)).join('');
    if (filter===523) return builtin('addslashes',[{value:text,kind:'string'}]).value;
    if (filter===522) return builtin('htmlentities',[{value:text,kind:'string'},{value:flags&128?0:3,kind:'integer'},{value:'UTF-8',kind:'string'},{value:false,kind:'boolean'}]).value;
    if (filter===514) return [...rawBytes].map((c)=>/[a-z0-9_.-]/i.test(c)?c:'%'+c.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0')).join('');
    rawBytes = [...rawBytes].map((c)=>{const n=c.charCodeAt(0); return filter===515&&('<>&"\''.includes(c)||n<32) || flags&16&&n<32 || flags&32&&n>=127 || flags&64&&c==='&' ? `&#${n};` : c;}).join('');
    const output=fromByteString(rawBytes); return filter===516&&flags&256&&output===''?null:output;
  };
  const failureResult = () => {const value=fallback();return {value,kind:filter!==1024&&Object.hasOwn(options,'default')?arrayKind(options,'default'):phpType(value)};};
  const walk = (value, kind, depth=0) => {if(depth>64) throw limit('Frontend filter_var(): arrays exceed 64 levels'); if(isPhpArray(value)){const entries=arrayEntries(value);if(entries.length>10000)throw limit('Frontend filter_var(): arrays exceed 10000 entries');const types=new Map();return {value:makeArray(entries.map(([key,item])=>{const next=walk(item,arrayKind(value,key),depth+1);types.set(key,next.kind);return[key,next.value];}),types),kind:'array'};} returnedKind=null;const out=single(value,kind);return out===failed?failureResult():{value:out,kind:returnedKind||phpType(out)};};
  if (isPhpArray(input) && (!(flags&(required|force))||flags&scalar) || !isPhpArray(input)&&flags&required) return failureResult();
  const {value,kind}=walk(input,items[0].kind);
  if (!isPhpArray(input)&&flags&force) return {value:makeArray([[0,value]],new Map([[0,kind]])),kind:'array'};
  return {value,kind};
};

export const runFilterArray = (items, context, invoke, builtin) => {
  const [input, options, addEmpty] = items.map((item) => item.value), result = [], kinds = new Map();
  const fields = isPhpArray(options) ? arrayEntries(options) : arrayEntries(input).map(([key]) => [key, options]);
  for (const [key, option] of fields) {
    work(context);
    if (isPhpArray(options) && typeof key !== 'string') throw new TypeError('filter_var_array(): options must contain only string keys');
    if (isPhpArray(options) && key === '') throw failure('ValueError','filter_var_array(): options cannot contain empty keys');
    if (!Object.hasOwn(input,key)) {if (addEmpty) {result.push([key,null]);kinds.set(key,'NULL');} continue;}
    const filter = isPhpArray(option) ? Object.hasOwn(option,'filter') ? phpInt(option.filter) : 516 : option == null ? 516 : phpInt(option);
    const next = runFilter([{value:input[key],kind:arrayKind(input,key)},{value:filter,kind:'integer'},{value:isPhpArray(option)?option:0,kind:isPhpArray(option)?'array':'integer'}],context,invoke,builtin);
    result.push([key,next.value]); kinds.set(key,next.kind);
  }
  return {value:makeArray(result,kinds),kind:'array'};
};
