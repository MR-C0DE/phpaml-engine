import test from 'node:test';
import assert from 'node:assert/strict';
import {invokeBuiltin} from '../src-js/core/php-builtins.js';
import {phpType} from '../src-js/core/php-values.js';
import {makeArray} from '../src-js/core/php-arrays.js';
const source = {file: 'output.php', line: 8, strictTypes: true};
const call = (name, values, context = {}) => invokeBuiltin(name, values.map((value) => ({value, kind: phpType(value)})), {}, {source, ...context});

test('output functions return distinct PHP values and preserve empty console output', () => {
  const original = console.log, logs = []; console.log = (value) => logs.push(value);
  try {
    assert.deepEqual(call('print_r', ['hello']), {value: true, kind: 'boolean'});
    assert.deepEqual(call('var_export', ['hello']), {value: null, kind: 'NULL'});
    assert.deepEqual(call('print_r', [false]), {value: true, kind: 'boolean'});
    assert.deepEqual(logs, ['hello', "'hello'"]);
    assert.deepEqual(call('var_export', ["'\\\0", true]), {value: "'\\'\\\\' . \"\\0\" . ''", kind: 'string'});
    assert.equal(logs.length, 2);
  } finally {console.log = original;}
});
test('reactive output only permits returning strings, including named argument binding', () => {
  for (const name of ['print_r', 'var_export']) {
    assert.equal(call(name, [['x'], true], {readOnly: true}).kind, 'string');
    assert.throws(() => call(name, [['x']], {readOnly: true}), /return: true/);
    assert.throws(() => call(name, ['x', 'true']), TypeError);
    assert.throws(() => call(name, []), {name: 'ArgumentCountError'});
  }
  assert.equal(invokeBuiltin('var_export', [{name: 'return', value: true, kind: 'boolean'}, {name: 'value', value: 'x', kind: 'string'}], {}, {source, readOnly: true}).value, "'x'");
});
test('output preserves float type metadata and captured PHP precision', () => {
  const floats = makeArray([[0, 1], [1, -0]], new Map([[0, 'double'], [1, 'double']]));
  assert.equal(call('var_export', [floats, true]).value, 'array (\n  0 => 1.0,\n  1 => -0.0,\n)');
  assert.equal(call('print_r', [1.23456789, true], {source: {...source, precision: 5}}).value, '1.2346');
  assert.equal(call('var_export', [1.23456789, true], {source: {...source, serializePrecision: 5}}).value, '1.2346');
});
test('oversized and opaque data fail before writing any console output', () => {
  const original = console.log, logs = []; console.log = (value) => logs.push(value);
  try {
    let nested = 'x'; for (let i = 0; i < 66; i++) nested = [nested];
    for (const value of ['x'.repeat(1048577), nested, ['before', () => {}], new Error('opaque')]) {
      assert.throws(() => call('print_r', [value]));
    }
    assert.throws(() => call('var_export', ['long', true], {builtinBudget: {remaining: 2}}), /work budget/);
    assert.deepEqual(logs, []);
  } finally {console.log = original;}
});
