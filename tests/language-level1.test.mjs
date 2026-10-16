import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData, resolveType} from '../src-js/core/value.js';
import {phpBool, phpFloat, phpInt, phpString, phpDump} from '../src-js/core/php-values.js';

globalThis.location = new URL('https://example.test/app');
globalThis.HTMLButtonElement = class {};
globalThis.addEventListener = () => {};
globalThis.document = {querySelector: () => null, addEventListener: () => {}};
globalThis.CustomEvent = class {constructor(type, options) {this.type = type; this.detail = options.detail;}};
const {execute} = await import('../src-js/actions-runtime.js');
const root = () => ({dispatchEvent: () => {}, querySelectorAll: () => [], querySelector: () => null});
const expression = (operation, left, right = null) => ({$expression: {operation, left, right}});
const scope = (...actions) => ({type: 'local-scope', action: {type: 'sequence', actions}});
const local = (name, value) => ({type: 'local-set', name, value});
const set = (target, value) => ({type: 'set', target, value});

test('scalar casts follow PHP zero strings, numeric prefixes, booleans and null', () => {
  for (const value of [null, false, 0, '', '0', [], {}]) assert.equal(phpBool(value), false);
  for (const value of [true, 1, 'false', '0.0', [0]]) assert.equal(phpBool(value), true);
  assert.equal(phpString(true), '1');
  assert.equal(phpString(false), '');
  assert.equal(phpString(null), '');
  assert.equal(phpString(1 / 3, 'double'), '0.33333333333333');
  assert.equal(phpString(1e14, 'double'), '1.0E+14');
  assert.equal(phpString(1e14, 'integer'), '100000000000000');
  assert.equal(phpInt(' -12.75tail'), -12);
  assert.equal(phpInt('nonnumeric'), 0);
  assert.equal(phpFloat(' 2.5e1tail'), 25);
  assert.throws(() => phpInt('9007199254740993'), /precision/);
});

test('gettype keeps integral float literals, casts, state types and conditional branches', () => {
  for (const [value, type] of [[null, 'NULL'], [true, 'boolean'], ['a', 'string'], [1, 'integer'], [{$float: 1}, 'double']]) {
    assert.equal(resolveData(expression('gettype', value), {}), type);
  }
  assert.equal(resolveData(expression('gettype', expression('toFloat', 1)), {}), 'double');
  assert.equal(resolveData(expression('gettype', expression('add', {$float: 1}, {$state: 'n'})), {n: 1}), 'double');
  assert.equal(resolveType({$state: 'n'}, {n: 2}, {stateTypes: {n: 'float'}}), 'double');
  assert.equal(resolveType({$state: 'n'}, {n: null}, {stateTypes: {n: 'float'}}), 'NULL');
});

test('local assignments snapshot values instead of rereading changed state', async () => {
  const state = {count: 1, result: 0};
  await execute(root(), state, scope(
    local('v61', {$state: 'count'}),
    {type: 'increment', target: 'count', value: 1},
    set('result', {$local: 'v61'}),
  ));
  assert.deepEqual(state, {count: 2, result: 1});
});

test('locals copy arrays by value and nested handler scopes restore their caller', async () => {
  const state = {profile: {name: 'before'}, result: '', type: ''};
  await execute(root(), state, scope(
    local('v61', {$state: 'profile'}),
    set('profile.name', 'after'),
    scope(local('v61', null)),
    set('result', expression('offset', {$local: 'v61'}, 'name')),
    local('v62', {$float: 1}),
    set('type', expression('gettype', {$local: 'v62'})),
  ));
  assert.deepEqual(state, {profile: {name: 'after'}, result: 'before', type: 'double'});
});

test('private local frames do not leak across repeated or concurrent events', async () => {
  const action = scope(local('v61', {$state: 'count'}), set('result', {$local: 'v61'}));
  const first = {count: 1}, second = {count: 8};
  await Promise.all([execute(root(), first, action), execute(root(), second, action)]);
  assert.deepEqual(first, {count: 1, result: 1});
  assert.deepEqual(second, {count: 8, result: 8});
  await assert.rejects(execute(root(), {}, scope(set('result', {$local: 'v61'}))), /Undefined frontend local/);
  await assert.rejects(execute(root(), {}, scope(local('__proto__', true))), /Invalid frontend local/);
});

test('var_dump reports PHP scalar names and UTF-8 byte lengths', async () => {
  assert.equal(phpDump('André'), 'string(6) "André"\n');
  assert.equal(phpDump(1, 'double'), 'float(1)\n');
  assert.equal(phpDump(1e20, 'double'), 'float(1.0E+20)\n');
  assert.equal(phpDump(-0, 'double'), 'float(-0)\n');
  const messages = [];
  const previous = console.log;
  console.log = (message) => messages.push(message);
  try {
    await execute(root(), {}, scope(local('v61', {$float: 1}), {type: 'console', level: 'dump', values: [{$local: 'v61'}, false, null]}));
  } finally { console.log = previous; }
  assert.deepEqual(messages, ['float(1)\nbool(false)\nNULL\n']);
});

const {assignType} = await import('../src-js/core/php-types.js');
const {rootConfigs} = await import('../src-js/context.js');

