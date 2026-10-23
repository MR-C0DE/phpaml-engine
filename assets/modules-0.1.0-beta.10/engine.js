import {
  activateEffect,
  cleanupEffect,
  context,
  effectRuntimes,
  installNavigationListeners,
  lifecycle,
  mount,
  navigate,
  on,
  remember,
  render,
  rootConfigs,
  rootStates,
  route,
  runEffects,
  stateHistories,
  unmount,
  updateActiveLinks
} from "./chunk-F7NIHWFI.js";
import {
  clone,
  configureEvalAsset,
  formatThrowable
} from "./chunk-URCPTMHR.js";
import {
  ENGINE_VERSION,
  configureModules,
  moduleExport,
  prepareModules,
  prepareScopeModules
} from "./chunk-DER6LTKY.js";

// phpaml-proxy:../storage.js
var indexedState = (...args) => moduleExport("browser", "indexedState")(...args);

// src-js/diagnostics.js
var observer = new MutationObserver((records) => records.forEach((record) => record.removedNodes.forEach((node) => {
  if (!(node instanceof Element)) return;
  if (node.matches("[data-aml-client]")) unmount(node);
  node.querySelectorAll?.("[data-aml-client]").forEach(unmount);
})));
observer.observe(document.documentElement, { childList: true, subtree: true });
var clearPersisted = (key, storage = "local") => storage === "indexeddb" ? Promise.resolve(prepareModules(["browser"])).then(() => indexedState("delete", key)) : (storage === "session" ? sessionStorage : localStorage).removeItem(key);
var clearFormDraft = (formOrKey) => {
  const key = typeof formOrKey === "string" ? formOrKey : formOrKey?.dataset?.amlFormPreserve;
  if (!key) throw new Error("A form or draft key is required.");
  sessionStorage.removeItem(`phpaml.form.${key}`);
};
var inspect = (root) => clone(rootStates.get(root) || {});
var effects = (root) => {
  const definitions = rootConfigs.get(root)?.effects || {};
  const runtimes = effectRuntimes.get(root) || /* @__PURE__ */ new Map();
  return Object.fromEntries(Object.entries(definitions).map(([id, definition]) => {
    const runtime = runtimes.get(id);
    return [id, {
      mode: definition.mode,
      dependencies: clone(definition.dependencies || []),
      runOnMount: Boolean(definition.runOnMount),
      debounce: Number(definition.debounce || 0),
      throttle: Number(definition.throttle || 0),
      concurrency: definition.concurrency || "latest",
      active: Boolean(runtime && !runtime.disabled),
      inFlight: Boolean(runtime?.inFlight),
      queued: Boolean(runtime?.queued),
      controllers: runtime?.controllers?.size || 0
    }];
  }));
};
var pauseEffect = (root, id) => {
  const runtime = effectRuntimes.get(root)?.get(id);
  if (!runtime) throw new Error(`Unknown AML effect: ${id}`);
  cleanupEffect(root, id, "pause");
  runtime.disabled = true;
  root.dispatchEvent(new CustomEvent("aml:effect-pause", { detail: { id } }));
};
var resumeEffect = (root, id, run = false) => {
  const runtime = effectRuntimes.get(root)?.get(id);
  const definition = rootConfigs.get(root)?.effects?.[id];
  if (!runtime || !definition) throw new Error(`Unknown AML effect: ${id}`);
  runtime.disabled = false;
  runtime.selfRuns = [];
  root.dispatchEvent(new CustomEvent("aml:effect-resume", { detail: { id } }));
  if (run) activateEffect(root, rootStates.get(root), id, definition);
};
var runEffect = (root, id) => {
  const runtime = effectRuntimes.get(root)?.get(id);
  const definition = rootConfigs.get(root)?.effects?.[id];
  if (!runtime || !definition) throw new Error(`Unknown AML effect: ${id}`);
  if (runtime.disabled) throw new Error(`AML effect is paused or disabled: ${id}`);
  activateEffect(root, rootStates.get(root), id, definition);
};
var stateHistory = (root) => clone(stateHistories.get(root) || []);
var restore = (root, index) => {
  const entries = stateHistories.get(root) || [];
  const position = Number(index);
  const entry = position < 0 ? entries[entries.length + position] : entries[position];
  if (!entry) throw new RangeError(`Unknown AML state history entry: ${index}`);
  const state = rootStates.get(root);
  if (!state) throw new Error("AML root is not mounted.");
  const previous = clone(state);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, clone(entry.state));
  render(root, state);
  const detail = { index: Number(index), state: clone(state) };
  root.dispatchEvent(new CustomEvent("aml:restore", { detail }));
  lifecycle(root, "update", detail);
  remember(root, state, `restore:${index}`);
  const restoredTargets = [.../* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(state)])].filter((target) => !Object.is(previous[target], state[target]));
  runEffects(root, state, restoredTargets);
  return inspect(root);
};

// src-js/development-errors.js
var installed = false;
var reporting = false;
var escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[character]);
var normalizeError = (reason) => reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : JSON.stringify(reason));
var showDevelopmentError = (reason, context2 = "AML Engine") => {
  if (!document.querySelector('meta[name="aml-debug"][content="true"]')) return;
  const error = normalizeError(reason);
  const previous = document.getElementById("aml-development-error-overlay");
  previous?.remove();
  const overlay = document.createElement("div");
  overlay.id = "aml-development-error-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <style>
      #aml-development-error-overlay{position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;padding:24px;background:rgba(9,9,11,.88);color:#18181b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #aml-development-error-overlay *{box-sizing:border-box}
      #aml-development-error-overlay .aml-error-panel{width:min(960px,100%);max-height:calc(100vh - 48px);overflow:auto;background:#fff;border:1px solid #e4e4e7;border-radius:5px;box-shadow:0 30px 90px rgba(0,0,0,.4)}
      #aml-development-error-overlay .aml-error-bar{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #e4e4e7;background:#fafafa}
      #aml-development-error-overlay .aml-error-badge{padding:3px 8px;border-radius:4px;color:#fff;background:#dc2626;font:700 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
      #aml-development-error-overlay .aml-error-content{padding:24px}
      #aml-development-error-overlay h1{margin:8px 0 24px;font-size:clamp(24px,4vw,38px);line-height:1.15;letter-spacing:-.03em}
      #aml-development-error-overlay p{margin:0;color:#71717a;font:600 13px ui-monospace,SFMono-Regular,Menlo,monospace}
      #aml-development-error-overlay pre{margin:0;padding:16px;overflow:auto;border:1px solid #27272a;border-radius:5px;color:#f4f4f5;background:#18181b;font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}
      #aml-development-error-overlay .aml-error-actions{display:flex;gap:10px;margin-top:18px}
      #aml-development-error-overlay button{padding:9px 14px;border:1px solid #d4d4d8;border-radius:4px;background:#fff;color:#18181b;font:600 14px system-ui;cursor:pointer}
      #aml-development-error-overlay button:first-child{color:#fff;background:#18181b;border-color:#18181b}
      @media(max-width:640px){#aml-development-error-overlay{padding:0;place-items:stretch}#aml-development-error-overlay .aml-error-panel{max-height:100vh;border:0;border-radius:0}}
    </style>
    <section class="aml-error-panel" aria-labelledby="aml-client-error-title">
      <header class="aml-error-bar"><span class="aml-error-badge">CLIENT</span><strong>PHPAML development error</strong></header>
      <div class="aml-error-content">
        <p>${escapeHtml(context2)} \xB7 ${escapeHtml(error.name || "Error")}</p>
        <h1 id="aml-client-error-title">${escapeHtml(error.message || "Unknown browser error.")}</h1>
        <pre>${escapeHtml(error.source ? formatThrowable(error) + "\n\nBrowser stack:\n" + (error.stack || "") : error.stack || error.message)}</pre>
        <div class="aml-error-actions"><button type="button" data-aml-error-reload>Reload page</button><button type="button" data-aml-error-close>Close overlay</button></div>
      </div>
    </section>`;
  document.body.append(overlay);
  overlay.querySelector("[data-aml-error-reload]").addEventListener("click", () => location.reload());
  overlay.querySelector("[data-aml-error-close]").addEventListener("click", () => overlay.remove());
};
var installDevelopmentErrorOverlay = () => {
  if (installed || !document.querySelector('meta[name="aml-debug"][content="true"]')) return;
  installed = true;
  window.addEventListener("error", (event) => showDevelopmentError(event.error || event.message, "Browser"));
  window.addEventListener("unhandledrejection", (event) => showDevelopmentError(event.reason, "Unhandled promise"));
  const originalError = console.error.bind(console);
  console.error = (...values) => {
    originalError(...values);
    if (reporting) return;
    const error = values.find((value) => value instanceof Error);
    if (!error) return;
    reporting = true;
    try {
      showDevelopmentError(error, "AML Engine");
    } finally {
      reporting = false;
    }
  };
};

// src-js/start.js
var startEngine = (engineScript = null, evalUrl = null) => {
  configureEvalAsset(engineScript?.dataset?.amlEvalSrc || evalUrl || (engineScript?.src ? new URL(`engine-eval-${ENGINE_VERSION}.min.js`, engineScript.src).href : `/_aml/engine-eval-${ENGINE_VERSION}.min.js`), engineScript?.nonce || "");
  installDevelopmentErrorOverlay();
  installNavigationListeners();
  window.AMLEngine = { mount, unmount, on, navigate, context, route, clearPersisted, clearFormDraft, inspect, effects, pauseEffect, resumeEffect, runEffect, history: stateHistory, restore };
  mount();
  updateActiveLinks();
  const liveReloadMeta = document.querySelector('meta[name="aml-live-reload"]');
  if (liveReloadMeta) {
    let liveReloadVersion = null;
    let liveReloadTimer = null, liveReloadRequest = null, liveReloadStopped = true;
    const liveReloadEndpoint = liveReloadMeta.content || "/_aml/live-reload";
    const checkForChanges = async () => {
      if (liveReloadStopped || liveReloadRequest || document.visibilityState === "hidden") return;
      const request = new AbortController();
      liveReloadRequest = request;
      try {
        const response = await fetch(liveReloadEndpoint, { mode: "same-origin", cache: "no-store", headers: { Accept: "application/json" }, signal: request.signal });
        if (!response.ok) return;
        const state = await response.json();
        if (request.signal.aborted || liveReloadStopped) return;
        if (liveReloadVersion !== null && liveReloadVersion !== state.version) location.reload();
        liveReloadVersion = state.version;
      } catch {
      } finally {
        if (liveReloadRequest === request) liveReloadRequest = null;
      }
    };
    const resumeLiveReload = () => {
      if (!liveReloadStopped || document.visibilityState === "hidden") return;
      liveReloadStopped = false;
      checkForChanges();
      liveReloadTimer = setInterval(checkForChanges, 1e3);
    };
    const stopLiveReload = () => {
      liveReloadStopped = true;
      clearInterval(liveReloadTimer);
      liveReloadRequest?.abort();
      liveReloadRequest = null;
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") stopLiveReload();
      else resumeLiveReload();
    });
    window.addEventListener("pagehide", stopLiveReload);
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) resumeLiveReload();
    });
    resumeLiveReload();
  }
};

// phpaml-entry:engine
configureModules({ "unicode": () => import("./unicode-C4CDOK3W.js"), "intl": () => import("./intl-MDUFDXKG.js"), "bcmath": () => import("./bcmath-U2F57GLR.js"), "regex": () => import("./regex-5XRKF5LS.js"), "date": () => import("./date-ROGYUT7L.js"), "spl": () => import("./spl-BDWSC66K.js"), "reflection": () => import("./reflection-6FX5GNQ3.js"), "files": () => import("./files-XBEU2VHB.js"), "browser": () => import("./browser-ENFBCPRR.js"), "animations": () => import("./animations-JTCKLEY2.js") });
if (!window.AMLEngine?.mount) {
  const scripts = [...document.querySelectorAll("script[data-aml-engine]")];
  const script = scripts.find((node) => node.src === import.meta.url) || scripts.at(-1);
  try {
    const loading = prepareScopeModules(document);
    if (loading) await loading;
    if (!window.AMLEngine?.mount) startEngine(script, new URL("../engine-eval-0.1.0-beta.10.min.js", import.meta.url).href);
  } catch (error) {
    if (!window.AMLEngine?.mount) installDevelopmentErrorOverlay();
    document.dispatchEvent(new CustomEvent("aml:error", { detail: { error } }));
    console.error(error);
  }
}
