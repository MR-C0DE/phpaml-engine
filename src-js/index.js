import { mount, on, unmount } from './lifecycle-runtime.js';
import { context, navigate, route, updateActiveLinks } from './navigation.js';
import { clearFormDraft, clearPersisted, effects, inspect, pauseEffect, restore, resumeEffect, runEffect, stateHistory } from './diagnostics.js';

window.AMLEngine = {mount, unmount, on, navigate, context, route, clearPersisted, clearFormDraft, inspect, effects, pauseEffect, resumeEffect, runEffect, history: stateHistory, restore};
mount();
updateActiveLinks();

const liveReloadMeta = document.querySelector('meta[name="aml-live-reload"]');
if (liveReloadMeta) {
  let liveReloadVersion = null;
  const liveReloadEndpoint = liveReloadMeta.content || '/_aml/live-reload';
  const checkForChanges = async () => {
    try {
      const response = await fetch(liveReloadEndpoint, {cache: 'no-store', headers: {Accept: 'application/json'}});
      if (!response.ok) return;
      const state = await response.json();
      if (liveReloadVersion !== null && liveReloadVersion !== state.version) location.reload();
      liveReloadVersion = state.version;
    } catch { /* The development server may be restarting. */ }
  };
  checkForChanges();
  setInterval(checkForChanges, 1000);
}
