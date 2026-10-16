import {createReference} from './php-references.js';
import {ownValues} from './php-value-ownership.js';
import {isPhpObject} from './php-object-values.js';
import {warn} from './diagnostics.js';
import {isRoundingMode} from './php-rounding-mode.js';

const metadata = new WeakMap();
const owners = new WeakMap();
const group = () => ({origins: new Map(), everOwned: false});
const storageCount = (cell) => [...(cell?.storages || [])].reduce((sum, [group, keys]) => sum + (group.origins.size || !group.everOwned ? keys.size : 0), 0);
const retainsReference = (ref) => !ref.cell || ref.cell.bindings.size > 0 || storageCount(ref.cell) > 1;
export const referenceHasOtherOwners = (ref, ownBinding) => !ref.cell || [...ref.cell.bindings].some((binding) => binding !== ownBinding) || storageCount(ref.cell) > 0;
export const ownArray = (table, key, value) => {
  ownValues(table, key, value);
  let slots = owners.get(table); if (!slots) {slots = new Map(); owners.set(table, slots);}
  for (const origin of slots.get(key) || []) {const g = origin.group, n = g.origins.get(origin) || 0; if (n <= 1) g.origins.delete(origin); else g.origins.set(origin, n - 1);}
  const origins = new Set(), visit = (value) => {if (!isPhpArray(value)) return; const origin = metadata.get(value)?.origin; if (origin) {if (origins.has(origin)) return; origins.add(origin); origin.group.everOwned = true; origin.group.origins.set(origin, (origin.group.origins.get(origin) || 0) + 1);} for (const [, item] of arrayEntries(value)) visit(item);};
  visit(value); slots.set(key, origins);
};
export const releaseArrays = (table) => {for (const key of owners.get(table)?.keys() || []) ownArray(table, key, null);};
const prepareArrayMutation = (value) => {
  const info = metadata.get(value); if (!info?.origin) return;
  const origin = info.origin, previous = origin.group;
  if (previous.origins.size > 1) {const next = group(), count = previous.origins.get(origin); if (count) {previous.origins.delete(origin); next.origins.set(origin, count); next.everOwned = true;} origin.group = next;}
};
const kindOf = (value) => value == null ? 'NULL' : typeof value === 'number' ? Number.isInteger(value) ? 'integer' : 'double' : typeof value === 'boolean' ? 'boolean' : typeof value === 'string' ? 'string' : typeof value === 'function' || value instanceof Error || isPhpObject(value) || isRoundingMode(value) ? 'object' : 'array';
export const isPhpArray = (value) => value !== null && typeof value === 'object' && !(value instanceof Error) && !isPhpObject(value) && !isRoundingMode(value);
export const arrayKey = (value, context = null) => {
  if (value == null) return '';
  if (typeof value === 'boolean') return Number(value);
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) warn(context, 'Implicit conversion from float to int loses precision', 'PHP_DEPRECATED');
    const key = Number.isFinite(value) ? Math.trunc(value) : 0;
    if (!Number.isSafeInteger(key)) throw new RangeError('Frontend array key exceeds safe integer precision');
    return key;
  }
  if (typeof value !== 'string') throw new TypeError('Illegal offset type');
  if (['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase())) throw new Error(`Reserved frontend array key: ${value}`);
  if (/^(?:0|-[1-9]\d*|[1-9]\d*)$/.test(value)) {
    const integer = BigInt(value);
    if (integer >= -9223372036854775808n && integer <= 9223372036854775807n) {
      if (!Number.isSafeInteger(Number(value))) throw new RangeError('Frontend array key exceeds safe integer precision');
      return Number(value);
    }
  }
  return value;
};
export const arrayEntries = (value) => {
  if (!isPhpArray(value)) throw new TypeError('Expected a PHP array');
  const info = metadata.get(value);
  const keys = info?.keys.filter((key) => Object.hasOwn(value, key)) || Object.keys(value).map((key) => arrayKey(key));
  const known = new Set(keys);
  for (const key of Object.keys(value).map((key) => arrayKey(key))) if (!known.has(key)) { keys.push(key); known.add(key); }
  return keys.map((key) => [key, value[key]]);
};
export const arrayElementReference = (value, key) => {const ref = metadata.get(value)?.refs?.get(key); return ref && retainsReference(ref) ? ref : null;};
export const arrayKind = (value, key) => metadata.get(value)?.refs?.get(key)?.get().kind || metadata.get(value)?.types?.get(key) || kindOf(value?.[key]);
export const makeArray = (entries = [], types = new Map(), next = undefined, cursor = 0, refs = new Map(), origin = {}) => {
  origin.group ||= group();
  for (const [key, reference] of refs) if (reference.cell) {const storages = reference.cell.storages ||= new Map(); const keys = storages.get(origin.group) || new Set(); keys.add(key); storages.set(origin.group, keys);}
  const list = entries.every(([key], index) => key === index);
  const value = list ? [] : {};
  for (const [key, item] of entries) Object.defineProperty(value, key, refs.has(key) ? {get: () => refs.get(key).get().value, set: (value) => refs.get(key).set(value, kindOf(value)), enumerable: true, configurable: true} : {value: item, enumerable: true, writable: true, configurable: true});
  const numeric = entries.map(([key]) => key).filter((key) => typeof key === 'number');
  metadata.set(value, {keys: entries.map(([key]) => key), types: new Map(types), next: next ?? (numeric.length ? Math.max(...numeric) + 1 : 0), cursor, refs: new Map(refs), origin});
  origin.current = value;
  return value;
};
export const nextArrayKey = (value, context = null) => {
  const info = metadata.get(value);
  let next = info?.next;
  if (next == null) { const integers = arrayEntries(value).map(([key]) => key).filter((key) => typeof key === 'number'); next = integers.length ? Math.max(...integers) + 1 : 0; }
  if ((context?.source?.phpVersion ?? 80400) < 80300) next = Math.max(0, next);
  if (!Number.isSafeInteger(next)) throw new RangeError('Frontend array index exceeds safe integer precision');
  return next;
};
export const arrayWrite = (value, key, item, kind = kindOf(item), context = null, append = false) => {
  if (value == null) value = makeArray();
  if (!isPhpArray(value)) throw new Error('Cannot use a scalar value as an array');
  const refs = new Map([...(metadata.get(value)?.refs || [])].filter(([, reference]) => retainsReference(reference)));
  prepareArrayMutation(value);
  key = append ? nextArrayKey(value, context) : arrayKey(key, context);
  const entries = arrayEntries(value), types = new Map(entries.map(([key]) => [key, arrayKind(value, key)]));
  const position = entries.findIndex(([candidate]) => candidate === key);
  if (position < 0) entries.push([key, clonePhp(item)]); else entries[position] = [key, clonePhp(item)];
  if (refs.has(key)) refs.get(key).set(item, kind);
  types.set(key, kind);
  const previous = nextArrayKey(value, context);
  const numericCount = arrayEntries(value).filter(([candidate]) => typeof candidate === 'number').length;
  const next = typeof key === 'number' ? numericCount === 0 && previous === 0 ? key + 1 : Math.max(previous, key + 1) : previous;
  return makeArray(entries, types, next, metadata.get(value)?.cursor ?? 0, refs, metadata.get(value)?.origin);
};
export const arrayUnset = (value, key, context = null) => {
  if (value == null) return value;
  if (!isPhpArray(value)) throw new TypeError('Cannot unset an offset in a scalar value');
  prepareArrayMutation(value);
  key = arrayKey(key, context);
  const entries = arrayEntries(value), removed = entries.findIndex(([candidate]) => candidate === key), previous = arrayCursor(value);
  if (removed >= 0) for (const iterator of metadata.get(value)?.origin?.iterators || []) if (removed <= iterator.position) iterator.position--;
  const cursor = removed >= 0 && removed < previous ? previous - 1 : previous;
  return makeArray(entries.filter(([candidate]) => candidate !== key), metadata.get(value)?.types, nextArrayKey(value, context), cursor, new Map([...(metadata.get(value)?.refs || [])].filter(([candidate]) => candidate !== key)), metadata.get(value)?.origin);
};
export const arrayRead = (value, key, context = null, quiet = false) => {
  key = arrayKey(key, context);
  if (isPhpArray(value) && Object.hasOwn(value, key)) return {value: value[key], kind: arrayKind(value, key)};
  if (typeof value === 'string' && typeof key === 'number') {
    const index = key < 0 ? value.length + key : key;
    if (index >= 0 && index < value.length) return {value: value[index], kind: 'string'};
  }
  if (!quiet) warn(context, isPhpArray(value) ? `Undefined array key ${JSON.stringify(key)}` : 'Trying to access array offset on a scalar value');
  return {value: null, kind: 'NULL'};
};
export const sameArrayOrigin = (a, b) => isPhpArray(a) && isPhpArray(b) && !!metadata.get(a)?.origin && metadata.get(a).origin === metadata.get(b)?.origin;
export const referenceCells = (value) => [...(metadata.get(value)?.refs?.values() || [])].map((reference) => reference.cell).filter(Boolean);
export const arrayReference = (value, key, context, append = false) => {
  if (value == null) value = makeArray();
  key = append ? nextArrayKey(value, context) : arrayKey(key, context);
  prepareArrayMutation(value);
  const existing = metadata.get(value)?.refs?.get(key); if (existing) return {array: value, reference: existing};
  const reference = createReference(arrayRead(value, key, context, true));
  return {array: arrayWithReference(value, key, reference, context), reference};
};
export const arrayWithReference = (value, key, reference, context, append = false) => {
  if (reference.embeddable === false) throw new Error('Property references cannot be embedded in frontend arrays; reference an array element or a local instead');
  if (value == null) value = makeArray();
  key = append ? nextArrayKey(value, context) : arrayKey(key, context);
  const refs = new Map(metadata.get(value)?.refs || []); refs.delete(key);
  const clean = makeArray(arrayEntries(value), metadata.get(value)?.types, nextArrayKey(value, context), metadata.get(value)?.cursor || 0, refs, metadata.get(value)?.origin);
  const next = arrayWrite(clean, key, reference.get().value, reference.get().kind, context); refs.set(key, reference);
  return makeArray(arrayEntries(next), metadata.get(next).types, nextArrayKey(next, context), metadata.get(next).cursor, refs, metadata.get(value)?.origin);
};
export const clonePhp = (value, transfer = false, depth = 0) => {
  if (!isPhpArray(value)) return value;
  if (depth > 64) throw new RangeError('Frontend array reference graph exceeds 64 levels');
  if (metadata.has(value)) {
    const info = metadata.get(value), refs = new Map();
    for (const [key, reference] of info.refs || []) {
      if (transfer || retainsReference(reference)) refs.set(key, reference);
    }
    return makeArray(arrayEntries(value).map(([key, item]) => [key, refs.has(key) ? item : clonePhp(item, false, depth + 1)]), info.types, info.next, info.cursor, refs, transfer ? info.origin : {group: info.origin?.group});
  }
  if (Array.isArray(value)) return value.map((item) => clonePhp(item, false, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clonePhp(item, false, depth + 1)]));
};
export const restoreArrayMetadata = (value, descriptor) => {
  if (!isPhpArray(value) || !descriptor) return value;
  metadata.set(value, {keys: descriptor.entries.map((entry) => entry.key), types: new Map(descriptor.entries.map((entry) => [entry.key, entry.type])), next: descriptor.next});
  for (const entry of descriptor.entries) if (entry.array) restoreArrayMetadata(value[entry.key], entry.array);
  return value;
};
export const describeArray = (value) => isPhpArray(value) ? {next: nextArrayKey(value), entries: arrayEntries(value).map(([key, item]) => ({key, type: arrayKind(value, key), ...(isPhpArray(item) ? {array: describeArray(item)} : {})}))} : null;

