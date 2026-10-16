import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData} from '../src-js/core/value.js';
import {invokeBuiltin} from '../src-js/core/php-builtins.js';
import {phpType} from '../src-js/core/php-values.js';
import {makeArray, arrayEntries, validatePhpValue} from '../src-js/core/php-arrays.js';

const source = {file: 'NativeService.php', line: 24, strictTypes: true, phpVersion: 80400};
const call = (name, ...args) => ({$expression: {operation: 'builtin', left: name, right: {arguments: args.map((value) => ({value})), source}}});
const evaluate = (name, ...args) => resolveData(call(name, ...args), {});
const direct = (name, values, context = {}) => invokeBuiltin(name, values.map((value) => ({value, kind: phpType(value)})), {}, {source, ...context});

test('native allocation limits reject oversized strings and arrays', () => {
  for (const [name, ...args] of [['str_repeat', 'a', 1048577], ['str_pad', 'a', 1048577], ['sprintf', '%2000000s', 'x'], ['range', 0, 10000], ['array_fill', 0, 10001, 1], ['array_pad', [], 10001, 1]]) {
    assert.throws(() => evaluate(name, ...args), (error) => error.code === 'PHP_BUILTIN_LIMIT' && error.source.file === source.file);
  }
});

test('expensive native calls share an event budget', () => {
  const context = {builtinBudget: {remaining: 1000000}};
  const expression = call('levenshtein', 'a'.repeat(700), 'b'.repeat(700));
  assert.equal(resolveData(expression, {}, context), 700);
  assert.equal(resolveData(expression, {}, context), 700);
  assert.throws(() => resolveData(expression, {}, context), (error) => error.code === 'PHP_BUILTIN_LIMIT');
});

test('invalid callbacks are checked even when no array element invokes them', () => {
  for (const [name, args] of [['array_map', ['system', []]], ['array_filter', [[], 42]], ['array_udiff', [[], [], 'eval']], ['array_uintersect_uassoc', [[], [], 'strcmp', 'file_get_contents']]]) {
    assert.throws(() => direct(name, args), TypeError);
  }
});

test('read-only expressions reject hidden output and randomness through dynamic calls', () => {
  for (const [name, args] of [['printf', ['hello']], ['str_shuffle', ['abc']], ['array_rand', [[1]]], ['strtok', ['a,b', ',']]]) {
    assert.throws(() => direct(name, args, {readOnly: true}), /Reactive text cannot run/);
  }
  assert.equal(direct('sprintf', ['%d', 3], {readOnly: true}).value, '3');
});

test('byte operations keep valid UTF-8 and reject binary values that cannot enter frontend strings', () => {
  assert.equal(evaluate('hex2bin', 'c3a9'), 'é');
  assert.throws(() => evaluate('hex2bin', 'ff'), (error) => error.code === 'PHP_INVALID_UTF8');
  assert.throws(() => evaluate('strrev', 'é'), (error) => error.code === 'PHP_INVALID_UTF8');
  assert.equal(evaluate('addcslashes', 'André', 'A'), '\\André');
});

test('non-finite math values can be inspected locally but cannot be stored in State', () => {
  const value = evaluate('sqrt', -1);
  assert.equal(direct('is_nan', [value]).value, true);
  assert.equal(direct('is_infinite', [evaluate('fdiv', 1, 0)]).value, true);
  assert.throws(() => validatePhpValue(value), /finite/);
  assert.throws(() => evaluate('pow', 2, 54), (error) => error.code === 'PHP_BUILTIN_LIMIT');
});

test('secure array selection preserves keys and samples without duplicates', () => {
  const value = makeArray([['a', 1], [7, 2], ['c', 3]]);
  for (let i = 0; i < 20; i++) {
    const keys = arrayEntries(direct('array_rand', [value, 2]).value).map(([, key]) => key);
    assert.equal(new Set(keys).size, 2);
    assert.ok(keys.every((key) => ['a', 7, 'c'].includes(key)));
  }
});

test('cryptographic compatibility hashes match standard vectors and preserve UTF-8 bytes', () => {
  assert.equal(evaluate('md5', ''), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(evaluate('sha1', ''), 'da39a3ee5e6b4b0d3255bfef95601890afd80709');
  assert.equal(evaluate('md5', 'abc'), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(evaluate('sha1', 'abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
});
