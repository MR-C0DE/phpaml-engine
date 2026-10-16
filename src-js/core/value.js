import {dynamicLocalId} from './php-symbols.js';
import {resolveNullsafe} from './php-nullsafe.js';
import {createReference, bindLocalReference, unbindLocalReference, hasLocalBinding} from './php-references.js';
import {compoundCast} from './php-casts.js';
import {staticLocal} from './php-function-introspection.js';
import {splMethod} from './php-spl.js';
import {evaluateEnum} from './php-enums.js';
import {objectOffsetReference, readOffset} from './php-object-collections.js';
import {isPhpObject} from './php-object-values.js';
import {staticPropertyReference} from './php-static-properties.js';
import {evaluateObject, objectPropertyReference} from './php-objects.js';
import {createClosure, evaluateCall, evaluateDisplay} from './php-functions.js';
import {evaluateEval} from './php-eval.js';
import {evaluateException} from './php-exceptions.js';
import {bytes, text} from './php-builtin-support.js';
import {evaluateBuiltin, phpRound} from './php-builtins.js';
import {roundingMode} from './php-rounding-mode.js';
import {isPhpArray, arrayElementReference, arrayRead, arrayWrite, arrayUnset, clonePhp, arrayKind, sameArrayOrigin, arrayReference, arrayWithReference, ownArray} from './php-arrays.js';
import {collectionOperations, evaluateCollection} from './php-collections.js';
import { readPath } from './state.js';
import { phpMatches, phpCompare, phpIncrement, phpBitwise } from './php-operators.js';
import { localName, warn } from './diagnostics.js';
import { phpArithmetic, phpBool, phpFloat, phpInt, phpString, phpType, hasFloatNumericPrefix } from './php-values.js';

const resolved = new WeakMap();
export const resolvedNode = (item, reference = null) => {const node = reference ? {$local: 'v67656e657261746f72'} : {}; resolved.set(node, {...item, reference}); return node;};
export const resolveData = (value, state, eventData = null) => {
  eventData ??= {};
  eventData.objectState = state;
  eventData.evaluated ??= new WeakMap();
  if (resolved.has(value)) {const item = resolved.get(value); eventData.evaluated.set(value, item); return item.value;}
  const result = resolveValue(value, state, eventData);
  if (value && typeof value === 'object') eventData.evaluated.set(value, {...eventData.evaluated.get(value), value: result, kind: resultType(value, state, eventData, result)});
  return result;
};

