import {clonePhp} from './php-arrays.js';
export const clone = (value) => clonePhp(value);

export const safeSegments = (path) => {
  const segments = String(path).split('.');
  if (!segments.length || segments.some((segment, index) => !((index === 0 ? /^[a-zA-Z_][a-zA-Z0-9_-]*$/ : /^(?:[a-zA-Z_][a-zA-Z0-9_-]*|\d+)$/).test(segment)) || ['__proto__', 'prototype', 'constructor'].includes(segment.toLowerCase()))) {
    throw new Error(`Unsafe AML state path: ${path}`);
  }
  return segments;
};

const ownValue = (value, key) => value != null && Object.hasOwn(value, key) ? value[key] : undefined;
const writeOwn = (value, key, next) => {
  if (Object.hasOwn(value, key)) value[key] = next;
  else Object.defineProperty(value, key, {value: next, writable: true, enumerable: true, configurable: true});
};
// Row handles are outside serialized user State. A key is resolved again for every
// write, including two writes in one event before the next DOM update.
const rowBindings = new WeakMap();
export const rowToken = key => 'k' + [...new TextEncoder().encode(String(key))].map(byte => byte.toString(16).padStart(2, '0')).join('');
export const bindRow = (state, prefix, rule) => {
  safeSegments(prefix);
  let registry = rowBindings.get(state);
  if (!registry) { registry = {rows: new Map(), roots: new Set(), revision: 0, indices: new WeakMap()}; rowBindings.set(state, registry); }
  registry.roots.add(prefix.slice(0, prefix.lastIndexOf('.')));
  registry.rows.set(prefix, rule);
};
export const unbindRows = (state, prefix) => {
  const rows = rowBindings.get(state)?.rows;
  if (rows) for (const path of rows.keys()) if (path === prefix || path.startsWith(prefix + '.')) rows.delete(path);
};
const boundRow = (state, path) => {
  const registry = rowBindings.get(state);
  if (!registry) return null;
  let prefix = path;
  while (prefix) {
    if (registry.rows.has(prefix)) return {prefix, rule: registry.rows.get(prefix)};
    const end = prefix.lastIndexOf('.'); prefix = end < 0 ? '' : prefix.slice(0, end);
  }
  return null;
};
const sourceIndex = (state, rule, depth) => {
  const items = readPath(state, rule.source, depth + 1);
  if (!Array.isArray(items)) throw new TypeError('An editable IList source must remain an indexed array.');
  const registry = rowBindings.get(state);
  let caches = registry.indices.get(items);
  if (!caches) { caches = new Map(); registry.indices.set(items, caches); }
  let cached = caches.get(rule.keyPath);
  if (!cached || cached.revision !== registry.revision) {
    const keys = new Map();
    items.forEach((item, index) => {
      const key = rule.keyPath ? safeSegments(rule.keyPath).reduce(ownValue, item) : undefined;
      if (typeof key !== 'string' && !(typeof key === 'number' && Number.isSafeInteger(key))) throw new TypeError('Editable IList records require a stable string or integer key.');
      if (keys.has(String(key))) throw new Error('Duplicate editable IList key: ' + key);
      keys.set(String(key), index);
    });
    cached = {revision: registry.revision, keys}; caches.set(rule.keyPath, cached);
  }
  const found = cached.keys.get(rule.key) ?? -1;
  if (found < 0) throw new Error('This IList item no longer exists in its source.');
  return found;
};
export const resolveWritePath = (state, path, depth = 0) => {
  safeSegments(path);
  if (depth > 32) throw new RangeError('Cyclic IList field binding.');
  const binding = boundRow(state, path);
  if (!binding) {
    if ([...(rowBindings.get(state)?.roots || [])].some(root => path === root || path.startsWith(root + '.'))) throw new Error('This IList row has been removed.');
    return path;
  }
  const {prefix, rule} = binding;
  if (!rule.source) throw new Error('This calculated IList is read-only. Connect its source with editable().');
  const index = sourceIndex(state, rule, depth);
  const suffix = path.slice(prefix.length);
  if (!suffix) throw new Error('Write an IList field, not the row handle.');
  return resolveWritePath(state, `${rule.source}.${index}${suffix}`, depth + 1);
};
export const readPath = (state, path, depth = 0) => {
  const segments = safeSegments(path);
  if (depth > 32) throw new RangeError('Cyclic IList field binding.');
  const binding = boundRow(state, path);
  if (!binding) return segments.reduce(ownValue, state);
  const {prefix, rule} = binding;
  let value = rule.value;
  if (rule.direct && rule.source) {
    try { value = readPath(state, `${rule.source}.${sourceIndex(state, rule, depth)}`, depth + 1); }
    catch (_) { /* Preserve the last validated row when its source is invalid. */ }
  }
  const suffix = path.slice(prefix.length + 1);
  return suffix ? safeSegments(suffix).reduce(ownValue, value) : value;
};

