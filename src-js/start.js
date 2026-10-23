import { mount, on, unmount } from './lifecycle-runtime.js';
import { context, navigate, route, updateActiveLinks, installNavigationListeners } from './navigation.js';
import { clearFormDraft, clearPersisted, effects, inspect, pauseEffect, restore, resumeEffect, runEffect, stateHistory } from './diagnostics.js';
import { installDevelopmentErrorOverlay } from './development-errors.js';
import {ENGINE_VERSION} from './core/version.js';
import {configureEvalAsset} from './core/php-eval.js';

export const startEngine = (engineScript = null, evalUrl = null) => {

configureEvalAsset(engineScript?.dataset?.amlEvalSrc || evalUrl || (engineScript?.src
  ? new URL(`engine-eval-${ENGINE_VERSION}.min.js`, engineScript.src).href
  : `/_aml/engine-eval-${ENGINE_VERSION}.min.js`), engineScript?.nonce || '');

installDevelopmentErrorOverlay();
installNavigationListeners();
window.AMLEngine = {mount, unmount, on, navigate, context, route, clearPersisted, clearFormDraft, inspect, effects, pauseEffect, resumeEffect, runEffect, history: stateHistory, restore};
mount();
updateActiveLinks();

const liveReloadMeta = document.querySelector('meta[name="aml-live-reload"]');
if (liveReloadMeta) {
  let liveReloadVersion = null;
  let liveReloadTimer = null, liveReloadRequest = null, liveReloadStopped = true;
  const liveReloadEndpoint = liveReloadMeta.content || '/_aml/live-reload';
  const checkForChanges = async () => {
    if (liveReloadStopped || liveReloadRequest || document.visibilityState === 'hidden') return;
    const request = new AbortController();
    liveReloadRequest = request;
    try {
      const response = await fetch(liveReloadEndpoint, {mode: 'same-origin', cache: 'no-store', headers: {Accept: 'application/json'}, signal: request.signal});
      if (!response.ok) return;
      const state = await response.json();
      if (request.signal.aborted || liveReloadStopped) return;
      if (liveReloadVersion !== null && liveReloadVersion !== state.version) location.reload();
      liveReloadVersion = state.version;
    } catch { /* The development server may be restarting. */ }
    finally { if (liveReloadRequest === request) liveReloadRequest = null; }
  };
  const resumeLiveReload = () => {
    if (!liveReloadStopped || document.visibilityState === 'hidden') return;
    liveReloadStopped = false;
    checkForChanges();
    liveReloadTimer = setInterval(checkForChanges, 1000);
  };
  const stopLiveReload = () => {
    liveReloadStopped = true;
    clearInterval(liveReloadTimer);
    liveReloadRequest?.abort();
    liveReloadRequest = null;
  };
  // Visibility changes precede pagehide during navigation in WebKit. Abort
  // while the document is still active instead of fetching from a closing page.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopLiveReload();
    else resumeLiveReload();
  });
  window.addEventListener('pagehide', stopLiveReload);
  window.addEventListener('pageshow', event => { if (event.persisted) resumeLiveReload(); });
  resumeLiveReload();
}

};
