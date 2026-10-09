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
});

test('rejects unknown state expression operations', () => {
  assert.throws(
    () => resolveData({$expression: {operation: 'execute', left: 1, right: 2}}, {}),
    /Unknown AML state expression/,
  );
});
