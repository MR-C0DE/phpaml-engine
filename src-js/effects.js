import { clone } from './core/state.js';

export const newEffectRuntime = (id, definition) => ({
  id, controllers: new Set(), debounceTimer: null, timer: null, listener: null,
  mode: null, selfRuns: [], disabled: false, generation: 0, inFlight: false,
  queued: false, invoke: null, definition, hasRun: false, lastActivated: 0,
});

export const eventPayload = (event) => {
  if (!event) return null;
  let detail = null;
  try { detail = clone(event.detail ?? null); } catch (_) {}
  return {
    type: event.type, detail, key: event.key, code: event.code,
    repeat: Boolean(event.repeat), button: event.button,
    clientX: event.clientX, clientY: event.clientY,
    value: event.target?.value, checked: event.target?.checked,
  };
};
