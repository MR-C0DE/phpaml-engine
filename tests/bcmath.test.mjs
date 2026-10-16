import test from 'node:test';
import assert from 'node:assert/strict';
import {invokeBuiltin, builtinNames} from '../src-js/core/php-builtins.js';
import {roundingMode} from '../src-js/core/php-rounding-mode.js';
import {phpType} from '../src-js/core/php-values.js';
import {clonePhp, validatePhpValue} from '../src-js/core/php-arrays.js';
import {resolveData} from '../src-js/core/value.js';

const source = {file: 'DecimalService.php', line: 12, strictTypes: true, phpVersion: 80400};
const call = (name, values, context = {}) => invokeBuiltin(name, values.map((value) => ({value, kind: phpType(value)})), {}, {source, ...context}).value;
test('all 14 procedural BCMath functions preserve decimal strings beyond floating precision', () => {
  assert.equal(builtinNames.filter((name) => name.startsWith('bc')).length, 14);
  assert.equal(call('bcadd', ['0.1', '0.2', 2]), '0.30');
  assert.equal(call('bcadd', ['9007199254740993.01', '0.02', 2]), '9007199254740993.03');
  assert.equal(call('bcsub', ['1000000000000000000000000000000', '0.01', 2]), '999999999999999999999999999999.99');
  assert.equal(call('bccomp', ['-0.001', '0', 2]), 0);
  assert.equal(call('bcadd', ['1\0ignored', '2', 2]), '3.00');
  assert.equal(call('bcsqrt', ['2', 30]), '1.414213562373095048801688724209');
});
test('RoundingMode stays opaque, keeps identity and is rejected as State or a forged argument', () => {
  const mode = roundingMode('HalfEven');
  assert.equal(clonePhp([mode])[0], mode);
  assert.equal(call('bcround', ['1.005', 2, mode]), '1.00');
  assert.equal(call('bcround', ['1.005', 2]), '1.01');
  assert.equal(call('bcround', ['-250', -2, roundingMode('HalfOdd')]), '-300');
  assert.throws(() => call('bcround', ['1.2', 0, {name: 'HalfEven'}]), TypeError);
  assert.throws(() => call('bcround', ['1.2', 0, 3]), TypeError);
  assert.throws(() => validatePhpValue([mode]), /remain local/);
});
test('scale is shared inside one event and does not leak to another or to reactive displays', () => {
  const context = {source: {...source, bcScale: 3}, builtinMemory: {}};
  assert.equal(call('bcscale', [], context), 3);
  assert.equal(call('bcscale', [2], context), 3);
  assert.equal(call('bcdiv', ['1', '3'], context), '0.33');
  assert.equal(call('bcdiv', ['1', '3'], {source: {...source, bcScale: 3}, builtinMemory: {}}), '0.333');
  assert.equal(call('bcscale', [], {readOnly: true}), 0);
  assert.throws(() => call('bcscale', [4], {readOnly: true}), /Reactive text/);
});
test('decimal limits reject expensive inputs before allocating oversized BigInts', () => {
  for (const [name, args] of [
    ['bcadd', ['1'.repeat(4097), '0']], ['bcadd', ['1', '2', 1001]],
    ['bcscale', [1001]], ['bcround', ['1', -1001]], ['bcpow', ['1.2', '10001']],
    ['bcpow', ['123456789', '10000']],
  ]) assert.throws(() => call(name, args), (error) => error.code === 'PHP_BUILTIN_LIMIT');
  const context = {builtinBudget: {remaining: 10}};
  assert.equal(call('bcadd', ['1', '2'], context), '3');
  assert.equal(call('bcadd', ['1', '2'], context), '3');
  assert.throws(() => call('bcadd', ['1', '2'], context), (error) => error.code === 'PHP_BUILTIN_LIMIT');
  assert.throws(() => call('bcpowmod', ['12345', '9'.repeat(500), '123456789'], {builtinBudget: {remaining: 50}}), (error) => error.code === 'PHP_BUILTIN_LIMIT');
});
test('native decimal errors retain PHP source and version-dependent zero powers', () => {
  for (const [name, args, expected] of [
    ['bcadd', ['1e2', '1'], 'ValueError'], ['bcdiv', ['1', '0'], 'DivisionByZeroError'],
    ['bcadd', ['1\n', '1'], 'ValueError'], ['bcadd', ['1\u2028', '1'], 'ValueError'],
    ['bcsqrt', ['-1'], 'ValueError'], ['bcpow', ['2', '1.2'], 'ValueError'],
    ['bcpowmod', ['2', '-1', '5'], 'ValueError'], ['bcscale', [-1], 'ValueError'],
  ]) assert.throws(() => resolveData({$expression: {operation: 'builtin', left: name, right: {arguments: args.map((value) => ({value})), source}}}, {}), (error) => error.name === expected && error.source.file === source.file);
  assert.equal(call('bcpow', ['0', '-1', 2], {source: {...source, phpVersion: 80300}}), '0.00');
  assert.throws(() => call('bcpow', ['0', '-1', 2]), (error) => error.name === 'DivisionByZeroError');
});
