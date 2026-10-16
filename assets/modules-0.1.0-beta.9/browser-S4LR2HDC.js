import {
  commit,
  mountedRoots,
  rootConfigs,
  rootControllers,
  rootStates,
  scheduleUpdate,
  showValidation,
  validateControl,
  validationControllers,
  validationTimers
} from "./chunk-ILXEYMGO.js";
import {
  assignType,
  clone,
  coerce,
  deletePath,
  describeArray,
  phpType,
  readPath,
  recomputeComputed,
  resolveData,
  restoreArrayMetadata,
  writePath
} from "./chunk-HCVTEZMH.js";
import {
  __export,
  registerModule
} from "./chunk-RFV3LKK7.js";

// src-js/browser-api.js
var browser_api_exports = {};
__export(browser_api_exports, {
  request: () => request
});

// src-js/http.js
var http_exports = {};
__export(http_exports, {
  csrfToken: () => csrfToken,
  prepareApiRequest: () => prepareApiRequest,
  refreshCsrfToken: () => refreshCsrfToken
});
var CSRF_SELECTOR = 'meta[name="csrf-token"],meta[name="aml-csrf-token"]';
var csrfToken = (documentRoot = document) => documentRoot.querySelector(CSRF_SELECTOR)?.getAttribute("content") || "";
var refreshCsrfToken = (response, documentRoot = document) => {
  const renewed = response.headers.get("X-CSRF-Token");
  if (!renewed) return;
  documentRoot.querySelector(CSRF_SELECTOR)?.setAttribute("content", renewed);
};
var prepareApiRequest = (url, action, data, signal, token = "", engine = "api") => {
  const options = {
    method: action.method,
    credentials: "same-origin",
    signal,
    headers: { "Accept": "application/json", "X-AML-Engine": engine }
  };
  if (action.method === "GET") {
    Object.entries(data).forEach(([key, value]) => url.searchParams.set(key, String(value ?? "")));
  } else {
    options.headers["Content-Type"] = "application/json";
    if (token) options.headers["X-CSRF-Token"] = token;
    options.body = JSON.stringify(data);
  }
  return options;
};

// src-js/browser-api.js
var request = async (root, state, action, trigger, executionContext = null) => {
  const owner = executionContext?.owner || executionContext;
  const data = resolveData(action.data || {}, state, executionContext?.eventData);
  const url = new URL(action.url, location.origin);
  if (url.origin !== location.origin) throw new Error("AML API requests must remain same-origin.");
  const executionGeneration = owner?.generation;
  const isCurrent = () => !owner || owner.concurrency === "parallel" || owner.generation === executionGeneration;
  const controllers = rootControllers.get(root) || /* @__PURE__ */ new Set();
  rootControllers.set(root, controllers);
  if (action.loading) commit(root, state, action.loading, true, executionContext);
  if (action.error) commit(root, state, action.error, "", executionContext);
  trigger?.setAttribute("aria-busy", "true");
  if (trigger instanceof HTMLButtonElement) trigger.disabled = true;
  try {
    const retries = Math.max(0, Math.min(5, Number(action.retries || 0)));
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (!isCurrent()) return;
      const controller = new AbortController();
      controllers.add(controller);
      owner?.controllers?.add(controller);
      let timeout = null;
      let timedOut = false;
      const timeoutMs = Number(action.timeout || 0);
      if (timeoutMs > 0) timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      try {
        const options = prepareApiRequest(url, action, data, controller.signal, csrfToken());
        const response = await fetch(url, options);
        refreshCsrfToken(response);
        const contentType = response.headers.get("content-type") || "";
        const result = contentType.includes("application/json") ? await response.json() : await response.text();
        if (!response.ok) {
          const error = new Error(typeof result === "object" ? result.message || result.error || `API request failed: ${response.status}` : result);
          error.retryable = response.status === 429 || response.status >= 500;
          throw error;
        }
        if (!isCurrent()) return;
        const selected = action.select ? readPath(result, action.select) : result;
        if (action.result) commit(root, state, action.result, selected, executionContext);
        root.dispatchEvent(new CustomEvent("aml:api-success", { detail: { url: url.href, result, attempts: attempt + 1 } }));
        return;
      } catch (error) {
        if (!isCurrent() || error?.name === "AbortError" && !timedOut) return;
        const failure = timedOut ? new Error(`API request timed out after ${timeoutMs} ms`) : error;
        const retryable = timedOut || error?.retryable === true || error instanceof TypeError;
        if (attempt >= retries || !retryable) throw failure;
        const delay = Math.min(3e4, Math.max(0, Number(action.retryDelay ?? 250)) * 2 ** attempt);
        root.dispatchEvent(new CustomEvent("aml:api-retry", { detail: { url: url.href, attempt: attempt + 1, delay, error: failure } }));
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      } finally {
        if (timeout !== null) clearTimeout(timeout);
        controllers.delete(controller);
        owner?.controllers?.delete(controller);
      }
    }
  } catch (error) {
    if (error?.name === "AbortError" || !isCurrent()) return;
    if (action.error) commit(root, state, action.error, error.message, executionContext);
    root.dispatchEvent(new CustomEvent("aml:api-error", { detail: { url: url.href, error } }));
    if (executionContext) throw error;
  } finally {
    if (action.loading && isCurrent()) commit(root, state, action.loading, false, executionContext);
    trigger?.removeAttribute("aria-busy");
    if (trigger instanceof HTMLButtonElement) trigger.disabled = false;
  }
};