export const arrayCursor = (value) => metadata.get(value)?.cursor ?? 0;
export const withArrayCursor = (value, cursor) => makeArray(arrayEntries(value), new Map(arrayEntries(value).map(([key]) => [key, arrayKind(value, key)])), nextArrayKey(value), cursor, new Map([...(metadata.get(value)?.refs || [])].filter(([, ref]) => retainsReference(ref))), metadata.get(value)?.origin);

export const validatePhpValue = (value, kind = kindOf(value), depth = 0) => {
  if (isPhpObject(value)) throw new TypeError('Frontend service objects must remain local; store scalar or array results in State');
  if (isRoundingMode(value)) throw new TypeError('RoundingMode values must remain local; store decimal results as strings in State');
  if (value instanceof Error) throw new TypeError('Frontend exceptions must remain local; store their message or code in state.');
  if (typeof value === 'function') throw new TypeError('Frontend callables must remain local; component state must be serializable');
  if (depth >= 512) throw new RangeError('Frontend state exceeds JSON nesting depth');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError('Frontend state must contain finite floats');
  if (typeof value === 'number' && kind === 'integer' && !Number.isSafeInteger(value)) throw new RangeError('Frontend integer exceeds JavaScript safe integer precision');
  if (isPhpArray(value)) for (const [key, item] of arrayEntries(value)) validatePhpValue(item, arrayKind(value, key), depth + 1);
};

