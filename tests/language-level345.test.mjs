import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData} from '../src-js/core/value.js';
import {makeArray, arrayWrite, arrayEntries, arrayKind, clonePhp} from '../src-js/core/php-arrays.js';
import {persistedPayload, restoredValue} from '../src-js/storage.js';

globalThis.location = new URL('https://example.test/app');
globalThis.HTMLButtonElement = class {};
globalThis.addEventListener = () => {};
globalThis.document = {querySelector: () => null, addEventListener: () => {}};
globalThis.CustomEvent = class {constructor(type, options) {this.type = type; this.detail = options.detail;}};
const {execute} = await import('../src-js/actions-runtime.js');
const {rootConfigs} = await import('../src-js/context.js');
const owner = () => ({dispatchEvent: () => {}, querySelectorAll: () => [], querySelector: () => null});
const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const set = (target, value) => ({type: 'set', target, value});
const nop = {type: 'evaluate', value: null};
const loop = (conditions, action, kind = 'while') => ({type: 'loop', kind, conditions: [conditions], action, init: nop, update: nop, limit: 1000});

test('empty and isset do not evaluate missing offsets as errors', () => {
  const node = ex('offset', {$local: 'v61'}, 'missing');
  assert.equal(resolveData(ex('empty', node), {}), true);
  assert.equal(resolveData(ex('isset', node), {}), false);
  assert.equal(resolveData(ex('empty', '0'), {}), true);
  assert.equal(resolveData(ex('empty', []), {}), true);
});

test('match distinguishes float and int, evaluates its subject once and skips unused arms', async () => {
  const root = owner(), state = {count: 1, result: ''};
  const match = ex('match', ex('postIncrement', {$state: 'count'}), [
    {default: false, conditions: [{$float: 1}], value: ex('divide', 1, 0)},
    {default: false, conditions: [1], value: 'integer'},
  ]);
  await execute(root, state, set('result', match));
  assert.deepEqual(state, {count: 2, result: 'integer'});
  await assert.rejects(execute(root, state, set('result', match)), {name: 'UnhandledMatchError'});
});

test('state-driven loops read current values on every event and do executes at least once', async () => {
  const root = owner(), state = {count: 0, limit: 3};
  const action = loop(ex('less', {$state: 'count'}, {$state: 'limit'}), {type: 'increment', target: 'count', value: 1});
  await execute(root, state, action);
  assert.equal(state.count, 3);
  state.limit = 5;
  await execute(root, state, action);
  assert.equal(state.count, 5);
  await execute(root, state, loop(false, {type: 'increment', target: 'count', value: 1}, 'do'));
  assert.equal(state.count, 6);
});

test('infinite and nested loops fail with a source location and restore state', async () => {
  const root = owner(), state = {count: 0};
  const action = {...loop(true, {type: 'increment', target: 'count', value: 1}), phpSource: {file: 'Page.php', line: 20}};
  await assert.rejects(execute(root, state, action), (error) => error.code === 'PHP_LOOP_LIMIT' && error.source.line === 20);
  assert.equal(state.count, 0);
  const outer = {...loop(true, {...loop(true, {type: 'loop-control', operation: 'continue', levels: 2}), limit: 10000}), limit: 10000};
  await assert.rejects(execute(root, state, outer), (error) => error.code === 'PHP_LOOP_LIMIT');
});

test('array offsets and copies preserve key order and floating values', () => {
  const original = makeArray([[2, 1], [0, 2], ['name', 'André']], new Map([[2, 'double']]));
  const copy = clonePhp(original);
  const changed = arrayWrite(copy, 2, 3, 'integer');
  assert.deepEqual(arrayEntries(original).map(([key]) => key), [2, 0, 'name']);
  assert.equal(arrayKind(original, 2), 'double');
  assert.equal(original[2], 1);
  assert.equal(changed[2], 3);
  assert.throws(() => arrayWrite(original, '__proto__', {polluted: true}), /Reserved/);
  assert.equal({}.polluted, undefined);
});

test('array metadata survives persistence and restores append position after deletion', () => {
  const value = makeArray([[2, 1], [0, 2]], new Map([[2, 'double']]), 9);
  const restored = restoredValue(owner(), 'items', {version: 1}, persistedPayload({version: 1}, value, 'array'), 'array');
  assert.deepEqual(arrayEntries(restored).map(([key]) => key), [2, 0]);
  assert.equal(arrayKind(restored, 2), 'double');
  assert.deepEqual(arrayEntries(arrayWrite(restored, null, 'next', 'string', null, true)).map(([key]) => key), [2, 0, 9]);
});

test('mutating a dynamic array offset evaluates its key once', async () => {
  const root = owner(), state = {index: 0, items: [1, 2]};
  rootConfigs.set(root, {valueTypes: {index: 'integer', items: 'array'}});
  const action = {type: 'evaluate', value: ex('compoundAssign', ex('offset', {$state: 'items'}, ex('postIncrement', {$state: 'index'})), {operator: '+', value: 4})};
  await execute(root, state, action);
  assert.deepEqual(state, {index: 1, items: [5, 2]});
});

test('nested array values cannot bypass numeric state validation', async () => {
  const root = owner(), state = {items: []};
  await assert.rejects(execute(root, state, set('items', ex('array', [{value: ex('power', {$float: 10}, 400)}]))), /finite floats/);
  assert.deepEqual(state.items, []);
});
