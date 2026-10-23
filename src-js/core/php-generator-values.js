import {checkIteration} from './loop-budget.js';
import {resolveData, resolveType, resolvedNode, valueReference, promoteReference} from './value.js';
import {containsYield} from '../eval/generators.js';
import {isGenerator, generatorMethod, generatorClosed} from './php-generators.js';
import {foreachEntries, isIterable} from './php-iterators.js';
import {callableDefinition} from './php-functions.js';
import specs from './builtin-signatures.json' with {type: 'json'};
import {warn} from './diagnostics.js';
import {createReference} from './php-references.js';
import {phpBool} from './php-values.js';
import {phpMatches} from './php-operators.js';
import {clonePhp} from './php-arrays.js';

const empty = () => ({value: null, kind: 'NULL'});
const expr = (operation, left, right) => ({$expression: {operation, left, right}});
const assignable = (node) => node?.$local || node?.$state || ['componentInput', 'dynamicLocal', 'offset', 'appendOffset', 'objectProperty', 'objectStaticProperty'].includes(node?.$expression?.operation);
const read = (node, state, context) => {const value = resolveData(node, state, context); return {value, kind: resolveType(node, state, context, value)};};
export function* generatorTarget(node, state, context, frame) {
  const rule = node?.$expression;
  if (!rule) return node;
  if (['offset', 'appendOffset'].includes(rule.operation)) return expr(rule.operation, yield* generatorTarget(rule.left, state, context, frame), rule.operation === 'offset' ? resolvedNode(yield* generatorValue(rule.right, state, context, frame)) : null);
  if (rule.operation === 'objectProperty') return expr(rule.operation, resolvedNode(yield* generatorValue(rule.left, state, context, frame)), {...rule.right, name: resolvedNode(yield* generatorValue(rule.right.name, state, context, frame))});
  return node;
}
function* shape(node, state, context, frame) {
  if (!node || typeof node !== 'object') return node;
  if (Object.keys(node).some((key) => key.startsWith('$'))) return resolvedNode(yield* generatorValue(node, state, context, frame));
  const result = Array.isArray(node) ? [] : {};
  for (const [key, value] of Object.entries(node)) result[key] = yield* shape(value, state, context, frame);
  return result;
}
function* delegate(source, context) {
  if (!isIterable(source)) throw new Error('Can use "yield from" only with arrays and Traversables');
  if (isGenerator(source)) {
    if (generatorClosed(source)) throw new Error('Generator passed to yield from was aborted without proper return and is unable to continue');
    const call = (method, args = []) => generatorMethod(source, method, args, context);
    let count = 0;
    while (call('valid').value) {
      checkIteration(context, ++count);
      let sent;
      try {sent = yield {key: call('key'), item: call('current')};}
      catch (error) {call('throw', [{value: error, kind: 'object'}]); continue;}
      call('send', [sent || empty()]);
    }
    return call('getreturn');
  }
  let count = 0;
  for (const entry of foreachEntries(source, true, context, () => {
    checkIteration(context, ++count);
  })) yield entry;
  return empty();
}

function* nullsafeGenerator(node,state,context,frame) {
  const rule=node?.$expression;
  if(rule?.operation==='nullsafeChain')return yield* nullsafeGenerator(rule.left,state,context,frame);
  if(!['objectProperty','objectCall','objectMethodRef','offset','objectClassName','objectStaticProperty','objectClass','objectConstant'].includes(rule?.operation))return yield* generatorValue(node,state,context,frame);
  const isStatic=['objectCall','objectMethodRef'].includes(rule.operation)&&rule.right?.class!=null;
  const item=yield* nullsafeGenerator(isStatic?rule.right.class:rule.left,state,context,frame);
  if(item.skipped||item.value===null&&rule.right?.nullable)return {...empty(),skipped:true};
  const next=isStatic?expr(rule.operation,rule.left,{...rule.right,class:resolvedNode(item)}):expr(rule.operation,resolvedNode(item),rule.right);
  return yield* generatorValue(next,state,context,frame);
}

