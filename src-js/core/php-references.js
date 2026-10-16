import {clonePhp, arrayEntries, isPhpArray, referenceCells, sameArrayOrigin, ownArray} from './php-arrays.js';
const tokens = new WeakMap();
const token = (table, name) => {let map = tokens.get(table); if (!map) {map = new Map(); tokens.set(table, map);} if (!map.has(name)) map.set(name, {}); return map.get(name);};
export const createReference = (item) => {
  const cell = {item, bindings: new Set(), guards: new Map(), shared: false};
  const reference = {cell, get: () => cell.item, set: (value, kind) => {
    for (const guard of cell.guards.values()) ({value, kind} = guard(value, kind));
    cell.item = {value: clonePhp(value, sameArrayOrigin(value, cell.item.value)), kind}; ownArray(cell, 'value', cell.item.value); return cell.item;
  }};
  ownArray(cell, 'value', item.value);
  return reference;
};
export const bindLocalReference = (context, name, reference) => {
  const table = context.localReferences ||= Object.create(null), key = token(table, name);
  if (context.locals) ownArray(context.locals, name, null);
  table[name]?.cell?.bindings.delete(key); table[name] = reference; reference.cell?.bindings.add(key);
  if (context.locals) Object.defineProperty(context.locals, name, {enumerable: true, configurable: true, get: () => reference.get().value, set: (value) => reference.set(value, value == null ? 'NULL' : typeof value === 'number' ? Number.isInteger(value) ? 'integer' : 'double' : typeof value === 'boolean' ? 'boolean' : typeof value === 'string' ? 'string' : isPhpArray(value) ? 'array' : 'object')});
  return reference;
};
export const unbindLocalReference = (context, name) => {const table = context.localReferences; if (!table) return; table[name]?.cell?.bindings.delete(token(table, name)); delete table[name];};

export const hasLocalBinding = (context, name) => !!tokens.get(context.localReferences)?.has(name);

export const releaseLocalReferences = (context) => {for (const name of Object.keys(context.localReferences || {})) unbindLocalReference(context, name);};
