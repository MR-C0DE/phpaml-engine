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
    writePath(state, target, value);
    const config = rootConfigs.get(root) || {shared: {}, persisted: {}, types: {}, computed: {}};
    const changes = new Map([[target, value]]);
    recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
    const transaction = transactions.get(root);
    if (transaction) {
      changes.forEach((changed, name) => transaction.changes.set(name, changed));
      return;
    }
    const persistedTarget = owningTarget(config.persisted, target);
    const persisted = persistedTarget ? config.persisted[persistedTarget] : null;
    if (persisted) {
      try {
        const persistedValue = readPath(state, persistedTarget);
        const payload = persistedPayload(persisted, persistedValue);
        if (persisted.storage === 'indexeddb') indexedState('put', persisted.key, payload).catch((error) => root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: persistedTarget, error}})));
        else (persisted.storage === 'session' ? sessionStorage : localStorage).setItem(persisted.key, payload);
      } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: persistedTarget, error}})); }
    }
    const sharedTarget = owningTarget(config.shared, target);
    const sharedKey = sharedTarget ? config.shared[sharedTarget] : null;
    if (sharedKey) {
      const sharedValue = readPath(state, sharedTarget);
      sharedState[sharedKey] = sharedValue;
      mountedRoots.forEach((otherRoot) => {
        if (otherRoot === root) return;
        const otherConfig = rootConfigs.get(otherRoot) || {};
        const otherTarget = Object.keys(otherConfig.shared || {}).find((name) => otherConfig.shared[name] === sharedKey);
        if (!otherTarget) return;
        const otherState = rootStates.get(otherRoot);
        writePath(otherState, otherTarget, sharedValue);
        const otherChanges = new Map([[otherTarget, sharedValue]]);
        recomputeComputed(otherRoot, otherState, otherConfig, otherTarget).forEach((computed, name) => otherChanges.set(name, computed));
        const otherPersisted = otherConfig.persisted?.[otherTarget];
        if (otherPersisted) {
          try {
            const payload = persistedPayload(otherPersisted, sharedValue);
            if (otherPersisted.storage === 'indexeddb') indexedState('put', otherPersisted.key, payload).catch((error) => otherRoot.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: otherTarget, error}})));
            else (otherPersisted.storage === 'session' ? sessionStorage : localStorage).setItem(otherPersisted.key, payload);
          } catch (error) { otherRoot.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: otherTarget, error}})); }
        }
        scheduleUpdate(otherRoot, otherState, otherChanges);
      });
    }
    scheduleUpdate(root, state, changes, (executionContext?.owner || executionContext)?.id);
  };
export const apply = (scope, state, action, executionContext = null) => {
    const current = readPath(state, action.target);
    const value = resolveData(action.value, state, executionContext?.eventData);
    let next;
    if (action.type === 'increment') next = Number(current ?? 0) + Number(value ?? 1);
    else if (action.type === 'decrement') next = Number(current ?? 0) - Number(value ?? 1);
    else if (action.type === 'toggle') next = !Boolean(current);
    else if (action.type === 'set') next = value;
    else if (action.type === 'append') next = [...(Array.isArray(current) ? current : []), value];
    else if (action.type === 'prepend') next = [value, ...(Array.isArray(current) ? current : [])];
    else if (action.type === 'remove-at') next = (Array.isArray(current) ? current : []).filter((_, index) => index !== Number(value));
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
    commit(scope, state, action.target, next, executionContext);
  };
export const resolveData = (value, state, eventData = null) => {
    if (Array.isArray(value)) return value.map((item) => resolveData(item, state, eventData));
    if (value && typeof value === 'object') {
      if (typeof value.$state === 'string') return readPath(state, value.$state);
      if (typeof value.$event === 'string') return readPath(eventData || {}, value.$event);
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveData(item, state, eventData)]));
    }
    return value;
  };
import { mountedRoots, pendingBatches, pendingEffectOrigins, rootConfigs, rootStates, sharedState, transactions } from './context.js';
import { clone, owningTarget, readPath, recomputeComputed, writePath } from './core/state.js';
import { indexedState, persistedPayload } from './storage.js';
import { render } from './rendering.js';
import { lifecycle, remember } from './lifecycle.js';
import { runEffects } from './effects-runtime.js';
