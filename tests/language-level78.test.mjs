import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData, resolveType} from '../src-js/core/value.js';
import {builtinNames, phpRound} from '../src-js/core/php-builtins.js';

const source = {file: 'service.php', line: 21, strictTypes: true, phpVersion: 80400};
const call = (name, ...args) => ({$expression: {operation: 'builtin', left: name, right: {arguments: args.map((value) => ({value})), source}}});
const evaluate = (name, ...args) => resolveData(call(name, ...args), {});

test('builtin calls use a closed whitelist and report their PHP call site', () => {
  assert.ok(builtinNames.includes('sqrt') && builtinNames.includes('array_map') && builtinNames.includes('sprintf'));
  assert.equal(new Set(builtinNames).size, builtinNames.length);
  for (const name of ['eval', 'constructor', '__proto__', 'fgets', 'fprintf']) {
    assert.throws(() => evaluate(name, 'anything'), (error) => error.source === source && /Unsupported frontend builtin/.test(error.message));
  }
  assert.throws(() => evaluate('strlen', 7), (error) => error instanceof TypeError && error.source === source);
  assert.throws(() => evaluate('random_int', 5, 1), (error) => error.name === 'ValueError' && error.source === source);
});

test('byte operations preserve UTF-8 and reject partial characters without replacement', () => {
  assert.equal(evaluate('strlen', 'André😀'), 10);
  assert.equal(evaluate('substr', 'André😀', -4), '😀');
  assert.equal(evaluate('substr', '\uFEFFabc', 0), '\uFEFFabc');
  assert.throws(() => evaluate('substr', 'é', 0, 1), (error) => error.code === 'PHP_INVALID_UTF8');
  assert.equal(evaluate('strtoupper', 'André'), 'ANDRé');
  assert.equal(evaluate('trim', '\u00A0abc\u00A0'), '\u00A0abc\u00A0');
});

test('random integers cover exact safe bounds without floating point range bias', () => {
  for (let i = 0; i < 100; i++) {
    const value = evaluate('random_int', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    assert.ok(Number.isSafeInteger(value));
    const die = evaluate('random_int', 1, 6);
    assert.ok(die >= 1 && die <= 6);
  }
  assert.equal(evaluate('random_int', 17, 17), 17);
});

test('rounding keeps PHP float kinds, ties, negative precision and version semantics', () => {
  for (const [mode, positive, negative] of [[1, 3, -3], [2, 2, -2], [3, 2, -2], [4, 3, -3]]) {
    assert.equal(phpRound(2.5, 0, mode), positive);
    assert.equal(phpRound(-2.5, 0, mode), negative);
  }
  assert.equal(phpRound(-1.25, 1), -1.3);
  assert.equal(phpRound(125, -1), 130);
  assert.equal(phpRound(0.285, 2), 0.29);
  assert.equal(phpRound(1.4999999999999998, 0, 1, 80300), 2);
  assert.equal(phpRound(1.4999999999999998, 0, 1, 80400), 1);
  assert.equal(phpRound(1.5, 0, 999, 80300), 2);
  for (const version of [80200, 80300, 80400]) {
    assert.equal(phpRound(-0.005, 2, 2, version), version < 80400 ? 0 : -0);
    assert.equal(phpRound(-0.005, 2, 3, version), version < 80400 ? 0 : -0);
    assert.equal(phpRound(-0.004, 2, 2, version), -0);
    assert.equal(phpRound(-0, 2, 2, version), -0);
  }
  const node = call('round', 2), context = {};
  const value = resolveData(node, {}, context);
  assert.equal(resolveType(node, {}, context, value), 'double');
});

test('money formatting retains binary double low digits while integer arithmetic stays exact', () => {
  assert.equal(evaluate('intdiv', Number.MAX_SAFE_INTEGER, 3), 3002399751580330);
  assert.equal(evaluate('number_format', -0.004, 2), '0.00');
  assert.equal(evaluate('number_format', 1234.5, 2, ',', ' '), '1 234,50');
  assert.equal(evaluate('number_format', -2.675, 25), '-2.6749999999999998223643161');
  assert.equal(evaluate('number_format', 1e21, 2), '1,000,000,000,000,000,000,000.00');
  assert.throws(() => evaluate('intdiv', 1, 0), (error) => error.name === 'DivisionByZeroError');
});

test('string and formatting growth is bounded', () => {
  assert.throws(() => evaluate('number_format', 1, 1001), (error) => error.code === 'PHP_BUILTIN_LIMIT');
  assert.throws(() => evaluate('str_replace', 'x', 'long', 'x'.repeat(300000)), (error) => error.code === 'PHP_BUILTIN_LIMIT');
  assert.throws(() => evaluate('explode', ',', ','.repeat(10000)), (error) => error.code === 'PHP_BUILTIN_LIMIT');
});
