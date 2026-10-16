import {isSplObject, splStorageReference} from './php-spl.js';
import {isGenerator, generatorMethod} from './php-generators.js';
import {objectData, objectIs, isPhpObject} from './php-object-values.js';
import {magicMember, callMagic} from './php-magic.js';
import {phpType, phpBool, phpInt} from './php-values.js';
import {arrayRead, clonePhp, isPhpArray, arrayReference} from './php-arrays.js';
import {warn} from './diagnostics.js';

export const invokeCollectionMethod = (value, method, args, context) => {
  if (context?.readOnly) throw new Error('Collection objects must be used in frontend events');
  if (isGenerator(value)) return generatorMethod(value, method, args, context);
  const name = objectData(value).definition.name, member = magicMember(name, method, context);
  if (!member || member.abstract || member.static || member.visibility !== 'public') throw new Error(`Invalid collection method ${name}::${method}()`);
  return callMagic(value, name, member, args, context.objectState || {}, context);
};
export const isCountable = (value) => isPhpArray(value) || objectIs(value, 'Countable');
export const countObject = (value, mode, context) => {
  if (![0, 1].includes(mode)) throw Object.assign(new Error('count(): mode must be COUNT_NORMAL or COUNT_RECURSIVE'), {name: 'ValueError'});
  if (!objectIs(value, 'Countable')) throw new TypeError('count(): expected Countable|array');
  const result = invokeCollectionMethod(value, 'count', [], context);
  if (result.kind === 'object') {warn(context, 'Object could not be converted to int by count()'); return {value: 1, kind: 'integer'};}
  return {value: phpInt(result.value), kind: 'integer'};
};
export const objectOffsetReference = (value, key, keyKind, context) => {
  if (!objectIs(value, 'ArrayAccess')) throw new Error(`Cannot use object of type ${objectData(value).definition.name} as array`);
  const args = [{value: key, kind: keyKind}], read = () => invokeCollectionMethod(value, 'offsetget', args, context);
  const ref = {
    get: read,
    probe: (issetOnly = false) => {
      if (!phpBool(invokeCollectionMethod(value, 'offsetexists', args, context).value)) return {value: null, kind: 'NULL'};
      return issetOnly && !isSplObject(value) ? {value: true, kind: 'boolean'} : read();
    },
    set: (next, kind) => {invokeCollectionMethod(value, 'offsetset', [...args, {value: next, kind}], context); return {value: next, kind};},
    remove: () => invokeCollectionMethod(value, 'offsetunset', args, context),
  };
  ref.reference = () => {
    if (isSplObject(value)) {const parent = splStorageReference(value), result = arrayReference(parent.get().value, key, context, key === null); parent.set(result.array); return result.reference;}
    const item = read(); if (item.reference) return item.reference;
    warn(context, `Indirect modification of overloaded element of ${objectData(value).definition.name} has no effect`, 'PHP_NOTICE');
    let current = {...item, value: clonePhp(item.value)}; return {get: () => current, set: (value, kind) => current = {value, kind}};
  };
  ref.indirect = () => {
    if (isSplObject(value)) return ref;
    const member = magicMember(objectData(value).definition.name, 'offsetget', context);
    if (context.functions?.[member?.id]?.returnsReference) return ref.reference();
    let item;
    const get = () => {
      if (!item) {
        const result = read(); item = {...result, value: clonePhp(result.value)};
        if (result.kind !== 'object') warn(context, `Indirect modification of overloaded element of ${objectData(value).definition.name} has no effect`, 'PHP_NOTICE');
      }
      return item;
    };
    return {get, acquire: get, set: (value, kind) => {get(); return item = {value: clonePhp(value), kind};}, remove: () => {get();}};
  };
  ref.increment = ref.indirect;
  return ref;
};
export const readOffset = (value, key, keyKind, context, quiet = false, issetOnly = false) => {
  if (isPhpObject(value)) {const ref = objectOffsetReference(value, key, keyKind, context); return quiet ? ref.probe(issetOnly) : ref.get();}
  if (phpType(value) === 'object') throw new Error('Cannot use object as array');
  return arrayRead(value, key, context, quiet);
};

// Shared nested destructuring groups are fetched once; repeated explicit keys
// remain separate reads, as in PHP's list()/[] assignment.
export const bindOffsetPattern = (bindings, source, read, write, context, cache = new Map()) => {
  for (const binding of bindings) {
    let current = source;
    for (const [depth, key] of binding.path.entries()) {
      const slot = binding.slots && depth + 1 < binding.path.length ? binding.slots.slice(0, depth + 1).join('.') : null;
      if (slot !== null && cache.has(slot)) current = cache.get(slot);
      else {const offset = read(key); current = readOffset(current.value, offset.value, offset.kind, context); if (slot !== null) cache.set(slot, current);}
    }
    write(binding.target, current);
  }
};
