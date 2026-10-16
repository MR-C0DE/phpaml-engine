import test from 'node:test';
import assert from 'node:assert/strict';
import {invokeBuiltin} from '../src-js/core/php-builtins.js';
import {phpType} from '../src-js/core/php-values.js';
import {arrayEntries, arrayKind} from '../src-js/core/php-arrays.js';

const call = (version, name, values, kinds = []) => invokeBuiltin(name,
  values.map((value, i) => ({value, kind: kinds[i] ?? phpType(value)})), {},
  {source: {phpVersion: version, strictTypes: true}}).value;

test('formatted infinities retain the native PHP version sign behavior', () => {
  for (const version of [80200, 80300, 80400]) {
    assert.equal(call(version, 'sprintf', ['%+f %+e %+g', NaN, Infinity, -Infinity]),
      version < 80400 ? 'NaN INF INF' : 'NaN INF -INF');
  }
});

test('PHP 8.2 character ranges with an explicitly floating step become numeric', () => {
  for (const version of [80200, 80300, 80400]) {
    const value = call(version, 'range', ['a', 'c', 1], ['string', 'string', 'double']);
    assert.deepEqual(arrayEntries(value), version < 80300 ? [[0, 0]] : [[0, 'a'], [1, 'b'], [2, 'c']]);
    assert.equal(arrayKind(value, 0), version < 80300 ? 'double' : 'string');
  }
});

test('PHP 8.2 case-insensitive searches short-circuit an empty haystack', () => {
  for (const name of ['mb_stripos', 'mb_strripos']) {
    for (const offset of [-8, 0, 8]) assert.equal(call(80200, name, ['', '', offset]), false);
    assert.equal(call(80300, name, ['', '', 0]), 0);
    assert.throws(() => call(80300, name, ['', '', 8]), {name: 'ValueError'});
  }
  for (const name of ['mb_stristr', 'mb_strrichr']) {
    assert.equal(call(80200, name, ['', '', false]), false);
    assert.equal(call(80300, name, ['', '', false]), '');
  }
});

test('BCMath integer operands keep PHP 8.2 decimal-scale validation', () => {
  for (const [name, args, expected] of [
    ['bcpow', ['2', '2.00', 2], '4.00'],
    ['bcpowmod', ['2.00', '3', '5', 2], '3.00'],
    ['bcpowmod', ['2', '3.00', '5', 2], '3.00'],
    ['bcpowmod', ['2', '3', '5.00', 2], '3.00'],
  ]) {
    assert.throws(() => call(80200, name, args), {name: 'ValueError'});
    assert.equal(call(80300, name, args), expected);
  }
});

test('reserved IPv6 validation follows PHP 8.2 and later address tables', () => {
  for (const version of [80200, 80300, 80400]) {
    for (const address of ['::ffff:192.0.2.1', '::ffff:0808:0808']) {
      assert.equal(call(version, 'filter_var', [address, 275, 4194304]), version < 80300 ? address : false);
    }
    for (const address of ['2001:db8::1', '2001:10::1', '5f::1', '3ff3::1']) {
      assert.equal(call(version, 'filter_var', [address, 275, 4194304]), version < 80300 ? false : address);
    }
    for (const address of ['::', '::1', 'fe80::1']) assert.equal(call(version, 'filter_var', [address, 275, 4194304]), false);
  }
});