test('typed properties accept PHP scalar unions and nullable values without hiding incompatible assignments', () => {
  const integer = {types: ['int'], nullable: false, property: 'Page::$age'};
  assert.throws(() => assignType(integer, '42'), TypeError);
  assert.deepEqual(assignType(integer, '42', 'string', false), {value: 42, kind: 'integer'});
  assert.throws(() => assignType(integer, null, 'NULL', false), TypeError);
  assert.throws(() => assignType(integer, '42tail', 'string', false), TypeError);
  assert.deepEqual(assignType({...integer, nullable: true}, null), {value: null, kind: 'NULL'});
  assert.deepEqual(assignType({types: ['float']}, 1, 'integer'), {value: 1, kind: 'double'});
  assert.deepEqual(assignType({types: ['int', 'float']}, '1.0', 'string', false), {value: 1, kind: 'double'});
  assert.deepEqual(assignType({types: ['int', 'string']}, '1.0', 'string', false), {value: '1.0', kind: 'string'});
  assert.deepEqual(assignType({types: ['true']}, true), {value: true, kind: 'boolean'});
  assert.throws(() => assignType({types: ['true']}, false), TypeError);
});

test('failed typed sequences restore values and numeric kinds, and carry the exact failing PHP source', async () => {
  const owner = root(), state = {count: 1, result: 0};
  const config = {valueTypes: {count: 'integer', result: 'integer'}, typeRules: {count: {types: ['int'], nullable: false, property: 'Page::$count'}}};
  rootConfigs.set(owner, config);
  await assert.rejects(execute(owner, state, scope(
    set('result', {$float: 1}),
    {...set('count', 'invalid'), phpSource: {file: 'Page.php', line: 42, strictTypes: true}},
  )), (error) => {
    assert.equal(error.code, 'PHP_TYPE_ERROR');
    assert.equal(error.source.line, 42);
    assert.match(error.message, /Page::\$count.*\[PHP Page.php:42\]/);
    return true;
  });
  assert.deepEqual(state, {count: 1, result: 0});
  assert.deepEqual(config.valueTypes, {count: 'integer', result: 'integer'});
});

test('runtime numeric errors are explicit and local variable names stay readable', async () => {
  assert.throws(() => resolveData(expression('add', 9007199254740991, 1), {}), /precision/);
  assert.throws(() => resolveData(expression('add', 'abc', 1), {}), TypeError);
  assert.throws(() => resolveData(expression('modulo', 2, 0.5), {}, {reportWarning: () => {}}), /zero/);
  await assert.rejects(execute(root(), {}, scope(set('x', {$local: 'v6e6f6d'}))), /\$nom/);
});

test('PHP conversion warnings are emitted once with their PHP origin', async () => {
  const events = [], owner = {...root(), dispatchEvent: (event) => events.push(event)};
  const previous = console.warn;
  console.warn = () => {};
  try {
    await execute(owner, {}, {...scope(
      local('v61', expression('add', '12tail', 1)),
      local('v62', expression('toString', [])),
    ), phpSource: {file: 'Page.php', line: 7, strictTypes: true}});
  } finally {console.warn = previous;}
  const warnings = events.filter((event) => event.type === 'aml:warning');
  assert.deepEqual(warnings.map((event) => event.detail.message), ['A non-numeric value encountered', 'Array to string conversion']);
  assert.ok(warnings.every((event) => event.detail.source.line === 7));
});

test('numeric kinds survive transaction commit and the next handler invocation', async () => {
  const owner = root(), state = {dynamic: 0, kind: ''};
  rootConfigs.set(owner, {valueTypes: {dynamic: 'integer', kind: 'string'}, typeRules: {dynamic: {types: ['mixed'], nullable: true}}});
  await execute(owner, state, scope(set('dynamic', {$float: 1}), set('kind', 'pending')));
  await execute(owner, state, scope(set('kind', expression('gettype', {$state: 'dynamic'}))));
  assert.equal(state.kind, 'double');
});

test('non-finite float state is rejected before it can be persisted as null', async () => {
  const owner = root(), state = {value: 1};
  await assert.rejects(execute(owner, state, set('value', expression('toFloat', '1e500'))), /finite floats/);
  assert.deepEqual(state, {value: 1});
});

test('persistence retains whole floats and nullable scalar state', async () => {
  const {persistedPayload, restoredValue} = await import('../src-js/storage.js');
  const config = {valueTypes: {}, typeRules: {optional: {types: ['?int'], nullable: true}}};
  assert.equal(restoredValue(root(), 'dynamic', {}, persistedPayload({}, 1, 'double'), 'mixed', config), 1);
  assert.equal(config.valueTypes.dynamic, 'double');
  assert.equal(restoredValue(root(), 'optional', {}, persistedPayload({}, null, 'NULL'), 'int', config), null);
  assert.equal(config.valueTypes.optional, 'NULL');
});

test('sharing a scalar carries its PHP numeric kind to the receiving component', async () => {
  const {mountedRoots, rootStates} = await import('../src-js/context.js');
  const first = {...root(), dataset: {}}, second = {...root(), dataset: {}};
  const left = {number: 0}, right = {number: 0};
  for (const [owner, state] of [[first, left], [second, right]]) {
    rootConfigs.set(owner, {shared: {number: 'level1-kind'}, valueTypes: {number: 'integer'}});
    rootStates.set(owner, state); mountedRoots.add(owner);
  }
  try {
    await execute(first, left, set('number', {$float: 1}));
    assert.equal(right.number, 1);
    assert.equal(rootConfigs.get(second).valueTypes.number, 'double');
  } finally {mountedRoots.delete(first); mountedRoots.delete(second);}
});
