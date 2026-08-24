import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coerce,
  computedValue,
  deletePath,
  pathAffects,
  readPath,
  safeSegments,
  writePath,
} from '../src-js/core/state.js';

test('reads, writes and deletes nested state safely', () => {
  const state = {};
  writePath(state, 'profile.address.city', 'Montréal');
  assert.equal(readPath(state, 'profile.address.city'), 'Montréal');
  deletePath(state, 'profile.address.city');
  assert.equal(readPath(state, 'profile.address.city'), undefined);
});

test('rejects prototype-pollution paths', () => {
  for (const path of ['__proto__.polluted', 'user.constructor.value', 'prototype.value']) {
    assert.throws(() => safeSegments(path), /Unsafe AML state path/);
  }
});

test('computes and coerces values deterministically', () => {
  assert.equal(computedValue({operation: 'sum', dependencies: ['a', 'b']}, {a: 2, b: '3'}), 5);
  assert.equal(computedValue({operation: 'count', dependencies: ['items']}, {items: [1, 2]}), 2);
  assert.equal(coerce('bool', 'true'), true);
  assert.equal(coerce('int', '12'), 12);
  assert.equal(pathAffects('profile', 'profile.name'), true);
});
