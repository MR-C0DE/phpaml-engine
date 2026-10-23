import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRow, unbindRows, readPath, writePath, resolveWritePath, rowToken} from '../src-js/core/state.js';
const prefix = 'components.IList.i1.rows.k61';
test('row writes resolve stable keys after reorder, with no alias data in serialized State', () => {
  const state = {items: [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}]};
  bindRow(state, prefix, {source: 'items', direct: true, keyPath: 'id', key: 'a', value: state.items[0]});
  writePath(state, 'items', [...state.items].reverse());
  assert.equal(resolveWritePath(state, prefix + '.name'), 'items.1.name');
  writePath(state, resolveWritePath(state, prefix + '.name'), 'Edited');
  assert.equal(readPath(state, prefix + '.name'), 'Edited');
  assert.equal(state.items[0].name, 'B');
  assert.deepEqual(Object.keys(state), ['items']);
});
test('missing, duplicate, unstable, removed and readonly rows cannot redirect writes', () => {
  const state = {items: [{id: 'a', name: 'A'}]};
  const rule = {source: 'items', keyPath: 'id', key: 'a', value: state.items[0]};
  bindRow(state, prefix, rule);
  writePath(state, 'items', [{id: 'b', name: 'B'}]);
  assert.throws(() => resolveWritePath(state, prefix + '.name'), /no longer exists/);
  writePath(state, 'items', [{id: 'a'}, {id: 'a'}]);
  assert.throws(() => resolveWritePath(state, prefix + '.name'), /Duplicate/);
  writePath(state, 'items', [{name: 'No key'}]);
  assert.throws(() => resolveWritePath(state, prefix + '.name'), /stable/);
  bindRow(state, prefix, {value: {name: 'Read-only'}});
  assert.equal(readPath(state, prefix + '.name'), 'Read-only');
  assert.throws(() => resolveWritePath(state, prefix + '.name'), /read-only/);
  unbindRows(state, prefix);
  assert.throws(() => resolveWritePath(state, prefix + '.name'), /removed/);
  assert.throws(() => resolveWritePath(state, prefix + '.__proto__.bad'), /Unsafe/);
});
test('nested row handles resolve to their current owning record', () => {
  const state = {items: [{id: 'a', children: [{id: 'x', name: 'X'}]}, {id: 'b', children: []}]};
  bindRow(state, prefix, {source: 'items', direct: true, keyPath: 'id', key: 'a', value: state.items[0]});
  const child = 'components.IList.i2.rows.k78';
  bindRow(state, child, {source: prefix + '.children', direct: true, keyPath: 'id', key: 'x', value: {id: 'x', name: 'X'}});
  writePath(state, 'items', [...state.items].reverse());
  assert.equal(resolveWritePath(state, child + '.name'), 'items.1.children.0.name');
  assert.equal(readPath(state, child + '.name'), 'X');
  assert.equal(rowToken('André'), 'k416e6472c3a9');
  assert.notEqual(rowToken('😀'), rowToken('😁'));
});

test('row effect dependencies follow source changes while unrelated state stays independent', async () => {
  const {statePathAffects} = await import('../src-js/core/state.js');
  const state = {items: [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}]};
  bindRow(state, prefix, {source: 'items', direct: true, keyPath: 'id', key: 'a', value: state.items[0]});
  assert.equal(statePathAffects(state, prefix + '.name', 'items.0.name'), true);
  assert.equal(statePathAffects(state, prefix + '.name', 'items.1.name'), false);
  assert.equal(statePathAffects(state, prefix + '.name', 'tick'), false);
  writePath(state, 'items', [...state.items].reverse());
  assert.equal(statePathAffects(state, prefix + '.name', 'items.1.name'), true);
  bindRow(state, 'components.IList.i2.rows.k61', {value: {name: 'A'}, dependencies: ['items', 'query']});
  assert.equal(statePathAffects(state, 'components.IList.i2.rows.k61.name', 'query'), true);
});
