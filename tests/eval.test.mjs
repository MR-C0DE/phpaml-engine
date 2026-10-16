import test from 'node:test';
import assert from 'node:assert/strict';
import {compileEval} from '../src-js/eval/compiler.js';
import {installEvalCompiler, needsEvalParser} from '../src-js/core/php-eval.js';
import {resolveData, resolveType} from '../src-js/core/value.js';
installEvalCompiler(compileEval);
const source = {file: 'Page.php', line: 12, strictTypes: true, phpVersion: 80400};
const context = () => ({source, functions: {}, locals: {}, localTypes: {}, localReferences: {}, functionDeclarations: new Set(), functionDefinitionIds: new Map(), loopBudget: {remaining: 10000}, callBudget: {depth: 0, remaining: 10000}, evaluated: new WeakMap()});
const node = (code, options = {}) => ({$expression: {operation: 'eval', left: code, right: {source, ...options}}});
const run = (code, data = context(), options = {}) => resolveData(node(code, options), {}, data);

test('nullsafe chains reject writes, references and first-class closure creation before execution', () => {
  for (const code of ['$a?->foo(...);', '$a?->foo->bar(...);', '$a?->foo()::bar(...);', '$a?->foo->bar = 1;', '++$a?->foo->bar;', '$b =& $a?->foo();', 'unset($a?->foo->bar);']) {
    assert.match(compileEval('$a = null; ' + code, {source}).error?.message || '', /nullsafe/);
  }
  assert.equal(run('$a = null; return $a?->foo->bar;'), null);
  assert.equal(run('$a = null; return isset($a?->foo->bar);'), false);
});

