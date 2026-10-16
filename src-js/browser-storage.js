import {mountedRoots, rootStates, rootConfigs} from './context.js';
import {writePath, recomputeComputed} from './core/state.js';
import {scheduleUpdate} from './state-runtime.js';
import {indexedState, persistedPayload, restoredValue} from './storage.js';

export const persistState = (root, target, persisted, value, kind) => {
  try {
    const payload = persistedPayload(persisted, value, kind);
    if (persisted.storage === 'indexeddb') indexedState('put', persisted.key, payload).catch((error) => root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target, error}})));
    else (persisted.storage === 'session' ? sessionStorage : localStorage).setItem(persisted.key, payload);
  } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target, error}})); }
};
let storageListenerInstalled = false;
const installStorageListener = () => {
  if (storageListenerInstalled) return;
  storageListenerInstalled = true;
  addEventListener('storage', (event) => {
    mountedRoots.forEach((root) => {
      const state = rootStates.get(root);
      const config = rootConfigs.get(root) || {};
      Object.entries(config.persisted || {}).forEach(([target, persisted]) => {
        if (persisted.storage !== 'local' || persisted.key !== event.key) return;
        try {
          const value = event.newValue === null ? undefined : restoredValue(root, target, persisted, event.newValue, config.types?.[target]);
          if (value === undefined) return;
          writePath(state, target, value);
          const changes = new Map([[target, value]]);
          recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
          scheduleUpdate(root, state, changes);
        } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target, error}})); }
      });
    });
  });
};
export const restorePersisted = (root, state, config) => {
  installStorageListener();
      Object.entries(config.persisted || {}).forEach(([target, persisted]) => {
        if (persisted.storage === 'indexeddb') return;
        try {
          const storage = persisted.storage === 'session' ? sessionStorage : localStorage;
          const saved = storage.getItem(persisted.key);
          if (saved !== null) {
            const restored = restoredValue(root, target, persisted, saved, config.types?.[target], config);
            if (restored === undefined) storage.removeItem(persisted.key);
            else writePath(state, target, restored);
          }
        } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target, error}})); }
      });
};
export const restoreIndexed = (root, state, config) => Object.entries(config.persisted || {}).filter(([, persisted]) => persisted.storage === 'indexeddb').map(async ([target, persisted]) => {
        try {
          const saved = await indexedState('get', persisted.key);
          if (saved === undefined) return;
          const restored = restoredValue(root, target, persisted, saved, config.types?.[target], config);
          if (restored === undefined) await indexedState('delete', persisted.key);
          else {
            writePath(state, target, restored);
            const changes = new Map([[target, restored]]);
            recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
            scheduleUpdate(root, state, changes);
          }
        } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target, error}})); }
      });
export const restoreContexts = (root, state) => {
    root.querySelectorAll('[data-aml-context-provider]').forEach((provider) => {
      const rule = JSON.parse(provider.dataset.amlContextProvider);
      if (!rule.persist) return;
      try {
        const stored = localStorage.getItem(rule.storageKey || `phpaml.context.${rule.name}`);
        if (stored === null) return;
        const value = JSON.parse(stored);
        if (rule.state) writePath(state, rule.state, value);
        else { rule.value = value; provider.dataset.amlContextProvider = JSON.stringify(rule); }
      } catch (error) { root.dispatchEvent(new CustomEvent('aml:context-error', {detail: {name: rule.name, error}})); }
    });
  };

export const persistContext = (root, rule, value) => {
        try {
          localStorage.setItem(rule.storageKey || `phpaml.context.${rule.name}`, JSON.stringify(value));
        } catch (error) { root.dispatchEvent(new CustomEvent('aml:context-error', {detail: {name: rule.name, error}})); }
};