export const arrayOrigin = (value) => metadata.get(value)?.origin;

// Transaction and history snapshots detach alias cells while retaining PHP keys/types.
export const snapshotPhp = (value, depth = 0, cells = new Map()) => {
  if (!isPhpArray(value)) return value;
  if (depth > 512) throw new RangeError('Frontend snapshot exceeds its nesting limit');
  const entries = arrayEntries(value), refs = new Map();
  for (const [key] of entries) {
    const reference = arrayElementReference(value, key); if (!reference) continue;
    const identity = reference.cell || reference;
    if (!cells.has(identity)) {const copy = createReference({value: null, kind: 'NULL'}); cells.set(identity, copy); const item = reference.get(); copy.set(snapshotPhp(item.value, depth + 1, cells), item.kind);}
    refs.set(key, cells.get(identity));
  }
  return makeArray(entries.map(([key, item]) => [key, refs.has(key) ? refs.get(key).get().value : snapshotPhp(item, depth + 1, cells)]), new Map(entries.map(([key]) => [key, arrayKind(value, key)])), nextArrayKey(value), arrayCursor(value), refs);
};

export const validateStateReferences = (state, types) => {
  const visit = (value, kind, path) => {
    if (isPhpArray(value)) {for (const [key, item] of arrayEntries(value)) {const child = path ? `${path}.${key}` : String(key); visit(item, types[child] || arrayKind(value, key), child);} return;}
    validatePhpValue(value, types[path] || kind);
  };
  visit(state, 'array', '');
};