const record = (node, result, context) => {context.evaluated.set(node, result); return result.value;};
const assign = (target, value, kind, state, context) => {
  if (target?.$collection) { context.collection[target.$collection] = clonePhp(value); context.collectionTypes[target.$collection] = kind; return {value, kind}; }
  if (target?.$local) {
    if (!/^v(?:[0-9a-f]{2})*$/.test(target.$local) || !context.locals) throw new Error('Invalid frontend local assignment');
    if (context.localReferences?.[target.$local]) return context.localReferences[target.$local].set(value, kind, context.source);
    context.locals[target.$local] = clonePhp(value, sameArrayOrigin(value, context.locals[target.$local]));
    context.localTypes[target.$local] = kind; ownArray(context.locals, target.$local, context.locals[target.$local]);
    return {value, kind};
  }
  if (target?.$state && context.assignState) return context.assignState(target.$state, value, kind, context.source);
  throw new Error('A mutating expression requires an action scope and an assignable target');
};
export const valueReference = (target, state, context, indirect = false, quiet = false, unpack = false) => {
  if (target?.$expression?.operation === 'dynamicLocal') target = {$local: dynamicLocalId(resolveData(target.$expression.left,state,context),context)};
  if (resolved.get(target)?.reference) return resolved.get(target).reference;
  if (target?.$local) {
    const id = target.$local, remove = () => {unbindLocalReference(context, id); ownArray(context.locals, id, null); delete context.locals[id]; delete context.localTypes[id];};
    const reference = context.localReferences?.[id];
    if (reference) return {...reference, set: (value, kind, source = context.source) => reference.set(value, kind, source), remove};
  }
  if (['objectThis', 'objectCall', 'objectNew', 'call'].includes(target?.$expression?.operation)) {const value = resolveData(target, state, context); return {get: () => ({value, kind: phpType(value)})};}
  if (target?.$expression?.operation === 'objectStaticProperty') return staticPropertyReference(target.$expression, state, context);
  if (target?.$expression?.operation === 'objectProperty') {const ref = objectPropertyReference(target.$expression, state, context); return indirect ? ref.indirect() : ref;}
  if (['offset', 'appendOffset'].includes(target?.$expression?.operation)) {
    const rule = target.$expression;
    const parent = valueReference(rule.left, state, context, false, quiet, unpack);
    const append = rule.operation === 'appendOffset';
    const key = append ? null : resolveData(rule.right, state, context);
    const keyKind = append ? 'NULL' : resolveType(rule.right, state, context, key);
    let prepared;
    const prepare = () => prepared ??= offsetReference(parent, key, keyKind, append, context, unpack);
    // Fetch writable offsets after the RHS. ??= first probes without acquiring
    // them, and acquires nested overloaded values only for an assigned fallback.
    const ref = quiet ? {
      probe: (issetOnly = false) => readOffset((parent.probe?.() || parent.get(true)).value, key, keyKind, context, true, issetOnly),
      get: (...args) => prepare().get(...args),
      set: (...args) => prepare().set(...args),
      remove: () => prepare().remove(),
      indirect: () => {const actual = prepare(); return actual.indirect?.() || actual;},
    } : prepare();
    return indirect ? ref.indirect?.() || ref : ref;
  }
  return {
    ...(target?.$state ? {embeddable: false} : {}),
    get: (quiet = false) => {const value = quiet ? resolveQuiet(target, state, context) : resolveData(target, state, context); return {value, kind: resolveType(target, state, context, value)};},
    set: (value, kind, source = context.source) => assign(target, value, kind, state, {...context, source}),
    remove: () => {if (target?.$local) {ownArray(context.locals, target.$local, null); delete context.locals[target.$local]; delete context.localTypes[target.$local]; if (context.localReferences) delete context.localReferences[target.$local];} else throw new Error('Cannot unset a root state property');},
  };
};
const offsetReference = (reference, key, keyKind, append, context, unpack = false) => {
  const parent = unpack ? reference : reference.indirect?.() || reference;
  const container = parent.get(true).value;
  if (isPhpObject(container)) {
    const ref = objectOffsetReference(container, key, keyKind, context);
    if (!unpack) return ref;
    let item = ref.get(); item = {...item, value: clonePhp(item.value)};
    return {get: () => item, set: (value, kind) => item = {value, kind}};
  }
  if (phpType(container) === 'object') throw new Error('Cannot use object as array');
  return {
    get: (quiet = false) => arrayRead(parent.get(quiet).value, key, context, quiet),
    probe: () => readOffset((reference.probe?.() || reference.get(true)).value, key, keyKind, context, true),
    acquire: () => {const result = arrayRead(parent.get(true).value, key, context, true); parent.warnIndirect?.(); return result;},
    set: (value, kind, source = context.source) => {const current=parent.get(true).value, ref=!append&&isPhpArray(current)?arrayElementReference(current,key):null; if(ref)return ref.set(value,kind);parent.set(arrayWrite(current, key, value, kind, context, append), 'array', source); return {value, kind};},
    remove: () => {const current = parent.get(true).value; if (current != null) parent.set(arrayUnset(current, key, context), 'array');},
  };
};
export const assignTarget = (target, value, kind, state, context) => valueReference(target, state, context).set(value, kind);
export const resolveQuiet = (node, state, context, issetOnly = false) => {
  if (node?.$expression?.operation === 'nullsafeChain') return record(node, resolveNullsafe(node.$expression.left,state,context,true,issetOnly),context);
  if (node?.$expression?.operation === 'dynamicLocal') return resolveQuiet({$local:dynamicLocalId(resolveData(node.$expression.left,state,context),context)},state,context,issetOnly);
  if (node?.$expression?.operation === 'objectStaticProperty') return record(node, staticPropertyReference(node.$expression, state, context).get(true), context);
  if (node?.$expression?.operation === 'objectProperty') return record(node, objectPropertyReference(node.$expression, state, context).probe(issetOnly), context);
  if (node?.$local && context.localReferences?.[node.$local]) return record(node, context.localReferences[node.$local].get(true), context);
  if (node?.$local && !Object.hasOwn(context.locals || {}, node.$local)) return record(node, {value: null, kind: 'NULL'}, context);
  if (node?.$expression?.operation === 'offset') {
    const parent = resolveQuiet(node.$expression.left, state, context);
    const key = resolveData(node.$expression.right, state, context);
    return record(node, readOffset(parent, key, resolveType(node.$expression.right, state, context, key), context, true, issetOnly), context);
  }
  return resolveData(node, state, context);
};
const resolveValue = (value, state, eventData) => {
  if (Array.isArray(value)) return value.map((item) => resolveData(item, state, eventData));
  if (value && typeof value === 'object') {
    if (Object.hasOwn(value, '$float')) return Number(value.$float);
    if (typeof value.$local === 'string') {
      if (eventData.localReferences?.[value.$local]) return record(value, eventData.localReferences[value.$local].get(), eventData);
      if (!eventData?.locals || !Object.hasOwn(eventData.locals, value.$local)) throw new Error(`Undefined frontend local: ${localName(value.$local)}`);
      return eventData.locals[value.$local];
    }
    if (typeof value.$state === 'string') return readPath(state, value.$state);
    if (typeof value.$event === 'string') return readPath(eventData || {}, value.$event);
    if (typeof value.$loop === 'string') return readPath(eventData?.loop || {}, value.$loop);
    if (typeof value.$collection === 'string') return readPath(eventData?.collection || {}, value.$collection);
    if (value.$expression && typeof value.$expression === 'object') {
      const expression = value.$expression;
      if (expression.operation === 'dynamicLocal') { const target={$local:dynamicLocalId(resolveData(expression.left,state,eventData),eventData)}; const result=resolveData(target,state,eventData); return record(value,{value:result,kind:resolveType(target,state,eventData,result)},eventData); }
      if (expression.operation === 'nullsafeChain') return record(value,resolveNullsafe(expression.left,state,eventData),eventData);
      if (expression.operation.startsWith('object')) return record(value, evaluateObject(expression, state, eventData), eventData);
      if (expression.operation === 'eval') return record(value, evaluateEval(expression, state, eventData, resolveData, resolveType), eventData);
      if (['exception', 'exceptionGet', 'exceptionIs', 'throw', 'assert'].includes(expression.operation)) return evaluateException(expression, state, eventData, resolveData, resolveType);
      if (expression.operation === 'display') return record(value, evaluateDisplay(expression, state, eventData), eventData);
      if (expression.operation === 'assignReference') {const ref = promoteReference(expression.right, state, eventData); bindReferenceTarget(expression.left, ref, state, eventData); return record(value, ref.get(), eventData);}
      if (expression.operation === 'splMethod') return record(value, splMethod(expression, state, eventData), eventData);
      if (expression.operation === 'builtin') return record(value, evaluateBuiltin(expression, state, eventData, resolveData, resolveType, valueReference), eventData);
      if (expression.operation === 'staticLocal') return staticLocal(expression, state, eventData);
      if (['enumCase', 'enumCases', 'enumFrom'].includes(expression.operation)) return record(value, evaluateEnum(expression, state, eventData), eventData);
      if (expression.operation === 'roundingMode') return roundingMode(expression.left);
      if (expression.operation === 'call') return record(value, evaluateCall(expression, state, eventData), eventData);
      if (expression.operation === 'closure' || expression.operation === 'functionRef') return createClosure(expression.left, expression.operation === 'closure' ? expression.right : [], state, eventData);
      if (collectionOperations.has(expression.operation)) return record(value, evaluateCollection(expression, state, eventData, resolveData, resolveType, valueReference), eventData);
      if (expression.operation === 'match') {
        const subject = resolveData(expression.left, state, eventData);
        const subjectType = resolveType(expression.left, state, eventData, subject);
        let fallback;
        for (const arm of expression.right) {
          if (arm.default) {fallback = arm; continue;}
          for (const condition of arm.conditions) {
            const candidate = resolveData(condition, state, eventData);
            if (phpMatches('eq', subject, candidate, subjectType, resolveType(condition, state, eventData, candidate))) {
              const result = resolveData(arm.value, state, eventData);
              return record(value, {value: result, kind: resolveType(arm.value, state, eventData, result)}, eventData);
            }
          }
        }
        if (fallback) {const result = resolveData(fallback.value, state, eventData); return record(value, {value: result, kind: resolveType(fallback.value, state, eventData, result)}, eventData);}
        const error = new Error('Unhandled match case'); error.name = 'UnhandledMatchError'; throw error;
      }
      if (['assign', 'coalesceAssign', 'compoundAssign', 'unsetOffset'].includes(expression.operation)) {
        const ref = valueReference(expression.left, state, eventData, false, ['assign', 'coalesceAssign', 'compoundAssign'].includes(expression.operation));
        if (expression.operation === 'unsetOffset') {ref.remove(); return null;}
        if (expression.operation === 'coalesceAssign') {const current = ref.probe?.() || ref.get(true); if (current.value != null) return record(value, current, eventData);}
        if (expression.operation === 'compoundAssign') {
          const right = resolveData(expression.right.value, state, eventData);
          const current = ref.get();
          const operator = expression.right.operator;
          const rightType = resolveType(expression.right.value, state, eventData, right);
          const operation = {'+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide', '%': 'modulo', '**': 'power'}[operator];
          const floating = operator !== '%' && (current.kind === 'double' || rightType === 'double' || hasFloatNumericPrefix(current.value) || hasFloatNumericPrefix(right) || operator === '**' && Number(right) < 0);
          const bitOperation = {'<<': 'shiftLeft', '>>': 'shiftRight', '&': 'bitAnd', '|': 'bitOr', '^': 'bitXor'}[operator];
          const result = bitOperation ? resolveData({$expression: {operation: bitOperation, left: resolvedNode(current), right: resolvedNode({value: right, kind: rightType})}}, state, eventData) : operator === '.' ? phpString(current.value, current.kind, eventData) + phpString(right, rightType, eventData) : phpArithmetic(operation, current.value, right, floating, eventData);
          return record(value, ref.set(result, !bitOperation && floating ? 'double' : phpType(result)), eventData);
        }
        const right = resolveData(expression.right, state, eventData);
        return record(value, ref.set(right, resolveType(expression.right, state, eventData, right)), eventData);
      }
      if (['preIncrement', 'postIncrement', 'preDecrement', 'postDecrement'].includes(expression.operation)) {
        let ref = valueReference(expression.left, state, eventData);
        ref = ref.increment?.() || ref;
        const before = ref.get();
        const next = phpIncrement(before.value, before.kind, expression.operation.endsWith('Increment') ? 1 : -1, eventData);
        const after = ref.set(next.value, next.kind);
        return record(value, expression.operation.startsWith('post') ? before : after, eventData);
      }
      const left = ['coalesce', 'isset', 'empty'].includes(expression.operation) ? resolveQuiet(expression.left, state, eventData, expression.operation === 'isset') : resolveData(expression.left, state, eventData);
      if (expression.operation === 'and') return phpBool(left) && phpBool(resolveData(expression.right, state, eventData));
      if (expression.operation === 'or') return phpBool(left) || phpBool(resolveData(expression.right, state, eventData));
      if (expression.operation === 'coalesce' || expression.operation === 'elvis') {
        if (expression.operation === 'coalesce' ? left != null : phpBool(left)) return record(value, {value: left, kind: resolveType(expression.left, state, eventData, left)}, eventData);
        const right = resolveData(expression.right, state, eventData);
        return record(value, {value: right, kind: resolveType(expression.right, state, eventData, right)}, eventData);
      }
      if (expression.operation === 'isset') return left != null;
      if (expression.operation === 'empty') return !phpBool(left);
      if (['incrementValue', 'decrementValue'].includes(expression.operation)) return record(value, phpIncrement(left, resolveType(expression.left, state, eventData, left), expression.operation === 'incrementValue' ? 1 : -1, eventData), eventData);
      if (expression.operation === 'isObject') return phpType(left) === 'object';
      if (expression.operation === 'gettype') return resolveType(expression.left, state, eventData, left);
      const right = resolveData(expression.right, state, eventData);
      if (expression.operation === 'offset') return record(value, readOffset(left, right, resolveType(expression.right, state, eventData, right), eventData), eventData);
      if (expression.operation === 'xor') return phpBool(left) !== phpBool(right);
      if (['bitNot', 'shiftLeft', 'shiftRight'].includes(expression.operation)) return phpBitwise(expression.operation, left, right, eventData);
      if (['bitOr', 'bitAnd', 'bitXor'].includes(expression.operation)) {
        const a = left, b = right, op = expression.operation;
        if (typeof a === 'string' && typeof b === 'string') {
          const x = bytes(a), y = bytes(b), output = new Uint8Array(op === 'bitOr' ? Math.max(x.length, y.length) : Math.min(x.length, y.length));
          for (let i = 0; i < output.length; i++) output[i] = op === 'bitOr' ? (x[i] || 0) | (y[i] || 0) : op === 'bitAnd' ? x[i] & y[i] : x[i] ^ y[i];
          return text(output);
        }
        return phpBitwise(op, a, b, eventData);
      }
      if (['add', 'subtract', 'multiply', 'divide', 'modulo', 'power'].includes(expression.operation)) {
        const floating = resolveType(expression.left, state, eventData, left) === 'double'
          || resolveType(expression.right, state, eventData, right) === 'double'
          || [left, right].some(hasFloatNumericPrefix)
          || expression.operation === 'power' && Number(right) < 0;
        return phpArithmetic(expression.operation, left, right, expression.operation !== 'modulo' && floating, eventData);
      }
      if (['identical', 'notIdentical', 'equal', 'notEqual', 'less', 'lessEqual', 'greater', 'greaterEqual'].includes(expression.operation)) {
        return phpMatches(expression.operation, left, right, resolveType(expression.left, state, eventData, left), resolveType(expression.right, state, eventData, right));
      }
      if (expression.operation === 'concat') return phpString(left, resolveType(expression.left, state, eventData, left), eventData) + phpString(right, resolveType(expression.right, state, eventData, right), eventData);
      if (expression.operation === 'not') return !phpBool(left);
      if (expression.operation === 'column') {
        if (!Array.isArray(left) || typeof right !== 'string') return [];
        return left.map((item) => item && typeof item === 'object' ? readPath(item, right) : null);
      }
      if (expression.operation === 'unique') {
        return Array.isArray(left) ? [...new Set(left)] : [];
      }
      if (expression.operation === 'reverse') {
        return Array.isArray(left) ? [...left].reverse() : [];
      }
      if (expression.operation === 'slice') {
        if (!Array.isArray(left)) return [];
        const offset = Number(resolveData(expression.right?.offset, state, eventData) ?? 0);
        const length = expression.right && Object.hasOwn(expression.right, 'length')
          ? Number(resolveData(expression.right.length, state, eventData))
          : null;
        if (!Number.isInteger(offset) || (length !== null && !Number.isInteger(length))) return [];
        if (length === null) return left.slice(offset);
        const start = offset < 0 ? Math.max(0, left.length + offset) : offset;
        const end = length >= 0 ? start + length : Math.max(start, left.length + length);
        return left.slice(start, end);
      }
      if (expression.operation === 'merge') {
        const collections = Array.isArray(expression.right) ? expression.right : [];
        return [left, ...collections]
          .map((collection) => resolveData(collection, state, eventData))
          .filter(Array.isArray)
          .flat();
      }
      if (expression.operation === 'search') {
        if (!Array.isArray(left)) return false;
        const position = left.findIndex((item) => item === right);
        return position === -1 ? false : position;
      }
      if (expression.operation === 'ceil') return Math.ceil(Number(left ?? 0));
      if (expression.operation === 'floor') return Math.floor(Number(left ?? 0));
      if (expression.operation === 'round') {
        return phpRound(Number(left ?? 0), Number(right ?? 0), 1, eventData.source?.phpVersion);
      }
      if (expression.operation === 'min') return Math.min(Number(left ?? 0), Number(right ?? 0));
      if (expression.operation === 'max') return Math.max(Number(left ?? 0), Number(right ?? 0));
      if (['toArray', 'toObject'].includes(expression.operation)) return record(value, compoundCast(expression.operation, left, resolveType(expression.left, state, eventData, left), eventData), eventData);
      if (expression.operation === 'toInt') return phpInt(left);
      if (expression.operation === 'toFloat') return phpFloat(left);
      if (expression.operation === 'toString') return phpString(left, resolveType(expression.left, state, eventData, left), eventData);
      if (expression.operation === 'toBool') return phpBool(left);
      if (expression.operation === 'compare') {
        const result = phpCompare(left, right, resolveType(expression.left, state, eventData, left), resolveType(expression.right, state, eventData, right));
        return Number.isNaN(result) ? 1 : result;
      }
      throw new Error(`Unknown AML state expression: ${expression.operation}`);
    }
    if (value.$conditional && typeof value.$conditional === 'object') {
      const condition = value.$conditional;
      const left = resolveData(condition.left, state, eventData);
      const right = resolveData(condition.right, state, eventData);
      const matches = phpMatches(condition.operator, left, right, resolveType(condition.left, state, eventData, left), resolveType(condition.right, state, eventData, right));
      const selected = matches ? condition.then : condition.otherwise;
      const result = resolveData(selected, state, eventData);
      return record(value, {value: result, kind: resolveType(selected, state, eventData, result)}, eventData);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveData(item, state, eventData)]));
  }
  return value;
};

