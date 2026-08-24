export const observer = new MutationObserver((records) => records.forEach((record) => record.removedNodes.forEach((node) => {
    if (!(node instanceof Element)) return;
    if (node.matches('[data-aml-client]')) unmount(node);
    node.querySelectorAll?.('[data-aml-client]').forEach(unmount);
  })));
  observer.observe(document.documentElement, {childList: true, subtree: true});
export const clearPersisted = (key, storage = 'local') => storage === 'indexeddb'
    ? indexedState('delete', key)
    : (storage === 'session' ? sessionStorage : localStorage).removeItem(key);
export const clearFormDraft = (formOrKey) => {
    const key = typeof formOrKey === 'string' ? formOrKey : formOrKey?.dataset?.amlFormPreserve;
    if (!key) throw new Error('A form or draft key is required.');
    sessionStorage.removeItem(`phpaml.form.${key}`);
  };
export const inspect = (root) => clone(rootStates.get(root) || {});
export const effects = (root) => {
    const definitions = rootConfigs.get(root)?.effects || {};
    const runtimes = effectRuntimes.get(root) || new Map();
    return Object.fromEntries(Object.entries(definitions).map(([id, definition]) => {
      const runtime = runtimes.get(id);
      return [id, {
        mode: definition.mode, dependencies: clone(definition.dependencies || []),
        runOnMount: Boolean(definition.runOnMount), debounce: Number(definition.debounce || 0),
        throttle: Number(definition.throttle || 0), concurrency: definition.concurrency || 'latest',
        active: Boolean(runtime && !runtime.disabled), inFlight: Boolean(runtime?.inFlight),
        queued: Boolean(runtime?.queued), controllers: runtime?.controllers?.size || 0,
      }];
    }));
  };
export const pauseEffect = (root, id) => {
    const runtime = effectRuntimes.get(root)?.get(id);
    if (!runtime) throw new Error(`Unknown AML effect: ${id}`);
    cleanupEffect(root, id, 'pause');
    runtime.disabled = true;
    root.dispatchEvent(new CustomEvent('aml:effect-pause', {detail: {id}}));
  };
export const resumeEffect = (root, id, run = false) => {
    const runtime = effectRuntimes.get(root)?.get(id);
    const definition = rootConfigs.get(root)?.effects?.[id];
    if (!runtime || !definition) throw new Error(`Unknown AML effect: ${id}`);
    runtime.disabled = false;
    runtime.selfRuns = [];
    root.dispatchEvent(new CustomEvent('aml:effect-resume', {detail: {id}}));
    if (run) activateEffect(root, rootStates.get(root), id, definition);
  };
export const runEffect = (root, id) => {
    const runtime = effectRuntimes.get(root)?.get(id);
    const definition = rootConfigs.get(root)?.effects?.[id];
    if (!runtime || !definition) throw new Error(`Unknown AML effect: ${id}`);
    if (runtime.disabled) throw new Error(`AML effect is paused or disabled: ${id}`);
    activateEffect(root, rootStates.get(root), id, definition);
  };
export const stateHistory = (root) => clone(stateHistories.get(root) || []);
export const restore = (root, index) => {
    const entries = stateHistories.get(root) || [];
    const position = Number(index);
    const entry = position < 0 ? entries[entries.length + position] : entries[position];
    if (!entry) throw new RangeError(`Unknown AML state history entry: ${index}`);
    const state = rootStates.get(root);
    if (!state) throw new Error('AML root is not mounted.');
    const previous = clone(state);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, clone(entry.state));
    render(root, state);
    const detail = {index: Number(index), state: clone(state)};
    root.dispatchEvent(new CustomEvent('aml:restore', {detail}));
    lifecycle(root, 'update', detail);
    remember(root, state, `restore:${index}`);
    const restoredTargets = [...new Set([...Object.keys(previous), ...Object.keys(state)])]
      .filter((target) => !Object.is(previous[target], state[target]));
    runEffects(root, state, restoredTargets);
    return inspect(root);
  };
import { effectRuntimes, rootConfigs, rootStates, stateHistories } from './context.js';
import { clone } from './core/state.js';
import { indexedState } from './storage.js';
import { activateEffect, cleanupEffect, runEffects } from './effects-runtime.js';
import { render } from './rendering.js';
import { lifecycle, remember } from './lifecycle.js';
import { unmount } from './lifecycle-runtime.js';
