import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeObject} from '../src-js/core/php-object-values.js';
import {invokeBuiltin} from '../src-js/core/php-builtins.js';

test('JsonSerializable cannot execute a service hook in a read-only display context', () => {
  let writes = 0;
  const definition = {name: 'ReadOnlySerializer', parent: null, ancestors: ['JsonSerializable'], properties: {}, methods: {jsonserialize: {id: 'serializer', name: 'jsonSerialize', owner: 'ReadOnlySerializer', visibility: 'public', static: false, abstract: false}}};
  const value = makeObject(definition);
  const context = {readOnly: true, objectState: {counter: 0}, source: {file: 'readonly-json.php', line: 1, strictTypes: true}, classes: {readonlyserializer: definition}, functions: {serializer: {declared: true, name: 'ReadOnlySerializer::jsonSerialize', parameters: [], body: {type: 'set', target: 'counter', value: 1}}}, assignState: () => {writes++;}};
  assert.throws(() => invokeBuiltin('json_encode', [{value, kind: 'object'}], context.objectState, context), /frontend events/);
  assert.equal(writes, 0);
  assert.equal(context.objectState.counter, 0);
});