test('eval shares locals and references, isolates return, and preserves float results', () => {
  const data = context(); let aliased = 2;
  data.localReferences.v78 = {get: () => ({value: aliased, kind: 'integer'}), set: (value, kind) => {aliased = value; return {value, kind};}};
  const expr = node('$x += 3; $created = $x; return 2.0; $x = 99;');
  assert.equal(resolveData(expr, {}, data), 2); assert.equal(resolveType(expr, {}, data, 2), 'double');
  assert.equal(aliased, 5); assert.equal(data.locals.v63726561746564, 5); assert.equal(data.callBudget.depth, 0);
  assert.equal(run(''), false); assert.equal(run('// comment'), null); assert.equal(run('return;'), null);
  assert.equal(run(false), false); assert.equal(run(null), false);
});
test('eval uses PHP 8 precedence and rejects ambiguous syntax', () => {
  assert.equal(run('return "total=" . 1 + 2 * 3;'), 'total=7');
  assert.deepEqual(run('$a = true and false; return [$a, -2 ** 2, 2 ** 3 ** 2];'), [true, -4, 512]);
  for (const code of ['return ( ;', 'return true ? 1 : false ? 2 : 3;', 'return 1 < 2 < 3;']) assert.throws(() => run(code), {name: 'ParseError'});
  assert.equal(run('return (1 < 2) < 3;'), false);
  assert.equal(run('return true ? 1 : (false ? 2 : 3);'), 1);
});
test('PHP escape bytes decode as UTF-8 and invalid bytes fail explicitly', () => {
  assert.equal(run('return "\\xC3\\xA9\\u{1F600}\\n";'), 'é😀\n');
  assert.throws(() => run('return "\\xFF";'), {name: 'ValueError'});
  assert.deepEqual(run('return [intval(value: "ff", base: 16), gettype(value: 2.0)];'), [255, 'double']);
});
test('eval declarations are conditional, survive evaluations, and never replace an existing function', () => {
  const data = context();
  run('if (false) { function selected(): int { return 100; } }', data);
  assert.equal(run('function selected(): int { return 3; } return selected();', data), 3);
  assert.equal(run('if (false) { function selected(): int { return 9; } } return selected();', data), 3);
  assert.throws(() => run('function selected(): int { return 9; }', data), /Cannot redeclare/);
  assert.equal(run('$fn = selected(...); return $fn();', data), 3);
  assert.throws(() => run('function strlen() {}'), /Cannot redeclare/);
});
test('eval errors have eval source locations and use weak types unless declared strict', () => {
  assert.equal(run('return strlen(123);'), 3);
  assert.throws(() => run('declare(strict_types=1); return strlen(123);'), (error) => error.name === 'TypeError' && error.source.file === "Page.php(12) : eval()'d code");
  assert.deepEqual(run('try {\n throw new RuntimeException("stop");\n} catch (Throwable $e) { return [$e->getLine(), $e->getFile(), $e->getTrace()[0]["function"]]; }'), [2, "Page.php(12) : eval()'d code", 'eval']);
  assert.equal(run('\nreturn __LINE__;'), 2);
});
test('bounded eval shares function, work and loop limits', () => {
  assert.throws(() => run(' '.repeat(65537)), {name: 'ValueError'});
  assert.throws(() => run('while (true) {}'), (error) => error.code === 'PHP_LOOP_LIMIT');
  assert.throws(() => run('function recurse_eval() { return eval("return recurse_eval();"); } return recurse_eval();'), (error) => error.code === 'PHP_CALL_LIMIT');
  const data = context(); data.callBudget.remaining = 1; assert.equal(run('return 1;', data), 1); assert.throws(() => run('return 1;', data), /call limit/);
  assert.throws(() => run('return 1;', {...context(), readOnly: true}), /reactive text/);
  assert.equal(compileEval('return ' + '['.repeat(150) + '1' + ']'.repeat(150) + ';', {source}).error.name, 'ValueError');
});
test('server facilities and arbitrary objects are closed, including browser globals', () => {
  for (const code of ['require "service.php";', 'return new PDO("sqlite::memory:");', 'return $_SERVER;', 'return window.alert(1);', 'return process.exit();']) assert.throws(() => run(code));
  assert.equal(run('$name="x"; $$name=4; return $x;'),4);
  assert.equal(run('class EvalNamedTest {public int $n=3;} return (new EvalNamedTest)->n;'),3);
  assert.equal(run('namespace EvalNamedSpace; return 7;'),7);
  assert.throws(() => run('return system("echo bad");'), /undefined frontend function/);
  assert.equal(run('return SORT_ASC;', context(), {constants: {SORT_ASC: 4}}), 4);
  assert.throws(() => run('return PRIVATE_SERVER_CONSTANT;'), /Undefined frontend constant/);
});
test('only dynamic eval requires the optional parser, including nested programs', () => {
  const literal = node('return 1;', {program: compileEval('return 1;', {source})});
  assert.equal(needsEvalParser(literal), false); assert.equal(needsEvalParser(node('return 1;')), true);
  assert.equal(needsEvalParser({functions: {f: {body: node('return 1;')}}}), true);
});

test('first-class callables resolve recursive and forward declarations and reject inactive functions', () => {
  assert.equal(run('function first_eval() { $next = second_eval(...); return $next(); } function second_eval() { return 7; } return first_eval();'), 7);
  assert.equal(run('function recursive_callable(int $n) { if ($n < 1) { return 0; } $self = recursive_callable(...); return $n + $self($n - 1); } return recursive_callable(3);'), 6);
  assert.throws(() => run('if (false) { function inactive_eval() {} } return inactive_eval(...);'), /undefined function/);
});

test('eval rejects invalid __debugInfo declarations before running their bodies', () => {
  for (const method of ['public static function __debugInfo() {}', 'public function __debugInfo($a = null) {}', 'public function __debugInfo(): mixed {}', 'private function __debugInfo() {}']) {
    assert.throws(() => run('return new class { ' + method + ' };'), /__debugInfo|magic method/);
  }
});

test('is_object stays pure in reactive expressions while member introspection requires an event', () => {
  const data = {...context(), readOnly: true};
  const call = (name, value) => ({$expression: {operation: 'builtin', left: name, right: {arguments: [{value}], source}}});
  assert.equal(resolveData(call('is_object', 'text'), {}, data), false);
  assert.throws(() => resolveData(call('get_class_methods', 'Missing'), {}, data), /introspection in an event/);
});