// src-js/browser-forms.js
var browser_forms_exports = {};
__export(browser_forms_exports, {
  preserveForm: () => preserveForm,
  restoreForm: () => restoreForm,
  scheduleRemoteValidation: () => scheduleRemoteValidation,
  validateRemote: () => validateRemote
});
var preserveForm = (form) => {
  const values = {};
  for (const [name, value] of new FormData(form).entries()) {
    if (value instanceof File) continue;
    if (Object.prototype.hasOwnProperty.call(values, name)) values[name] = Array.isArray(values[name]) ? [...values[name], value] : [values[name], value];
    else values[name] = value;
  }
  [...form.querySelectorAll('input[type="checkbox"][name]')].forEach((control) => {
    if (!Object.prototype.hasOwnProperty.call(values, control.name)) values[control.name] = false;
  });
  try {
    sessionStorage.setItem(`phpaml.form.${form.dataset.amlFormPreserve}`, JSON.stringify(values));
  } catch (error) {
    form.dispatchEvent(new CustomEvent("aml:form-preserve-error", { detail: { error } }));
  }
};
var restoreForm = (form) => {
  try {
    const saved = sessionStorage.getItem(`phpaml.form.${form.dataset.amlFormPreserve}`);
    if (!saved) return;
    const values = JSON.parse(saved);
    const positions = {};
    [...form.elements].forEach((control) => {
      if (!control.name || !Object.prototype.hasOwnProperty.call(values, control.name) || control.type === "file") return;
      const stored = values[control.name];
      const list = Array.isArray(stored) ? stored : [stored];
      if (control.type === "checkbox") control.checked = stored === true || list.map(String).includes(control.value);
      else if (control.type === "radio") control.checked = list.map(String).includes(control.value);
      else if (control.matches("select[multiple]")) [...control.options].forEach((option) => option.selected = list.map(String).includes(option.value));
      else {
        const index = positions[control.name] || 0;
        control.value = list[Math.min(index, list.length - 1)] ?? "";
        positions[control.name] = index + 1;
      }
      control.dispatchEvent(new Event("input", { bubbles: true }));
    });
  } catch (error) {
    form.dispatchEvent(new CustomEvent("aml:form-preserve-error", { detail: { error } }));
  }
};
var validateRemote = async (root, state, control) => {
  if (!control.dataset.amlValidateApi || !validateControl(control)) return !control.matches('[aria-invalid="true"]');
  const config = JSON.parse(control.dataset.amlValidateApi);
  const action = config.request;
  const data = resolveData(action.data || {}, state);
  const url = new URL(action.url, location.origin);
  if (url.origin !== location.origin) return showValidation(control, "Validation API must remain same-origin.");
  validationControllers.get(control)?.abort();
  const controller = new AbortController();
  validationControllers.set(control, controller);
  control.setAttribute("aria-busy", "true");
  const options = prepareApiRequest(url, action, data, controller.signal, "", "validation");
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || `Validation failed: ${response.status}`);
    return showValidation(control, result.valid === true ? "" : result.message || config.message);
  } catch (error) {
    if (error.name === "AbortError") return false;
    return showValidation(control, error.message || config.message);
  } finally {
    if (validationControllers.get(control) === controller) {
      validationControllers.delete(control);
      control.removeAttribute("aria-busy");
    }
  }
};
var scheduleRemoteValidation = (root, state, control) => {
  if (!control.dataset.amlValidateApi || !validateControl(control)) return;
  clearTimeout(validationTimers.get(control));
  const config = JSON.parse(control.dataset.amlValidateApi);
  validationTimers.set(control, setTimeout(() => validateRemote(root, state, control), Number(config.debounce ?? 400)));
};