// Evaluation records retain numeric kinds without evaluating an operand twice.
export const resolveType = (expression, state, context = null, value = undefined) => {
  context ??= {};
  const record = expression && typeof expression === 'object' ? context.evaluated?.get(expression) : null;
  if (record) return record.kind;
  if (value === undefined) value = resolveData(expression, state, context);
  return resultType(expression, state, context, value);
};
const resultType = (expression, state, context, value) => {
  if (resolved.has(expression)) return resolved.get(expression).kind;
  if (value == null || typeof value !== 'number') return phpType(value);
  if (!expression || typeof expression !== 'object') return phpType(value);
  if (Object.hasOwn(expression, '$float')) return 'double';
  if (expression.$local) return context.localTypes?.[expression.$local] || phpType(value);
  if (expression.$collection) return context.collectionTypes?.[expression.$collection] || phpType(value);
  if (expression.$state) {
    const type = context.valueTypes?.[expression.$state] || context.stateTypes?.[expression.$state];
    return ['float', 'double'].includes(type) ? 'double' : ['int', 'integer'].includes(type) ? 'integer' : phpType(value);
  }
  if (expression.$conditional) return context.evaluated?.get(expression)?.kind || phpType(value);
  const rule = expression.$expression;
  if (!rule) return phpType(value);
  if (collectionOperations.has(rule.operation) || ['match', 'offset', 'call', 'builtin', 'display', 'eval', 'objectProperty', 'objectStaticProperty', 'objectCall', 'objectConstant'].includes(rule.operation)) return context.evaluated?.get(expression)?.kind || phpType(value);
  if (['compoundAssign', 'assign', 'coalesceAssign', 'preIncrement', 'postIncrement', 'preDecrement', 'postDecrement', 'incrementValue', 'decrementValue', 'coalesce', 'elvis'].includes(rule.operation)) return context.evaluated?.get(expression)?.kind || phpType(value);
  if (['toFloat', 'ceil', 'floor', 'round'].includes(rule.operation)) return 'double';
  if (['toInt', 'count', 'compare', 'modulo'].includes(rule.operation)) return 'integer';
  if (['add', 'subtract', 'multiply', 'divide', 'power', 'min', 'max'].includes(rule.operation)) {
    for (const node of [rule.left, rule.right]) {
      const evaluated = node && typeof node === 'object' ? context.evaluated?.get(node) : {value: node, kind: phpType(node)};
      if (evaluated?.kind === 'double' || hasFloatNumericPrefix(evaluated?.value)) return 'double';
    }
    const exponent = rule.right && typeof rule.right === 'object' ? context.evaluated?.get(rule.right)?.value : rule.right;
    if (rule.operation === 'power' && Number(exponent) < 0) return 'double';
  }
  return phpType(value);
};

