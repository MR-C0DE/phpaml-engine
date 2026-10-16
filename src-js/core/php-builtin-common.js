import {md5, sha1, ripemd160} from '@noble/hashes/legacy.js';
import {sha224, sha256, sha384, sha512, sha512_224, sha512_256} from '@noble/hashes/sha2.js';
import {hmac} from '@noble/hashes/hmac.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import {bytes, bounded, work, failure} from './php-builtin-support.js';
import {warn} from './diagnostics.js';

const patterns = {
  ctype_alnum: /^[A-Za-z0-9]+$/, ctype_alpha: /^[A-Za-z]+$/,
  ctype_cntrl: /^[\x00-\x1f\x7f]+$/, ctype_digit: /^[0-9]+$/,
  ctype_graph: /^[\x21-\x7e]+$/, ctype_lower: /^[a-z]+$/,
  ctype_print: /^[\x20-\x7e]+$/, ctype_punct: /^[!-/:-@\[-`{-~]+$/,
  ctype_space: /^[\x09-\x0d ]+$/, ctype_upper: /^[A-Z]+$/, ctype_xdigit: /^[A-Fa-f0-9]+$/,
};
export const hashAlgorithms = Object.freeze({md5, sha1, ripemd160, sha224, sha256, sha384, sha512, 'sha512/224': sha512_224, 'sha512/256': sha512_256});
export const runCommon = (name, items, context) => {
  const [a, b, c, d] = items.map(item => item.value);
  if (Object.hasOwn(patterns, name)) {
    let value = a;
    if (typeof value !== 'string') {
      warn(context, `${name}(): Non-string arguments are deprecated`, 'PHP_DEPRECATED');
      if (items[0].kind !== 'integer') return {value: false, kind: 'boolean'};
      value = a >= -128 && a <= 255 ? String.fromCharCode(a & 255) : String(a);
    }
    bounded(value); work(context, value.length);
    return {value: value.match(patterns[name])?.[0] === value, kind: 'boolean'};
  }
  if (name === 'hash_algos' || name === 'hash_hmac_algos') return {value: Object.keys(hashAlgorithms), kind: 'array'};
  if (name === 'hash_equals') {
    bounded(a); bounded(b); work(context, a.length + b.length);
    const left = bytes(a), right = bytes(b);
    if (left.length !== right.length) return {value: false, kind: 'boolean'};
    let difference = 0;
    for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
    return {value: difference === 0, kind: 'boolean'};
  }
  if (name !== 'hash' && name !== 'hash_hmac') return null;
  const algorithm = a.toLowerCase();
  if (!Object.hasOwn(hashAlgorithms, algorithm)) throw failure('ValueError', 'Unsupported frontend hash algorithm: ' + a);
  if (name === 'hash' ? c : d) throw failure('ValueError', 'Frontend hashes return hexadecimal text; binary output is not supported');
  bounded(b); if (name === 'hash_hmac') bounded(c);
  const input = bytes(b), key = name === 'hash_hmac' ? bytes(c) : null;
  work(context, input.length + (key?.length || 0) + 256);
  const digest = key ? hmac(hashAlgorithms[algorithm], key, input) : hashAlgorithms[algorithm](input);
  return {value: bytesToHex(digest), kind: 'string'};
};
