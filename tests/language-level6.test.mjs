import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData, resolveType} from '../src-js/core/value.js';
import {invokeFunction, createClosure} from '../src-js/core/php-functions.js';
import {validatePhpValue} from '../src-js/core/php-arrays.js';

const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const local = (name) => ({$local: 'v' + Buffer.from(name).toString('hex')});
const source = {file: 'service.php', line: 10, strictTypes: true};
const parameter = (name, rule = null, options = {}) => ({name, id: local(name).$local, reference: false, variadic: false, rule, ...options});
const rule = (...types) => ({types, nullable: types.includes('null'), property: '(function)'});
const definition = (parameters, value, extra = {}) => ({name: 'add', parameters, body: {type: 'return', value, hasValue: true, phpSource: {...source, line: 12}}, returnType: rule('int'), source, declared: true, ...extra});
const context = (functions) => ({functions, locals: {}, localTypes: {}, localReferences: {}, functionDeclarations: new Set(), source: {...source, file: 'Page.php', line: 30}, loopBudget: {remaining: 10000}, callBudget: {depth: 0, remaining: 10000}});
const call = (id, args = []) => ex('call', ex('functionRef', id), {arguments: args.map((value) => ({value})), source: {...source, file: 'Page.php', line: 30}});

test('function frames preserve float returns, defaults and argument evaluation order', () => {
  const functions = {add: definition([parameter('a', rule('int')), parameter('b', rule('int'), {default: 2})], ex('add', local('a'), local('b'))), float: definition([], {$float: 2}, {name: 'decimal', returnType: rule('float')})};
  const data = context(functions); data.locals[local('n').$local] = 1;
  assert.equal(resolveData(call('add', [ex('postIncrement', local('n')), local('n')]), {}, data), 3);
  assert.equal(resolveData(call('add', [4]), {}, data), 6);
  const node = call('float'); assert.equal(resolveData(node, {}, data), 2); assert.equal(resolveType(node, {}, data), 'double');
  assert.equal(data.callBudget.depth, 0);
});

test('parameter and return errors retain the service location and a call stack', () => {
  const data = context({bad: definition([], 'wrong')});
  assert.throws(() => resolveData(call('bad'), {}, data), (error) => error.name === 'TypeError' && error.source.line === 12 && error.phpStack[0].source.file === 'Page.php');
  data.functions.argument = definition([parameter('a', rule('int'))], local('a'));
  assert.throws(() => resolveData(call('argument', ['wrong']), {}, data), (error) => error.name === 'TypeError' && error.source.file === 'service.php');
  assert.throws(() => resolveData(call('argument'), {}, data), {name: 'ArgumentCountError'});
});

test('closures capture by value or reference and references initialize missing locals', () => {
  const data = context({read: definition([], local('n'), {returnType: null})});
  data.locals[local('n').$local] = 3;
  const byValue = createClosure('read', [{id: local('n').$local, reference: false, value: local('n')}], {}, data);
  const byReference = createClosure('read', [{id: local('n').$local, reference: true, value: local('n')}], {}, data);
  data.locals[local('n').$local] = 9;
  assert.equal(invokeFunction(byValue, [], {}, data).value, 3);
  assert.equal(invokeFunction(byReference, [], {}, data).value, 9);
  delete data.locals[local('n').$local];
  createClosure('read', [{id: local('n').$local, reference: true, value: local('n')}], {}, data);
  assert.equal(data.locals[local('n').$local], null);
});

test('call budgets cover both recursion depth and cumulative calls', () => {
  const data = context({recurse: definition([], call('recurse')), once: definition([], 1)});
  assert.throws(() => resolveData(call('recurse'), {}, data), (error) => error.code === 'PHP_CALL_LIMIT');
  assert.equal(data.callBudget.depth, 0);
  data.callBudget.remaining = 2;
  assert.equal(resolveData(call('once'), {}, data), 1);
  assert.equal(resolveData(call('once'), {}, data), 1);
  assert.throws(() => resolveData(call('once'), {}, data), (error) => error.code === 'PHP_CALL_LIMIT');
});

test('only registered callables execute and closures cannot enter component state', () => {
  const data = context({once: definition([], 1)});
  let executed = false;
  assert.throws(() => invokeFunction(() => {executed = true;}, [], {}, data), TypeError);
  assert.equal(executed, false);
  const closure = createClosure('once', [], {}, data);
  assert.throws(() => validatePhpValue([closure]), /callables must remain local/);
  assert.throws(() => resolveData(ex('map', [], {$callable: 42}), {}, data), TypeError);
});

test('functions cannot access caller locals unless explicitly captured or passed', () => {
  const data = context({hidden: definition([], local('secret'))}); data.locals[local('secret').$local] = 42;
  assert.throws(() => resolveData(call('hidden'), {}, data), /Undefined frontend local/);
});
