import test from 'node:test';
import assert from 'node:assert/strict';

import { eventPayload, newEffectRuntime } from '../src-js/effects.js';
import { hasAsyncAction } from '../src-js/core/action-analysis.js';

test('creates isolated mutable effect runtimes', () => {
  const definition = {mode: 'run'};
  const first = newEffectRuntime('first', definition);
  const second = newEffectRuntime('second', definition);
  first.controllers.add(new AbortController());
  assert.equal(first.controllers.size, 1);
  assert.equal(second.controllers.size, 0);
  assert.equal(first.generation, 0);
  assert.equal(first.definition, definition);
});

test('captures only supported event fields and clones detail', () => {
  const detail = {item: {id: 7}};
  const payload = eventPayload({
    type: 'aml-select', detail, key: 'Enter', code: 'Enter', repeat: false,
    button: 0, clientX: 12, clientY: 14, target: {value: 'seven', checked: true, secret: 'hidden'},
    secret: 'hidden',
  });
  detail.item.id = 8;
  assert.equal(payload.detail.item.id, 7);
  assert.equal(payload.value, 'seven');
  assert.equal(payload.secret, undefined);
  assert.equal(payload.target, undefined);
});

test('detects asynchronous actions recursively', () => {
  assert.equal(hasAsyncAction({type: 'set'}), false);
  assert.equal(hasAsyncAction({type: 'sequence', actions: [{type: 'set'}, {type: 'api'}]}), true);
  assert.equal(hasAsyncAction({type: 'condition', then: {type: 'set'}, otherwise: {type: 'api'}}), true);
  assert.equal(hasAsyncAction(null), false);
});
