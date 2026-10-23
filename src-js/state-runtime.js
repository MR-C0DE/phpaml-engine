import {ownArray} from './core/php-arrays.js';
export const scheduleUpdate = (root, state, changes, originEffectId = null) => {
    let pending = pendingBatches.get(root);
    if (!pending) {
      pending = new Map();
      pendingBatches.set(root, pending);
      queueMicrotask(() => {
        const batch = pendingBatches.get(root);
        const origins = pendingEffectOrigins.get(root) || new Map();
        pendingBatches.delete(root);
        pendingEffectOrigins.delete(root);
        if (!batch || batch.size === 0 || !rootStates.has(root)) return;
        const targets = [...batch.keys()];
        try {
          render(root, state, targets.length === 1 ? targets[0] : null);
        } catch (error) {
          root.dispatchEvent(new CustomEvent('aml:render-error', {detail: {error, changes: Object.fromEntries(batch)}}));
          console.error(error);
          return;
        }
        batch.forEach((value, target) => root.dispatchEvent(new CustomEvent('aml:state', {detail: {target, value}})));
        const detail = {changes: Object.fromEntries(batch), state: clone(state)};
        if (batch.size > 1) root.dispatchEvent(new CustomEvent('aml:batch', {detail}));
        lifecycle(root, 'update', detail);
        remember(root, state, batch.size > 1 ? 'batch' : targets[0]);
        runEffects(root, state, targets, false, origins);
      });
    }
    changes.forEach((value, target) => pending.set(target, value));
    if (originEffectId) {
      const origins = pendingEffectOrigins.get(root) || new Map();
      changes.forEach((_, target) => origins.set(target, originEffectId));
      pendingEffectOrigins.set(root, origins);
    }
  };
export const commit = (root, state, target, value, executionContext = null) => {
    target = resolveWritePath(state, target);
    validatePhpValue(value, executionContext?.valueType || phpType(value));
    if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError('Frontend state must contain finite floats');
    const config = rootConfigs.get(root) || {shared: {}, persisted: {}, types: {}, computed: {}};
    const data = executionContext?.eventData;
    const typed = assignType(config.typeRules?.[target], value, executionContext?.valueType || phpType(value), data?.source?.strictTypes ?? true, data);
    value = typed.value;
    if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError('Frontend state must contain finite floats');
    value = clone(value);
    writePath(state, target, value); ownArray(state, '@state', state);
    if (config.valueTypes) config.valueTypes[target] = typed.kind;
    const changes = new Map([[target, value]]);
    recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
    const transaction = transactions.get(root);
    if (transaction) {
      changes.forEach((changed, name) => transaction.changes.set(name, changed));
      return;
    }
    const persistedTarget = owningTarget(config.persisted, target);
    const persisted = persistedTarget ? config.persisted[persistedTarget] : null;
    if (persisted) persistState(root, persistedTarget, persisted, readPath(state, persistedTarget), config.valueTypes?.[persistedTarget]);
    const sharedTarget = owningTarget(config.shared, target);
    const sharedKey = sharedTarget ? config.shared[sharedTarget] : null;
    if (sharedKey) {
      const sharedValue = readPath(state, sharedTarget);
      sharedState[sharedKey] = sharedValue;
      sharedValueTypes[sharedKey] = config.valueTypes?.[sharedTarget] || phpType(sharedValue);
      mountedRoots.forEach((otherRoot) => {
        if (otherRoot === root) return;
        const otherConfig = rootConfigs.get(otherRoot) || {};
        const otherTarget = Object.keys(otherConfig.shared || {}).find((name) => otherConfig.shared[name] === sharedKey);
        if (!otherTarget) return;
        const otherState = rootStates.get(otherRoot);
        writePath(otherState, otherTarget, sharedValue);
        if (otherConfig.valueTypes) otherConfig.valueTypes[otherTarget] = sharedValueTypes[sharedKey];
        const otherChanges = new Map([[otherTarget, sharedValue]]);
        recomputeComputed(otherRoot, otherState, otherConfig, otherTarget).forEach((computed, name) => otherChanges.set(name, computed));
        const otherPersisted = otherConfig.persisted?.[otherTarget];
        if (otherPersisted) persistState(otherRoot, otherTarget, otherPersisted, sharedValue, sharedValueTypes[sharedKey]);
        scheduleUpdate(otherRoot, otherState, otherChanges);
      });
    }
    scheduleUpdate(root, state, changes, (executionContext?.owner || executionContext)?.id);
  };
