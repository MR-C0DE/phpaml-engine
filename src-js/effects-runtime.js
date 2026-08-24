export const registerEffect = (root, state, id, definition, mounting = false) => {
    const runtimes = effectRuntimes.get(root);
    if (!runtimes) return;
    if (runtimes.has(id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
    runtimes.set(id, newEffectRuntime(id, definition));
    if (!mounting || definition.runOnMount) activateEffect(root, state, id, definition);
  };
export const cleanupEffect = (root, id, reason = 'rerun') => {
    const runtime = effectRuntimes.get(root)?.get(id);
    if (!runtime) return;
    runtime.generation++;
    if (runtime.debounceTimer) clearTimeout(runtime.debounceTimer);
    if (runtime.timer) runtime.mode === 'interval' ? clearInterval(runtime.timer) : clearTimeout(runtime.timer);
    if (runtime.listener) runtime.listener.target.removeEventListener(runtime.listener.event, runtime.listener.handler);
    runtime.controllers.forEach((controller) => controller.abort());
    runtime.controllers.clear();
    runtime.debounceTimer = runtime.timer = runtime.listener = null;
    runtime.queued = false;
    if (runtime.hasRun && runtime.definition.cleanup && rootStates.has(root)) {
      const cleanupAction = runtime.definition.cleanup;
      runtime.hasRun = false;
      execute(root, rootStates.get(root), cleanupAction, null, {owner: runtime, eventData: null}).catch((error) => {
        root.dispatchEvent(new CustomEvent('aml:effect-error', {detail: {id, phase: 'cleanup', error}}));
        console.error(error);
      });
    }
    root.dispatchEvent(new CustomEvent('aml:effect-cleanup', {detail: {id, reason}}));
  };
export const activateEffect = (root, state, id, definition, selfTriggered = false) => {
    const runtimes = effectRuntimes.get(root);
    const runtime = runtimes?.get(id);
    if (!runtime || runtime.disabled) return;
    const activatedAt = Date.now();
    if (Number(definition.throttle || 0) > 0 && activatedAt - runtime.lastActivated < Number(definition.throttle)) return;
    runtime.lastActivated = activatedAt;
    cleanupEffect(root, id);
    const start = () => {
      if (!rootStates.has(root) || runtime.disabled) return;
      const now = Date.now();
      runtime.selfRuns = selfTriggered
        ? [...runtime.selfRuns.filter((timestamp) => now - timestamp < 60_000), now]
        : [];
      const rapidRuns = runtime.selfRuns.filter((timestamp) => now - timestamp < 50).length;
      if (rapidRuns > 25 || runtime.selfRuns.length > 60) {
        runtime.disabled = true;
        cleanupEffect(root, id, 'cycle');
        root.dispatchEvent(new CustomEvent('aml:effect-cycle', {detail: {id, rapidLimit: 25, sustainedLimit: 60}}));
        return;
      }
      const run = (event = null) => {
        const strategy = definition.concurrency || 'latest';
        if (runtime.inFlight && strategy === 'exhaust') return;
        if (runtime.inFlight && strategy === 'queue') { runtime.queued = true; return; }
        if (runtime.inFlight && strategy === 'latest') {
          runtime.generation++;
          runtime.controllers.forEach((controller) => controller.abort());
          runtime.controllers.clear();
        }
        const generation = runtime.generation;
        runtime.inFlight = true;
        runtime.hasRun = true;
        root.dispatchEvent(new CustomEvent('aml:effect-run', {detail: {id, mode: definition.mode}}));
        execute(root, state, definition.action, null, {owner: runtime, eventData: eventPayload(event)}).catch((error) => {
          if (error?.name === 'AbortError') return;
          root.dispatchEvent(new CustomEvent('aml:effect-error', {detail: {id, error}}));
          console.error(error);
        }).finally(() => {
          if (strategy !== 'parallel' && runtime.generation !== generation) return;
          runtime.inFlight = false;
          if (runtime.queued) { runtime.queued = false; queueMicrotask(run); }
        });
      };
      runtime.invoke = run;
      runtime.mode = definition.mode;
      runtime.concurrency = definition.concurrency || 'latest';
      if (definition.mode === 'timeout') runtime.timer = setTimeout(run, Number(definition.delay));
      else if (definition.mode === 'interval') runtime.timer = setInterval(run, Number(definition.delay));
      else if (definition.mode === 'listener') {
        const target = definition.target === 'window' ? window : document;
        const handler = (event) => run(event);
        target.addEventListener(definition.event, handler);
        runtime.listener = {target, event: definition.event, handler};
      } else run();
    };
    if (Number(definition.debounce || 0) > 0) runtime.debounceTimer = setTimeout(start, Number(definition.debounce));
    else start();
  };
export const runEffects = (root, state, changedTargets = null, mounting = false, origins = new Map()) => {
    const effects = rootConfigs.get(root)?.effects || {};
    Object.entries(effects).forEach(([id, definition]) => {
      if (mounting && !definition.runOnMount) return;
      if (!mounting && (!changedTargets || !(definition.dependencies || []).some((dependency) => changedTargets.some((target) => pathAffects(dependency, target))))) return;
      const selfTriggered = !mounting && changedTargets.some((target) => origins.get(target) === id && (definition.dependencies || []).some((dependency) => pathAffects(dependency, target)));
      activateEffect(root, state, id, definition, selfTriggered);
    });
  };
import { effectRuntimes, rootConfigs, rootStates } from './context.js';
import { pathAffects } from './core/state.js';
import { eventPayload, newEffectRuntime } from './effects.js';
import { execute } from './actions-runtime.js';
