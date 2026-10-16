import {destructureReference} from './php-destructure.js';
import {executeFunctionBody, declareFunction} from './php-functions.js';
import {containsYield} from '../eval/generators.js';
import {generatorValue, generatorTarget} from './php-generator-values.js';
import {foreachEntries, referenceEntries} from './php-iterators.js';
import {readOffset} from './php-object-collections.js';
import {assignTarget, bindReferenceTarget} from './value.js';
import {clonePhp} from './php-arrays.js';
import {phpBool, phpString, phpDump} from './php-values.js';
import {phpMatches, phpIncrement} from './php-operators.js';
import {withSource, warn} from './diagnostics.js';
import {exceptionFlow} from './php-exceptions.js';

// Coroutine counterpart of the synchronous function executor.
export function* executeGeneratorBody(action, state, context, frame) {
  if (!action) return;
  if (!containsYield(action)) return executeFunctionBody(action, state, context);
  const data = {...context, source: action.phpSource || context.source};
  const item = function* (node) {return yield* generatorValue(node, state, data, frame);};
  const value = function* (node) {return (yield* item(node)).value;};
  const run = function* (child) {return yield* executeGeneratorBody(child, state, data, frame);};
  const iteration = (count) => {if (count > (action.limit || 1000) || --data.loopBudget.remaining < 0) throw Object.assign(new RangeError('Frontend loop exceeds its safe iteration limit'), {code: 'PHP_LOOP_LIMIT'});};
  const outer = (signal) => signal.operation === 'return' ? signal : {...signal, levels: signal.levels - 1};
  const bindings = function* (rules, source, kind) {
    const cache = new Map();
    for (const binding of rules) {
      let current = {value: source, kind};
      for (const [depth, node] of binding.path.entries()) {
        const slot = binding.slots && depth + 1 < binding.path.length ? binding.slots.slice(0, depth + 1).join('.') : null;
        if (slot !== null && cache.has(slot)) current = cache.get(slot);
        else {const offset = yield* item(node); current = readOffset(current.value, offset.value, offset.kind, data); if (slot !== null) cache.set(slot, current);}
      }
      assignTarget(yield* generatorTarget(binding.target, state, data, frame), current.value, current.kind, state, data);
    }
  };
  try {
    if (action.type === 'try') {
      const flow = exceptionFlow(action, (target, error) => assignTarget(target, error, 'object', state, data), data);
      let step = flow.next();
      while (!step.done) { try { step = flow.next(yield* run(step.value)); } catch (error) { step = flow.throw(error); } }
      return step.value;
    }
    if (['sequence', 'transaction'].includes(action.type)) {for (const child of action.actions || []) {const signal = yield* run(child); if (signal) return signal;} return;}
    if (action.type === 'return') return {operation: 'return', ...(yield* item(action.value)), hasValue: action.hasValue, source: data.source};
    if (action.type === 'function-declare') {declareFunction(action.id, data); return;}
    if (action.type === 'evaluate') {yield* value(action.value); return;}
    if (action.type === 'local-set') {const result = yield* item(action.value); assignTarget({$local: action.name}, result.value, result.kind, state, data); return;}
    if (action.type === 'condition') {
      const a = yield* item(Object.hasOwn(action, 'left') ? action.left : {$state: action.state}), b = yield* item(action.value);
      return yield* run(phpMatches(action.operator, a.value, b.value, a.kind, b.kind) ? action.then : action.otherwise);
    }
    if (action.type === 'loop-control') return {operation: action.operation, levels: action.levels || 1};
    if (action.type === 'console') {
      const values = []; for (const node of action.values || []) values.push(yield* item(node));
      if (action.level === 'echo') console.log(values.map((entry) => phpString(entry.value, entry.kind, data)).join(''));
      else if (action.level === 'dump') console.log(values.map((entry) => phpDump(entry.value, entry.kind, 0, undefined, data)).join(''));
      else console[action.level === 'warn' ? 'warn' : action.level === 'error' ? 'error' : 'log'](...values.map((entry) => entry.value));
      return;
    }
    if (action.type === 'set') {const result = yield* item(action.value); data.assignState(action.target, result.value, result.kind, data.source); return;}
    if (action.type === 'increment' || action.type === 'decrement') {const current = yield* item({$state: action.target}); const next = phpIncrement(current.value, current.kind, action.type === 'increment' ? 1 : -1, data); data.assignState(action.target, next.value, next.kind, data.source); return;}
    if (action.type === 'destructure') {const result = yield* item(action.value); yield* bindings(action.bindings, clonePhp(result.value), result.kind); return;}
    if (action.type === 'switch') {
      const subject = yield* item(action.value); let start = -1, fallback = -1;
      for (let i = 0; i < action.cases.length; i++) {const branch = action.cases[i]; if (branch.default) {fallback = i; continue;} const candidate = yield* item(branch.value); if (phpMatches('looseEq', subject.value, candidate.value, subject.kind, candidate.kind)) {start = i; break;}}
      if (start < 0) start = fallback;
      for (let i = start; i >= 0 && i < action.cases.length; i++) {const signal = yield* run(action.cases[i].action); if (!signal) continue; if (signal.operation === 'return' || signal.levels > 1) return outer(signal); if (signal.operation === 'continue') warn(data, 'continue targeting switch is equivalent to break'); break;}
      return;
    }
    if (action.type === 'foreach-local') {
      const patternReference=action.bindings.some(binding=>binding.reference), byReference=action.reference||patternReference;
      const source = byReference ? null : clonePhp(yield* value(action.source));
      let count = 0;
      for (const {key, item, reference} of (byReference ? referenceEntries(action.source, state, data, () => iteration(++count)) : foreachEntries(source, !!action.key, data, () => iteration(++count)))) {if (reference && patternReference) destructureReference(action.bindings,reference,state,data); else if (reference) bindReferenceTarget(yield* generatorTarget(action.bindings[0].target, state, data, frame), reference, state, data); else yield* bindings(action.bindings, item.value, item.kind); if (action.key) assignTarget(yield* generatorTarget(action.key, state, data, frame), key.value, key.kind, state, data); const signal = yield* run(action.action); if (signal?.operation === 'return' || signal?.levels > 1) return outer(signal); if (signal?.operation === 'break') break;}
      return;
    }
    if (action.type === 'loop') {
      yield* run(action.init); let count = 0;
      const condition = function* () {let result = true; for (const node of action.conditions) result = yield* value(node); return phpBool(result);};
      while (action.kind === 'do' && count === 0 || (yield* condition())) {iteration(++count); const signal = yield* run(action.action); if (signal?.operation === 'return' || signal?.levels > 1) return outer(signal); if (signal?.operation === 'break') break; yield* run(action.update);}
      return;
    }
    throw new Error(`Unsupported instruction in a synchronous frontend function: ${action.type}`);
  } catch (error) {throw withSource(error, data.source, data.trace);}
}
