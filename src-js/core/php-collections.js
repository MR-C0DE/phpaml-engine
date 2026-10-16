import {promoteReference} from './value.js';
import {spreadEntries} from './php-iterators.js';
import {countObject} from './php-object-collections.js';
import {isPhpObject} from './php-object-values.js';
import {invokeFunction, isFrontendCallable} from './php-functions.js';
import {arrayEntries, arrayElementReference, arrayKey, arrayRead, arrayKind, arrayWrite, arrayUnset, makeArray, nextArrayKey, clonePhp, isPhpArray, arrayWithReference} from './php-arrays.js';
import {phpBool, phpType, phpString} from './php-values.js';
import {phpMatches, phpCompare, compareStrings} from './php-operators.js';

export const collectionOperations = new Set(['array', 'count', 'sum', 'contains', 'filter', 'map', 'reduce', 'find', 'any', 'all', 'sortBy', 'sort', 'keys', 'values', 'keyExists', 'arrayMutate']);
export const evaluateCollection = (expression, state, context, resolve, type, reference) => {
  const operation = expression.operation;
  const value = (node, data = context) => resolve(node, state, data);
  const kind = (node, result, data = context) => type(node, state, data, result);
  const callableCache = new Map();
  const callback = (node, args, kinds = []) => {
    if (node && Object.hasOwn(node, '$callable')) {
      if (!callableCache.has(node)) callableCache.set(node, value(node.$callable));
      return invokeFunction(callableCache.get(node), args.map((value, index) => ({value, kind: kinds[index] || phpType(value)})), state, {...context, source: {...context.source, strictTypes: false}});
    }
    const rule = node?.$callback;
    if (!rule) throw new TypeError('Expected a frontend arrow callback');
    const data = {...context, locals: clonePhp(context.locals || {}), localTypes: {...context.localTypes}, evaluated: new WeakMap(), collection: {...context.collection}, collectionTypes: {...context.collectionTypes}};
    rule.parameters.forEach((name, index) => {data.collection[name] = args[index]; data.collectionTypes[name] = kinds[index] || phpType(args[index]);});
    const result = value(rule.expression, data);
    return {value: result, kind: kind(rule.expression, result, data)};
  };
  for (const node of [expression.right, expression.right?.callback]) if (node && Object.hasOwn(node, '$callable')) {const fn = value(node.$callable); if (!isFrontendCallable(fn, context)) throw new TypeError('Expected a compiled frontend callable'); callableCache.set(node, fn);}
  if (operation === 'array') {
    let result = makeArray();
    for (const entry of expression.left) {
      if (Object.hasOwn(entry, 'spread')) {
        const source = value(entry.spread);
        for (const {key, item} of spreadEntries(source, context)) {const ref = isPhpArray(source) && arrayElementReference(source, key.value); result = ref ? arrayWithReference(result, key.value, ref, context, key.kind === 'integer') : arrayWrite(result, key.value, item.value, item.kind, context, key.kind === 'integer');}
      } else {
        const key = Object.hasOwn(entry, 'key') ? value(entry.key) : null;
        if (entry.reference) {result = arrayWithReference(result, key, promoteReference(entry.value, state, context), context, !Object.hasOwn(entry, 'key')); continue;}
        const item = value(entry.value);
        result = arrayWrite(result, key, item, kind(entry.value, item), context, !Object.hasOwn(entry, 'key'));
      }
    }
    return {value: result, kind: 'array'};
  }
  if (operation === 'arrayMutate') {
    const ref = reference(expression.left, state, context);
    const original = ref.get(); const source = original.value;
    const entries = arrayEntries(source), options = expression.right;
    const refsFor = (pairs, sourceEntries = entries) => new Map(pairs.map(([key], index) => [key, arrayElementReference(source, sourceEntries[index][0])]).filter(([, ref]) => ref));
    const args = (options.args || []).map((node) => ({value: value(node), node}));
    let next, result = {value: true, kind: 'boolean'};
    const fn = options.function;
    if (fn === 'array_pop' || fn === 'array_shift') {
      const removed = fn === 'array_pop' ? entries.pop() : entries.shift();
      result = removed ? {value: removed[1], kind: arrayKind(source, removed[0])} : {value: null, kind: 'NULL'};
      let position = 0;
      const pairs = fn === 'array_shift' ? entries.map(([key, item]) => [typeof key === 'number' ? position++ : key, item]) : entries;
      const types = new Map(pairs.map(([key], index) => [key, arrayKind(source, entries[index][0])]));
      const previous = nextArrayKey(source, context);
      next = makeArray(pairs, types, fn === 'array_pop' ? removed && typeof removed[0] === 'number' && removed[0] === previous - 1 ? removed[0] : previous : undefined, 0, refsFor(pairs));
    } else if (fn === 'array_push' || fn === 'array_unshift') {
      if (fn === 'array_push') {
        next = clonePhp(source);
        for (const item of args) next = arrayWrite(next, null, item.value, kind(item.node, item.value), context, true);
      } else {
        let index = args.length;
        const pairs = [...args.map((item, index) => [index, item.value]), ...entries.map(([key, item]) => [typeof key === 'number' ? index++ : key, item])];
        const types = new Map(args.map((item, index) => [index, kind(item.node, item.value)]));
        for (let i = 0; i < entries.length; i++) types.set(pairs[args.length + i][0], arrayKind(source, entries[i][0]));
        next = makeArray(pairs, types, undefined, 0, refsFor(pairs.slice(args.length))); 
      }
      result = {value: arrayEntries(next).length, kind: 'integer'};
    } else {
      const flag = args[0]?.value ?? 0;
      if (![0, 1, 2, 10].includes(flag)) throw new Error(`Unsupported frontend sort flag: ${flag}`);
      const compare = (left, right, leftKind, rightKind) => {
        if (flag === 1) return Number(left) - Number(right);
        if ([2, 10].includes(flag)) {
          let a = phpString(left, leftKind), b = phpString(right, rightKind);
          if (flag & 8) {a = a.toLowerCase(); b = b.toLowerCase();}
          return compareStrings(a, b);
        }
        return phpCompare(left, right, leftKind, rightKind);
      };
      const keys = fn === 'ksort' || fn === 'krsort';
      entries.sort((a, b) => (fn === 'usort' ? Number(callback(options.callback, [a[1], b[1]], [arrayKind(source, a[0]), arrayKind(source, b[0])]).value) : keys ? compare(a[0], b[0], phpType(a[0]), phpType(b[0])) : compare(a[1], b[1], arrayKind(source, a[0]), arrayKind(source, b[0]))) * (['rsort', 'arsort', 'krsort'].includes(fn) ? -1 : 1));
      const preserve = ['asort', 'arsort', 'ksort', 'krsort'].includes(fn);
      next = makeArray(entries.map(([key, item], index) => [preserve ? key : index, item]), new Map(entries.map(([key], index) => [preserve ? key : index, arrayKind(source, key)])), undefined, 0, new Map(entries.map(([key], index) => [preserve ? key : index, arrayElementReference(source, key)]).filter(([, ref]) => ref)));
    }
    ref.set(next, 'array');
    return result;
  }
  const source = value(expression.left);
  if (operation === 'count' && isPhpObject(source)) return countObject(source, 0, context);
  const entries = arrayEntries(source);
  const arrayResult = (pairs, types = new Map(), refs = new Map()) => ({value: makeArray(pairs, types, undefined, 0, refs), kind: 'array'});
  const refsFor = (pairs, sourceEntries = entries) => new Map(pairs.map(([key], index) => [key, arrayElementReference(source, sourceEntries[index][0])]).filter(([, ref]) => ref));
  if (operation === 'count') return {value: entries.length, kind: 'integer'};
  if (operation === 'sum') { const sum = entries.reduce((sum, [, item]) => sum + (Number(item) || 0), 0); return {value: sum, kind: entries.some(([key]) => arrayKind(source, key) === 'double') ? 'double' : phpType(sum)}; }
  if (operation === 'keys') return arrayResult(entries.map(([key], index) => [index, key]));
  if (operation === 'values') return arrayResult(entries.map(([, item], index) => [index, clonePhp(item)]), new Map(entries.map(([key], index) => [index, arrayKind(source, key)])), refsFor(entries.map(([, item], index) => [index, item])));
  if (operation === 'keyExists') return {value: Object.hasOwn(source, arrayKey(value(expression.right), context)), kind: 'boolean'};
  if (operation === 'contains') {
    const modern = expression.right && Object.hasOwn(expression.right, 'needle') && Object.hasOwn(expression.right, 'strict');
    const needleNode = modern ? expression.right.needle : expression.right;
    const needle = value(needleNode), needleType = kind(needleNode, needle);
    const strict = modern ? phpBool(value(expression.right.strict)) : true;
    return {value: entries.some(([key, item]) => phpMatches(strict ? 'eq' : 'looseEq', item, needle, arrayKind(source, key), needleType)), kind: 'boolean'};
  }
  if (operation === 'sort' || operation === 'sortBy') {
    entries.sort((a, b) => operation === 'sort' ? phpCompare(a[1], b[1], arrayKind(source, a[0]), arrayKind(source, b[0])) : Number(callback(expression.right, [a[1], b[1]]).value));
    return arrayResult(entries.map(([, item], index) => [index, clonePhp(item)]), new Map(entries.map(([key], index) => [index, arrayKind(source, key)])), refsFor(entries.map(([, item], index) => [index, item])));
  }
  if (operation === 'reduce') {
    let result = {value: value(expression.right.initial), kind: null}; result.kind = kind(expression.right.initial, result.value);
    for (const [key, item] of entries) result = callback(expression.right, [result.value, item], [result.kind, arrayKind(source, key)]);
    return result;
  }
  const selected = [], types = new Map();
  for (const [key, item] of entries) {
    const result = expression.right ? callback(expression.right, [item], [arrayKind(source, key)]) : {value: phpBool(item), kind: 'boolean'};
    if (operation === 'map') {selected.push([key, clonePhp(result.value)]); types.set(key, result.kind);}
    else if (operation === 'filter' && phpBool(result.value)) {selected.push([key, clonePhp(item)]); types.set(key, arrayKind(source, key));}
    else if (operation === 'find' && phpBool(result.value)) return {value: clonePhp(item), kind: arrayKind(source, key)};
    else if (operation === 'any' && phpBool(result.value)) return {value: true, kind: 'boolean'};
    else if (operation === 'all' && !phpBool(result.value)) return {value: false, kind: 'boolean'};
  }
  if (operation === 'find') return {value: null, kind: 'NULL'};
  if (operation === 'any' || operation === 'all') return {value: operation === 'all', kind: 'boolean'};
  return arrayResult(selected, types, operation === 'filter' ? new Map(selected.map(([key]) => [key, arrayElementReference(source, key)]).filter(([, ref]) => ref)) : new Map());
};
