import {
  assignTarget,
  assignType,
  bindOffsetPattern,
  bindReferenceTarget,
  clone,
  clonePhp,
  coerce,
  declareFunction,
  deletePath,
  destructure,
  destructureReference,
  exceptionFlow,
  foreachEntries,
  ownArray,
  owningTarget,
  pathAffects,
  phpArithmetic,
  phpBool,
  phpDump,
  phpIncrement,
  phpMatches,
  phpString,
  phpType,
  prepareEval,
  readPath,
  recomputeComputed,
  referenceEntries,
  releaseArrays,
  releaseLocalReferences,
  resolveData,
  resolveType,
  restoreArrayMetadata,
  safeSegments,
  serviceRuntime,
  snapshotPhp,
  validatePhpValue,
  validateStateReferences,
  warn,
  withSource,
  writePath
} from "./chunk-AK2NYU3I.js";
import {
  moduleExport,
  prepareInstructionModules,
  prepareModules,
  prepareScopeModules
} from "./chunk-RFV3LKK7.js";

// src-js/context.js
var rootStates = /* @__PURE__ */ new WeakMap();
var rootConfigs = /* @__PURE__ */ new WeakMap();
var mountedRoots = /* @__PURE__ */ new Set();
var sharedState = /* @__PURE__ */ Object.create(null);
var sharedTypes = /* @__PURE__ */ Object.create(null);
var sharedValueTypes = /* @__PURE__ */ Object.create(null);
var rootControllers = /* @__PURE__ */ new WeakMap();
var rootCleanups = /* @__PURE__ */ new WeakMap();
var validationTimers2 = /* @__PURE__ */ new WeakMap();
var validationControllers2 = /* @__PURE__ */ new WeakMap();
var transactions = /* @__PURE__ */ new WeakMap();
var stateHistories = /* @__PURE__ */ new WeakMap();
var pendingBatches = /* @__PURE__ */ new WeakMap();
var pendingEffectOrigins = /* @__PURE__ */ new WeakMap();
var effectRuntimes = /* @__PURE__ */ new WeakMap();
var navigationRuntimes = /* @__PURE__ */ new WeakMap();
var toastTimers2 = /* @__PURE__ */ new WeakMap();

// phpaml-proxy:../browser-storage.js
var persistState = (...args) => moduleExport("browser", "persistState")(...args);
var restorePersisted = (...args) => moduleExport("browser", "restorePersisted", true)?.(...args) ?? null;
var restoreIndexed = (...args) => moduleExport("browser", "restoreIndexed", true)?.(...args) ?? null;
var restoreContexts = (...args) => moduleExport("browser", "restoreContexts", true)?.(...args) ?? null;
var persistContext = (...args) => moduleExport("browser", "persistContext")(...args);

// phpaml-proxy:../animations-runtime.js
var animateIn = (...args) => moduleExport("animations", "animateIn", true)?.(...args) ?? null;
var animateNavigation = (...args) => moduleExport("animations", "animateNavigation")(...args);

// src-js/effects.js
var newEffectRuntime = (id, definition) => ({
  id,
  controllers: /* @__PURE__ */ new Set(),
  debounceTimer: null,
  timer: null,
  listener: null,
  mode: null,
  selfRuns: [],
  disabled: false,
  generation: 0,
  inFlight: false,
  queued: false,
  invoke: null,
  definition,
  hasRun: false,
  lastActivated: 0
});
var eventPayload = (event) => {
  if (!event) return null;
  let detail = null;
  try {
    detail = clone(event.detail ?? null);
  } catch (_) {
  }
  return {
    type: event.type,
    detail,
    key: event.key,
    code: event.code,
    repeat: Boolean(event.repeat),
    button: event.button,
    clientX: event.clientX,
    clientY: event.clientY,
    value: event.target?.value,
    checked: event.target?.checked
  };
};

// src-js/control-flow.js
var controlSignal = (signal) => signal === "break" || signal === "continue" ? { operation: signal, levels: 1 } : signal?.operation === "return" || signal?.operation === "break" || signal?.operation === "continue" ? signal : null;
var outerSignal = (signal) => signal.operation === "return" ? signal : signal.levels === 2 ? signal.operation : { ...signal, levels: signal.levels - 1 };
var iteration = (context2, count, limit) => {
  if (count > limit || --context2.loopBudget.remaining < 0) {
    const error = new RangeError("Frontend loop exceeds its safe iteration limit");
    error.code = "PHP_LOOP_LIMIT";
    throw error;
  }
};
var bind = (bindings, source, sourceKind, state, data) => bindOffsetPattern(
  bindings,
  { value: source, kind: sourceKind },
  (key) => {
    const value = resolveData(key, state, data);
    return { value, kind: resolveType(key, state, data, value) };
  },
  (target, item) => assignTarget(target, item.value, item.kind, state, data),
  data
);
var executeFlow = async (root, state, action, trigger, context2) => {
  const data = context2.eventData;
  const run = (instruction) => execute(root, state, instruction, trigger, context2);
  if (action.type === "try") {
    const flow = exceptionFlow(action, (target, error) => assignTarget(target, error, "object", state, data), data);
    let step = flow.next();
    while (!step.done) {
      try {
        step = flow.next(await run(step.value));
      } catch (error) {
        step = flow.throw(error);
      }
    }
    return step.value;
  }
  if (action.type === "destructure") {
    destructure(action, state, data);
    return;
  }
  if (action.type === "switch") {
    const subject = resolveData(action.value, state, data), kind = resolveType(action.value, state, data, subject);
    let start = -1, fallback = -1;
    for (let index = 0; index < action.cases.length; index++) {
      const branch = action.cases[index];
      if (branch.default) {
        fallback = index;
        continue;
      }
      const candidate = resolveData(branch.value, state, data);
      if (phpMatches("looseEq", subject, candidate, kind, resolveType(branch.value, state, data, candidate))) {
        start = index;
        break;
      }
    }
    if (start < 0) start = fallback;
    for (let index = start; index >= 0 && index < action.cases.length; index++) {
      const signal = controlSignal(await run(action.cases[index].action));
      if (!signal) continue;
      if (signal.operation === "return" || signal.levels > 1) return outerSignal(signal);
      if (signal.operation === "continue") warn(data, "continue targeting switch is equivalent to break; use continue 2 to continue an outer loop");
      break;
    }
    return;
  }
  const limit = Math.max(1, Math.min(1e4, action.limit || 1e3));
  if (action.type === "foreach-local") {
    const patternReference = action.bindings.some((binding) => binding.reference), byReference = action.reference || patternReference;
    const source = byReference ? null : clonePhp(resolveData(action.source, state, data));
    let count2 = 0;
    for (const { key, item, reference } of byReference ? referenceEntries(action.source, state, data, () => iteration(data, ++count2, limit)) : foreachEntries(source, !!action.key, data, () => iteration(data, ++count2, limit))) {
      if (reference && patternReference) destructureReference(action.bindings, reference, state, data);
      else if (reference) bindReferenceTarget(action.bindings[0].target, reference, state, data);
      else bind(action.bindings, item.value, item.kind, state, data);
      if (action.key) assignTarget(action.key, key.value, key.kind, state, data);
      const signal = controlSignal(await run(action.action));
      if (signal?.operation === "return" || signal?.levels > 1) return outerSignal(signal);
      if (signal?.operation === "break") break;
    }
    return;
  }
  await run(action.init);
  let count = 0;
  const condition = () => {
    let result = true;
    for (const item of action.conditions) result = resolveData(item, state, data);
    return phpBool(result);
  };
  while (action.kind === "do" && count === 0 || condition()) {
    iteration(data, ++count, limit);
    const signal = controlSignal(await run(action.action));
    if (signal?.operation === "return" || signal?.levels > 1) return outerSignal(signal);
    if (signal?.operation === "break") break;
    await run(action.update);
  }
};

// phpaml-proxy:../files-runtime.js
var executeFile = (...args) => moduleExport("files", "executeFile")(...args);

// phpaml-proxy:../browser-api.js
var request = (...args) => moduleExport("browser", "request")(...args);

// src-js/core/action-analysis.js
var hasAsyncAction = (action) => {
  if (!action) return false;
  if (action.type === "try") return hasAsyncAction(action.action) || hasAsyncAction(action.finally) || (action.catches || []).some((branch) => hasAsyncAction(branch.action));
  if (action.type === "local-scope") return hasAsyncAction(action.action);
  if (action.type === "api" || action.type === "file") return true;
  if (action.type === "action-state") return hasAsyncAction(action.action);
  if (action.type === "form-state-action") return hasAsyncAction(action.action);
  if (action.type === "sequence" || action.type === "transaction") return (action.actions || []).some(hasAsyncAction);
  if (action.type === "condition") return hasAsyncAction(action.then) || hasAsyncAction(action.otherwise);
  if (action.type === "loop") return [action.init, action.update, action.action].some(hasAsyncAction);
  if (action.type === "switch") return (action.cases || []).some((branch) => hasAsyncAction(branch.action));
  if (action.type === "foreach-local") return hasAsyncAction(action.action);
  if (action.type === "foreach") return hasAsyncAction(action.action);
  return false;
};

