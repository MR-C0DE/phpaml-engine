import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData, resolveType} from '../src-js/core/value.js';
const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const source = {file: 'TextPage.php', line: 21, strictTypes: true};
const display = (value, functions = {}) => ex('display', value, {functions, source});
const call = (id) => ex('call', ex('functionRef', id), {arguments: [], source});
const fn = (body) => ({name: 'formatter', parameters: [], body, source, declared: true, returnType: null});

test('display frames preserve PHP numeric kinds without leaking function locals', () => {
  const value = display(call('format'), {format: fn({type: 'sequence', actions: [
    {type: 'local-set', name: 'v78', value: 'private'},
    {type: 'return', value: {$float: 2}, hasValue: true},
  ]})});
  const context = {locals: {v78: 'event'}, localTypes: {v78: 'string'}, functions: {event: {}}, callBudget: {depth: 0, remaining: 2}};
  for (let i = 0; i < 3; i++) {
    assert.equal(resolveData(value, {}, context), 2);
    assert.equal(resolveType(value, {}, context), 'double');
    assert.equal(context.locals.v78, 'event');
    assert.equal(context.callBudget.remaining, 2);
    assert.deepEqual(context.functions, {event: {}});
  }
});

test('display evaluation refuses writes and keeps PHP locations on errors', () => {
  const state = {count: 1};
  const direct = display(ex('assign', {$state: 'count'}, 7));
  const indirect = display(call('mutate'), {mutate: fn({type: 'set', target: 'count', value: 9})});
  for (const value of [direct, indirect]) {
    assert.throws(() => resolveData(value, state), (error) => /cannot modify state/.test(error.message) && error.source.file === source.file);
    assert.deepEqual(state, {count: 1});
  }
  assert.throws(() => resolveData(display(ex('divide', 10, 0)), state), (error) => error.name === 'DivisionByZeroError' && error.source.line === 21);
});

test('display functions retain recursion and loop budgets', () => {
  assert.throws(() => resolveData(display(call('recursive'), {recursive: fn({type: 'return', value: call('recursive'), hasValue: true})}), {}), (error) => error.code === 'PHP_CALL_LIMIT');
  const loop = {type: 'loop', kind: 'while', conditions: [true], action: {type: 'evaluate', value: 0}, limit: 1000};
  assert.throws(() => resolveData(display(call('forever'), {forever: fn(loop)}), {}), (error) => error.code === 'PHP_LOOP_LIMIT');
});