export const promoteReference = (target, state, context) => {
  if(target?.$expression?.operation==='dynamicLocal')target={$local:dynamicLocalId(resolveData(target.$expression.left,state,context),context)};
  if (['call', 'objectCall', 'builtin'].includes(target?.$expression?.operation)) {const value = resolveData(target, state, context), item = context.evaluated.get(target); if (item.reference) return item.reference; warn(context, 'Only variables should be assigned by reference', 'PHP_NOTICE'); return createReference({value, kind: item.kind});}
  if (target?.$local) {const id = target.$local; if (!Object.hasOwn(context.locals || {}, id) && hasLocalBinding(context, id)) unbindLocalReference(context, id); return context.localReferences?.[id] ? bindLocalReference(context, id, context.localReferences[id]) : bindLocalReference(context, id, createReference({value: context.locals?.[id] ?? null, kind: context.localTypes?.[id] || phpType(context.locals?.[id])}));}
  if (['offset', 'appendOffset'].includes(target?.$expression?.operation)) {
    const rule = target.$expression, parent = valueReference(rule.left, state, context), key = resolveData(rule.right, state, context);
    const source = parent.get(true).value;
    if (isPhpObject(source)) return objectOffsetReference(source, key, phpType(key), context).reference();
    const item = arrayReference(source, key, context, rule.operation === 'appendOffset');
    // Keep the newly acquired cell alive while storing its array container.
    const guard = {}; item.reference.cell?.bindings.add(guard); parent.set(item.array, 'array'); item.reference.cell?.bindings.delete(guard);
    return item.reference;
  }
  let reference = valueReference(target, state, context); reference = reference.reference?.() || reference; if (!reference.set) throw new Error('Expression cannot be referenced'); return reference;
};
export const bindReferenceTarget = (target, reference, state, context) => {
  if(target?.$expression?.operation==='dynamicLocal')target={$local:dynamicLocalId(resolveData(target.$expression.left,state,context),context)};
  if (target?.$local) return bindLocalReference(context, target.$local, reference);
  if (['objectProperty','objectStaticProperty'].includes(target?.$expression?.operation)) {
    const destination = valueReference(target, state, context);
    if (destination.bind) return destination.bind(reference);
    throw new Error('This property does not support reference binding');
  }
  if (['offset', 'appendOffset'].includes(target?.$expression?.operation)) {
    const rule = target.$expression, parent = valueReference(rule.left, state, context), key = resolveData(rule.right, state, context);
    parent.set(arrayWithReference(parent.get(true).value, key, reference, context, rule.operation === 'appendOffset'), 'array'); return reference;
  }
  throw new Error('Reference binding requires a local variable or an array offset');
};
