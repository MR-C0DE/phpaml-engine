export const clone = (value) => typeof structuredClone === 'function'
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

export const safeSegments = (path) => {
  const segments = String(path).split('.');
  if (!segments.length || segments.some((segment, index) => !((index === 0 ? /^[a-zA-Z_][a-zA-Z0-9_-]*$/ : /^(?:[a-zA-Z_][a-zA-Z0-9_-]*|\d+)$/).test(segment)) || ['__proto__', 'prototype', 'constructor'].includes(segment.toLowerCase()))) {
    throw new Error(`Unsafe AML state path: ${path}`);
  }
  return segments;
};

export const readPath = (state, path) => safeSegments(path).reduce((value, key) => value?.[key], state);

export const writePath = (state, path, value) => {
  const keys = safeSegments(path);
  const leaf = keys.pop();
  const parent = keys.reduce((current, key) => current[key] ??= {}, state);
  parent[leaf] = value;
};

export const pathAffects = (binding, target) => binding === target || binding.startsWith(`${target}.`) || target.startsWith(`${binding}.`);

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
      if (changedTarget && !rule.dependencies.some((dependency) => pathAffects(dependency, changedTarget)) && ![...changes.keys()].some((dependency) => rule.dependencies.some((item) => pathAffects(item, dependency)))) return;
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
  const parent = keys.reduce((current, key) => current?.[key], state);
  if (parent && typeof parent === 'object') delete parent[leaf];
};
