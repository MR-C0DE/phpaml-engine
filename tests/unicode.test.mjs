import test from 'node:test';
import assert from 'node:assert/strict';
import {invokeBuiltin, builtinNames} from '../src-js/core/php-builtins.js';
import {phpType} from '../src-js/core/php-values.js';
import {resolveData} from '../src-js/core/value.js';

const source = {file: 'UnicodeService.php', line: 12, strictTypes: true, phpVersion: 80400};
const call = (name, values, context = {}) => invokeBuiltin(name, values.map((value) => ({value, kind: phpType(value)})), {}, {source, ...context}).value;

test('28 Unicode functions share the closed native registry', () => {
  assert.equal(builtinNames.filter((name) => name.startsWith('mb_')).length, 28);
  assert.equal(call('mb_strlen', ['André 🌍']), 7);
  assert.equal(call('mb_strlen', ['é']), 2);
  assert.equal(call('mb_strlen', ['👨‍👩‍👧‍👦']), 7);
  assert.equal(call('mb_substr', ['été🌍', -1]), '🌍');
});

test('Unicode casing follows PHP full/simple mappings and contextual sigma', () => {
  assert.equal(call('mb_strtoupper', ['Straße ﬃ']), 'STRASSE FFI');
  assert.equal(call('mb_strtolower', ['ΟΣ ΟΣΑ ΙΣ́ ΙΣ́Α']), 'ος οσα ις́ ισ́α');
  assert.equal(call('mb_convert_case', ['ΟΣ İ', 5]), 'οσ i');
  assert.equal(call('mb_convert_case', ["a'B a-B ǳUNG ßTEST", 2]), "A'b A-B ǲung Sstest");
  assert.equal(call('mb_stripos', ['Straße', 'SS']), false);
  assert.equal(call('mb_stripos', ['Straße', 'ẞ']), 4);
  assert.equal(call('mb_strtolower', ['ΟΣ'], {source: {...source, phpVersion: 80200}}), 'οσ');
  assert.ok(call('mb_strtolower', ['A' + '\u0301'.repeat(64) + 'Σ']).endsWith('σ'));
  assert.ok(call('mb_strtolower', ['A' + '\u0301'.repeat(63) + 'Σ']).endsWith('ς'));
});

test('Unicode bounds apply before padding allocation and share the native event budget', () => {
  for (const [name, args] of [['mb_str_pad', ['é', 2000000]], ['mb_str_pad', ['', 400000, '🌍']], ['mb_str_split', ['a'.repeat(10001)]]]) {
    assert.throws(() => call(name, args), (error) => error.code === 'PHP_BUILTIN_LIMIT');
  }
  const context = {builtinBudget: {remaining: 10}};
  assert.equal(call('mb_strlen', ['André'], context), 5);
  assert.equal(call('mb_strlen', ['André'], context), 5);
  assert.throws(() => call('mb_strlen', ['a'], context), (error) => error.code === 'PHP_BUILTIN_LIMIT');
});

test('UTF-8 validation distinguishes malformed browser text and limits recursive inputs', () => {
  assert.equal(call('mb_check_encoding', [['été', ['🌍', null, 3]]]), true);
  assert.equal(call('mb_check_encoding', ['x\ud800']), false);
  assert.equal(call('mb_scrub', ['x\ud800']), 'x?');
  assert.equal(call('mb_scrub', ['x\ud800'], {source: {...source, mbSubstitute: 'none'}}), 'x');
  assert.throws(() => call('mb_strlen', ['x\ud800']), (error) => error.code === 'PHP_INVALID_UTF8');
  let nested = 'a'; for (let i = 0; i < 66; i++) nested = [nested];
  assert.throws(() => call('mb_check_encoding', [nested]), (error) => error.code === 'PHP_BUILTIN_LIMIT');
});

test('unsupported encoding and request checks are explicit errors with PHP source locations', () => {
  for (const [name, args] of [['mb_strlen', ['été', 'ISO-8859-1']], ['mb_check_encoding', []], ['mb_check_encoding', [null]], ['mb_chr', [65, 'invalid']]]) {
    assert.throws(() => resolveData({$expression: {operation: 'builtin', left: name, right: {arguments: args.map((value) => ({value})), source}}}, {}), (error) => error.name === 'ValueError' && error.source.file === source.file);
  }
  assert.throws(() => call('mb_strlen', ['été'], {source: {...source, mbEncoding: 'ISO-8859-1'}}), /UTF-8 only/);
  assert.equal(call('mb_strlen', ['été', 'UTF-8'], {source: {...source, mbEncoding: 'ISO-8859-1'}}), 3);
});

test('Unicode width, code points and bytes remain distinct', () => {
  assert.equal(call('mb_strwidth', ['漢🌍é']), 6);
  assert.equal(call('mb_strimwidth', ['漢字abc', 0, 5, '…']), '漢字…');
  assert.equal(call('mb_strcut', ['漢字かな', 2, -2]), '漢字');
  assert.equal(call('mb_trim', ['\u3000\u0085été\u00a0']), 'été');
  assert.equal(call('mb_chr', [0xd800]), false);
  assert.equal(call('mb_ord', ['🌍']), 0x1f30d);
});

test('NumberFormatter carries the server ICU currency default for decimal and percent styles', () => {
  for (const intlCurrencyFromLocale of [false, true]) {
    const context = {source: {...source, intlCurrencyFromLocale}};
    for (const style of [1, 2, 3, 12]) {
      const formatter = call('numfmt_create', ['fr_CA', style, null], context);
      assert.equal(call('numfmt_get_text_attribute', [formatter, 5], context),
        intlCurrencyFromLocale || [2, 12].includes(style) ? 'CAD' : 'XXX');
    }
  }
});

test('empty grapheme searches preserve the PHP runtime indexing convention', () => {
  const input = 'aé👨‍👩‍👧‍👦éz';
  for (const graphemeEmptySearchCodeUnits of [false, true]) {
    const context = {source: {...source, graphemeEmptySearchCodeUnits}};
    for (const name of ['grapheme_strpos', 'grapheme_stripos', 'grapheme_strrpos', 'grapheme_strripos']) {
      assert.equal(call(name, [input, '', -2], context), graphemeEmptySearchCodeUnits ? 13 : 3);
      assert.equal(call(name, [input, '', 0], context), name.includes('strr') ? (graphemeEmptySearchCodeUnits ? 16 : 5) : 0);
    }
    assert.equal(call('grapheme_strstr', [input, '', false], context), input);
    assert.equal(call('grapheme_strstr', [input, '', true], context), '');
  }
});