// src-js/validation.js
var validateValue = (rules, value) => {
  for (const rule of rules) {
    if (rule.type === "required" && String(value ?? "").trim() === "") return rule.message;
    if (rule.type === "min-length" && String(value ?? "").length > 0 && String(value).length < Number(rule.value)) return rule.message;
    if (rule.type === "email" && String(value ?? "").length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return rule.message;
  }
  return "";
};
var validationMessage = (control) => {
  const rules = JSON.parse(control.dataset.amlValidate || "[]");
  const value = control.type === "checkbox" ? control.checked ? control.value : "" : control.value;
  return validateValue(rules, value);
};

// phpaml-proxy:../browser-forms.js
var preserveForm = (...args) => moduleExport("browser", "preserveForm")(...args);
var restoreForm = (...args) => moduleExport("browser", "restoreForm")(...args);
var validateRemote = (...args) => moduleExport("browser", "validateRemote")(...args);
var scheduleRemoteValidation = (...args) => moduleExport("browser", "scheduleRemoteValidation", true)?.(...args) ?? null;

// src-js/forms-runtime.js
var updateModel = (root, state, control) => {
  const target = control.dataset.amlModel;
  if (!target) return;
  const raw = control.type === "file" ? [...control.files || []].map((file) => ({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified })) : control.type === "checkbox" ? control.checked : control.value;
  const declared = rootConfigs.get(root)?.types?.[target];
  const type = ["int", "float", "bool", "string", "array"].includes(declared) ? declared : control.dataset.amlModelType || (control.type === "checkbox" ? "bool" : control.type === "number" ? "float" : "string");
  const value = coerce(type, raw);
  commit(root, state, target, value);
};
var showValidation = (control, message) => {
  const base = control.dataset.amlModel || control.name || "field";
  const id = `aml-error-${base.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  let error = control.parentElement?.querySelector(`:scope > [data-aml-validation-for="${CSS.escape(base)}"]`);
  control.setAttribute("aria-invalid", message ? "true" : "false");
  if (!message) {
    if (control.getAttribute("aria-describedby") === id) control.removeAttribute("aria-describedby");
    error?.remove();
    return true;
  }
  control.setAttribute("aria-describedby", id);
  if (!error) {
    error = document.createElement("small");
    error.id = id;
    error.dataset.amlValidationFor = base;
    error.setAttribute("role", "alert");
    control.insertAdjacentElement("afterend", error);
  }
  error.textContent = message;
  return false;
};
var validateControl = (control) => showValidation(control, validationMessage(control));
var validateForm = (form) => {
  let valid = true;
  form.querySelectorAll("[data-aml-validate]:not([disabled])").forEach((control) => {
    if (!validateControl(control)) valid = false;
  });
  if (!valid) form.querySelector('[aria-invalid="true"]')?.focus();
  return valid;
};

// src-js/lifecycle.js
var remember = (root, state, reason = "update") => {
  const limit = Math.max(0, Math.min(100, Number.parseInt(root.dataset.amlHistory || "0", 10) || 0));
  if (limit === 0) return;
  const history = stateHistories.get(root) || [];
  history.push({ at: Date.now(), reason, state: clone(state) });
  if (history.length > limit) history.splice(0, history.length - limit);
  stateHistories.set(root, history);
};
var lifecycle = (root, phase, detail = {}) => {
  root.dispatchEvent(new CustomEvent(`aml:${phase}`, { detail }));
  root.querySelectorAll("[data-aml-component]").forEach((component) => {
    component.dispatchEvent(new CustomEvent(`aml:${phase}`, { detail: { ...detail, component: component.dataset.amlComponent } }));
  });
};

// src-js/lifecycle-runtime.js
var formState = (form) => {
  if (!form?.dataset?.amlFormState) return null;
  try {
    return JSON.parse(form.dataset.amlFormState);
  } catch (_) {
    return null;
  }
};
var commitFormState = (root, state, rule, target, value) => {
  const path = rule?.[target];
  if (path && !Object.is(readPath(state, path), value)) commit(root, state, path, value);
};
var updateFormValidityState = (root, state, form, rule) => {
  const valid = form.checkValidity() && !form.querySelector('[aria-invalid="true"]');
  commitFormState(root, state, rule, "valid", valid);
  commitFormState(root, state, rule, "invalid", !valid);
  return valid;
};
var pendingMounts = /* @__PURE__ */ new WeakMap();
var mount = (scope = document) => {
  const roots = [...scope.querySelectorAll("[data-aml-client]")];
  const loading = prepareScopeModules(scope);
  if (!loading) return mountRoots(roots);
  const requests = roots.map((root) => {
    const request2 = { connected: root.isConnected };
    pendingMounts.set(root, request2);
    return [root, request2];
  });
  return loading.then(() => mountRoots(requests.filter(([root, request2]) => {
    if (pendingMounts.get(root) !== request2) return false;
    pendingMounts.delete(root);
    return !request2.connected || root.isConnected;
  }).map(([root]) => root)));
};
var mountRoots = (roots) => {
  roots.forEach((root) => {
    if (root.dataset.amlEngineMounted === "true") return;
    const manifests = [...root.querySelectorAll("template[data-aml-state]")];
    const state = {};
    const config = { shared: {}, persisted: {}, types: {}, typeRules: {}, valueTypes: {}, arrayMetadata: {}, computed: {}, effects: {} };
    manifests.forEach((manifest) => {
      const values = JSON.parse(manifest.dataset.amlState || "{}");
      const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"shared":{},"persisted":{},"types":{},"computed":{},"effects":{}}');
      Object.entries(values).forEach(([target, value]) => {
        if (readPath(state, target) !== void 0) throw new Error(`Duplicate AML state target: ${target}`);
        writePath(state, target, restoreArrayMetadata(value, addition.arrayMetadata?.[target]));
      });
      for (const group of ["shared", "persisted", "types", "typeRules", "valueTypes", "arrayMetadata", "computed", "effects"]) {
        if (group === "effects") Object.keys(addition.effects || {}).forEach((id) => {
          if (Object.prototype.hasOwnProperty.call(config.effects, id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
        });
        Object.assign(config[group], addition[group] || {});
      }
    });
    restorePersisted(root, state, config);
    Object.entries(config.shared || {}).forEach(([target, key]) => {
      const type = config.types?.[target] || "mixed";
      if (sharedTypes[key] && sharedTypes[key] !== type) throw new Error(`Incompatible AML shared state types for ${key}: ${sharedTypes[key]} and ${type}`);
      sharedTypes[key] = type;
      if (Object.prototype.hasOwnProperty.call(sharedState, key)) {
        writePath(state, target, sharedState[key]);
        config.valueTypes[target] = sharedValueTypes[key] || phpType(sharedState[key]);
      } else {
        sharedState[key] = readPath(state, target);
        sharedValueTypes[key] = config.valueTypes[target] || phpType(sharedState[key]);
      }
    });
    restoreContexts(root, state);
    recomputeComputed(root, state, config);
    rootStates.set(root, state);
    config.arrayMetadataApplied = true;
    rootConfigs.set(root, config);
    mountedRoots.add(root);
    rootControllers.set(root, /* @__PURE__ */ new Set());
    rootCleanups.set(root, /* @__PURE__ */ new Set());
    const listen = (type, listener, options) => {
      root.addEventListener(type, listener, options);
      rootCleanups.get(root).add(() => root.removeEventListener(type, listener, options));
    };
    const executeClientEvent = (target, eventName, event = null) => {
      if (!target || !root.contains(target)) return Promise.resolve(false);
      const encoded = target.getAttribute(`data-aml-client-${eventName}`);
      if (!encoded) return Promise.resolve(false);
      let action;
      try {
        action = JSON.parse(encoded);
      } catch (error) {
        root.dispatchEvent(new CustomEvent("aml:error", { detail: { error, event: eventName } }));
        return Promise.reject(error);
      }
      return execute(root, state, action, target, { eventData: eventPayload(event) }).then(() => true).catch((error) => {
        root.dispatchEvent(new CustomEvent("aml:error", { detail: { error, action, event: eventName } }));
        console.error(error);
        return false;
      });
    };
    if (typeof ResizeObserver === "function") {
      const virtualResizeObserver = new ResizeObserver((entries) => {
        if (entries.some((entry) => entry.target.matches?.("[data-aml-virtual-list]"))) renderVirtualLists(root, state);
      });
      root.querySelectorAll("[data-aml-virtual-list]").forEach((list) => virtualResizeObserver.observe(list));
      rootCleanups.get(root).add(() => virtualResizeObserver.disconnect());
    }
    effectRuntimes.set(root, /* @__PURE__ */ new Map());
    stateHistories.set(root, []);
    root.dataset.amlEngineMounted = "true";
    listen("click", async (event) => {
      const stepControl = event.target.closest("[data-aml-step-next],[data-aml-step-previous]");
      if (stepControl && root.contains(stepControl)) {
        event.preventDefault();
        const form = stepControl.closest("[data-aml-multi-step-form]");
        const rule = JSON.parse(form.dataset.amlMultiStepForm);
        const current = Math.max(0, Math.min(Number(rule.count) - 1, Number(readPath(state, rule.state)) || 0));
        if (stepControl.matches("[data-aml-step-next]")) {
          const panel = form.querySelector(`[data-aml-form-step="${current}"]`);
          let valid = true;
          panel?.querySelectorAll("[data-aml-validate]:not([disabled])").forEach((control) => {
            if (!validateControl(control)) valid = false;
          });
          const remote = [...panel?.querySelectorAll("[data-aml-validate-api]:not([disabled])") || []];
          if (valid) valid = (await Promise.all(remote.map((control) => validateRemote(root, state, control)))).every(Boolean);
          if (!valid) {
            panel?.querySelector('[aria-invalid="true"]')?.focus();
            return;
          }
          commit(root, state, rule.state, Math.min(Number(rule.count) - 1, current + 1));
        } else commit(root, state, rule.state, Math.max(0, current - 1));
        return;
      }
      const disclosure = event.target.closest("[data-aml-disclosure-trigger]");
      if (disclosure && root.contains(disclosure)) {
        const rule = JSON.parse(disclosure.dataset.amlDisclosureTrigger);
        commit(root, state, rule.state, !Boolean(readPath(state, rule.state)));
        queueMicrotask(() => {
          const panel = document.getElementById(disclosure.getAttribute("aria-controls"));
          panel?.querySelector('[role="menuitem"],button,a[href],input,[tabindex]:not([tabindex="-1"])')?.focus();
        });
        return;
      }
      root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]').forEach((trigger2) => {
        const panel = document.getElementById(trigger2.getAttribute("aria-controls"));
        if (panel?.contains(event.target)) return;
        const rule = JSON.parse(trigger2.dataset.amlDisclosureTrigger);
        commit(root, state, rule.state, false);
      });
      const selectedMenuItem = event.target.closest('[role="menuitem"]');
      if (selectedMenuItem) {
        const panel = selectedMenuItem.closest("[data-aml-disclosure-panel]");
        const trigger2 = panel && root.querySelector(`[data-aml-disclosure-trigger][aria-controls="${CSS.escape(panel.id)}"]`);
        if (trigger2) {
          const rule = JSON.parse(trigger2.dataset.amlDisclosureTrigger);
          commit(root, state, rule.state, false);
        }
      }
      const themeChoice = event.target.closest("[data-aml-theme-choice]");
      if (themeChoice && root.contains(themeChoice)) {
        const provider = matchingContextProvider(themeChoice, "theme", root);
        if (provider) {
          const rule = JSON.parse(provider.dataset.amlContextProvider);
          const value = themeChoice.dataset.amlThemeChoice;
          if (rule.name === "theme") {
            if (rule.state) commit(root, state, rule.state, value);
            else {
              rule.value = value;
              provider.dataset.amlContextProvider = JSON.stringify(rule);
              renderContexts(root, state);
            }
            root.querySelectorAll("[data-aml-theme-choice]").forEach((choice) => choice.setAttribute("aria-pressed", choice === themeChoice ? "true" : "false"));
            return;
          }
        }
      }
      const accordion = event.target.closest("[data-aml-accordion-trigger]");
      if (accordion && root.contains(accordion)) {
        const rule = JSON.parse(accordion.dataset.amlAccordionTrigger);
        commit(root, state, rule.state, String(readPath(state, rule.state)) === String(rule.value) ? "" : rule.value);
        return;
      }
      const sort = event.target.closest("[data-aml-table-sort]");
      if (sort && root.contains(sort)) {
        const rule = JSON.parse(sort.dataset.amlTableSort);
        const direction = sort.getAttribute("aria-sort") === "ascending" ? "desc" : "asc";
        sort.closest("table")?.querySelectorAll("[data-aml-table-sort]").forEach((header) => header.setAttribute("aria-sort", "none"));
        sort.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
        apply(root, state, { type: "sort-by", target: rule.state, value: { key: rule.key, direction } });
        return;
      }
      const trigger = event.target.closest("[data-aml-client-click]");
      if (!trigger || !root.contains(trigger)) return;
      event.preventDefault();
      const actionForm = trigger.closest("form");
      const action = JSON.parse(trigger.dataset.amlClientClick);
      if (actionForm && action.type !== "form-state-reset" && !validateForm(actionForm)) {
        const rule = formState(actionForm);
        commitFormState(root, state, rule, "submitted", true);
        updateFormValidityState(root, state, actionForm, rule);
        actionForm.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      execute(root, state, action, trigger, { eventData: eventPayload(event) }).catch((error) => {
        root.dispatchEvent(new CustomEvent("aml:error", { detail: { error, action } }));
        console.error(error);
      });
    });
    listen("keydown", (event) => {
      if (event.key === "Escape") {
        const openTriggers = [...root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]')];
        const focusedPanel = document.activeElement?.closest?.("[data-aml-disclosure-panel]");
        const trigger = focusedPanel && openTriggers.find((candidate) => candidate.getAttribute("aria-controls") === focusedPanel.id) || openTriggers.reverse()[0];
        if (trigger) {
          const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
          event.preventDefault();
          commit(root, state, rule.state, false);
          trigger.focus();
          return;
        }
      }
      const menuItem = event.target.closest('[role="menuitem"]');
      if (menuItem && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        const items = [...menuItem.closest('[role="menu"]').querySelectorAll('[role="menuitem"]:not([disabled])')];
        let position = items.indexOf(menuItem);
        if (event.key === "Home") position = 0;
        else if (event.key === "End") position = items.length - 1;
        else position = (position + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        event.preventDefault();
        items[position]?.focus();
        return;
      }
      const disclosureTrigger = event.target.closest("[data-aml-disclosure-trigger]");
      if (disclosureTrigger && event.key === "ArrowDown") {
        event.preventDefault();
        if (disclosureTrigger.getAttribute("aria-expanded") !== "true") disclosureTrigger.click();
        else document.getElementById(disclosureTrigger.getAttribute("aria-controls"))?.querySelector('[role="menuitem"],button,a[href],[tabindex]:not([tabindex="-1"])')?.focus();
        return;
      }
      const openDialog = root.querySelector("dialog[data-aml-modal][open]");
      if (openDialog && event.key === "Tab") {
        const focusable = [...openDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      const sortable = event.target.closest("[data-aml-table-sort]");
      if (sortable && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        sortable.click();
        return;
      }
      const sortableItem = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
      if (sortableItem && event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        const list = sortableItem.parentElement;
        const from = Number(sortableItem.dataset.amlListIndex);
        const to = from + (event.key === "ArrowUp" ? -1 : 1);
        const collection = readPath(state, list.dataset.amlList);
        const length = Array.isArray(collection) ? collection.length : 0;
        if (to >= 0 && to < length) {
          event.preventDefault();
          apply(root, state, { type: "move", target: list.dataset.amlList, value: { from, to } });
          queueMicrotask(() => list.querySelector(`[data-aml-list-index="${to}"]`)?.focus());
          root.dispatchEvent(new CustomEvent("aml:sort", { detail: { state: list.dataset.amlList, from, to, input: "keyboard" } }));
        }
        return;
      }
      executeClientEvent(event.target.closest("[data-aml-client-keydown]"), "keydown", event);
      const tab = event.target.closest("[data-aml-tab]");
      if (!tab || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const tabs = [...tab.closest('[role="tablist"]').querySelectorAll("[data-aml-tab]")];
      let index = tabs.indexOf(tab);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = tabs.length - 1;
      else index = (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[index].focus();
      tabs[index].click();
    });
    listen("keyup", (event) => {
      executeClientEvent(event.target.closest("[data-aml-client-keyup]"), "keyup", event);
    });
    listen("mouseover", (event) => {
      const target = event.target.closest("[data-aml-client-mouseenter]");
      if (target && !target.contains(event.relatedTarget)) executeClientEvent(target, "mouseenter", event);
    });
    listen("mouseout", (event) => {
      const target = event.target.closest("[data-aml-client-mouseleave]");
      if (target && !target.contains(event.relatedTarget)) executeClientEvent(target, "mouseleave", event);
    });
    listen("cancel", (event) => {
      const dialog = event.target.closest("[data-aml-modal]");
      if (!dialog) return;
      event.preventDefault();
      const rule = JSON.parse(dialog.dataset.amlModal);
      commit(root, state, rule.state, false);
    });
    listen("dragstart", (event) => {
      executeClientEvent(event.target.closest("[data-aml-client-dragstart]"), "dragstart", event);
      const item = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
      if (!item || !event.dataTransfer) return;
      const list = item.parentElement;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/x-aml-index", JSON.stringify({ index: Number(item.dataset.amlListIndex), state: list.dataset.amlList }));
      item.setAttribute("aria-grabbed", "true");
    });
    listen("dragend", (event) => {
      event.target.closest('[aria-grabbed="true"]')?.removeAttribute("aria-grabbed");
      executeClientEvent(event.target.closest("[data-aml-client-dragend]"), "dragend", event);
    });
    listen("dragover", (event) => {
      const clientTarget = event.target.closest("[data-aml-client-dragover]");
      if (clientTarget) {
        event.preventDefault();
        executeClientEvent(clientTarget, "dragover", event);
      }
      if (event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]')) event.preventDefault();
    });
    listen("drop", (event) => {
      const clientTarget = event.target.closest("[data-aml-client-drop]");
      if (clientTarget) {
        event.preventDefault();
        executeClientEvent(clientTarget, "drop", event);
      }
      const destination = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
      if (!destination || !event.dataTransfer || !Array.from(event.dataTransfer.types).includes("text/x-aml-index")) return;
      event.preventDefault();
      const list = destination.parentElement;
      let source;
      try {
        source = JSON.parse(event.dataTransfer.getData("text/x-aml-index"));
      } catch (_) {
        return;
      }
      if (!source || source.state !== list.dataset.amlList) return;
      const from = Number(source.index);
      const to = Number(destination.dataset.amlListIndex);
      if (Number.isInteger(from) && Number.isInteger(to)) {
        apply(root, state, { type: "move", target: list.dataset.amlList, value: { from, to } });
        root.dispatchEvent(new CustomEvent("aml:sort", { detail: { state: list.dataset.amlList, from, to, input: "pointer" } }));
      }
    });
    listen("scroll", (event) => {
      if (event.target.matches?.("[data-aml-virtual-list]")) renderVirtualLists(root, state);
    }, true);
    listen("input", (event) => {
      const control = event.target.closest("[data-aml-model]");
      if (control && root.contains(control) && control.type !== "checkbox") {
        updateModel(root, state, control);
        if (control.dataset.amlValidate) validateControl(control);
        scheduleRemoteValidation(root, state, control);
      }
      const preserved = event.target.closest("form[data-aml-form-preserve]");
      if (preserved) preserveForm(preserved);
      const tracked = event.target.closest("form[data-aml-form-state]");
      if (tracked) {
        const rule = formState(tracked);
        commitFormState(root, state, rule, "dirty", true);
        updateFormValidityState(root, state, tracked, rule);
      }
      executeClientEvent(event.target.closest("[data-aml-client-input]"), "input", event);
    });
    listen("change", (event) => {
      const control = event.target.closest("[data-aml-model]");
      if (control && root.contains(control)) {
        updateModel(root, state, control);
        if (control.dataset.amlValidate) validateControl(control);
        scheduleRemoteValidation(root, state, control);
      }
      const preserved = event.target.closest("form[data-aml-form-preserve]");
      if (preserved) preserveForm(preserved);
      const tracked = event.target.closest("form[data-aml-form-state]");
      if (tracked) {
        const rule = formState(tracked);
        commitFormState(root, state, rule, "dirty", true);
        updateFormValidityState(root, state, tracked, rule);
      }
      executeClientEvent(event.target.closest("[data-aml-client-change]"), "change", event);
    });
    listen("focusin", (event) => {
      executeClientEvent(event.target.closest("[data-aml-client-focus]"), "focus", event);
    });
    listen("focusout", (event) => {
      const tracked = event.target.closest("form[data-aml-form-state]");
      if (tracked) {
        const rule = formState(tracked);
        commitFormState(root, state, rule, "touched", true);
        updateFormValidityState(root, state, tracked, rule);
      }
      executeClientEvent(event.target.closest("[data-aml-client-blur]"), "blur", event);
    });
    listen("submit", async (event) => {
      const form = event.target.closest("form");
      if (!form || !root.contains(form)) return;
      if (form.dataset.amlValidationPassed === "true") {
        delete form.dataset.amlValidationPassed;
        return;
      }
      event.preventDefault();
      const rule = formState(form);
      commitFormState(root, state, rule, "submitted", true);
      if (!validateForm(form)) {
        updateFormValidityState(root, state, form, rule);
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      const controls = [...form.querySelectorAll("[data-aml-validate-api]")];
      const valid = (await Promise.all(controls.map((control) => validateRemote(root, state, control)))).every(Boolean);
      updateFormValidityState(root, state, form, rule);
      if (valid) {
        if (form.hasAttribute("data-aml-client-submit")) {
          await executeClientEvent(form, "submit", event);
          return;
        }
        form.dataset.amlValidationPassed = "true";
        form.requestSubmit(event.submitter || void 0);
      }
    });
    const revealTooltip = (event, visible) => {
      const trigger = event.target.closest("[data-aml-tooltip-trigger]");
      if (!trigger || !root.contains(trigger)) return;
      if (!visible && event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return;
      const content = document.getElementById(trigger.getAttribute("aria-describedby"));
      if (content) content.hidden = !visible;
    };
    listen("pointerover", (event) => revealTooltip(event, true));
    listen("pointerout", (event) => revealTooltip(event, false));
    listen("focusin", (event) => revealTooltip(event, true));
    listen("focusout", (event) => revealTooltip(event, false));
    const closeOutsideDisclosures = (event) => root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]').forEach((trigger) => {
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      if (trigger.contains(event.target) || panel?.contains(event.target)) return;
      const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
      commit(root, state, rule.state, false);
    });
    document.addEventListener("click", closeOutsideDisclosures);
    rootCleanups.get(root).add(() => document.removeEventListener("click", closeOutsideDisclosures));
    render(root, state);
    root.querySelectorAll("form[data-aml-form-state]").forEach((form) => {
      updateFormValidityState(root, state, form, formState(form));
    });
    root.querySelectorAll("form[data-aml-form-preserve]").forEach(restoreForm);
    root.querySelectorAll("template[data-aml-redirect]").forEach((redirect) => {
      const rule = JSON.parse(redirect.dataset.amlRedirect);
      queueMicrotask(() => navigate(rule.destination, !rule.replace, root));
    });
    remember(root, state, "mount");
    lifecycle(root, "mount", { state: clone(state) });
    Object.entries(config.effects).forEach(([id, definition]) => effectRuntimes.get(root).set(id, newEffectRuntime(id, definition)));
    const indexedRestores = restoreIndexed(root, state, config) || [];
    Promise.all(indexedRestores).finally(() => {
      if (!rootStates.has(root)) return;
      Object.entries(config.effects).forEach(([id, definition]) => {
        if (definition.runOnMount) activateEffect(root, state, id, definition);
      });
    });
  });
};
var unmount = (root) => {
  if (root) pendingMounts.delete(root);
  if (!root || root.dataset.amlEngineMounted !== "true") return;
  lifecycle(root, "unmount", { state: clone(rootStates.get(root) || {}) });
  effectRuntimes.get(root)?.forEach((_, id) => cleanupEffect(root, id, "unmount"));
  rootControllers.get(root)?.forEach((controller) => controller.abort());
  navigationRuntimes.get(root)?.controller?.abort();
  navigationRuntimes.delete(root);
  root.querySelectorAll("[data-aml-validate-api]").forEach((control) => {
    clearTimeout(validationTimers.get(control));
    validationControllers.get(control)?.abort();
  });
  root.querySelectorAll("[data-aml-toast]").forEach((toast) => clearTimeout(toastTimers.get(toast)));
  rootCleanups.get(root)?.forEach((cleanup) => {
    try {
      cleanup();
    } catch (error) {
      console.error(error);
    }
  });
  rootControllers.delete(root);
  rootCleanups.delete(root);
  effectRuntimes.delete(root);
  rootStates.delete(root);
  rootConfigs.delete(root);
  stateHistories.delete(root);
  mountedRoots.delete(root);
  delete root.dataset.amlEngineMounted;
};
var on = (root, phase, handler) => {
  if (!["mount", "update", "unmount"].includes(phase)) throw new Error(`Unknown AML lifecycle phase: ${phase}`);
  const eventName = `aml:${phase}`;
  root.addEventListener(eventName, handler);
  const dispose = () => root.removeEventListener(eventName, handler);
  const cleanups = rootCleanups.get(root) || /* @__PURE__ */ new Set();
  cleanups.add(dispose);
  rootCleanups.set(root, cleanups);
  if (phase === "mount" && root.dataset.amlEngineMounted === "true") {
    queueMicrotask(() => handler(new CustomEvent(eventName, { detail: { state: clone(rootStates.get(root) || {}) } })));
  }
  return dispose;
};

// src-js/navigation.js
var updateActiveLinks = () => {
  document.querySelectorAll("a[href]").forEach((link) => {
    let url;
    try {
      url = new URL(link.href, location.href);
    } catch (_) {
      return;
    }
    if (url.origin !== location.origin) return;
    const active = url.pathname === location.pathname;
    if (active) link.setAttribute("aria-current", "page");
    else if (link.getAttribute("aria-current") === "page") link.removeAttribute("aria-current");
  });
};
var clearNavigationState = (current) => {
  const boundary = current.querySelector("[data-aml-navigation-boundary]");
  if (!boundary) return;
  boundary.querySelector(":scope > [data-aml-navigation-overlay]")?.remove();
  const content = boundary.querySelector(":scope > [data-aml-navigation-content]");
  content?.removeAttribute("inert");
  content?.removeAttribute("aria-hidden");
};
var showNavigationState = (current, status, message = "", url = location.href, signal = null) => {
  const boundary = current.querySelector("[data-aml-navigation-boundary]");
  if (!boundary) return false;
  boundary.querySelector(":scope > [data-aml-navigation-overlay]")?.remove();
  const template = boundary.querySelector(`:scope > template[data-aml-navigation-state="${status}"]`);
  if (!template) return false;
  const overlay = document.createElement("div");
  overlay.dataset.amlNavigationOverlay = status;
  overlay.setAttribute("role", status === "error" ? "alert" : "status");
  overlay.appendChild(template.content.cloneNode(true));
  const content = boundary.querySelector(":scope > [data-aml-navigation-content]");
  content?.setAttribute("inert", "");
  content?.setAttribute("aria-hidden", "true");
  boundary.appendChild(overlay);
  const live = boundary.querySelector(":scope > [data-aml-navigation-live]");
  if (live) live.textContent = message || status;
  fetch(url, { headers: { "X-AML-Navigation": "true", "X-AML-Navigation-State": status }, signal }).then((response) => response.text()).then(async (html) => {
    if (signal?.aborted || !overlay.isConnected) return;
    const stateDocument = new DOMParser().parseFromString(html, "text/html");
    const stateRoot = stateDocument.querySelector("[data-aml-client]");
    const stateContent = stateDocument.querySelector("[data-aml-navigation-state-content]");
    if (!stateRoot || !stateContent || stateContent.dataset.amlNavigationStateContent !== status) return;
    const modules = prepareScopeModules(stateRoot);
    if (modules) await modules;
    if (signal?.aborted || !overlay.isConnected) return;
    overlay.replaceChildren(document.importNode(stateRoot, true));
    await mount(overlay);
    const target = overlay.querySelector('[data-aml-navigation-focus],h1,[role="alert"],[role="status"]');
    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }).catch((error) => {
    if (error?.name !== "AbortError") current.dispatchEvent(new CustomEvent("aml:navigation-state-error", { detail: { status, error } }));
  });
  return true;
};
var focusNavigatedPage = (url) => {
  if (url.hash) {
    document.querySelector(url.hash)?.scrollIntoView();
    return;
  }
  scrollTo({ top: 0, behavior: "instant" });
  const target = document.querySelector("[data-aml-navigation-focus]") || document.querySelector('main,[role="main"]') || document.querySelector("h1");
  if (!target) return;
  const hadTabIndex = target.hasAttribute("tabindex");
  if (!hadTabIndex) target.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => target.focus({ preventScroll: true }));
  if (!hadTabIndex) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
};
var syncHead = (nextDocument) => {
  document.title = nextDocument.title || document.title;
  const selector = 'meta[name="description"],meta[name="robots"],link[rel="canonical"],meta[property^="og:"],meta[name^="twitter:"]';
  document.head.querySelectorAll(selector).forEach((node) => node.remove());
  nextDocument.head.querySelectorAll(selector).forEach((node) => document.head.appendChild(document.importNode(node, true)));
};
var navigate = async (destination, push = true, sourceRoot = null) => {
  const url = new URL(destination, location.href);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Unsupported AML navigation protocol: ${url.protocol}`);
  if (url.origin !== location.origin) {
    location.href = url.href;
    return;
  }
  const current = sourceRoot?.matches?.("[data-aml-client]") && document.contains(sourceRoot) ? sourceRoot : document.querySelector("[data-aml-client]");
  if (!current) {
    location.href = url.href;
    return;
  }
  const rootIndex = [...document.querySelectorAll("[data-aml-client]")].indexOf(current);
  const previous = navigationRuntimes.get(current);
  previous?.controller?.abort();
  const controller = new AbortController();
  const generation = (previous?.generation || 0) + 1;
  navigationRuntimes.set(current, { controller, generation });
  const active = () => navigationRuntimes.get(current)?.generation === generation && !controller.signal.aborted;
  current.setAttribute("aria-busy", "true");
  showNavigationState(current, "loading", "Loading page", location.href, controller.signal);
  document.dispatchEvent(new CustomEvent("aml:navigation-start", { detail: { url: url.href } }));
  try {
    const response = await fetch(url.href, { headers: { "X-AML-Navigation": "true" }, signal: controller.signal });
    const html = await response.text();
    if (!active()) return;
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    const next = nextDocument.querySelector("[data-aml-client]");
    if (!next) {
      if (response.status === 404 && showNavigationState(current, "not-found", "Page not found", location.href, controller.signal)) {
        current.removeAttribute("aria-busy");
        return;
      }
      throw new Error(`AML navigation failed: ${response.status}`);
    }
    const modules = prepareScopeModules(next), animations = prepareModules(["animations"]);
    if (modules || animations) await Promise.all([modules, animations]);
    if (!active()) return;
    clearNavigationState(current);
    unmount(current);
    current.replaceWith(document.importNode(next, true));
    syncHead(nextDocument);
    if (push) window.history.pushState({ aml: true }, "", url.href);
    else if (location.href !== url.href) window.history.replaceState({ aml: true }, "", url.href);
    mount(document);
    updateActiveLinks();
    focusNavigatedPage(url);
    const mounted = document.querySelectorAll("[data-aml-client]");
    const replacement = mounted[Math.min(Math.max(rootIndex, 0), mounted.length - 1)] || mounted[0];
    animateNavigation(replacement);
    document.dispatchEvent(new CustomEvent("aml:navigation-end", { detail: { url: url.href, status: response.status } }));
  } catch (error) {
    if (error?.name === "AbortError" || !active()) return;
    current.removeAttribute("aria-busy");
    const handled = showNavigationState(current, "error", "Navigation failed", location.href, controller.signal);
    document.dispatchEvent(new CustomEvent("aml:navigation-error", { detail: { url: url.href, error } }));
    if (!handled) throw error;
  } finally {
    if (navigationRuntimes.get(current)?.generation === generation) navigationRuntimes.delete(current);
  }
};
var listenersInstalled = false;
var installNavigationListeners = () => {
  if (listenersInstalled) return;
  listenersInstalled = true;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute("download") || link.target === "_blank" || link.dataset.amlNativeNavigation !== void 0) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    navigate(url.href, true, link.closest("[data-aml-client]")).catch((error) => {
      console.error(error);
      location.href = url.href;
    });
  });
  addEventListener("popstate", () => navigate(location.href, false).catch(() => location.reload()));
};
var context = (root, name, fallback = null) => {
  const providers = [...root.querySelectorAll("[data-aml-context-provider]")];
  const provider = providers.reverse().find((candidate) => JSON.parse(candidate.dataset.amlContextProvider).name === name);
  if (!provider) return fallback;
  try {
    return JSON.parse(provider.dataset.amlContextValue);
  } catch (_) {
    return fallback;
  }
};
var route = () => {
  const url = new URL(location.href);
  const query = {};
  url.searchParams.forEach((value, key) => {
    if (Object.prototype.hasOwnProperty.call(query, key)) query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
    else query[key] = value;
  });
  return Object.freeze({ path: url.pathname, query: Object.freeze(query), hash: url.hash });
};