// src-js/browser-storage.js
var browser_storage_exports = {};
__export(browser_storage_exports, {
  persistContext: () => persistContext,
  persistState: () => persistState,
  restoreContexts: () => restoreContexts,
  restoreIndexed: () => restoreIndexed,
  restorePersisted: () => restorePersisted
});

// src-js/storage.js
var storage_exports = {};
__export(storage_exports, {
  indexedState: () => indexedState,
  migrateValue: () => migrateValue,
  openStateDatabase: () => openStateDatabase,
  persistedPayload: () => persistedPayload,
  restoredValue: () => restoredValue
});
var migrateValue = (root, target, value, storedVersion, config) => {
  let migrated = clone(value);
  for (let version = Number(storedVersion) + 1; version <= Number(config.version || 1); version++) {
    const migration = config.migrations?.[version] || config.migrations?.[String(version)];
    if (!migration) {
      root.dispatchEvent(new CustomEvent("aml:storage-migration-required", { detail: { target, storedVersion, expectedVersion: config.version || 1, missingVersion: version } }));
      return void 0;
    }
    Object.entries(migration.rename || {}).forEach(([from, to]) => {
      const previous = readPath(migrated, from);
      if (previous !== void 0) {
        writePath(migrated, to, previous);
        deletePath(migrated, from);
      }
    });
    Object.entries(migration.defaults || {}).forEach(([path, fallback]) => {
      if (readPath(migrated, path) === void 0) writePath(migrated, path, fallback);
    });
    (migration.remove || []).forEach((path) => deletePath(migrated, path));
  }
  root.dispatchEvent(new CustomEvent("aml:storage-migrated", { detail: { target, from: storedVersion, to: config.version || 1 } }));
  return migrated;
};
var openStateDatabase = () => new Promise((resolve, reject) => {
  const request2 = indexedDB.open("phpaml-engine", 1);
  request2.onupgradeneeded = () => request2.result.createObjectStore("state");
  request2.onsuccess = () => resolve(request2.result);
  request2.onerror = () => reject(request2.error);
});
var indexedState = async (operation, key, value = void 0) => {
  const database = await openStateDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("state", operation === "get" ? "readonly" : "readwrite");
      const store = transaction.objectStore("state");
      const request2 = operation === "get" ? store.get(key) : operation === "delete" ? store.delete(key) : store.put(value, key);
      request2.onsuccess = () => resolve(request2.result);
      request2.onerror = () => reject(request2.error);
    });
  } finally {
    database.close();
  }
};
var persistedPayload = (config, value, phpType2 = void 0) => JSON.stringify({
  __amlPersisted: true,
  version: Number(config.version || 1),
  savedAt: Date.now(),
  value,
  ...phpType2 ? { phpType: phpType2 } : {},
  ...value && typeof value === "object" ? { phpArray: describeArray(value) } : {}
});
var restoredValue = (root, target, config, serialized, type, stateConfig = null) => {
  const parsed = JSON.parse(serialized);
  const restore = (value2, savedKind = null) => {
    const kind = typeof value2 === "number" && ["integer", "double"].includes(savedKind) ? savedKind : phpType(value2);
    const typed = stateConfig?.typeRules?.[target] ? assignType(stateConfig.typeRules[target], value2, kind, false) : { value: coerce(type, value2), kind: type === "float" && value2 !== null ? "double" : kind };
    if (typeof typed.value === "number" && (!Number.isFinite(typed.value) || typed.kind === "integer" && !Number.isSafeInteger(typed.value))) throw new RangeError("Persisted number cannot be represented safely");
    if (stateConfig?.valueTypes) stateConfig.valueTypes[target] = typed.kind;
    return typed.value;
  };
  if (!parsed || parsed.__amlPersisted !== true) return restore(parsed);
  if (Number(parsed.version) > Number(config.version || 1)) {
    root.dispatchEvent(new CustomEvent("aml:storage-version-newer", { detail: { target, storedVersion: parsed.version, expectedVersion: config.version || 1 } }));
    return void 0;
  }
  if (config.expiresAfter && Date.now() - Number(parsed.savedAt || 0) > Number(config.expiresAfter) * 1e3) {
    root.dispatchEvent(new CustomEvent("aml:storage-expired", { detail: { target } }));
    return void 0;
  }
  restoreArrayMetadata(parsed.value, parsed.phpArray);
  const value = Number(parsed.version) < Number(config.version || 1) ? migrateValue(root, target, parsed.value, parsed.version, config) : parsed.value;
  return value === void 0 ? void 0 : restore(value, Number(parsed.version) === Number(config.version || 1) ? parsed.phpType : null);
};

