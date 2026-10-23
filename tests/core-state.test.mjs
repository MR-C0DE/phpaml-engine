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

test('state paths never read, mutate or delete inherited properties', () => {
  const inherited = {profile: {name: 'outside'}};
  const state = Object.create(inherited);
  assert.equal(readPath(state, 'profile.name'), undefined);
  deletePath(state, 'profile.name');
  assert.equal(inherited.profile.name, 'outside');
  writePath(state, 'profile.name', 'local');
  assert.equal(state.profile.name, 'local');
  assert.equal(inherited.profile.name, 'outside');
  assert.equal(readPath({}, 'toString'), undefined);
  writePath(state, 'toString.value', 'local');
  assert.equal(state.toString.value, 'local');
  assert.equal(Object.prototype.toString.value, undefined);
  let touched = false;
  const accessor = Object.create({get inherited() { touched = true; }, set inherited(value) { touched = true; }});
  writePath(accessor, 'inherited', 'local');
  assert.equal(touched, false);
  assert.equal(accessor.inherited, 'local');
});

test('own properties retain ordinary names and array/string indexing', () => {
  const state = {toString: {value: 1}, items: ['safe'], text: 'ok'};
  assert.equal(readPath(state, 'toString.value'), 1);
  assert.equal(readPath(state, 'items.0'), 'safe');
  assert.equal(readPath(state, 'text.length'), 2);
  assert.equal(readPath(state, 'text.0'), 'o');
});

test('computes and coerces values deterministically', () => {
  assert.equal(computedValue({operation: 'sum', dependencies: ['a', 'b']}, {a: 2, b: '3'}), 5);
  assert.equal(computedValue({operation: 'count', dependencies: ['items']}, {items: [1, 2]}), 2);
  assert.equal(coerce('bool', 'true'), true);
  assert.equal(coerce('int', '12'), 12);
  assert.equal(pathAffects('profile', 'profile.name'), true);
});
