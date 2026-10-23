import {checkIteration} from './loop-budget.js';
import {splListMethod,cloneSplList,isSplList} from './php-spl-list.js';
import definitions from './spl-definitions.json' with {type: 'json'};
import {makeObject, objectData, isPhpObject, objectIs} from './php-object-values.js';
import {arrayEntries, arrayKind, arrayRead, arrayWrite, arrayWithReference, arrayUnset, arrayKey, clonePhp, isPhpArray, makeArray} from './php-arrays.js';
import {resolveData, resolveType} from './value.js';
import {phpType, phpBool} from './php-values.js';
import {invokeBuiltin} from './php-builtins.js';
import {invokeFunction} from './php-functions.js';
import {foreachEntries} from './php-iterators.js';

const storage = new WeakMap();
const fail = (name, message) => {throw Object.assign(new Error(message), {name});};
export const isSplObject = (value) => isPhpObject(value) && ['arrayiterator', 'arrayobject'].includes(objectData(value).definition.name.toLowerCase());
const result = (value, kind = phpType(value)) => ({value, kind});
export const cloneSpl = (original, copy) => {cloneSplList(original,copy);const info = storage.get(original); if (info) storage.set(copy, {cell: objectData(original).definition.name === 'ArrayIterator' ? info.cell : {array: clonePhp(info.cell.array)}, position: 0});};
export const splMethod = (expression, state, context) => {
  const value = resolveData(expression.left, state, context), method = expression.right.method;
  if (!isSplObject(value)&&!isSplList(value)) throw new TypeError('Invalid frontend SPL receiver');
  const args = expression.right.arguments.map((node) => {const value = resolveData(node, state, context); return {value, kind: resolveType(node, state, context, value)};});
  const extra=splListMethod(value,method,args,context);if(extra)return extra;
  const [a, b, c] = args.map((item) => item.value);
  if (storage.get(value)?.cell.sorting && ['__construct', 'offsetset', 'append', 'offsetunset', 'exchangearray', 'asort', 'ksort', 'natsort', 'natcasesort', 'uasort', 'uksort'].includes(method)) throw new Error('Modification of ArrayObject during sorting is prohibited');
  if (method === '__construct') {
    if (!isPhpArray(a)) throw new TypeError('Frontend SPL constructors currently require an array');
    if (b !== 0) fail('ValueError', 'Frontend SPL currently supports flags = 0');
    if (c != null && c.replace(/^\\/, '').toLowerCase() !== 'arrayiterator') fail('ValueError', 'Frontend ArrayObject currently requires ArrayIterator');
    storage.set(value, {cell: {array: clonePhp(a)}, position: 0}); return result(null);
  }
  const data = storage.get(value); if (!data) throw new Error('Uninitialized frontend SPL object');
  const entries = () => arrayEntries(data.cell.array);
  const current = () => entries()[data.position];
  if (method === 'getarraycopy') return result(clonePhp(data.cell.array), 'array');
  if (method === 'count') return result(entries().length, 'integer');
  if (method === 'getflags') return result(0, 'integer');
  if (method === 'setflags') {if (a !== 0) fail('ValueError', 'Frontend SPL currently supports flags = 0'); return result(null);}
  if (method === 'getiteratorclass') return result('ArrayIterator', 'string');
  if (method === 'setiteratorclass') {if (a.replace(/^\\/, '').toLowerCase() !== 'arrayiterator') fail('ValueError', 'Frontend ArrayObject currently requires ArrayIterator'); return result(null);}
  if (method === 'offsetexists') {const key = arrayKey(a, context); return result(Object.hasOwn(data.cell.array, key), 'boolean');}
  if (method === 'offsetget') return arrayRead(data.cell.array, a, context);
  if (method === 'offsetset' || method === 'append') {const item = method === 'append' ? args[0] : args[1]; data.cell.array = arrayWrite(data.cell.array, a, item.value, item.kind, context, method === 'append' || a === null); return result(null);}
  if (method === 'offsetunset') {
    const key = arrayKey(a, context), index = entries().findIndex(([candidate]) => candidate === key);
    data.cell.array = arrayUnset(data.cell.array, key, context); if (index >= 0 && index < data.position) data.position--; return result(null);
  }
  if (method === 'current') {const entry = current(); return entry ? result(entry[1], arrayKind(data.cell.array, entry[0])) : result(null);}
  if (method === 'key') return result(current()?.[0] ?? null);
  if (method === 'valid') return result(!!current(), 'boolean');
  if (method === 'rewind') {data.position = 0; return result(null);}
  if (method === 'next') {data.position++; return result(null);}
  if (method === 'seek') {if (a < 0 || a >= entries().length) fail('OutOfBoundsException', 'Seek position is out of range'); data.position = a; return result(null);}
  if (method === 'exchangearray') {if (!isPhpArray(a)) throw new TypeError('Frontend exchangeArray() currently requires an array'); const old = data.cell.array; data.cell.array = clonePhp(a); data.position = 0; return result(clonePhp(old), 'array');}
  if (method === 'getiterator') {if (--(context.objectBudget ||= {remaining: 10000}).remaining < 0) throw new RangeError('Frontend object allocation limit exceeded'); const copy = makeObject(definitions.arrayiterator.class); storage.set(copy, {cell: data.cell, position: 0}); return result(copy, 'object');}
  if (['asort', 'ksort', 'natsort', 'natcasesort', 'uasort', 'uksort'].includes(method)) {
    const ref = {get: () => result(data.cell.array, 'array'), set: (array) => {data.cell.array = array; return result(array, 'array');}};
    data.cell.sorting = true; try {const output = invokeBuiltin(method, [{...ref.get(), ref}, ...args], state, context); data.position = 0; return output;} finally {data.cell.sorting = false;}
  }
  throw new Error(`Unsupported frontend SPL method ${method}()`);
};
export const runIterators = (name, items, context, invoke) => {
  if (!['iterator_to_array', 'iterator_count', 'iterator_apply'].includes(name)) return null;
  const source = items[0].value;
  if (name === 'iterator_apply' && !objectIs(source, 'Traversable')) throw new TypeError('iterator_apply(): Argument #1 must be Traversable');
  let count = 0, output = makeArray();
  const iteration = () => checkIteration(context, count + 1);
  for (const {key, item} of foreachEntries(source, name === 'iterator_to_array' && items[1].value, context, iteration)) {
    count++;
    if (name === 'iterator_to_array') output = item.reference ? arrayWithReference(output, key?.value, item.reference, context, !items[1].value) : arrayWrite(output, key?.value, item.value, item.kind, context, !items[1].value);
    if (name === 'iterator_apply') {
      const args = arrayEntries(items[2].value).map(([key, value]) => ({value, kind: arrayKind(items[2].value, key), ...(typeof key === 'string' ? {name: key} : {})}));
      if (!phpBool(invokeFunction(items[1].value, args, context.objectState || {}, {...context, source: {...context.source, strictTypes: false}}).value)) break;
    }
  }
  return name === 'iterator_to_array' ? result(output, 'array') : result(count, 'integer');
};

export const splStorageReference = (value) => {
  const data = storage.get(value); if (!data) throw new Error('Uninitialized frontend SPL object');
  return {get: () => result(data.cell.array, 'array'), set: (array) => {if (data.cell.sorting) throw new Error('Modification of ArrayObject during sorting is prohibited'); data.cell.array = array; return result(array, 'array');}};
};
