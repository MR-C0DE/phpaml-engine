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

test('resolves scoped foreach values and nested keys', () => {
  const context = {loop: {index: 2, user: {name: 'André', score: 7}}};
  assert.equal(resolveData({$loop: 'index'}, {}, context), 2);
  assert.equal(resolveData({$loop: 'user.name'}, {}, context), 'André');
  assert.equal(resolveData({
    $expression: {operation: 'add', left: {$loop: 'user.score'}, right: 1},
  }, {}, context), 8);
});

test('evaluates safe collection expressions', () => {
  assert.equal(resolveData({$expression: {operation: 'count', left: [2, 3, 5], right: null}}, {}), 3);
  assert.equal(resolveData({$expression: {operation: 'count', left: {a: 1, b: 2}, right: null}}, {}), 2);
  assert.equal(resolveData({$expression: {operation: 'sum', left: [2, 3, 5], right: null}}, {}), 10);
  assert.equal(resolveData({$expression: {operation: 'contains', left: ['admin', 'editor'], right: 'admin'}}, {}), true);
  assert.equal(resolveData({$expression: {operation: 'contains', left: ['1'], right: 1}}, {}), false);
});

test('evaluates safe filter map and reduce callbacks', () => {
  const state = {users: [{name: 'André', active: true}, {name: 'Marie', active: false}], prices: [2, 3, 5]};
  const filter = {$expression: {
    operation: 'filter',
    left: {$state: 'users'},
    right: {$callback: {parameters: ['user'], expression: {$conditional: {
      left: {$collection: 'user.active'}, operator: 'truthy', right: true, then: true, otherwise: false,
    }}}},
  }};
  const map = {$expression: {
    operation: 'map', left: filter,
    right: {$callback: {parameters: ['user'], expression: {$collection: 'user.name'}}},
  }};
  const reduce = {$expression: {
    operation: 'reduce', left: {$state: 'prices'},
    right: {initial: 0, $callback: {parameters: ['sum', 'price'], expression: {$expression: {
      operation: 'add', left: {$collection: 'sum'}, right: {$collection: 'price'},
    }}}},
  }};
  assert.deepEqual(resolveData(filter, state), [{name: 'André', active: true}]);
  assert.deepEqual(resolveData(map, state), ['André']);
  assert.equal(resolveData(reduce, state), 10);
});

test('finds checks extracts and deduplicates reactive collections', () => {
  const state = {
    users: [{name: 'André', role: 'admin', active: true}, {name: 'Marie', role: 'editor', active: false}],
    tags: ['php', 'aml', 'php'],
  };
  const predicate = (operator, right) => ({$callback: {
    parameters: ['user'],
    expression: {$conditional: {
      left: {$collection: 'user.active'}, operator, right, then: true, otherwise: false,
    }},
  }});
  assert.deepEqual(resolveData({$expression: {operation: 'find', left: {$state: 'users'}, right: predicate('eq', false)}}, state), state.users[1]);
  assert.equal(resolveData({$expression: {operation: 'any', left: {$state: 'users'}, right: predicate('eq', false)}}, state), true);
  assert.equal(resolveData({$expression: {operation: 'all', left: {$state: 'users'}, right: predicate('eq', true)}}, state), false);
  assert.deepEqual(resolveData({$expression: {operation: 'column', left: {$state: 'users'}, right: 'name'}}, state), ['André', 'Marie']);
  assert.deepEqual(resolveData({$expression: {operation: 'unique', left: {$state: 'tags'}, right: null}}, state), ['php', 'aml']);
});

test('sorts reactive collections with native and custom ordering', () => {
  const state = {
    numbers: [10, 2, 1],
    users: [{name: 'Marie'}, {name: 'André'}],
  };
  assert.deepEqual(resolveData({$expression: {operation: 'sort', left: {$state: 'numbers'}, right: null}}, state), [1, 2, 10]);
  assert.deepEqual(resolveData({$expression: {
    operation: 'sortBy',
    left: {$state: 'users'},
    right: {$callback: {
      parameters: ['a', 'b'],
      expression: {$expression: {
        operation: 'compare',
        left: {$collection: 'a.name'},
        right: {$collection: 'b.name'},
      }},
    }},
  }}, state), [{name: 'André'}, {name: 'Marie'}]);
  assert.deepEqual(state.numbers, [10, 2, 1]);
});

test('reverses slices and merges reactive collections without mutating sources', () => {
  const state = {items: [1, 2, 3, 4], more: [5, 6], tail: [7]};
  assert.deepEqual(resolveData({$expression: {operation: 'reverse', left: {$state: 'items'}, right: null}}, state), [4, 3, 2, 1]);
  assert.deepEqual(resolveData({$expression: {operation: 'slice', left: {$state: 'items'}, right: {offset: 1, length: 2}}}, state), [2, 3]);
  assert.deepEqual(resolveData({$expression: {operation: 'slice', left: {$state: 'items'}, right: {offset: -2}}}, state), [3, 4]);
  assert.deepEqual(resolveData({$expression: {operation: 'merge', left: {$state: 'items'}, right: [{$state: 'more'}, {$state: 'tail'}]}}, state), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(state.items, [1, 2, 3, 4]);
});

test('searches keys checks values rounds bounds and casts with PHP semantics', () => {
  const state = {names: ['André', 'Marie'], user: {email: null}, total: 10, page: 9, value: '42.8'};
  const expression = (operation, left, right = null) => ({$expression: {operation, left, right}});
  assert.equal(resolveData(expression('search', {$state: 'names'}, 'Marie'), state), 1);
  assert.equal(resolveData(expression('search', {$state: 'names'}, 'Absent'), state), false);
  assert.equal(resolveData(expression('keyExists', {$state: 'user'}, 'email'), state), true);
  assert.equal(resolveData(expression('isset', {$state: 'user.email'}), state), false);
  assert.equal(resolveData(expression('ceil', expression('divide', {$state: 'total'}, 3)), state), 4);
  assert.equal(resolveData(expression('min', {$state: 'page'}, 5), state), 5);
  assert.equal(resolveData(expression('toInt', {$state: 'value'}), state), 42);
});