// src-js/browser-storage.js
var persistState = (root, target, persisted, value, kind) => {
  try {
    const payload = persistedPayload(persisted, value, kind);
    if (persisted.storage === "indexeddb") indexedState("put", persisted.key, payload).catch((error) => root.dispatchEvent(new CustomEvent("aml:storage-error", { detail: { target, error } })));
    else (persisted.storage === "session" ? sessionStorage : localStorage).setItem(persisted.key, payload);
  } catch (error) {
    root.dispatchEvent(new CustomEvent("aml:storage-error", { detail: { target, error } }));
  }
};
var storageListenerInstalled = false;
var installStorageListener = () => {
  if (storageListenerInstalled) return;
  storageListenerInstalled = true;
  addEventListener("storage", (event) => {
    mountedRoots.forEach((root) => {
      const state = rootStates.get(root);
      const config = rootConfigs.get(root) || {};
      Object.entries(config.persisted || {}).forEach(([target, persisted]) => {
        if (persisted.storage !== "local" || persisted.key !== event.key) return;
        try {
          const value = event.newValue === null ? void 0 : restoredValue(root, target, persisted, event.newValue, config.types?.[target]);
          if (value === void 0) return;
          writePath(state, target, value);
          const changes = /* @__PURE__ */ new Map([[target, value]]);
          recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
          scheduleUpdate(root, state, changes);
        } catch (error) {
          root.dispatchEvent(new CustomEvent("aml:storage-error", { detail: { target, error } }));
        }
      });
    });
  });
};
var restorePersisted = (root, state, config) => {
  installStorageListener();
  Object.entries(config.persisted || {}).forEach(([target, persisted]) => {
    if (persisted.storage === "indexeddb") return;
    try {
      const storage = persisted.storage === "session" ? sessionStorage : localStorage;
      const saved = storage.getItem(persisted.key);
      if (saved !== null) {
        const restored = restoredValue(root, target, persisted, saved, config.types?.[target], config);
        if (restored === void 0) storage.removeItem(persisted.key);
        else writePath(state, target, restored);
      }
    } catch (error) {
      root.dispatchEvent(new CustomEvent("aml:storage-error", { detail: { target, error } }));
    }
  });
};
var restoreIndexed = (root, state, config) => Object.entries(config.persisted || {}).filter(([, persisted]) => persisted.storage === "indexeddb").map(async ([target, persisted]) => {
  try {
    const saved = await indexedState("get", persisted.key);
    if (saved === void 0) return;
    const restored = restoredValue(root, target, persisted, saved, config.types?.[target], config);
    if (restored === void 0) await indexedState("delete", persisted.key);
    else {
      writePath(state, target, restored);
      const changes = /* @__PURE__ */ new Map([[target, restored]]);
      recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
      scheduleUpdate(root, state, changes);
    }
  } catch (error) {
    root.dispatchEvent(new CustomEvent("aml:storage-error", { detail: { target, error } }));
  }
});
var restoreContexts = (root, state) => {
  root.querySelectorAll("[data-aml-context-provider]").forEach((provider) => {
    const rule = JSON.parse(provider.dataset.amlContextProvider);
    if (!rule.persist) return;
    try {
      const stored = localStorage.getItem(rule.storageKey || `phpaml.context.${rule.name}`);
      if (stored === null) return;
      const value = JSON.parse(stored);
      if (rule.state) writePath(state, rule.state, value);
      else {
        rule.value = value;
        provider.dataset.amlContextProvider = JSON.stringify(rule);
      }
    } catch (error) {
      root.dispatchEvent(new CustomEvent("aml:context-error", { detail: { name: rule.name, error } }));
    }
  });
};
var persistContext = (root, rule, value) => {
  try {
    localStorage.setItem(rule.storageKey || `phpaml.context.${rule.name}`, JSON.stringify(value));
  } catch (error) {
    root.dispatchEvent(new CustomEvent("aml:context-error", { detail: { name: rule.name, error } }));
  }
};

// phpaml-module:browser
registerModule("browser", "0.1.0-beta.9", { ...browser_api_exports, ...browser_forms_exports, ...browser_storage_exports, ...storage_exports, ...http_exports });
