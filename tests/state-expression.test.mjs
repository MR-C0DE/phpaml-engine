import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveData } from '../src-js/core/value.js';

test('evaluates allowlisted arithmetic state expressions', () => {
  const state = {count: 4, step: 2};
  assert.equal(resolveData({
    $expression: {operation: 'add', left: {$state: 'count'}, right: {$state: 'step'}},
  }, state), 6);
  assert.equal(resolveData({
    $expression: {operation: 'subtract', left: {$state: 'count'}, right: 1},
  }, state), 3);
  assert.equal(resolveData({
    $expression: {operation: 'multiply', left: {$state: 'count'}, right: {$state: 'step'}},
  }, state), 8);
  assert.equal(resolveData({$expression: {operation: 'divide', left: 8, right: 2}}, state), 4);
  assert.equal(resolveData({$expression: {operation: 'modulo', left: 7, right: 2}}, state), 1);
  assert.throws(() => resolveData({$expression: {operation: 'divide', left: 1, right: 0}}, state), /Division by zero/);
  assert.equal(resolveData({$expression: {operation: 'concat', left: 'Count: ', right: {$state: 'count'}}}, state), 'Count: 4');
  assert.equal(resolveData({$expression: {operation: 'not', left: false, right: null}}, state), true);
});

test('rejects unknown state expression operations', () => {
  assert.throws(
    () => resolveData({$expression: {operation: 'execute', left: 1, right: 2}}, {}),
    /Unknown AML state expression/,
  );
});

test('evaluates safe conditional state values', () => {
  const conditional = {$conditional: {
    left: {$state: 'total'}, operator: 'gte', right: 100, then: 10, otherwise: 0,
  }};
  assert.equal(resolveData(conditional, {total: 120}), 10);
  assert.equal(resolveData(conditional, {total: 80}), 0);
});
