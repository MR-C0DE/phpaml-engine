import test from 'node:test';
import assert from 'node:assert/strict';
import {makeObject, objectData, objectIs} from '../src-js/core/php-object-values.js';
import {clonePhp, isPhpArray, validatePhpValue, makeArray} from '../src-js/core/php-arrays.js';
import {phpType, phpBool, phpDump} from '../src-js/core/php-values.js';
import {phpIdentical, phpCompare} from '../src-js/core/php-operators.js';
import {resolveData, resolveType} from '../src-js/core/value.js';

const type = {name: 'Product', ancestors: ['Priced'], parent: null, abstract: false, properties: {}, methods: {}, constants: {}};
test('object handles retain identity through PHP array value copies', () => {
  const object = makeObject(type, new Map([['price', {value: 10, kind: 'double'}]]));
  const array = makeArray([[0, object]]), copy = clonePhp(array);
  assert.notEqual(array, copy); assert.equal(copy[0], object);
  assert.equal(phpType(object), 'object'); assert.equal(phpBool(object), true);
  assert.equal(isPhpArray(object), false); assert.equal(objectIs(object, 'PRICED'), true);
  assert.deepEqual(Object.keys(object), []);
  assert.throws(() => validatePhpValue(copy), /must remain local/);
});
test('object identity differs from property equality, and cycles remain bounded', () => {
  const a = makeObject(type, new Map([['price', {value: 10, kind: 'double'}]]));
  const b = makeObject(type, new Map([['price', {value: 10, kind: 'double'}]]));
  assert.equal(phpIdentical(a, b), false); assert.equal(phpIdentical(a, a), true); assert.equal(phpCompare(a, b), 0);
  objectData(a).fields.set('next', {value: a, kind: 'object'});
  objectData(b).fields.set('next', {value: b, kind: 'object'});
  assert.match(phpDump(a), /\*RECURSION\*/);
  assert.throws(() => phpCompare(a, b), /Recursive object comparison/);
});
test('typed object fields retain integral float metadata', () => {
  const descriptor = {...type, properties: {price: {name: 'price', owner: 'Product', visibility: 'public', readonly: false, rule: {types: ['float'], nullable: false}, default: {$float: 10}}}};
  const context = {classes: {product: descriptor}, functions: {}, locals: {}, localTypes: {}, source: {strictTypes: true}};
  const object = resolveData({$expression: {operation: 'objectNew', left: 'Product', right: {arguments: []}}}, {}, context);
  context.locals.v70 = object;
  const node = {$expression: {operation: 'objectProperty', left: {$local: 'v70'}, right: {name: 'price'}}};
  assert.equal(resolveData(node, {}, context), 10); assert.equal(resolveType(node, {}, context), 'double');
});
test('unknown classes cannot resolve to JavaScript prototype members', () => {
  assert.throws(() => resolveData({$expression: {operation: 'objectNew', left: 'constructor', right: {arguments: []}}}, {}, {classes: {}}), /Unknown compiled frontend class/);
});