export const writePath = (state, path, value) => {
  const keys = safeSegments(path);
  const leaf = keys.pop();
  const parent = keys.reduce((current, key) => {
    if (current === null || typeof current !== 'object') throw new TypeError('A state path must traverse local objects.');
    if (ownValue(current, key) == null) writeOwn(current, key, {});
    return current[key];
  }, state);
  if (parent === null || typeof parent !== 'object') throw new TypeError('A state path must target a local object.');
  writeOwn(parent, leaf, value);
  const registry = rowBindings.get(state); if (registry) registry.revision++;
};

export const pathAffects = (binding, target) => binding === target || binding.startsWith(`${target}.`) || target.startsWith(`${binding}.`);

// Effects/computed values depend on the owning field, not the virtual row address.
export const statePathAffects = (state, binding, target, depth = 0) => {
  if (pathAffects(binding, target)) return true;
  if (depth > 32) return false;
  const row = boundRow(state, binding);
  if (!row) return false;
  if (row.rule.direct && row.rule.source) {
    try { return pathAffects(resolveWritePath(state, binding), target); } catch (_) { return false; }
  }
  return (row.rule.dependencies || []).some(path => statePathAffects(state, path, target, depth + 1));
};

export const owningTarget = (group, target) => Object.keys(group || {})
  .sort((left, right) => right.length - left.length)
  .find((candidate) => target === candidate || target.startsWith(`${candidate}.`));

export const computedValue = (rule, state) => {
  const values = (rule.dependencies || []).map((dependency) => readPath(state, dependency));
  if (rule.operation === 'sum') return values.reduce((total, value) => total + Number(value || 0), 0);
  if (rule.operation === 'count') return Array.isArray(values[0]) || typeof values[0] === 'string' ? values[0].length : (values[0] && typeof values[0] === 'object' ? Object.keys(values[0]).length : 0);
  if (rule.operation === 'all') return values.every(Boolean);
  if (rule.operation === 'any') return values.some(Boolean);
  return values.map((value) => value ?? '').join(rule.separator || '');
};

export const recomputeComputed = (root, state, config, changedTarget = null) => {
  const changes = new Map();
  let unstable = false;
  for (let pass = 0; pass < 20; pass++) {
    let passChanged = false;
    Object.entries(config.computed || {}).forEach(([target, rule]) => {
      if (changedTarget && !rule.dependencies.some((dependency) => statePathAffects(state, dependency, changedTarget)) && ![...changes.keys()].some((dependency) => rule.dependencies.some((item) => statePathAffects(state, item, dependency)))) return;
      const next = computedValue(rule, state);
      if (Object.is(readPath(state, target), next)) return;
      writePath(state, target, next);
      changes.set(target, next);
      passChanged = true;
    });
    if (!passChanged) { unstable = false; break; }
    unstable = pass === 19;
  }
  if (unstable && root) root.dispatchEvent(new CustomEvent('aml:reactivity-error', {detail: {reason: 'computed-cycle'}}));
  return changes;
};

export const coerce = (type, value) => {
  if (type === 'int') return value === '' ? 0 : Number.parseInt(value, 10);
  if (type === 'float') return value === '' ? 0 : Number.parseFloat(value);
  if (type === 'bool') return value === true || value === 1 || value === '1' || value === 'true';
  if (type === 'string') return value == null ? '' : String(value);
  if (type === 'array') return Array.isArray(value) || (value && typeof value === 'object') ? value : [];
  return value;
};

export const deletePath = (state, path) => {
  const keys = safeSegments(path); const leaf = keys.pop();
  const parent = keys.reduce(ownValue, state);
  if (parent && typeof parent === 'object') delete parent[leaf];
  const registry = rowBindings.get(state); if (registry) registry.revision++;
};
