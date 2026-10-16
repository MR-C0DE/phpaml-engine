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

};