// src-js/actions-runtime.js
var matches = (state, action, eventData = null) => {
  const current = Object.hasOwn(action, "left") ? resolveData(action.left, state, eventData) : readPath(state, action.state);
  const expected = resolveData(action.value, state, eventData);
  const leftExpression = Object.hasOwn(action, "left") ? action.left : { $state: action.state };
  return phpMatches(action.operator, current, expected, resolveType(leftExpression, state, eventData, current), resolveType(action.value, state, eventData, expected));
};
var execute = async (root, state, action, trigger = null, executionContext = null) => {
  const modules = prepareInstructionModules(action);
  if (modules) {
    const mountedConfig = rootConfigs.get(root);
    await modules;
    if (mountedConfig && rootConfigs.get(root) !== mountedConfig) return false;
  }
  const config = rootConfigs.get(root);
  if (config?.arrayMetadata && !config.arrayMetadataApplied) {
    for (const [target, descriptor] of Object.entries(config.arrayMetadata)) restoreArrayMetadata(readPath(state, target), descriptor);
    config.arrayMetadataApplied = true;
  }
  const source = action.phpSource || executionContext?.eventData?.source;
  const context2 = { ...executionContext || {}, eventData: {
    ...executionContext?.eventData || {},
    stateTypes: config?.types || executionContext?.eventData?.stateTypes || {},
    valueTypes: config?.valueTypes || executionContext?.eventData?.valueTypes || {},
    source,
    loopBudget: executionContext?.eventData?.loopBudget || { remaining: 1e4 },
    builtinBudget: executionContext?.eventData?.builtinBudget || { remaining: 1e6 },
    builtinMemory: executionContext?.eventData?.builtinMemory || {},
    reportWarning: (warning) => {
      root.dispatchEvent(new CustomEvent("aml:warning", { detail: warning }));
      console.warn(warning.message + (warning.source ? ` [PHP ${warning.source.file}:${warning.source.line}]` : ""));
    }
  } };
  context2.eventData.assignState = (target, value, valueType, source2 = context2.eventData.source) => {
    commit(root, state, target, value, { ...context2, eventData: { ...context2.eventData, source: source2 }, valueType });
    const assigned = readPath(state, target);
    return { value: assigned, kind: rootConfigs.get(root)?.valueTypes?.[target] || valueType };
  };
  try {
    return await executeInstruction(root, state, action, trigger, context2);
  } catch (error) {
    throw withSource(error, source);
  }
};
var executeInstruction = async (root, state, action, trigger = null, executionContext = null) => {
  if (action.type === "local-scope") {
    const config = rootConfigs.get(root);
    const services = serviceRuntime(config, action);
    await prepareEval({ ...action, functions: services.functions });
    const evalFunctions = config ? config.evalFunctions ||= {} : {};
    const childContext = { ...executionContext || {}, eventData: {
      ...executionContext?.eventData || {},
      locals: /* @__PURE__ */ Object.create(null),
      localTypes: /* @__PURE__ */ Object.create(null),
      stateTypes: rootConfigs.get(root)?.types || {},
      functions: { ...services.functions, ...evalFunctions },
      evalFunctions,
      classes: services.classes,
      staticFields: services.fields,
      objectBudget: { remaining: 1e4 },
      thisObject: null,
      objectScope: null,
      calledClass: null,
      localReferences: /* @__PURE__ */ Object.create(null),
      callBudget: { depth: 0, remaining: 1e4 },
      functionDeclarations: config?.functionDeclarations || /* @__PURE__ */ new Set(),
      functionDefinitionIds: config?.functionDefinitionIds || /* @__PURE__ */ new Map()
    } };
    if (config) {
      config.functionDeclarations = childContext.eventData.functionDeclarations;
      config.functionDefinitionIds = childContext.eventData.functionDefinitionIds;
    }
    try {
      return await execute(root, state, action.action, trigger, childContext);
    } finally {
      releaseLocalReferences(childContext.eventData);
      releaseArrays(childContext.eventData.locals);
    }
  }
  if (action.type === "local-set") {
    if (!/^v[0-9a-f]+$/.test(action.name) || !executionContext?.eventData?.locals) throw new Error("Invalid frontend local assignment");
    const data = executionContext.eventData;
    const value = resolveData(action.value, state, data);
    const type = resolveType(action.value, state, data, value);
    assignTarget({ $local: action.name }, value, type, state, data);
    return;
  }
  if (action.type === "function-declare") {
    declareFunction(action.id, executionContext.eventData);
    return;
  }
  if (action.type === "return") {
    const value = resolveData(action.value, state, executionContext.eventData);
    return { operation: "return", value, kind: resolveType(action.value, state, executionContext.eventData, value), hasValue: action.hasValue };
  }
  if (action.type === "evaluate") {
    resolveData(action.value, state, executionContext?.eventData);
    return;
  }
  if (action.type === "loop-control") return (action.levels || 1) === 1 ? action.operation : { operation: action.operation, levels: action.levels };
  if (["loop", "switch", "foreach-local", "destructure", "try"].includes(action.type)) {
    if (!transactions.has(root) && !hasAsyncAction(action)) return execute(root, state, { type: "transaction", actions: [action] }, trigger, executionContext);
    return executeFlow(root, state, action, trigger, executionContext);
  }
  if (action.type === "element-ref") {
    const element = root.querySelector(`[data-aml-ref="${CSS.escape(String(action.ref || ""))}"]`);
    if (!element) throw new Error(`Unknown AML element ref: ${action.ref}`);
    if (!["focus", "blur", "select", "play", "pause"].includes(action.operation)) throw new Error(`Unsupported AML ref operation: ${action.operation}`);
    if (typeof element[action.operation] !== "function") throw new Error(`Element ref does not support ${action.operation}`);
    const result = element[action.operation]();
    if (result && typeof result.then === "function") await result;
    return;
  }
  if (action.type === "form-state-reset") {
    const form = trigger?.closest?.("form[data-aml-form-state]");
    form?.reset();
    if (form) queueMicrotask(() => form.querySelectorAll("[data-aml-model]").forEach((control) => updateModel(root, state, control)));
    commit(root, state, action.dirty, false, executionContext);
    commit(root, state, action.touched, false, executionContext);
    commit(root, state, action.valid, true, executionContext);
    commit(root, state, action.invalid, false, executionContext);
    commit(root, state, action.submitting, false, executionContext);
    commit(root, state, action.submitted, false, executionContext);
    commit(root, state, action.error, "", executionContext);
    return;
  }
  if (action.type === "form-state-action") {
    const childContext = executionContext || {};
    commit(root, state, action.submitting, true, executionContext);
    commit(root, state, action.submitted, true, executionContext);
    commit(root, state, action.error, "", executionContext);
    try {
      const result = await execute(root, state, action.action, trigger, childContext);
      if (result?.cancelled) return result;
      root.dispatchEvent(new CustomEvent("aml:form-success", { detail: { action } }));
    } catch (error) {
      commit(root, state, action.error, error?.message || String(error), executionContext);
      root.dispatchEvent(new CustomEvent("aml:form-error", { detail: { action, error } }));
    } finally {
      commit(root, state, action.submitting, false, executionContext);
    }
    return;
  }
  if (action.type === "action-state") {
    const childContext = executionContext || {};
    commit(root, state, action.pending, true, executionContext);
    commit(root, state, action.success, false, executionContext);
    commit(root, state, action.error, "", executionContext);
    try {
      const result = await execute(root, state, action.action, trigger, childContext);
      if (result?.cancelled) return result;
      commit(root, state, action.success, true, executionContext);
      if (action.onSuccess) await execute(root, state, action.onSuccess, trigger, childContext);
      root.dispatchEvent(new CustomEvent("aml:action-success", { detail: { action } }));
    } catch (error) {
      commit(root, state, action.error, error?.message || String(error), executionContext);
      if (action.onError) await execute(root, state, action.onError, trigger, childContext);
      root.dispatchEvent(new CustomEvent("aml:action-error", { detail: { action, error } }));
    } finally {
      commit(root, state, action.pending, false, executionContext);
      if (action.onFinally) await execute(root, state, action.onFinally, trigger, childContext);
    }
    return;
  }
  if (action.type === "transaction") {
    const parent = transactions.get(root);
    const context2 = parent || { changes: /* @__PURE__ */ new Map(), snapshot: snapshotPhp(state), valueTypes: clone(rootConfigs.get(root)?.valueTypes || {}) };
    transactions.set(root, context2);
    try {
      for (const child of action.actions || []) {
        const signal = await execute(root, state, child, trigger, executionContext);
        if (controlSignal(signal)) {
          validateStateReferences(state, rootConfigs.get(root)?.valueTypes || {});
          if (!parent) {
            transactions.delete(root);
            context2.changes.forEach((_, target) => commit(root, state, target, readPath(state, target), { ...executionContext || {}, valueType: rootConfigs.get(root)?.valueTypes?.[target] }));
          }
          return signal;
        }
      }
      validateStateReferences(state, rootConfigs.get(root)?.valueTypes || {});
    } catch (error) {
      if (!parent) {
        transactions.delete(root);
        Object.keys(state).forEach((key) => delete state[key]);
        Object.assign(state, context2.snapshot);
        ownArray(state, "@state", state);
        const config = rootConfigs.get(root);
        if (config) config.valueTypes = context2.valueTypes;
        render(root, state);
        root.dispatchEvent(new CustomEvent("aml:transaction-error", { detail: { error, state: clone(state) } }));
      }
      throw error;
    }
    if (!parent) {
      transactions.delete(root);
      context2.changes.forEach((_, target) => commit(root, state, target, readPath(state, target), { ...executionContext || {}, valueType: rootConfigs.get(root)?.valueTypes?.[target] }));
      queueMicrotask(() => {
        const detail = { changes: Object.fromEntries(context2.changes), state: clone(state) };
        root.dispatchEvent(new CustomEvent("aml:transaction", { detail }));
      });
    }
    return;
  }
  if (action.type === "sequence") {
    if (!transactions.has(root) && !hasAsyncAction(action)) {
      return await execute(root, state, { type: "transaction", actions: action.actions || [] }, trigger, executionContext);
    }
    for (const child of action.actions || []) {
      const signal = await execute(root, state, child, trigger, executionContext);
      if (controlSignal(signal)) return signal;
    }
    return;
  }
  if (action.type === "foreach") {
    const collection = typeof action.source === "string" ? readPath(state, action.source) : resolveData(action.source, state, executionContext?.eventData);
    const entries = Array.isArray(collection) ? collection.map((value, key) => [key, value]) : collection && typeof collection === "object" ? Object.entries(collection) : [];
    const limit = Math.max(1, Math.min(1e4, Number(action.limit || 1e3)));
    if (entries.length > limit) throw new Error(`AML foreach exceeds its safe limit of ${limit} iterations`);
    for (const [key, value] of entries) {
      const childContext = {
        ...executionContext || {},
        eventData: {
          ...executionContext?.eventData || {},
          loop: {
            ...executionContext?.eventData?.loop || {},
            [action.value]: value,
            ...action.key ? { [action.key]: key } : {}
          }
        }
      };
      const signal = await execute(root, state, action.action, trigger, childContext);
      if (signal === "break") break;
      if (signal === "continue") continue;
    }
    return;
  }
  if (action.type === "condition") {
    const selected = matches(state, action, executionContext?.eventData) ? action.then : action.otherwise;
    if (selected) return await execute(root, state, selected, trigger, executionContext);
    return;
  }
  if (action.type === "console") {
    if (action.level === "echo") {
      console.log((action.values || []).map((node) => {
        const value = resolveData(node, state, executionContext.eventData);
        return phpString(value, resolveType(node, state, executionContext.eventData, value), executionContext.eventData);
      }).join(""));
      return;
    }
    if (action.level === "dump") {
      const data = executionContext.eventData;
      const values = (action.values || []).map((node) => {
        const value = resolveData(node, state, data);
        return { value, kind: resolveType(node, state, data, value) };
      });
      console.log(values.map(({ value, kind }) => phpDump(value, kind, 0, void 0, data)).join(""));
      return;
    }
    const method = action.level === "warn" ? "warn" : action.level === "error" ? "error" : "log";
    console[method](...resolveData(action.values || [], state, executionContext?.eventData));
    return;
  }
  if (action.type === "navigate") await navigate(action.destination, !action.replace, root);
  else if (action.type === "api") await request(root, state, action, trigger, executionContext);
  else if (action.type === "file") return await executeFile(root, state, action, trigger, executionContext);
  else apply(root, state, action, executionContext);
};