// Only the expression containing a suspension is split. Completed operands are
// opaque typed values, so calls and reference acquisition are never replayed.
export function* generatorValue(node, state, context, frame) {
  if (!containsYield(node)) return read(node, state, context);
  const evaluate = function* (value) {return yield* generatorValue(value, state, context, frame);};
  const rule = node?.$expression;
  if (node?.$conditional) {
    const c = node.$conditional, a = yield* evaluate(c.left), b = yield* evaluate(c.right);
    return yield* evaluate(phpMatches(c.operator, a.value, b.value, a.kind, b.kind) ? c.then : c.otherwise);
  }
  if (!rule) return read(yield* shape(node, state, context, frame), state, context);
  if (rule.operation === 'nullsafeChain') return yield* nullsafeGenerator(rule.left,state,context,frame);
  if (rule.operation === 'yield') {
    const key = rule.right.keyed ? yield* evaluate(rule.left) : {value: frame.index + 1, kind: 'integer'};
    let reference=null,item;
    if(frame.definition.returnsReference && assignable(rule.right.value)){reference=promoteReference(yield* generatorTarget(rule.right.value,state,context,frame),state,context);item=reference.get();}
    else {item=yield* evaluate(rule.right.value);if(frame.definition.returnsReference){warn(context,'Only variable references should be yielded by reference','PHP_NOTICE');reference=createReference(item);}}

    if (key.kind === 'integer' && key.value > frame.index) frame.index = key.value;
    if (!Number.isSafeInteger(frame.index)) throw new RangeError('Generator key exceeds safe frontend integer precision');
    return (yield {key, item: {...item, value: clonePhp(item.value)}, reference}) || empty();
  }
  if (rule.operation === 'yieldFrom') return yield* delegate((yield* evaluate(rule.left)).value, context);
  if (['assign', 'compoundAssign', 'coalesceAssign'].includes(rule.operation)) {
    const frozen = yield* generatorTarget(rule.left, state, context, frame), ref = valueReference(frozen, state, context, false, true);
    if (rule.operation === 'coalesceAssign') {const current = ref.probe?.() || ref.get(true); if (current.value != null) return current;}
    const right = rule.operation === 'compoundAssign' ? {...rule.right, value: resolvedNode(yield* evaluate(rule.right.value))} : resolvedNode(yield* evaluate(rule.right));
    return read(expr(rule.operation === 'coalesceAssign' ? 'assign' : rule.operation, resolvedNode(empty(), ref), right), state, context);
  }
  if (['preIncrement', 'postIncrement', 'preDecrement', 'postDecrement', 'unsetOffset'].includes(rule.operation)) return read(expr(rule.operation, yield* generatorTarget(rule.left, state, context, frame), rule.right), state, context);
  if (['and', 'or', 'coalesce', 'elvis'].includes(rule.operation)) {
    const left = rule.operation === 'coalesce' && !containsYield(rule.left) ? read(expr('coalesce', rule.left, null), state, context) : yield* evaluate(rule.left);
    if (rule.operation === 'and' && !phpBool(left.value)) return {value: false, kind: 'boolean'};
    if (rule.operation === 'or' && phpBool(left.value)) return {value: true, kind: 'boolean'};
    if (rule.operation === 'coalesce' && left.value != null || rule.operation === 'elvis' && phpBool(left.value)) return left;
    const right = yield* evaluate(rule.right);
    return ['and', 'or'].includes(rule.operation) ? {value: phpBool(right.value), kind: 'boolean'} : right;
  }
  if (rule.operation === 'match') {
    const subject = yield* evaluate(rule.left); let fallback;
    for (const arm of rule.right) {
      if (arm.default) {fallback = arm; continue;}
      for (const condition of arm.conditions) {const candidate = yield* evaluate(condition); if (phpMatches('eq', subject.value, candidate.value, subject.kind, candidate.kind)) return yield* evaluate(arm.value);}
    }
    if (fallback) return yield* evaluate(fallback.value);
    throw Object.assign(new Error('Unhandled match case'), {name: 'UnhandledMatchError'});
  }
  if (['call', 'objectCall', 'builtin'].includes(rule.operation)) {
    let callee;
    if (rule.operation === 'objectCall') {
      const options=rule.right.class!=null?{...rule.right,class:resolvedNode(yield* evaluate(rule.right.class))}:rule.right;
      const receiver = yield* evaluate(rule.left);
      if (receiver.value == null && rule.right.nullable) return empty();
      const name = yield* evaluate(rule.right.name);
      callee = read(expr('objectMethodRef', resolvedNode(receiver), {...options, name: resolvedNode(name), arguments: []}), state, context);
    } else callee = rule.operation === 'builtin' ? {value: rule.left, kind: 'string'} : yield* evaluate(rule.left);
    // The nullsafe receiver suppresses argument evaluation too.
    if (rule.operation === 'objectCall' && callee.value === null && rule.right.nullable) return empty();
    const builtin = typeof callee.value === 'string' ? callee.value.replace(/^\\/, '').toLowerCase() : null;
    const parameters = specs[builtin] || callableDefinition(callee.value, context)?.parameters || [];
    const args = []; let position = 0;
    for (const argument of rule.right.arguments || []) {
      const parameter = argument.name !== undefined ? parameters.find((p) => p.name === argument.name) || parameters.find((p) => p.variadic) : parameters[position] || parameters.find((p) => p.variadic);
      let ref = null, item;
      if ((parameter?.reference || argument.spread) && assignable(argument.value)) {
        ref = valueReference(yield* generatorTarget(argument.value, state, context, frame), state, context, false, false, !!argument.spread);
        if (parameter?.reference) ref = ref.indirect?.() || ref;
        item = parameter?.reference ? ref.acquire?.() || ref.get(true) : ref.get();
        // Evaluation has already acquired the argument; the invocation reuses it.
        const original = ref; let first = !!argument.spread;
        ref = {...ref, get: (...a) => first ? (first = false, item) : original.get(...a), acquire: () => original.get(true), indirect: () => ref};
      } else item = yield* evaluate(argument.value);
      args.push({...argument, value: resolvedNode({...item, value: clonePhp(item.value)}, ref)});
      if (argument.name === undefined) position += argument.spread ? Object.keys(item.value).length : 1;
    }
    return read(expr('call', resolvedNode(callee), {...rule.right, arguments: args}), state, context);
  }
  // Array entries are evaluated key first, even though the serialized descriptor
  // lists value first. The remaining expression forms have left-to-right operands.
  if (rule.operation === 'array') {
    const entries = [];
    for (const entry of rule.left) {
      if (Object.hasOwn(entry, 'spread')) entries.push({spread: resolvedNode(yield* evaluate(entry.spread))});
      else {const key = Object.hasOwn(entry, 'key') ? resolvedNode(yield* evaluate(entry.key)) : undefined; const value = resolvedNode(yield* evaluate(entry.value)); entries.push({...key === undefined ? {} : {key}, value});}
    }
    return read(expr('array', entries, rule.right), state, context);
  }
  return read(expr(rule.operation, yield* shape(rule.left, state, context, frame), yield* shape(rule.right, state, context, frame)), state, context);
}
