import {isSplObject, splStorageReference} from './php-spl.js';
import {valueReference, promoteReference} from './value.js';
import {isGenerator, generatorClosed, generatorMethod, generatorReference} from './php-generators.js';
import {objectIs, isPhpObject, objectData} from './php-object-values.js';
import {invokeCollectionMethod} from './php-object-collections.js';
import {arrayEntries, arrayElementReference, arrayKind, isPhpArray, clonePhp, arrayOrigin, arrayReference} from './php-arrays.js';
import {phpBool, phpType} from './php-values.js';
import {warn} from './diagnostics.js';

export const isIterable = (value) => isPhpArray(value) || objectIs(value, 'Traversable');

// Yield one entry at a time. Breaking or returning closes this generator before
// next(), so iterator side effects follow the PHP loop's control flow.
export function* foreachEntries(source, withKey, context, iteration) {
  if (!isPhpObject(source)) {
    if (source == null || typeof source !== 'object') {warn(context, 'foreach() argument must be of type array|object'); return;}
    for (const [key, value] of arrayEntries(source)) {iteration(); yield {key: {value: key, kind: phpType(key)}, item: {value, kind: arrayKind(source, key), reference: arrayElementReference(source, key)}};}
    return;
  }
  let depth = 0;
  while (objectIs(source, 'IteratorAggregate')) {
    if (++depth > 128) throw Object.assign(new RangeError('Frontend iterator delegation exceeds 128 levels'), {code: 'PHP_ITERATOR_LIMIT'});
    const next = invokeCollectionMethod(source, 'getiterator', [], context).value;
    if (!isPhpObject(next) || !objectIs(next, 'Traversable') || next === source) throw Object.assign(new Error(`Objects returned by ${objectData(source).definition.name}::getIterator() must be traversable or implement interface Iterator`), {name: 'Exception'});
    source = next;
  }
  if (!objectIs(source, 'Iterator')) throw new TypeError('Frontend foreach on service objects requires Iterator or IteratorAggregate');
  if (isGenerator(source) && generatorClosed(source)) throw Object.assign(new Error('Cannot traverse an already closed generator'), {name: 'Exception'});
  const call = (method) => invokeCollectionMethod(source, method, [], context);
  call('rewind');
  while (phpBool(call('valid').value)) {
    iteration();
    const result = call('current'), item = {...result, value: clonePhp(result.value)};
    const key = withKey ? call('key') : null;
    if (isSplObject(source)) item.reference = arrayElementReference(splStorageReference(source).get().value, key?.value ?? call('key').value);
    yield {key, item};
    call('next');
  }
}

export function* spreadEntries(value, context) {
  if (isPhpArray(value)) {for (const [key, item] of arrayEntries(value)) yield {key: {value: key, kind: phpType(key)}, item: {value: item, kind: arrayKind(value, key)}}; return;}
  if (!objectIs(value, 'Traversable')) throw new TypeError('Only arrays and Traversables can be unpacked');
  let count = 0;
  const iteration = () => {if (++count > 1000 || --(context.loopBudget ||= {remaining: 10000}).remaining < 0) throw Object.assign(new RangeError('Frontend loop limit exceeded'), {code: 'PHP_LOOP_LIMIT'});};
  for (const entry of foreachEntries(value, true, context, iteration)) {
    if (!['integer', 'string'].includes(entry.key.kind)) throw new Error('Keys must be of type int|string during unpacking');
    yield entry;
  }
}

export function* referenceEntries(target, state, context, iteration) {
  if(['call','objectCall'].includes(target?.$expression?.operation)) {const value=resolveData(target,state,context);target=resolvedNode({value,kind:'object'});}
  let parent = target?.$expression || target?.$local || target?.$state ? promoteReference(target,state,context) : {get:()=>({value:resolveData(target,state,context)})}; let initial = parent.get().value; if (isSplObject(initial)) {parent = splStorageReference(initial); initial = parent.get().value;}
  if(isGenerator(initial)){generatorReference(initial,context);generatorMethod(initial,'rewind',[],context);while(generatorMethod(initial,'valid',[],context).value){iteration();const reference=generatorReference(initial,context);yield {key:generatorMethod(initial,'key',[],context),item:reference.get(),reference};generatorMethod(initial,'next',[],context);}return;}
  if (!isPhpArray(initial)) throw new Error('Frontend foreach by reference requires an array');
  let array = initial;
  if (!arrayOrigin(array)) {array = clonePhp(array); parent.set(array, 'array'); array = parent.get().value;}
  // Plain initial JS arrays become typed PHP arrays when their first slot is acquired.
  if (!arrayOrigin(array)) {const entries = arrayEntries(array); if (!entries.length) return; const first = arrayReference(array, entries[0][0], context); parent.set(first.array, 'array'); array = parent.get().value;}
  let origin = arrayOrigin(array); const cursor = {position: 0}; (origin.iterators ||= new Set()).add(cursor);
  try {
    while (cursor.position < arrayEntries(origin.current).length) {
      iteration(); const [key] = arrayEntries(origin.current)[cursor.position];
      const acquired = arrayReference(origin.current, key, context); const guard = {}; acquired.reference.cell?.bindings.add(guard);
      if (arrayOrigin(parent.get().value) === origin) {parent.set(acquired.array, 'array'); const stored = arrayOrigin(parent.get().value); if (stored && stored !== origin) {origin.iterators.delete(cursor); origin = stored; (origin.iterators ||= new Set()).add(cursor);}}
      acquired.reference.cell?.bindings.delete(guard);
      yield {key: {value: key, kind: phpType(key)}, item: acquired.reference.get(), reference: acquired.reference};
      if (isPhpArray(parent.get().value) && arrayOrigin(parent.get().value) !== origin) {origin.iterators.delete(cursor); origin = arrayOrigin(parent.get().value); if (!origin) break; (origin.iterators ||= new Set()).add(cursor); cursor.position = -1;}
      cursor.position++;
    }
  } finally {origin.iterators.delete(cursor);}
}
