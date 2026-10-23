import {checkIteration as iteration} from './core/loop-budget.js';
import {destructure,destructureReference} from './core/php-destructure.js';
import {foreachEntries, referenceEntries} from './core/php-iterators.js';
import {bindOffsetPattern} from './core/php-object-collections.js';
import {execute} from './actions-runtime.js';
import {resolveData, resolveType, assignTarget, bindReferenceTarget} from './core/value.js';
import {phpBool} from './core/php-values.js';
import {phpMatches} from './core/php-operators.js';
import {clonePhp} from './core/php-arrays.js';
import {warn} from './core/diagnostics.js';
import {exceptionFlow} from './core/php-exceptions.js';

export const controlSignal = (signal) => signal === 'break' || signal === 'continue' ? {operation: signal, levels: 1} : signal?.operation === 'return' || signal?.operation === 'break' || signal?.operation === 'continue' ? signal : null;
const outerSignal = (signal) => signal.operation === 'return' ? signal : signal.levels === 2 ? signal.operation : {...signal, levels: signal.levels - 1};
const bind = (bindings, source, sourceKind, state, data) => bindOffsetPattern(bindings, {value: source, kind: sourceKind},
  (key) => {const value = resolveData(key, state, data); return {value, kind: resolveType(key, state, data, value)};},
  (target, item) => assignTarget(target, item.value, item.kind, state, data), data);
export const executeFlow = async (root, state, action, trigger, context) => {
  const data = context.eventData;
  const run = (instruction) => execute(root, state, instruction, trigger, context);
  if (action.type === 'try') {
    const flow = exceptionFlow(action, (target, error) => assignTarget(target, error, 'object', state, data), data);
    let step = flow.next();
    while (!step.done) { try { step = flow.next(await run(step.value)); } catch (error) { step = flow.throw(error); } }
    return step.value;
  }
  if (action.type === 'destructure') {destructure(action,state,data);return;}
  if (action.type === 'switch') {
    const subject = resolveData(action.value, state, data), kind = resolveType(action.value, state, data, subject);
    let start = -1, fallback = -1;
    for (let index = 0; index < action.cases.length; index++) {
      const branch = action.cases[index];
      if (branch.default) {fallback = index; continue;}
      const candidate = resolveData(branch.value, state, data);
      if (phpMatches('looseEq', subject, candidate, kind, resolveType(branch.value, state, data, candidate))) {start = index; break;}
    }
    if (start < 0) start = fallback;
    for (let index = start; index >= 0 && index < action.cases.length; index++) {
      const signal = controlSignal(await run(action.cases[index].action));
      if (!signal) continue;
      if (signal.operation === 'return' || signal.levels > 1) return outerSignal(signal);
      if (signal.operation === 'continue') warn(data, 'continue targeting switch is equivalent to break; use continue 2 to continue an outer loop');
      break;
    }
    return;
  }
  const limit = Math.max(1, Math.min(10000, action.limit || 1000));
  if (action.type === 'foreach-local') {
      const patternReference=action.bindings.some(binding=>binding.reference), byReference=action.reference||patternReference;
    const source = byReference ? null : clonePhp(resolveData(action.source, state, data));
    let count = 0;
    for (const {key, item, reference} of (byReference ? referenceEntries(action.source, state, data, () => iteration(data, ++count, limit)) : foreachEntries(source, !!action.key, data, () => iteration(data, ++count, limit)))) {
      if (reference && patternReference) destructureReference(action.bindings,reference,state,data); else if (reference) bindReferenceTarget(action.bindings[0].target, reference, state, data); else bind(action.bindings, item.value, item.kind, state, data);
      if (action.key) assignTarget(action.key, key.value, key.kind, state, data);
      const signal = controlSignal(await run(action.action));
      if (signal?.operation === 'return' || signal?.levels > 1) return outerSignal(signal);
      if (signal?.operation === 'break') break;
    }
    return;
  }
  await run(action.init);
  let count = 0;
  const condition = () => {let result = true; for (const item of action.conditions) result = resolveData(item, state, data); return phpBool(result);};
  while (action.kind === 'do' && count === 0 || condition()) {
    iteration(data, ++count, limit);
    const signal = controlSignal(await run(action.action));
    if (signal?.operation === 'return' || signal?.levels > 1) return outerSignal(signal);
    if (signal?.operation === 'break') break;
    await run(action.update);
  }
};