// src-js/effects-runtime.js
var registerEffect = (root, state, id, definition, mounting = false) => {
  const runtimes = effectRuntimes.get(root);
  if (!runtimes) return;
  if (runtimes.has(id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
  runtimes.set(id, newEffectRuntime(id, definition));
  if (!mounting || definition.runOnMount) activateEffect(root, state, id, definition);
};
var cleanupEffect = (root, id, reason = "rerun") => {
  const runtime = effectRuntimes.get(root)?.get(id);
  if (!runtime) return;
  runtime.generation++;
  if (runtime.debounceTimer) clearTimeout(runtime.debounceTimer);
  if (runtime.timer) runtime.mode === "interval" ? clearInterval(runtime.timer) : clearTimeout(runtime.timer);
  if (runtime.listener) runtime.listener.target.removeEventListener(runtime.listener.event, runtime.listener.handler);
  runtime.controllers.forEach((controller) => controller.abort());
  runtime.controllers.clear();
  runtime.debounceTimer = runtime.timer = runtime.listener = null;
  runtime.queued = false;
  if (runtime.hasRun && runtime.definition.cleanup && rootStates.has(root)) {
    const cleanupAction = runtime.definition.cleanup;
    runtime.hasRun = false;
    execute(root, rootStates.get(root), cleanupAction, null, { owner: runtime, eventData: null }).catch((error) => {
      root.dispatchEvent(new CustomEvent("aml:effect-error", { detail: { id, phase: "cleanup", error } }));
      console.error(error);
    });
  }
  root.dispatchEvent(new CustomEvent("aml:effect-cleanup", { detail: { id, reason } }));
};
var activateEffect = (root, state, id, definition, selfTriggered = false) => {
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
    runtime.selfRuns = selfTriggered ? [...runtime.selfRuns.filter((timestamp) => now - timestamp < 6e4), now] : [];
    const rapidRuns = runtime.selfRuns.filter((timestamp) => now - timestamp < 50).length;
    if (rapidRuns > 25 || runtime.selfRuns.length > 60) {
      runtime.disabled = true;
      cleanupEffect(root, id, "cycle");
      root.dispatchEvent(new CustomEvent("aml:effect-cycle", { detail: { id, rapidLimit: 25, sustainedLimit: 60 } }));
      return;
    }
    const run = (event = null) => {
      const strategy = definition.concurrency || "latest";
      if (runtime.inFlight && strategy === "exhaust") return;
      if (runtime.inFlight && strategy === "queue") {
        runtime.queued = true;
        return;
      }
      if (runtime.inFlight && strategy === "latest") {
        runtime.generation++;
        runtime.controllers.forEach((controller) => controller.abort());
        runtime.controllers.clear();
      }
      const generation = runtime.generation;
      runtime.inFlight = true;
      runtime.hasRun = true;
      root.dispatchEvent(new CustomEvent("aml:effect-run", { detail: { id, mode: definition.mode } }));
      execute(root, state, definition.action, null, { owner: runtime, eventData: eventPayload(event) }).catch((error) => {
        if (error?.name === "AbortError") return;
        root.dispatchEvent(new CustomEvent("aml:effect-error", { detail: { id, error } }));
        console.error(error);
      }).finally(() => {
        if (strategy !== "parallel" && runtime.generation !== generation) return;
        runtime.inFlight = false;
        if (runtime.queued) {
          runtime.queued = false;
          queueMicrotask(run);
        }
      });
    };
    runtime.invoke = run;
    runtime.mode = definition.mode;
    runtime.concurrency = definition.concurrency || "latest";
    if (definition.mode === "timeout") runtime.timer = setTimeout(run, Number(definition.delay));
    else if (definition.mode === "interval") runtime.timer = setInterval(run, Number(definition.delay));
    else if (definition.mode === "listener") {
      const target = definition.target === "window" ? window : document;
      const handler = (event) => run(event);
      target.addEventListener(definition.event, handler);
      runtime.listener = { target, event: definition.event, handler };
    } else run();
  };
  if (Number(definition.debounce || 0) > 0) runtime.debounceTimer = setTimeout(start, Number(definition.debounce));
  else start();
};
var runEffects = (root, state, changedTargets = null, mounting = false, origins = /* @__PURE__ */ new Map()) => {
  const effects = rootConfigs.get(root)?.effects || {};
  Object.entries(effects).forEach(([id, definition]) => {
    if (mounting && !definition.runOnMount) return;
    if (!mounting && (!changedTargets || !(definition.dependencies || []).some((dependency) => changedTargets.some((target) => pathAffects(dependency, target))))) return;
    const selfTriggered = !mounting && changedTargets.some((target) => origins.get(target) === id && (definition.dependencies || []).some((dependency) => pathAffects(dependency, target)));
    activateEffect(root, state, id, definition, selfTriggered);
  });
};

// src-js/rendering.js
var dynamicToken = (key) => {
  let hash = 2166136261;
  for (const character of String(key)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `k${(hash >>> 0).toString(36)}`;
};
var dynamicTarget = (target, token) => {
  const segments = safeSegments(target);
  const property = segments.pop();
  return [...segments, "items", token, property].join(".");
};
var rewriteDynamic = (value, mapping) => {
  if (Array.isArray(value)) return value.map((item) => rewriteDynamic(item, mapping));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteDynamic(item, mapping)]));
  if (typeof value !== "string") return value;
  const source = Object.keys(mapping).sort((a, b) => b.length - a.length).find((path) => value === path || value.startsWith(`${path}.`));
  return source ? mapping[source] + value.slice(source.length) : value;
};
var rewriteDynamicEffectId = (id, mapping) => {
  return rewriteDynamic(id, mapping);
};
var releaseServiceScopes = (root, node) => {
  const scopes = rootConfigs.get(root)?.serviceScopes;
  if (!scopes) return;
  if (node.matches?.("template[data-aml-service-scope]")) scopes.delete(node.dataset.amlServiceScope);
  node.querySelectorAll("template[data-aml-service-scope]").forEach((marker) => scopes.delete(marker.dataset.amlServiceScope));
};
var hydrateDynamicItem = (root, state, node, key) => {
  const token = dynamicToken(key);
  const config = rootConfigs.get(root);
  if (!config) return;
  const mapping = {};
  const dynamicEffects = [];
  const dynamicStateTargets = [];
  node.querySelectorAll("template[data-aml-state]").forEach((manifest) => {
    const values = JSON.parse(manifest.dataset.amlState || "{}");
    Object.keys(values).forEach((target) => {
      mapping[target] = dynamicTarget(target, token);
    });
    const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"effects":{}}');
    Object.keys(addition.effects || {}).forEach((id) => {
      const scope = id.split(".").slice(0, -1).join(".");
      if (scope && !mapping[scope]) mapping[scope] = `${scope}.items.${token}`;
    });
  });
  node.querySelectorAll("template[data-aml-service-scope]").forEach((marker) => {
    const scope = marker.dataset.amlServiceScope;
    mapping[scope] = `${scope}.items.${token}`;
  });
  node.querySelectorAll("[data-aml-file-source]").forEach((input) => {
    const source = input.dataset.amlFileSource;
    mapping[source] = `${source}.items.${token}`;
  });
  if (Object.keys(mapping).length === 0) return;
  node.querySelectorAll("template[data-aml-state]").forEach((manifest) => {
    const values = JSON.parse(manifest.dataset.amlState || "{}");
    const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"shared":{},"persisted":{},"types":{},"computed":{},"effects":{}}');
    const rewrittenValues = {};
    Object.entries(values).forEach(([target, initial]) => {
      const rewritten = mapping[target];
      rewrittenValues[rewritten] = rewriteDynamic(initial, mapping);
      dynamicStateTargets.push(rewritten);
      writePath(state, rewritten, rewrittenValues[rewritten]);
    });
    const rewrittenConfig = { shared: {}, persisted: {}, types: {}, computed: {}, effects: {} };
    for (const group of ["shared", "persisted", "types", "computed", "effects"]) {
      Object.entries(addition[group] || {}).forEach(([target, value]) => {
        const rewritten = group === "effects" ? rewriteDynamicEffectId(target, mapping) : mapping[target] || rewriteDynamic(target, mapping);
        rewrittenConfig[group][rewritten] = rewriteDynamic(value, mapping);
        if (group === "persisted") rewrittenConfig[group][rewritten].key += `.${token}`;
        Object.assign(config[group], rewrittenConfig[group]);
        if (group === "effects") dynamicEffects.push(rewritten);
      });
    }
    manifest.dataset.amlState = JSON.stringify(rewrittenValues);
    manifest.dataset.amlStateConfig = JSON.stringify(rewrittenConfig);
  });
  node.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (!attribute.name.startsWith("data-aml-") || attribute.name === "data-aml-state" || attribute.name === "data-aml-state-config") continue;
      try {
        element.setAttribute(attribute.name, JSON.stringify(rewriteDynamic(JSON.parse(attribute.value), mapping)));
      } catch (_) {
        element.setAttribute(attribute.name, rewriteDynamic(attribute.value, mapping));
      }
    }
  });
  node.dataset.amlDynamicState = JSON.stringify(dynamicStateTargets);
  node.dataset.amlDynamicEffects = JSON.stringify(dynamicEffects);
  recomputeComputed(root, state, config);
  dynamicEffects.forEach((id) => registerEffect(root, state, id, config.effects[id], true));
};
var releaseDynamicItem = (root, state, node) => {
  releaseServiceScopes(root, node);
  const targets = JSON.parse(node.dataset.amlDynamicState || "[]");
  const effects = JSON.parse(node.dataset.amlDynamicEffects || "[]");
  const config = rootConfigs.get(root) || {};
  targets.forEach((target) => {
    deletePath(state, target);
    for (const group of ["shared", "persisted", "types", "computed"]) delete config[group]?.[target];
  });
  effects.forEach((id) => {
    cleanupEffect(root, id, "dynamic-unmount");
    effectRuntimes.get(root)?.delete(id);
    delete config.effects?.[id];
  });
};
var renderRichComponents = (root, state, target = null) => {
  root.querySelectorAll("[data-aml-modal]").forEach((dialog) => {
    const rule = JSON.parse(dialog.dataset.amlModal);
    if (target && !pathAffects(rule.state, target)) return;
    const open = Boolean(readPath(state, rule.state));
    if (open && !dialog.open) {
      dialog.showModal?.();
      animateIn(dialog);
      queueMicrotask(() => dialog.querySelector('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')?.focus());
    } else if (!open && dialog.open) dialog.close?.();
  });
  root.querySelectorAll("[data-aml-tab]").forEach((tab) => {
    const rule = JSON.parse(tab.dataset.amlTab);
    if (target && !pathAffects(rule.state, target)) return;
    const selected = String(readPath(state, rule.state)) === String(rule.value);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  });
  root.querySelectorAll("[data-aml-tab-panel]").forEach((panel) => {
    const rule = JSON.parse(panel.dataset.amlTabPanel);
    if (target && !pathAffects(rule.state, target)) return;
    panel.hidden = String(readPath(state, rule.state)) !== String(rule.value);
  });
  root.querySelectorAll("[data-aml-accordion-trigger]").forEach((trigger) => {
    const rule = JSON.parse(trigger.dataset.amlAccordionTrigger);
    if (target && !pathAffects(rule.state, target)) return;
    const expanded = String(readPath(state, rule.state)) === String(rule.value);
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
    const panel = trigger.parentElement?.querySelector(":scope > [data-aml-accordion-panel]");
    if (panel) panel.hidden = !expanded;
  });
  root.querySelectorAll("[data-aml-toast]").forEach((toast) => {
    const rule = JSON.parse(toast.dataset.amlToast);
    if (target && !pathAffects(rule.state, target)) return;
    const visible = Boolean(readPath(state, rule.state));
    toast.hidden = !visible;
    clearTimeout(toastTimers2.get(toast));
    if (visible) {
      animateIn(toast);
      if (Number(rule.duration) > 0) toastTimers2.set(toast, setTimeout(() => commit(root, state, rule.state, false), Number(rule.duration)));
    }
  });
  root.querySelectorAll("[data-aml-disclosure-trigger]").forEach((trigger) => {
    const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
    if (target && !pathAffects(rule.state, target)) return;
    const open = Boolean(readPath(state, rule.state));
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    const panel = document.getElementById(trigger.getAttribute("aria-controls"));
    if (panel && root.contains(panel)) {
      panel.hidden = !open;
      if (open) animateIn(panel);
    }
  });
  root.querySelectorAll("[data-aml-multi-step-form]").forEach((form) => {
    const rule = JSON.parse(form.dataset.amlMultiStepForm);
    if (target && !pathAffects(rule.state, target)) return;
    const step = Math.max(0, Math.min(Number(rule.count) - 1, Number(readPath(state, rule.state)) || 0));
    if (Number(readPath(state, rule.state)) !== step) writePath(state, rule.state, step);
    form.querySelectorAll("[data-aml-form-step]").forEach((panel) => {
      const active = Number(panel.dataset.amlFormStep) === step;
      panel.setAttribute("aria-current", active ? "step" : "false");
      panel.hidden = !active;
      if (active) panel.removeAttribute("inert");
      else panel.setAttribute("inert", "");
      panel.querySelectorAll("input,select,textarea,button").forEach((control) => {
        if (!active && !control.disabled) {
          control.dataset.amlStepEnabled = "true";
          control.disabled = true;
        } else if (active && control.dataset.amlStepEnabled === "true") {
          control.disabled = false;
          delete control.dataset.amlStepEnabled;
        }
      });
    });
    if (target) queueMicrotask(() => form.querySelector(`[data-aml-form-step="${step}"] h2`)?.focus?.({ preventScroll: true }));
  });
};
var renderVirtualLists = (root, state, target = null) => {
  root.querySelectorAll("[data-aml-virtual-list]").forEach((list) => {
    const rule = JSON.parse(list.dataset.amlVirtualList);
    if (target && !pathAffects(rule.state, target)) return;
    const items = readPath(state, rule.state);
    const content = list.querySelector(":scope > [data-aml-virtual-content]");
    const template = content?.querySelector(":scope > template[data-aml-virtual-template]");
    if (!content || !template) return;
    const rowHeight = Number(rule.rowHeight);
    const overscan = Number(rule.overscan || 0);
    const start = Math.max(0, Math.floor(list.scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(list.clientHeight / rowHeight) + overscan * 2;
    const end = Math.min(Array.isArray(items) ? items.length : 0, start + visible);
    const existing = new Map([...content.children].filter((node) => node !== template && node.dataset.amlVirtualKey !== void 0).map((node) => [node.dataset.amlVirtualKey, node]));
    const fragment = document.createDocumentFragment();
    for (let index = start; index < end; index++) {
      const item = items[index];
      const key = String(readPath(item, rule.key) ?? index);
      const node = existing.get(key) || document.createElement("div");
      const isNew = !node.hasChildNodes();
      existing.delete(key);
      if (isNew) {
        node.appendChild(template.content.cloneNode(true));
        hydrateDynamicItem(root, state, node, key);
        animateIn(node);
      }
      node.querySelectorAll("[data-aml-item-bind]").forEach((binding) => {
        binding.textContent = readPath(item, binding.dataset.amlItemBind) ?? "";
      });
      node.dataset.amlVirtualKey = key;
      node.style.cssText = `position:absolute;left:0;right:0;height:${rowHeight}px;transform:translateY(${index * rowHeight}px)`;
      fragment.appendChild(node);
    }
    existing.forEach((node) => releaseDynamicItem(root, state, node));
    content.replaceChildren(fragment, template);
    content.style.height = `${(Array.isArray(items) ? items.length : 0) * rowHeight}px`;
  });
};
var matchingContextProvider = (node, name, root = null) => {
  let provider = node?.closest?.("[data-aml-context-provider]") || null;
  while (provider) {
    const rule = JSON.parse(provider.dataset.amlContextProvider);
    if (rule.name === name) return provider;
    provider = provider.parentElement?.closest?.("[data-aml-context-provider]") || null;
    if (root && provider && !root.contains(provider)) return null;
  }
  return null;
};
var renderContexts = (root, state, target = null) => {
  root.querySelectorAll("[data-aml-context-provider]").forEach((provider) => {
    const rule = JSON.parse(provider.dataset.amlContextProvider);
    if (target && rule.state && !pathAffects(rule.state, target)) return;
    let value = rule.state ? readPath(state, rule.state) : rule.value;
    if (rule.persist) persistContext(root, rule, value);
    provider.dataset.amlContextValue = JSON.stringify(value);
    provider.querySelectorAll("[data-aml-context-bind]").forEach((binding) => {
      const nearest = matchingContextProvider(binding, binding.dataset.amlContextBind, root);
      if (nearest === provider) {
        binding.textContent = value && typeof value === "object" ? JSON.stringify(value) : value ?? "";
      }
    });
    if (rule.name === "theme") {
      const resolved = value === "system" && typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : value;
      document.documentElement.dataset.theme = String(resolved || "light");
      document.documentElement.style.colorScheme = String(resolved || "light");
      provider.querySelectorAll("[data-aml-theme-choice]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice.dataset.amlThemeChoice === value)));
    }
    if (rule.name === "locale" && typeof value === "string" && /^[a-zA-Z]{2,3}([_-][a-zA-Z0-9]{2,8})*$/.test(value)) {
      document.documentElement.lang = value.replace("_", "-");
    }
  });
};
var render = (scope, state, target = null) => {
  const config = rootConfigs.get(scope) || rootConfigs.get(scope.closest?.("[data-aml-client]")) || {};
  const textContext = { valueTypes: config.valueTypes || {}, stateTypes: config.types || {} };
  scope.querySelectorAll("[data-aml-bind-value]").forEach((node) => {
    const expression = JSON.parse(node.dataset.amlBindValue), context2 = { ...textContext };
    const value = resolveData(expression, state, context2);
    node.textContent = phpString(value, resolveType(expression, state, context2, value), context2);
  });
  scope.querySelectorAll("[data-aml-bind]").forEach((node) => {
    if (target && !pathAffects(node.dataset.amlBind, target)) return;
    const value = readPath(state, node.dataset.amlBind);
    if (node.matches("progress,meter")) {
      node.value = Number(value ?? 0);
    } else if (node.matches("input,textarea,select")) {
      if (node.type === "file") return;
      if (node.type === "checkbox") node.checked = Boolean(value);
      else if (document.activeElement !== node) node.value = value ?? "";
    } else {
      node.textContent = phpString(value, resolveType({ $state: node.dataset.amlBind }, state, textContext, value), textContext);
    }
  });
  scope.querySelectorAll("[data-aml-show-when]").forEach((node) => {
    const rule = JSON.parse(node.dataset.amlShowWhen);
    if (target && !pathAffects(rule.state, target)) return;
    const hidden = readPath(state, rule.state) !== rule.equals;
    node.hidden = hidden;
    if (hidden) node.setAttribute("inert", "");
    else node.removeAttribute("inert");
    node.querySelectorAll("input,select,textarea,button").forEach((control) => {
      if (hidden && !control.disabled) {
        control.dataset.amlConditionEnabled = "true";
        control.disabled = true;
      } else if (!hidden && control.dataset.amlConditionEnabled === "true") {
        control.disabled = false;
        delete control.dataset.amlConditionEnabled;
      }
    });
  });
  scope.querySelectorAll("[data-aml-class-when]").forEach((node) => {
    JSON.parse(node.dataset.amlClassWhen).forEach((rule) => {
      if (target && !pathAffects(rule.state, target)) return;
      node.classList.toggle(rule.class, readPath(state, rule.state) === rule.equals);
    });
  });
  scope.querySelectorAll("[data-aml-disabled-when]").forEach((node) => {
    const rule = JSON.parse(node.dataset.amlDisabledWhen);
    if (target && !pathAffects(rule.state, target)) return;
    const disabled = readPath(state, rule.state) === rule.equals;
    node.disabled = disabled;
    node.setAttribute("aria-disabled", disabled ? "true" : "false");
  });
  scope.querySelectorAll("[data-aml-list]").forEach((list) => {
    if (target && !pathAffects(list.dataset.amlList, target)) return;
    const items = readPath(state, list.dataset.amlList);
    const labelPath = list.dataset.amlListLabel || "";
    const keyPath = list.dataset.amlListKey || "";
    const itemTag = list.dataset.amlListItemTag || "li";
    const template = list.querySelector(":scope > template[data-aml-list-template]");
    const existing = new Map([...list.children].filter((child) => child !== template && child.dataset.amlListKey !== void 0).map((child) => [child.dataset.amlListKey, child]));
    const seenKeys = /* @__PURE__ */ new Set();
    (Array.isArray(items) ? items : []).forEach((item, index) => {
      const label = labelPath ? readPath(item, labelPath) : item;
      const key = keyPath ? readPath(item, keyPath) : index;
      const keyString = String(key ?? index);
      if (seenKeys.has(keyString)) throw new Error(`Duplicate AML collection key: ${keyString}`);
      seenKeys.add(keyString);
      const node = existing.get(keyString) || document.createElement(itemTag);
      const isNew = !node.hasChildNodes();
      existing.delete(keyString);
      if (template && isNew) {
        node.appendChild(template.content.cloneNode(true));
        hydrateDynamicItem(scope, state, node, keyString);
      }
      if (template) {
        node.querySelectorAll("[data-aml-item-bind]").forEach((binding) => {
          binding.textContent = readPath(item, binding.dataset.amlItemBind) ?? "";
        });
      } else node.textContent = label ?? "";
      node.dataset.amlListIndex = String(index);
      node.dataset.amlListKey = keyString;
      if (list.dataset.amlSortable === "true") {
        node.draggable = true;
        node.tabIndex = 0;
        node.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");
      }
      list.appendChild(node);
      if (isNew) animateIn(node);
    });
    existing.forEach((node) => {
      releaseDynamicItem(scope, state, node);
      node.remove();
    });
    if (template) list.appendChild(template);
  });
  scope.querySelectorAll("[data-aml-when]").forEach((container) => {
    const rule = JSON.parse(container.dataset.amlWhen);
    if (target && !pathAffects(rule.state, target)) return;
    const content = container.querySelector(":scope > [data-aml-when-content]");
    const template = readPath(state, rule.state) === rule.equals ? container.querySelector(":scope > template[data-aml-when-then]") : container.querySelector(":scope > template[data-aml-when-else]");
    if (content && template) {
      releaseServiceScopes(scope, content);
      content.replaceChildren(template.content.cloneNode(true));
    }
  });
  renderRichComponents(scope, state, target);
  renderVirtualLists(scope, state);
  renderContexts(scope, state, target);
};

// src-js/state-runtime.js
var scheduleUpdate = (root, state, changes, originEffectId = null) => {
  let pending = pendingBatches.get(root);
  if (!pending) {
    pending = /* @__PURE__ */ new Map();
    pendingBatches.set(root, pending);
    queueMicrotask(() => {
      const batch = pendingBatches.get(root);
      const origins = pendingEffectOrigins.get(root) || /* @__PURE__ */ new Map();
      pendingBatches.delete(root);
      pendingEffectOrigins.delete(root);
      if (!batch || batch.size === 0 || !rootStates.has(root)) return;
      const targets = [...batch.keys()];
      try {
        render(root, state, targets.length === 1 ? targets[0] : null);
      } catch (error) {
        root.dispatchEvent(new CustomEvent("aml:render-error", { detail: { error, changes: Object.fromEntries(batch) } }));
        console.error(error);
        return;
      }
      batch.forEach((value, target) => root.dispatchEvent(new CustomEvent("aml:state", { detail: { target, value } })));
      const detail = { changes: Object.fromEntries(batch), state: clone(state) };
      if (batch.size > 1) root.dispatchEvent(new CustomEvent("aml:batch", { detail }));
      lifecycle(root, "update", detail);
      remember(root, state, batch.size > 1 ? "batch" : targets[0]);
      runEffects(root, state, targets, false, origins);
    });
  }
  changes.forEach((value, target) => pending.set(target, value));
  if (originEffectId) {
    const origins = pendingEffectOrigins.get(root) || /* @__PURE__ */ new Map();
    changes.forEach((_, target) => origins.set(target, originEffectId));
    pendingEffectOrigins.set(root, origins);
  }
};
var commit = (root, state, target, value, executionContext = null) => {
  validatePhpValue(value, executionContext?.valueType || phpType(value));
  if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Frontend state must contain finite floats");
  const config = rootConfigs.get(root) || { shared: {}, persisted: {}, types: {}, computed: {} };
  const data = executionContext?.eventData;
  const typed = assignType(config.typeRules?.[target], value, executionContext?.valueType || phpType(value), data?.source?.strictTypes ?? true, data);
  value = typed.value;
  if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Frontend state must contain finite floats");
  value = clone(value);
  writePath(state, target, value);
  ownArray(state, "@state", state);
  if (config.valueTypes) config.valueTypes[target] = typed.kind;
  const changes = /* @__PURE__ */ new Map([[target, value]]);
  recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
  const transaction = transactions.get(root);
  if (transaction) {
    changes.forEach((changed, name) => transaction.changes.set(name, changed));
    return;
  }
  const persistedTarget = owningTarget(config.persisted, target);
  const persisted = persistedTarget ? config.persisted[persistedTarget] : null;
  if (persisted) persistState(root, persistedTarget, persisted, readPath(state, persistedTarget), config.valueTypes?.[persistedTarget]);
  const sharedTarget = owningTarget(config.shared, target);
  const sharedKey = sharedTarget ? config.shared[sharedTarget] : null;
  if (sharedKey) {
    const sharedValue = readPath(state, sharedTarget);
    sharedState[sharedKey] = sharedValue;
    sharedValueTypes[sharedKey] = config.valueTypes?.[sharedTarget] || phpType(sharedValue);
    mountedRoots.forEach((otherRoot) => {
      if (otherRoot === root) return;
      const otherConfig = rootConfigs.get(otherRoot) || {};
      const otherTarget = Object.keys(otherConfig.shared || {}).find((name) => otherConfig.shared[name] === sharedKey);
      if (!otherTarget) return;
      const otherState = rootStates.get(otherRoot);
      writePath(otherState, otherTarget, sharedValue);
      if (otherConfig.valueTypes) otherConfig.valueTypes[otherTarget] = sharedValueTypes[sharedKey];
      const otherChanges = /* @__PURE__ */ new Map([[otherTarget, sharedValue]]);
      recomputeComputed(otherRoot, otherState, otherConfig, otherTarget).forEach((computed, name) => otherChanges.set(name, computed));
      const otherPersisted = otherConfig.persisted?.[otherTarget];
      if (otherPersisted) persistState(otherRoot, otherTarget, otherPersisted, sharedValue, sharedValueTypes[sharedKey]);
      scheduleUpdate(otherRoot, otherState, otherChanges);
    });
  }
  scheduleUpdate(root, state, changes, (executionContext?.owner || executionContext)?.id);
};
var apply = (scope, state, action, executionContext = null) => {
  if (action.type === "remove-path") {
    const segments = safeSegments(action.target);
    if (segments.length < 2) throw new Error("AML remove-path requires a nested state path");
    const rootTarget = segments.shift();
    const next2 = clone(readPath(state, rootTarget));
    const leaf = segments.pop();
    const parent = segments.reduce((current2, key) => current2?.[key], next2);
    if (Array.isArray(parent) && /^\d+$/.test(leaf)) parent.splice(Number(leaf), 1);
    else if (parent && typeof parent === "object") delete parent[leaf];
    commit(scope, state, rootTarget, next2, executionContext);
    return;
  }
  const current = readPath(state, action.target);
  const value = resolveData(action.value, state, executionContext?.eventData);
  let next, updatedKind;
  if (["increment", "decrement"].includes(action.type) && (value ?? 1) === 1) {
    const updated = phpIncrement(current, resolveType({ $state: action.target }, state, executionContext?.eventData, current), action.type === "increment" ? 1 : -1, executionContext?.eventData);
    next = updated.value;
    updatedKind = updated.kind;
  } else if (action.type === "increment") next = phpArithmetic("add", current, value ?? 1, resolveType({ $state: action.target }, state, executionContext?.eventData, current) === "double", executionContext?.eventData);
  else if (action.type === "decrement") next = phpArithmetic("subtract", current, value ?? 1, resolveType({ $state: action.target }, state, executionContext?.eventData, current) === "double", executionContext?.eventData);
  else if (action.type === "toggle") next = !phpBool(current);
  else if (action.type === "set") next = value;
  else if (action.type === "append") next = [...Array.isArray(current) ? current : [], value];
  else if (action.type === "prepend") next = [value, ...Array.isArray(current) ? current : []];
  else if (action.type === "remove-at") {
    const items = Array.isArray(current) ? current : [];
    const requested = Number(value);
    const index = requested < 0 ? items.length + requested : requested;
    next = items.filter((_, itemIndex) => itemIndex !== index);
  } else if (action.type === "remove-by") next = (Array.isArray(current) ? current : []).filter((item) => readPath(item, value.key) !== value.value);
  else if (action.type === "update-by") next = (Array.isArray(current) ? current : []).map((item) => readPath(item, value.key) === value.value ? { ...item, ...value.changes } : item);
  else if (action.type === "sort-by") next = [...Array.isArray(current) ? current : []].sort((left, right) => {
    const a = readPath(left, value.key);
    const b = readPath(right, value.key);
    const result = typeof a === "string" && typeof b === "string" ? a.localeCompare(b) : a > b ? 1 : a < b ? -1 : 0;
    return value.direction === "desc" ? -result : result;
  });
  else if (action.type === "reverse") next = [...Array.isArray(current) ? current : []].reverse();
  else if (action.type === "filter-by") next = (Array.isArray(current) ? current : []).filter((item) => readPath(item, value.key) === value.value === value.keepMatches);
  else if (action.type === "move") {
    next = [...Array.isArray(current) ? current : []];
    const from = Number(value.from);
    const to = Number(value.to);
    if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < next.length && to >= 0 && to < next.length && from !== to) {
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
    }
  } else if (action.type === "merge") next = { ...current && typeof current === "object" && !Array.isArray(current) ? current : {}, ...value };
  else if (action.type === "clear") next = [];
  else throw new Error(`Unknown AML client action: ${action.type}`);
  const valueType = updatedKind || (action.type === "set" ? resolveType(action.value, state, executionContext?.eventData, next) : ["increment", "decrement"].includes(action.type) && resolveType({ $state: action.target }, state, executionContext?.eventData, current) === "double" ? "double" : phpType(next));
  if (valueType === "integer" && !Number.isSafeInteger(next)) throw new RangeError("Frontend integer exceeds JavaScript safe integer precision");
  commit(scope, state, action.target, next, { ...executionContext || {}, valueType });
};

export {
  rootStates,
  rootConfigs,
  mountedRoots,
  rootControllers,
  rootCleanups,
  validationTimers2 as validationTimers,
  validationControllers2 as validationControllers,
  transactions,
  stateHistories,
  effectRuntimes,
  remember,
  lifecycle,
  scheduleUpdate,
  commit,
  updateActiveLinks,
  navigate,
  installNavigationListeners,
  context,
  route,
  showValidation,
  validateControl,
  cleanupEffect,
  activateEffect,
  runEffects,
  render,
  mount,
  unmount,
  on
};
