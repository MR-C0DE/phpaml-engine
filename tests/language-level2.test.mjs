import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData, resolveType} from '../src-js/core/value.js';
import {phpMatches, phpIncrement} from '../src-js/core/php-operators.js';

globalThis.location = new URL('https://example.test/app');
globalThis.HTMLButtonElement = class {};
globalThis.addEventListener = () => {};
globalThis.document = {querySelector: () => null, addEventListener: () => {}};
globalThis.CustomEvent = class {constructor(type, options) {this.type = type; this.detail = options.detail;}};
const {execute} = await import('../src-js/actions-runtime.js');
const {rootConfigs} = await import('../src-js/context.js');
const root = () => ({dispatchEvent: () => {}, querySelectorAll: () => [], querySelector: () => null});
const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const set = (target, value) => ({type: 'set', target, value});

test('strict and loose comparisons use PHP numeric kinds and PHP 8 string rules', () => {
  assert.equal(phpMatches('eq', 1, 1, 'integer', 'double'), false);
  assert.equal(phpMatches('looseEq', 1, '01'), true);
  assert.equal(phpMatches('looseEq', 0, 'abc'), false);
  assert.equal(phpMatches('looseEq', null, '0'), false);
  assert.equal(phpMatches('looseEq', null, 0), true);
  assert.equal(phpMatches('gt', '12', '2'), true);
  assert.equal(phpMatches('gt', '\u{1f600}', '\ue000'), true);
});

test('logical operators, coalescing and ternaries evaluate only the necessary operands', () => {
  const error = ex('divide', 1, 0);
  assert.equal(resolveData(ex('and', false, error), {}), false);
  assert.equal(resolveData(ex('or', true, error), {}), true);
  assert.equal(resolveData(ex('coalesce', 0, error), {}), 0);
  assert.equal(resolveData(ex('coalesce', {$local: 'v61'}, 'fallback'), {}), 'fallback');
  assert.equal(resolveData(ex('elvis', '0', 'fallback'), {}), 'fallback');
  assert.equal(resolveData({$conditional: {left: true, operator: 'truthy', right: true, then: 42, otherwise: error}}, {}), 42);
});

test('arithmetic keeps PHP division, power and signed remainder types', () => {
  const data = {};
  assert.equal(resolveData(ex('power', 2, ex('power', 3, 2)), {}, data), 512);
  const negativeExponent = ex('power', 1, -1);
  assert.equal(resolveData(negativeExponent, {}, data), 1);
  assert.equal(resolveType(negativeExponent, {}, data), 'double');
  assert.equal(resolveData(ex('modulo', -7, 3), {}), -1);
  assert.equal(resolveData(ex('modulo', -6, 3), {}), 0);
  assert.equal(resolveData(ex('gettype', ex('divide', 4, 2)), {}), 'integer');
  assert.equal(resolveData(ex('gettype', ex('divide', {$float: 4}, 2)), {}), 'double');
  assert.throws(() => resolveData(ex('power', 2, 54), {}), /precision/);
  assert.throws(() => resolveData(ex('modulo', 1, 0.5), {}, {reportWarning: () => {}}), /zero/);
});

test('pre/post increments execute once even when their numeric type is inspected', async () => {
  const owner = root(), state = {count: 1, float: 1, result: 0, kind: ''};
  rootConfigs.set(owner, {valueTypes: {count: 'integer', float: 'double'}});
  await execute(owner, state, {type: 'sequence', actions: [
    set('result', ex('postIncrement', {$state: 'count'})),
    set('kind', ex('gettype', ex('postIncrement', {$state: 'float'}))),
    set('result', ex('preIncrement', {$state: 'count'})),
  ]});
  assert.deepEqual(state, {count: 3, float: 2, result: 3, kind: 'double'});
});

test('expression assignments return the coerced property value and honor short circuits', async () => {
  const owner = root(), state = {number: 0, result: null};
  rootConfigs.set(owner, {valueTypes: {number: 'integer', result: 'NULL'}, typeRules: {number: {types: ['int'], nullable: false}}});
  await execute(owner, state, {...set('result', ex('assign', {$state: 'number'}, '12')), phpSource: {file: 'Page.php', line: 4, strictTypes: false}});
  assert.deepEqual(state, {number: 12, result: 12});
  await execute(owner, state, set('result', ex('and', false, ex('postIncrement', {$state: 'number'}))));
  assert.equal(state.number, 12);
});

test('a reused expression evaluates afresh while type inspection remains side-effect free', async () => {
  const owner = root(), state = {count: 1, result: 0};
  const action = set('result', ex('postIncrement', {$state: 'count'}));
  await execute(owner, state, action);
  await execute(owner, state, action);
  assert.deepEqual(state, {count: 3, result: 2});
});

test('PHP increment handles numeric strings, alphanumeric carries and nonnumeric decrements', () => {
  assert.deepEqual(phpIncrement('1.0', 'string', 1), {value: 2, kind: 'double'});
  assert.deepEqual(phpIncrement('Z9', 'string', 1), {value: 'AA0', kind: 'string'});
  const warnings = [];
  assert.deepEqual(phpIncrement(true, 'boolean', 1, {reportWarning: (warning) => warnings.push(warning)}), {value: true, kind: 'boolean'});
  assert.equal(warnings.length, 1);
});