export const apply = (scope, state, action, executionContext = null) => {
    if (action.target) action = {...action, target: resolveWritePath(state, action.target)};
    if (action.type === 'remove-path') {
      const segments = safeSegments(action.target);
      if (segments.length < 2) throw new Error('AML remove-path requires a nested state path');
      const rootTarget = segments.shift();
      const next = clone(readPath(state, rootTarget));
      const leaf = segments.pop();
      const parent = segments.reduce((current, key) => current?.[key], next);
      if (Array.isArray(parent) && /^\d+$/.test(leaf)) parent.splice(Number(leaf), 1);
      else if (parent && typeof parent === 'object') delete parent[leaf];
      commit(scope, state, rootTarget, next, executionContext);
      return;
    }
    const current = readPath(state, action.target);
    const value = resolveData(action.value, state, executionContext?.eventData);
    let next, updatedKind;
    if (['increment', 'decrement'].includes(action.type) && (value ?? 1) === 1) {
      const updated = phpIncrement(current, resolveType({$state: action.target}, state, executionContext?.eventData, current), action.type === 'increment' ? 1 : -1, executionContext?.eventData);
      next = updated.value; updatedKind = updated.kind;
    }
    else if (action.type === 'increment') next = phpArithmetic('add', current, value ?? 1, resolveType({$state: action.target}, state, executionContext?.eventData, current) === 'double', executionContext?.eventData);
    else if (action.type === 'decrement') next = phpArithmetic('subtract', current, value ?? 1, resolveType({$state: action.target}, state, executionContext?.eventData, current) === 'double', executionContext?.eventData);
    else if (action.type === 'toggle') next = !phpBool(current);
    else if (action.type === 'set') next = value;
    else if (action.type === 'append') next = [...(Array.isArray(current) ? current : []), value];
    else if (action.type === 'prepend') next = [value, ...(Array.isArray(current) ? current : [])];
    else if (action.type === 'remove-at') {
      const items = Array.isArray(current) ? current : [];
      const requested = Number(value);
      const index = requested < 0 ? items.length + requested : requested;
      next = items.filter((_, itemIndex) => itemIndex !== index);
    }
    else if (action.type === 'remove-by') next = (Array.isArray(current) ? current : []).filter((item) => readPath(item, value.key) !== value.value);
    else if (action.type === 'update-by') next = (Array.isArray(current) ? current : []).map((item) => readPath(item, value.key) === value.value ? {...item, ...value.changes} : item);
    else if (action.type === 'sort-by') next = [...(Array.isArray(current) ? current : [])].sort((left, right) => {
      const a = readPath(left, value.key); const b = readPath(right, value.key);
      const result = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : (a > b ? 1 : (a < b ? -1 : 0));
      return value.direction === 'desc' ? -result : result;
    });
    else if (action.type === 'reverse') next = [...(Array.isArray(current) ? current : [])].reverse();
    else if (action.type === 'filter-by') next = (Array.isArray(current) ? current : []).filter((item) => (readPath(item, value.key) === value.value) === value.keepMatches);
    else if (action.type === 'move') {
      next = [...(Array.isArray(current) ? current : [])];
      const from = Number(value.from); const to = Number(value.to);
      if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < next.length && to >= 0 && to < next.length && from !== to) {
        const [item] = next.splice(from, 1); next.splice(to, 0, item);
      }
    }
    else if (action.type === 'merge') next = {...(current && typeof current === 'object' && !Array.isArray(current) ? current : {}), ...value};
    else if (action.type === 'clear') next = [];
    else throw new Error(`Unknown AML client action: ${action.type}`);
    const valueType = updatedKind || (action.type === 'set'
      ? resolveType(action.value, state, executionContext?.eventData, next)
      : ['increment', 'decrement'].includes(action.type) && resolveType({$state: action.target}, state, executionContext?.eventData, current) === 'double' ? 'double' : phpType(next));
    if (valueType === 'integer' && !Number.isSafeInteger(next)) throw new RangeError('Frontend integer exceeds JavaScript safe integer precision');
    commit(scope, state, action.target, next, {...(executionContext || {}), valueType});
  };
import { mountedRoots, pendingBatches, pendingEffectOrigins, rootConfigs, rootStates, sharedState, sharedValueTypes, transactions } from './context.js';
import { clone, resolveWritePath, owningTarget, readPath, recomputeComputed, safeSegments, writePath } from './core/state.js';
import { resolveData, resolveType } from './core/value.js';
import {persistState} from './browser-storage.js';
import { render } from './rendering.js';
import { lifecycle, remember } from './lifecycle.js';
import { runEffects } from './effects-runtime.js';
export { resolveData } from './core/value.js';

import { assignType } from './core/php-types.js';
import { phpArithmetic, phpType, phpBool } from './core/php-values.js';

import { phpIncrement } from './core/php-operators.js';
import { validatePhpValue } from './core/php-arrays.js';
