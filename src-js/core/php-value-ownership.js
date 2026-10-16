// Local slots and array/property containers retain opaque objects and callables.
// This is deterministic reference lifetime bookkeeping, independent of JS GC.
const lifetimes = new WeakMap(), slots = new WeakMap();
const lifetime = (value) => {let item = lifetimes.get(value); if (!item) {item = {owners: new Set(), active: true, observers: new Set()}; lifetimes.set(value, item);} return item;};
const update = (item) => {const active = item.owners.size > 0; if (active === item.active) return; item.active = active; for (const observer of item.observers) observer(active);};
export const observeValueOwnership = (value, observer) => {const item = lifetime(value); item.observers.add(observer); observer(item.active);};
export const ownValues = (table, key, value) => {
  let entries = slots.get(table); if (!entries) {entries = new Map(); slots.set(table, entries);}
  let slot = entries.get(key); if (!slot) {slot = {values: new Set()}; entries.set(key, slot);}
  const values = new Set(), visit = (value) => {if (value === null || !['object', 'function'].includes(typeof value) || values.has(value)) return; values.add(value); if (typeof value === 'object') for (const item of Object.values(value)) visit(item);};
  visit(value); const previous = slot.values; slot.values = values;
  for (const item of values) if (!previous.has(item)) {const data = lifetime(item); data.owners.add(slot); update(data);}
  for (const item of previous) if (!values.has(item)) {const data = lifetime(item); data.owners.delete(slot); update(data);}
};
