import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveData} from '../src-js/core/value.js';
import {clonePhp, validatePhpValue} from '../src-js/core/php-arrays.js';
import {exceptionIs, formatThrowable, linkPrevious} from '../src-js/core/php-exceptions.js';
import {hasAsyncAction} from '../src-js/core/action-analysis.js';

const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const source = {file: 'service.php', line: 12, strictTypes: true};
const context = {source, locals: {}, localTypes: {}, trace: [{file: 'page.php', line: 30, function: 'validateAge'}]};
const descriptor = {name: 'App\\AgeException', parents: ['InvalidArgumentException', 'LogicException', 'Exception', 'Throwable', 'Stringable'], ctorKind: 'Exception'};
const create = (message, previous = null) => {
  context.locals.previous = previous;
  return resolveData(ex('exception', descriptor, {arguments: [{value: message}, {value: 17}, {value: {$local: 'previous'}}], source}), {}, context);
};

test('Throwable values keep identity through PHP copies but never enter serializable State', () => {
  const error = create('Âge invalide');
  assert.equal(clonePhp([error])[0], error);
  assert.throws(() => validatePhpValue({nested: [error]}), /exceptions must remain local/);
  assert.ok(exceptionIs(error, '\\aPp\\aGeExCePtIoN'));
  assert.ok(exceptionIs(error, 'Exception'));
  assert.ok(exceptionIs(error, 'Throwable'));
  assert.equal(exceptionIs(error, 'Error'), false);
  assert.equal(exceptionIs([], 'Throwable'), false);
});

test('PHP exception traces retain source and cause but exclude local values', () => {
  const previous = create('cause');
  const error = create('wrapper', previous);
  context.locals.error = error;
  const get = (method) => resolveData(ex('exceptionGet', {$local: 'error'}, {method}), {}, context);
  assert.equal(get('getmessage'), 'wrapper');
  assert.equal(get('getcode'), 17);
  assert.equal(get('getfile'), 'service.php');
  assert.equal(get('getline'), 12);
  assert.deepEqual(get('gettrace'), [{file: 'page.php', line: 30, function: 'validateAge'}]);
  assert.match(formatThrowable(error), /cause.*service.php:12[\s\S]*Next App\\AgeException: wrapper/);
  assert.match(get('gettraceasstring'), /#0 page.php\(30\): validateAge\(\)/);
  get('gettrace')[0].file = 'changed.php';
  assert.equal(error.phpTrace[0].file, 'page.php');
});

test('finally chains pending exceptions without creating overlapping or cyclic causes', () => {
  const first = create('first'), second = create('second', first);
  linkPrevious(first, second);
  assert.equal(first.phpPrevious, null);
  const final = create('final', create('middle'));
  linkPrevious(final, second);
  assert.equal(final.phpPrevious.phpPrevious, second);
  linkPrevious(final, second);
  assert.equal(first.phpPrevious, null);
});

test('try branches participate in asynchronous transaction analysis', () => {
  for (const branch of [{action: {type: 'file'}}, {finally: {type: 'api'}}, {catches: [{action: {type: 'file'}}]}]) {
    assert.equal(hasAsyncAction({type: 'try', ...branch}), true);
  }
  assert.equal(hasAsyncAction({type: 'try', action: {type: 'set'}}), false);
});
