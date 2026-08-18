<?php

declare(strict_types=1);

namespace AML\Engine;

final class EngineRuntime
{
    public const VERSION = '0.1.0-beta.2';

    public static function script(?string $nonce = null): string
    {
        if ($nonce !== null && preg_match('/^[A-Za-z0-9+\/_-]{8,256}={0,2}$/', $nonce) !== 1) {
            throw new \InvalidArgumentException('Invalid Content Security Policy nonce.');
        }
        $script = <<<'HTML'
<script data-aml-engine>
(() => {
  if (window.AMLEngine) return;
  const rootStates = new WeakMap();
  const rootConfigs = new WeakMap();
  const mountedRoots = new Set();
  const sharedState = Object.create(null);
  const sharedTypes = Object.create(null);
  const rootControllers = new WeakMap();
  const rootCleanups = new WeakMap();
  const validationTimers = new WeakMap();
  const validationControllers = new WeakMap();
  const transactions = new WeakMap();
  const stateHistories = new WeakMap();
  const pendingBatches = new WeakMap();
  const pendingEffectOrigins = new WeakMap();
  const effectRuntimes = new WeakMap();
  const navigationRuntimes = new WeakMap();
  const toastTimers = new WeakMap();
  const clone = (value) => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  const remember = (root, state, reason = 'update') => {
    const limit = Math.max(0, Math.min(100, Number.parseInt(root.dataset.amlHistory || '0', 10) || 0));
    if (limit === 0) return;
    const history = stateHistories.get(root) || [];
    history.push({at: Date.now(), reason, state: clone(state)});
    if (history.length > limit) history.splice(0, history.length - limit);
    stateHistories.set(root, history);
  };
  const lifecycle = (root, phase, detail = {}) => {
    root.dispatchEvent(new CustomEvent(`aml:${phase}`, {detail}));
    root.querySelectorAll('[data-aml-component]').forEach((component) => {
      component.dispatchEvent(new CustomEvent(`aml:${phase}`, {detail: {...detail, component: component.dataset.amlComponent}}));
    });
  };
  const updated = (root, target, value) => {
    root.dispatchEvent(new CustomEvent('aml:state', {detail: {target, value}}));
    lifecycle(root, 'update', {target, value});
  };
  const safeSegments = (path) => {
    const segments = String(path).split('.');
    if (!segments.length || segments.some((segment, index) => !((index === 0 ? /^[a-zA-Z_][a-zA-Z0-9_-]*$/ : /^(?:[a-zA-Z_][a-zA-Z0-9_-]*|\d+)$/).test(segment)) || ['__proto__', 'prototype', 'constructor'].includes(segment.toLowerCase()))) {
      throw new Error(`Unsafe AML state path: ${path}`);
    }
    return segments;
  };
  const readPath = (state, path) => safeSegments(path).reduce((value, key) => value?.[key], state);
  const writePath = (state, path, value) => {
    const keys = safeSegments(path);
    const leaf = keys.pop();
    const parent = keys.reduce((current, key) => current[key] ??= {}, state);
    parent[leaf] = value;
  };
  const pathAffects = (binding, target) => binding === target || binding.startsWith(`${target}.`) || target.startsWith(`${binding}.`);
  const owningTarget = (group, target) => Object.keys(group || {})
    .sort((left, right) => right.length - left.length)
    .find((candidate) => target === candidate || target.startsWith(`${candidate}.`));
  const computedValue = (rule, state) => {
    const values = (rule.dependencies || []).map((dependency) => readPath(state, dependency));
    if (rule.operation === 'sum') return values.reduce((total, value) => total + Number(value || 0), 0);
    if (rule.operation === 'count') return Array.isArray(values[0]) || typeof values[0] === 'string' ? values[0].length : (values[0] && typeof values[0] === 'object' ? Object.keys(values[0]).length : 0);
    if (rule.operation === 'all') return values.every(Boolean);
    if (rule.operation === 'any') return values.some(Boolean);
    return values.map((value) => value ?? '').join(rule.separator || '');
  };
  const recomputeComputed = (root, state, config, changedTarget = null) => {
    const changes = new Map();
    let unstable = false;
    for (let pass = 0; pass < 20; pass++) {
      let passChanged = false;
      Object.entries(config.computed || {}).forEach(([target, rule]) => {
        if (changedTarget && !rule.dependencies.some((dependency) => pathAffects(dependency, changedTarget)) && ![...changes.keys()].some((dependency) => rule.dependencies.some((item) => pathAffects(item, dependency)))) return;
        const next = computedValue(rule, state);
        if (Object.is(readPath(state, target), next)) return;
        writePath(state, target, next);
        changes.set(target, next);
        passChanged = true;
      });
      if (!passChanged) { unstable = false; break; }
      unstable = pass === 19;
    }
    if (unstable && root) root.dispatchEvent(new CustomEvent('aml:reactivity-error', {detail: {reason: 'computed-cycle'}}));
    return changes;
  };
  const coerce = (type, value) => {
    if (type === 'int') return value === '' ? 0 : Number.parseInt(value, 10);
    if (type === 'float') return value === '' ? 0 : Number.parseFloat(value);
    if (type === 'bool') return value === true || value === 1 || value === '1' || value === 'true';
    if (type === 'string') return value == null ? '' : String(value);
    if (type === 'array') return Array.isArray(value) || (value && typeof value === 'object') ? value : [];
    return value;
  };
  const deletePath = (state, path) => {
    const keys = safeSegments(path); const leaf = keys.pop();
    const parent = keys.reduce((current, key) => current?.[key], state);
    if (parent && typeof parent === 'object') delete parent[leaf];
  };
  const migrateValue = (root, target, value, storedVersion, config) => {
    let migrated = clone(value);
    for (let version = Number(storedVersion) + 1; version <= Number(config.version || 1); version++) {
      const migration = config.migrations?.[version] || config.migrations?.[String(version)];
      if (!migration) {
        root.dispatchEvent(new CustomEvent('aml:storage-migration-required', {detail: {target, storedVersion, expectedVersion: config.version || 1, missingVersion: version}}));
        return undefined;
      }
      Object.entries(migration.rename || {}).forEach(([from, to]) => {
        const previous = readPath(migrated, from);
        if (previous !== undefined) { writePath(migrated, to, previous); deletePath(migrated, from); }
      });
      Object.entries(migration.defaults || {}).forEach(([path, fallback]) => {
        if (readPath(migrated, path) === undefined) writePath(migrated, path, fallback);
      });
      (migration.remove || []).forEach((path) => deletePath(migrated, path));
    }
    root.dispatchEvent(new CustomEvent('aml:storage-migrated', {detail: {target, from: storedVersion, to: config.version || 1}}));
    return migrated;
  };
  const openStateDatabase = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('phpaml-engine', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const indexedState = async (operation, key, value = undefined) => {
    const database = await openStateDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction('state', operation === 'get' ? 'readonly' : 'readwrite');
        const store = transaction.objectStore('state');
        const request = operation === 'get' ? store.get(key) : (operation === 'delete' ? store.delete(key) : store.put(value, key));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally { database.close(); }
  };
  const persistedPayload = (config, value) => JSON.stringify({
    __amlPersisted: true,
    version: Number(config.version || 1),
    savedAt: Date.now(),
    value,
  });
  const restoredValue = (root, target, config, serialized, type) => {
    const parsed = JSON.parse(serialized);
    if (!parsed || parsed.__amlPersisted !== true) return coerce(type, parsed);
    if (Number(parsed.version) > Number(config.version || 1)) {
      root.dispatchEvent(new CustomEvent('aml:storage-version-newer', {detail: {target, storedVersion: parsed.version, expectedVersion: config.version || 1}}));
      return undefined;
    }
    if (config.expiresAfter && Date.now() - Number(parsed.savedAt || 0) > Number(config.expiresAfter) * 1000) {
      root.dispatchEvent(new CustomEvent('aml:storage-expired', {detail: {target}}));
      return undefined;
    }
    const value = Number(parsed.version) < Number(config.version || 1)
      ? migrateValue(root, target, parsed.value, parsed.version, config)
      : parsed.value;
    return value === undefined ? undefined : coerce(type, value);
  };
  const dynamicToken = (key) => {
    let hash = 2166136261;
    for (const character of String(key)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return `k${(hash >>> 0).toString(36)}`;
  };
  const dynamicTarget = (target, token) => {
    const segments = safeSegments(target); const property = segments.pop();
    return [...segments, 'items', token, property].join('.');
  };
  const rewriteDynamic = (value, mapping) => {
    if (Array.isArray(value)) return value.map((item) => rewriteDynamic(item, mapping));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteDynamic(item, mapping)]));
    if (typeof value !== 'string') return value;
    const source = Object.keys(mapping).sort((a, b) => b.length - a.length).find((path) => value === path || value.startsWith(`${path}.`));
    return source ? mapping[source] + value.slice(source.length) : value;
  };
  const rewriteDynamicEffectId = (id, mapping) => {
    return rewriteDynamic(id, mapping);
  };
  const hydrateDynamicItem = (root, state, node, key) => {
    const token = dynamicToken(key);
    const config = rootConfigs.get(root);
    if (!config) return;
    const mapping = {};
    const dynamicEffects = [];
    const dynamicStateTargets = [];
    node.querySelectorAll('template[data-aml-state]').forEach((manifest) => {
      const values = JSON.parse(manifest.dataset.amlState || '{}');
      Object.keys(values).forEach((target) => { mapping[target] = dynamicTarget(target, token); });
      const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"effects":{}}');
      Object.keys(addition.effects || {}).forEach((id) => {
        const scope = id.split('.').slice(0, -1).join('.');
        if (scope && !mapping[scope]) mapping[scope] = `${scope}.items.${token}`;
      });
    });
    if (Object.keys(mapping).length === 0) return;
    node.querySelectorAll('template[data-aml-state]').forEach((manifest) => {
      const values = JSON.parse(manifest.dataset.amlState || '{}');
      const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"shared":{},"persisted":{},"types":{},"computed":{},"effects":{}}');
      const rewrittenValues = {};
      Object.entries(values).forEach(([target, initial]) => {
        const rewritten = mapping[target];
        rewrittenValues[rewritten] = rewriteDynamic(initial, mapping);
        dynamicStateTargets.push(rewritten);
        writePath(state, rewritten, rewrittenValues[rewritten]);
      });
      const rewrittenConfig = {shared: {}, persisted: {}, types: {}, computed: {}, effects: {}};
      for (const group of ['shared', 'persisted', 'types', 'computed', 'effects']) {
        Object.entries(addition[group] || {}).forEach(([target, value]) => {
          const rewritten = group === 'effects' ? rewriteDynamicEffectId(target, mapping) : (mapping[target] || rewriteDynamic(target, mapping));
          rewrittenConfig[group][rewritten] = rewriteDynamic(value, mapping);
          if (group === 'persisted') rewrittenConfig[group][rewritten].key += `.${token}`;
          Object.assign(config[group], rewrittenConfig[group]);
          if (group === 'effects') dynamicEffects.push(rewritten);
        });
      }
      manifest.dataset.amlState = JSON.stringify(rewrittenValues);
      manifest.dataset.amlStateConfig = JSON.stringify(rewrittenConfig);
    });
    node.querySelectorAll('*').forEach((element) => {
      for (const attribute of [...element.attributes]) {
        if (!attribute.name.startsWith('data-aml-') || attribute.name === 'data-aml-state' || attribute.name === 'data-aml-state-config') continue;
        try { element.setAttribute(attribute.name, JSON.stringify(rewriteDynamic(JSON.parse(attribute.value), mapping))); }
        catch (_) { element.setAttribute(attribute.name, rewriteDynamic(attribute.value, mapping)); }
      }
    });
    node.dataset.amlDynamicState = JSON.stringify(dynamicStateTargets);
    node.dataset.amlDynamicEffects = JSON.stringify(dynamicEffects);
    recomputeComputed(root, state, config);
    dynamicEffects.forEach((id) => registerEffect(root, state, id, config.effects[id], true));
  };
  const releaseDynamicItem = (root, state, node) => {
    const targets = JSON.parse(node.dataset.amlDynamicState || '[]');
    const effects = JSON.parse(node.dataset.amlDynamicEffects || '[]');
    const config = rootConfigs.get(root) || {};
    targets.forEach((target) => {
      deletePath(state, target);
      for (const group of ['shared', 'persisted', 'types', 'computed']) delete config[group]?.[target];
    });
    effects.forEach((id) => {
      cleanupEffect(root, id, 'dynamic-unmount');
      effectRuntimes.get(root)?.delete(id);
      delete config.effects?.[id];
    });
  };
  const animateIn = (node) => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const source = node.closest('[data-aml-transition]') || (node.matches?.('[data-aml-transition]') ? node : null);
    if (!source || typeof node.animate !== 'function') return;
    const duration = Number(source.dataset.amlTransitionDuration || 180);
    const name = source.dataset.amlTransition || 'fade';
    const from = name === 'slide' ? {opacity: 0, transform: 'translateY(10px)'}
      : (name === 'scale' ? {opacity: 0, transform: 'scale(.97)'} : {opacity: 0});
    node.animate([from, {opacity: 1, transform: 'none'}], {duration, easing: 'ease-out'});
  };
  const renderRichComponents = (root, state, target = null) => {
    root.querySelectorAll('[data-aml-modal]').forEach((dialog) => {
      const rule = JSON.parse(dialog.dataset.amlModal);
      if (target && !pathAffects(rule.state, target)) return;
      const open = Boolean(readPath(state, rule.state));
      if (open && !dialog.open) {
        dialog.showModal?.(); animateIn(dialog);
        queueMicrotask(() => dialog.querySelector('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')?.focus());
      }
      else if (!open && dialog.open) dialog.close?.();
    });
    root.querySelectorAll('[data-aml-tab]').forEach((tab) => {
      const rule = JSON.parse(tab.dataset.amlTab);
      if (target && !pathAffects(rule.state, target)) return;
      const selected = String(readPath(state, rule.state)) === String(rule.value);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    });
    root.querySelectorAll('[data-aml-tab-panel]').forEach((panel) => {
      const rule = JSON.parse(panel.dataset.amlTabPanel);
      if (target && !pathAffects(rule.state, target)) return;
      panel.hidden = String(readPath(state, rule.state)) !== String(rule.value);
    });
    root.querySelectorAll('[data-aml-accordion-trigger]').forEach((trigger) => {
      const rule = JSON.parse(trigger.dataset.amlAccordionTrigger);
      if (target && !pathAffects(rule.state, target)) return;
      const expanded = String(readPath(state, rule.state)) === String(rule.value);
      trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      const panel = trigger.parentElement?.querySelector(':scope > [data-aml-accordion-panel]');
      if (panel) panel.hidden = !expanded;
    });
    root.querySelectorAll('[data-aml-toast]').forEach((toast) => {
      const rule = JSON.parse(toast.dataset.amlToast);
      if (target && !pathAffects(rule.state, target)) return;
      const visible = Boolean(readPath(state, rule.state));
      toast.hidden = !visible;
      clearTimeout(toastTimers.get(toast));
      if (visible) {
        animateIn(toast);
        if (Number(rule.duration) > 0) toastTimers.set(toast, setTimeout(() => commit(root, state, rule.state, false), Number(rule.duration)));
      }
    });
    root.querySelectorAll('[data-aml-disclosure-trigger]').forEach((trigger) => {
      const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
      if (target && !pathAffects(rule.state, target)) return;
      const open = Boolean(readPath(state, rule.state));
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (panel && root.contains(panel)) { panel.hidden = !open; if (open) animateIn(panel); }
    });
    root.querySelectorAll('[data-aml-multi-step-form]').forEach((form) => {
      const rule = JSON.parse(form.dataset.amlMultiStepForm);
      if (target && !pathAffects(rule.state, target)) return;
      const step = Math.max(0, Math.min(Number(rule.count) - 1, Number(readPath(state, rule.state)) || 0));
      if (Number(readPath(state, rule.state)) !== step) writePath(state, rule.state, step);
      form.querySelectorAll('[data-aml-form-step]').forEach((panel) => {
        const active = Number(panel.dataset.amlFormStep) === step;
        panel.setAttribute('aria-current', active ? 'step' : 'false'); panel.hidden = !active;
        if (active) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
        panel.querySelectorAll('input,select,textarea,button').forEach((control) => {
          if (!active && !control.disabled) { control.dataset.amlStepEnabled = 'true'; control.disabled = true; }
          else if (active && control.dataset.amlStepEnabled === 'true') { control.disabled = false; delete control.dataset.amlStepEnabled; }
        });
      });
      if (target) queueMicrotask(() => form.querySelector(`[data-aml-form-step="${step}"] h2`)?.focus?.({preventScroll: true}));
    });
  };
  const renderVirtualLists = (root, state, target = null) => {
    root.querySelectorAll('[data-aml-virtual-list]').forEach((list) => {
      const rule = JSON.parse(list.dataset.amlVirtualList);
      if (target && !pathAffects(rule.state, target)) return;
      const items = readPath(state, rule.state);
      const content = list.querySelector(':scope > [data-aml-virtual-content]');
      const template = content?.querySelector(':scope > template[data-aml-virtual-template]');
      if (!content || !template) return;
      const rowHeight = Number(rule.rowHeight); const overscan = Number(rule.overscan || 0);
      const start = Math.max(0, Math.floor(list.scrollTop / rowHeight) - overscan);
      const visible = Math.ceil(list.clientHeight / rowHeight) + overscan * 2;
      const end = Math.min(Array.isArray(items) ? items.length : 0, start + visible);
      const existing = new Map([...content.children].filter((node) => node !== template && node.dataset.amlVirtualKey !== undefined).map((node) => [node.dataset.amlVirtualKey, node]));
      const fragment = document.createDocumentFragment();
      for (let index = start; index < end; index++) {
        const item = items[index]; const key = String(readPath(item, rule.key) ?? index);
        const node = existing.get(key) || document.createElement('div');
        const isNew = !node.hasChildNodes(); existing.delete(key);
        if (isNew) { node.appendChild(template.content.cloneNode(true)); hydrateDynamicItem(root, state, node, key); animateIn(node); }
        node.querySelectorAll('[data-aml-item-bind]').forEach((binding) => { binding.textContent = readPath(item, binding.dataset.amlItemBind) ?? ''; });
        node.dataset.amlVirtualKey = key;
        node.style.cssText = `position:absolute;left:0;right:0;height:${rowHeight}px;transform:translateY(${index * rowHeight}px)`;
        fragment.appendChild(node);
      }
      existing.forEach((node) => releaseDynamicItem(root, state, node));
      content.replaceChildren(fragment, template);
      content.style.height = `${(Array.isArray(items) ? items.length : 0) * rowHeight}px`;
    });
  };
  const matchingContextProvider = (node, name, root = null) => {
    let provider = node?.closest?.('[data-aml-context-provider]') || null;
    while (provider) {
      const rule = JSON.parse(provider.dataset.amlContextProvider);
      if (rule.name === name) return provider;
      provider = provider.parentElement?.closest?.('[data-aml-context-provider]') || null;
      if (root && provider && !root.contains(provider)) return null;
    }
    return null;
  };
  const restoreContexts = (root, state) => {
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
  const renderContexts = (root, state, target = null) => {
    root.querySelectorAll('[data-aml-context-provider]').forEach((provider) => {
      const rule = JSON.parse(provider.dataset.amlContextProvider);
      if (target && rule.state && !pathAffects(rule.state, target)) return;
      let value = rule.state ? readPath(state, rule.state) : rule.value;
      if (rule.persist) {
        try {
          localStorage.setItem(rule.storageKey || `phpaml.context.${rule.name}`, JSON.stringify(value));
        } catch (error) { root.dispatchEvent(new CustomEvent('aml:context-error', {detail: {name: rule.name, error}})); }
      }
      provider.dataset.amlContextValue = JSON.stringify(value);
      provider.querySelectorAll('[data-aml-context-bind]').forEach((binding) => {
        const nearest = matchingContextProvider(binding, binding.dataset.amlContextBind, root);
        if (nearest === provider) {
          binding.textContent = value && typeof value === 'object' ? JSON.stringify(value) : (value ?? '');
        }
      });
      if (rule.name === 'theme') {
        const resolved = value === 'system' && typeof matchMedia === 'function'
          ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value;
        document.documentElement.dataset.theme = String(resolved || 'light');
        document.documentElement.style.colorScheme = String(resolved || 'light');
        provider.querySelectorAll('[data-aml-theme-choice]').forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.amlThemeChoice === value)));
      }
      if (rule.name === 'locale' && typeof value === 'string' && /^[a-zA-Z]{2,3}([_-][a-zA-Z0-9]{2,8})*$/.test(value)) {
        document.documentElement.lang = value.replace('_', '-');
      }
    });
  };
  const render = (scope, state, target = null) => {
    scope.querySelectorAll('[data-aml-bind]').forEach((node) => {
      if (target && !pathAffects(node.dataset.amlBind, target)) return;
      const value = readPath(state, node.dataset.amlBind);
      if (node.matches('input,textarea,select')) {
        if (node.type === 'checkbox') node.checked = Boolean(value);
        else if (document.activeElement !== node) node.value = value ?? '';
      } else {
        node.textContent = value ?? '';
      }
    });
    scope.querySelectorAll('[data-aml-show-when]').forEach((node) => {
      const rule = JSON.parse(node.dataset.amlShowWhen);
      if (target && !pathAffects(rule.state, target)) return;
      const hidden = readPath(state, rule.state) !== rule.equals;
      node.hidden = hidden;
      if (hidden) node.setAttribute('inert', ''); else node.removeAttribute('inert');
      node.querySelectorAll('input,select,textarea,button').forEach((control) => {
        if (hidden && !control.disabled) { control.dataset.amlConditionEnabled = 'true'; control.disabled = true; }
        else if (!hidden && control.dataset.amlConditionEnabled === 'true') { control.disabled = false; delete control.dataset.amlConditionEnabled; }
      });
    });
    scope.querySelectorAll('[data-aml-class-when]').forEach((node) => {
      JSON.parse(node.dataset.amlClassWhen).forEach((rule) => {
        if (target && !pathAffects(rule.state, target)) return;
        node.classList.toggle(rule.class, readPath(state, rule.state) === rule.equals);
      });
    });
    scope.querySelectorAll('[data-aml-disabled-when]').forEach((node) => {
      const rule = JSON.parse(node.dataset.amlDisabledWhen);
      if (target && !pathAffects(rule.state, target)) return;
      const disabled = readPath(state, rule.state) === rule.equals;
      node.disabled = disabled;
      node.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
    scope.querySelectorAll('[data-aml-list]').forEach((list) => {
      if (target && !pathAffects(list.dataset.amlList, target)) return;
      const items = readPath(state, list.dataset.amlList);
      const labelPath = list.dataset.amlListLabel || '';
      const keyPath = list.dataset.amlListKey || '';
      const itemTag = list.dataset.amlListItemTag || 'li';
      const template = list.querySelector(':scope > template[data-aml-list-template]');
      const existing = new Map([...list.children]
        .filter((child) => child !== template && child.dataset.amlListKey !== undefined)
        .map((child) => [child.dataset.amlListKey, child]));
      const seenKeys = new Set();
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
          node.querySelectorAll('[data-aml-item-bind]').forEach((binding) => {
            binding.textContent = readPath(item, binding.dataset.amlItemBind) ?? '';
          });
        } else node.textContent = label ?? '';
        node.dataset.amlListIndex = String(index);
        node.dataset.amlListKey = keyString;
        if (list.dataset.amlSortable === 'true') {
          node.draggable = true; node.tabIndex = 0;
          node.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
        }
        list.appendChild(node);
        if (isNew) animateIn(node);
      });
      existing.forEach((node) => { releaseDynamicItem(scope, state, node); node.remove(); });
      if (template) list.appendChild(template);
    });
    scope.querySelectorAll('[data-aml-when]').forEach((container) => {
      const rule = JSON.parse(container.dataset.amlWhen);
      if (target && !pathAffects(rule.state, target)) return;
      const content = container.querySelector(':scope > [data-aml-when-content]');
      const template = readPath(state, rule.state) === rule.equals
        ? container.querySelector(':scope > template[data-aml-when-then]')
        : container.querySelector(':scope > template[data-aml-when-else]');
      if (content && template) content.replaceChildren(template.content.cloneNode(true));
    });
    renderRichComponents(scope, state, target);
    renderVirtualLists(scope, state);
    renderContexts(scope, state, target);
  };
  const newEffectRuntime = (id, definition) => ({
    id, controllers: new Set(), debounceTimer: null, timer: null, listener: null,
    mode: null, selfRuns: [], disabled: false, generation: 0, inFlight: false,
    queued: false, invoke: null, definition, hasRun: false, lastActivated: 0,
  });
  const registerEffect = (root, state, id, definition, mounting = false) => {
    const runtimes = effectRuntimes.get(root);
    if (!runtimes) return;
    if (runtimes.has(id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
    runtimes.set(id, newEffectRuntime(id, definition));
    if (!mounting || definition.runOnMount) activateEffect(root, state, id, definition);
  };
  const cleanupEffect = (root, id, reason = 'rerun') => {
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
  const activateEffect = (root, state, id, definition, selfTriggered = false) => {
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
      const eventPayload = (event) => {
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
  const runEffects = (root, state, changedTargets = null, mounting = false, origins = new Map()) => {
    const effects = rootConfigs.get(root)?.effects || {};
    Object.entries(effects).forEach(([id, definition]) => {
      if (mounting && !definition.runOnMount) return;
      if (!mounting && (!changedTargets || !(definition.dependencies || []).some((dependency) => changedTargets.some((target) => pathAffects(dependency, target))))) return;
      const selfTriggered = !mounting && changedTargets.some((target) => origins.get(target) === id && (definition.dependencies || []).some((dependency) => pathAffects(dependency, target)));
      activateEffect(root, state, id, definition, selfTriggered);
    });
  };
  const scheduleUpdate = (root, state, changes, originEffectId = null) => {
    let pending = pendingBatches.get(root);
    if (!pending) {
      pending = new Map();
      pendingBatches.set(root, pending);
      queueMicrotask(() => {
        const batch = pendingBatches.get(root);
        const origins = pendingEffectOrigins.get(root) || new Map();
        pendingBatches.delete(root);
        pendingEffectOrigins.delete(root);
        if (!batch || batch.size === 0 || !rootStates.has(root)) return;
        const targets = [...batch.keys()];
        try {
          render(root, state, targets.length === 1 ? targets[0] : null);
        } catch (error) {
          root.dispatchEvent(new CustomEvent('aml:render-error', {detail: {error, changes: Object.fromEntries(batch)}}));
          console.error(error);
          return;
        }
        batch.forEach((value, target) => root.dispatchEvent(new CustomEvent('aml:state', {detail: {target, value}})));
        const detail = {changes: Object.fromEntries(batch), state: clone(state)};
        if (batch.size > 1) root.dispatchEvent(new CustomEvent('aml:batch', {detail}));
        lifecycle(root, 'update', detail);
        remember(root, state, batch.size > 1 ? 'batch' : targets[0]);
        runEffects(root, state, targets, false, origins);
      });
    }
    changes.forEach((value, target) => pending.set(target, value));
    if (originEffectId) {
      const origins = pendingEffectOrigins.get(root) || new Map();
      changes.forEach((_, target) => origins.set(target, originEffectId));
      pendingEffectOrigins.set(root, origins);
    }
  };
  const commit = (root, state, target, value, executionContext = null) => {
    writePath(state, target, value);
    const config = rootConfigs.get(root) || {shared: {}, persisted: {}, types: {}, computed: {}};
    const changes = new Map([[target, value]]);
    recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
    const transaction = transactions.get(root);
    if (transaction) {
      changes.forEach((changed, name) => transaction.changes.set(name, changed));
      return;
    }
    const persistedTarget = owningTarget(config.persisted, target);
    const persisted = persistedTarget ? config.persisted[persistedTarget] : null;
    if (persisted) {
      try {
        const persistedValue = readPath(state, persistedTarget);
        const payload = persistedPayload(persisted, persistedValue);
        if (persisted.storage === 'indexeddb') indexedState('put', persisted.key, payload).catch((error) => root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: persistedTarget, error}})));
        else (persisted.storage === 'session' ? sessionStorage : localStorage).setItem(persisted.key, payload);
      } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: persistedTarget, error}})); }
    }
    const sharedTarget = owningTarget(config.shared, target);
    const sharedKey = sharedTarget ? config.shared[sharedTarget] : null;
    if (sharedKey) {
      const sharedValue = readPath(state, sharedTarget);
      sharedState[sharedKey] = sharedValue;
      mountedRoots.forEach((otherRoot) => {
        if (otherRoot === root) return;
        const otherConfig = rootConfigs.get(otherRoot) || {};
        const otherTarget = Object.keys(otherConfig.shared || {}).find((name) => otherConfig.shared[name] === sharedKey);
        if (!otherTarget) return;
        const otherState = rootStates.get(otherRoot);
        writePath(otherState, otherTarget, sharedValue);
        const otherChanges = new Map([[otherTarget, sharedValue]]);
        recomputeComputed(otherRoot, otherState, otherConfig, otherTarget).forEach((computed, name) => otherChanges.set(name, computed));
        const otherPersisted = otherConfig.persisted?.[otherTarget];
        if (otherPersisted) {
          try {
            const payload = persistedPayload(otherPersisted, sharedValue);
            if (otherPersisted.storage === 'indexeddb') indexedState('put', otherPersisted.key, payload).catch((error) => otherRoot.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: otherTarget, error}})));
            else (otherPersisted.storage === 'session' ? sessionStorage : localStorage).setItem(otherPersisted.key, payload);
          } catch (error) { otherRoot.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target: otherTarget, error}})); }
        }
        scheduleUpdate(otherRoot, otherState, otherChanges);
      });
    }
    scheduleUpdate(root, state, changes, (executionContext?.owner || executionContext)?.id);
  };
  const apply = (scope, state, action, executionContext = null) => {
    const current = readPath(state, action.target);
    const value = resolveData(action.value, state, executionContext?.eventData);
    let next;
    if (action.type === 'increment') next = Number(current ?? 0) + Number(value ?? 1);
    else if (action.type === 'decrement') next = Number(current ?? 0) - Number(value ?? 1);
    else if (action.type === 'toggle') next = !Boolean(current);
    else if (action.type === 'set') next = value;
    else if (action.type === 'append') next = [...(Array.isArray(current) ? current : []), value];
    else if (action.type === 'prepend') next = [value, ...(Array.isArray(current) ? current : [])];
    else if (action.type === 'remove-at') next = (Array.isArray(current) ? current : []).filter((_, index) => index !== Number(value));
    else if (action.type === 'remove-by') next = (Array.isArray(current) ? current : []).filter((item) => readPath(item, value.key) !== value.value);
    else if (action.type === 'update-by') next = (Array.isArray(current) ? current : []).map((item) => readPath(item, value.key) === value.value ? {...item, ...value.changes} : item);
    else if (action.type === 'sort-by') next = [...(Array.isArray(current) ? current : [])].sort((left, right) => {
      const a = readPath(left, value.key); const b = readPath(right, value.key);
      const result = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : (a > b ? 1 : (a < b ? -1 : 0));
      return value.direction === 'desc' ? -result : result;
    });
    else if (action.type === 'reverse') next = [...(Array.isArray(current) ? current : [])].reverse();
    else if (action.type === 'filter-by') next = (Array.isArray(current) ? current : []).filter((item) => (readPath(item, value.key) === value.value) === value.keepMatches);
    else if (action.type === 'move') {
      next = [...(Array.isArray(current) ? current : [])];
      const from = Number(value.from); const to = Number(value.to);
      if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < next.length && to >= 0 && to < next.length && from !== to) {
        const [item] = next.splice(from, 1); next.splice(to, 0, item);
      }
    }
    else if (action.type === 'merge') next = {...(current && typeof current === 'object' && !Array.isArray(current) ? current : {}), ...value};
    else if (action.type === 'clear') next = [];
    else throw new Error(`Unknown AML client action: ${action.type}`);
    commit(scope, state, action.target, next, executionContext);
  };
  const resolveData = (value, state, eventData = null) => {
    if (Array.isArray(value)) return value.map((item) => resolveData(item, state, eventData));
    if (value && typeof value === 'object') {
      if (typeof value.$state === 'string') return readPath(state, value.$state);
      if (typeof value.$event === 'string') return readPath(eventData || {}, value.$event);
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveData(item, state, eventData)]));
    }
    return value;
  };
  const csrfToken = () => document.querySelector('meta[name="csrf-token"],meta[name="aml-csrf-token"]')?.getAttribute('content') || '';
  const refreshCsrfToken = (response) => {
    const renewed = response.headers.get('X-CSRF-Token');
    if (!renewed) return;
    const meta = document.querySelector('meta[name="csrf-token"],meta[name="aml-csrf-token"]');
    if (meta) meta.setAttribute('content', renewed);
  };
  const request = async (root, state, action, trigger, executionContext = null) => {
    const owner = executionContext?.owner || executionContext;
    const data = resolveData(action.data || {}, state, executionContext?.eventData);
    const url = new URL(action.url, location.origin);
    if (url.origin !== location.origin) throw new Error('AML API requests must remain same-origin.');
    const controller = new AbortController();
    const executionGeneration = owner?.generation;
    const isCurrent = () => !owner
      || owner.concurrency === 'parallel'
      || owner.generation === executionGeneration;
    const controllers = rootControllers.get(root) || new Set();
    controllers.add(controller);
    owner?.controllers?.add(controller);
    rootControllers.set(root, controllers);
    const options = {method: action.method, credentials: 'same-origin', signal: controller.signal, headers: {'Accept': 'application/json', 'X-AML-Engine': 'api'}};
    if (action.method === 'GET') {
      Object.entries(data).forEach(([key, value]) => url.searchParams.set(key, String(value ?? '')));
    } else {
      options.headers['Content-Type'] = 'application/json';
      const token = csrfToken();
      if (token) options.headers['X-CSRF-Token'] = token;
      options.body = JSON.stringify(data);
    }
    if (action.loading) commit(root, state, action.loading, true, executionContext);
    if (action.error) commit(root, state, action.error, '', executionContext);
    trigger?.setAttribute('aria-busy', 'true');
    if (trigger instanceof HTMLButtonElement) trigger.disabled = true;
    try {
      const response = await fetch(url, options);
      refreshCsrfToken(response);
      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json') ? await response.json() : await response.text();
      if (!response.ok) throw new Error(typeof result === 'object' ? (result.message || result.error || `API request failed: ${response.status}`) : result);
      if (!isCurrent()) return;
      const selected = action.select ? readPath(result, action.select) : result;
      if (action.result) commit(root, state, action.result, selected, executionContext);
      root.dispatchEvent(new CustomEvent('aml:api-success', {detail: {url: url.href, result}}));
    } catch (error) {
      if (error?.name === 'AbortError' || !isCurrent()) return;
      if (action.error) commit(root, state, action.error, error.message, executionContext);
      root.dispatchEvent(new CustomEvent('aml:api-error', {detail: {url: url.href, error}}));
      if (executionContext) throw error;
    } finally {
      controllers.delete(controller);
      owner?.controllers?.delete(controller);
      if (action.loading && isCurrent()) commit(root, state, action.loading, false, executionContext);
      trigger?.removeAttribute('aria-busy');
      if (trigger instanceof HTMLButtonElement) trigger.disabled = false;
    }
  };
  const matches = (state, action) => {
    const current = readPath(state, action.state);
    if (action.operator === 'eq') return current === action.value;
    if (action.operator === 'neq') return current !== action.value;
    if (action.operator === 'gt') return current > action.value;
    if (action.operator === 'gte') return current >= action.value;
    if (action.operator === 'lt') return current < action.value;
    if (action.operator === 'lte') return current <= action.value;
    if (action.operator === 'truthy') return Boolean(current);
    if (action.operator === 'falsy') return !Boolean(current);
    return false;
  };
  const hasAsyncAction = (action) => {
    if (!action) return false;
    if (action.type === 'api') return true;
    if (action.type === 'sequence' || action.type === 'transaction') return (action.actions || []).some(hasAsyncAction);
    if (action.type === 'condition') return hasAsyncAction(action.then) || hasAsyncAction(action.otherwise);
    return false;
  };
  const execute = async (root, state, action, trigger = null, executionContext = null) => {
    if (action.type === 'transaction') {
      const parent = transactions.get(root);
      const context = parent || {changes: new Map(), snapshot: clone(state)};
      transactions.set(root, context);
      try {
        for (const child of action.actions || []) await execute(root, state, child, trigger, executionContext);
      } catch (error) {
        if (!parent) {
          transactions.delete(root);
          Object.keys(state).forEach((key) => delete state[key]);
          Object.assign(state, context.snapshot);
          render(root, state);
          root.dispatchEvent(new CustomEvent('aml:transaction-error', {detail: {error, state: clone(state)}}));
        }
        throw error;
      }
      if (!parent) {
        transactions.delete(root);
        context.changes.forEach((_, target) => commit(root, state, target, readPath(state, target), executionContext));
        queueMicrotask(() => {
          const detail = {changes: Object.fromEntries(context.changes), state: clone(state)};
          root.dispatchEvent(new CustomEvent('aml:transaction', {detail}));
        });
      }
      return;
    }
    if (action.type === 'sequence') {
      if (!transactions.has(root) && !hasAsyncAction(action)) {
        await execute(root, state, {type: 'transaction', actions: action.actions || []}, trigger, executionContext);
        return;
      }
      for (const child of action.actions || []) await execute(root, state, child, trigger, executionContext);
      return;
    }
    if (action.type === 'condition') {
      const selected = matches(state, action) ? action.then : action.otherwise;
      if (selected) await execute(root, state, selected, trigger, executionContext);
      return;
    }
    if (action.type === 'navigate') await navigate(action.destination, !action.replace, root);
    else if (action.type === 'api') await request(root, state, action, trigger, executionContext);
    else apply(root, state, action, executionContext);
  };
  const updateModel = (root, state, control) => {
    const target = control.dataset.amlModel;
    if (!target) return;
    const raw = control.type === 'file'
      ? [...(control.files || [])].map((file) => ({name: file.name, size: file.size, type: file.type, lastModified: file.lastModified}))
      : (control.type === 'checkbox' ? control.checked : control.value);
    const type = rootConfigs.get(root)?.types?.[target] || 'string';
    const value = coerce(type, raw);
    commit(root, state, target, value);
  };
  const preserveForm = (form) => {
    const values = {};
    for (const [name, value] of new FormData(form).entries()) {
      if (value instanceof File) continue;
      if (Object.prototype.hasOwnProperty.call(values, name)) values[name] = Array.isArray(values[name]) ? [...values[name], value] : [values[name], value];
      else values[name] = value;
    }
    [...form.querySelectorAll('input[type="checkbox"][name]')].forEach((control) => {
      if (!Object.prototype.hasOwnProperty.call(values, control.name)) values[control.name] = false;
    });
    try { sessionStorage.setItem(`phpaml.form.${form.dataset.amlFormPreserve}`, JSON.stringify(values)); }
    catch (error) { form.dispatchEvent(new CustomEvent('aml:form-preserve-error', {detail: {error}})); }
  };
  const restoreForm = (form) => {
    try {
      const saved = sessionStorage.getItem(`phpaml.form.${form.dataset.amlFormPreserve}`);
      if (!saved) return;
      const values = JSON.parse(saved);
      const positions = {};
      [...form.elements].forEach((control) => {
        if (!control.name || !Object.prototype.hasOwnProperty.call(values, control.name) || control.type === 'file') return;
        const stored = values[control.name]; const list = Array.isArray(stored) ? stored : [stored];
        if (control.type === 'checkbox') control.checked = stored === true || list.map(String).includes(control.value);
        else if (control.type === 'radio') control.checked = list.map(String).includes(control.value);
        else if (control.matches('select[multiple]')) [...control.options].forEach((option) => option.selected = list.map(String).includes(option.value));
        else { const index = positions[control.name] || 0; control.value = list[Math.min(index, list.length - 1)] ?? ''; positions[control.name] = index + 1; }
        control.dispatchEvent(new Event('input', {bubbles: true}));
      });
    } catch (error) { form.dispatchEvent(new CustomEvent('aml:form-preserve-error', {detail: {error}})); }
  };
  const validationMessage = (control) => {
    const rules = JSON.parse(control.dataset.amlValidate || '[]');
    const value = control.type === 'checkbox' ? (control.checked ? control.value : '') : control.value;
    for (const rule of rules) {
      if (rule.type === 'required' && String(value ?? '').trim() === '') return rule.message;
      if (rule.type === 'min-length' && String(value ?? '').length > 0 && String(value).length < Number(rule.value)) return rule.message;
      if (rule.type === 'email' && String(value ?? '').length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return rule.message;
    }
    return '';
  };
  const showValidation = (control, message) => {
    const base = control.dataset.amlModel || control.name || 'field';
    const id = `aml-error-${base.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    let error = control.parentElement?.querySelector(`:scope > [data-aml-validation-for="${CSS.escape(base)}"]`);
    control.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (!message) {
      if (control.getAttribute('aria-describedby') === id) control.removeAttribute('aria-describedby');
      error?.remove();
      return true;
    }
    control.setAttribute('aria-describedby', id);
    if (!error) {
      error = document.createElement('small');
      error.id = id;
      error.dataset.amlValidationFor = base;
      error.setAttribute('role', 'alert');
      control.insertAdjacentElement('afterend', error);
    }
    error.textContent = message;
    return false;
  };
  const validateControl = (control) => showValidation(control, validationMessage(control));
  const validateRemote = async (root, state, control) => {
    if (!control.dataset.amlValidateApi || !validateControl(control)) return !control.matches('[aria-invalid="true"]');
    const config = JSON.parse(control.dataset.amlValidateApi);
    const action = config.request;
    const data = resolveData(action.data || {}, state);
    const url = new URL(action.url, location.origin);
    if (url.origin !== location.origin) return showValidation(control, 'Validation API must remain same-origin.');
    validationControllers.get(control)?.abort();
    const controller = new AbortController();
    validationControllers.set(control, controller);
    control.setAttribute('aria-busy', 'true');
    const options = {method: action.method, credentials: 'same-origin', signal: controller.signal, headers: {'Accept': 'application/json', 'X-AML-Engine': 'validation'}};
    if (action.method === 'GET') Object.entries(data).forEach(([key, value]) => url.searchParams.set(key, String(value ?? '')));
    else { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(data); }
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || `Validation failed: ${response.status}`);
      return showValidation(control, result.valid === true ? '' : (result.message || config.message));
    } catch (error) {
      if (error.name === 'AbortError') return false;
      return showValidation(control, error.message || config.message);
    } finally {
      if (validationControllers.get(control) === controller) {
        validationControllers.delete(control);
        control.removeAttribute('aria-busy');
      }
    }
  };
  const scheduleRemoteValidation = (root, state, control) => {
    if (!control.dataset.amlValidateApi || !validateControl(control)) return;
    clearTimeout(validationTimers.get(control));
    const config = JSON.parse(control.dataset.amlValidateApi);
    validationTimers.set(control, setTimeout(() => validateRemote(root, state, control), Number(config.debounce ?? 400)));
  };
  const validateForm = (form) => {
    let valid = true;
    form.querySelectorAll('[data-aml-validate]:not([disabled])').forEach((control) => { if (!validateControl(control)) valid = false; });
    if (!valid) form.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  };
  const mount = (scope = document) => {
    scope.querySelectorAll('[data-aml-client]').forEach((root) => {
      if (root.dataset.amlEngineMounted === 'true') return;
      const manifests = [...root.querySelectorAll('template[data-aml-state]')];
      const state = {};
      const config = {shared: {}, persisted: {}, types: {}, computed: {}, effects: {}};
      manifests.forEach((manifest) => {
        const values = JSON.parse(manifest.dataset.amlState || '{}');
        const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"shared":{},"persisted":{},"types":{},"computed":{},"effects":{}}');
        Object.entries(values).forEach(([target, value]) => {
          if (readPath(state, target) !== undefined) throw new Error(`Duplicate AML state target: ${target}`);
          writePath(state, target, value);
        });
        for (const group of ['shared', 'persisted', 'types', 'computed', 'effects']) {
          if (group === 'effects') Object.keys(addition.effects || {}).forEach((id) => {
            if (Object.prototype.hasOwnProperty.call(config.effects, id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
          });
          Object.assign(config[group], addition[group] || {});
        }
      });
      Object.entries(config.persisted || {}).forEach(([target, persisted]) => {
        if (persisted.storage === 'indexeddb') return;
        try {
          const storage = persisted.storage === 'session' ? sessionStorage : localStorage;
          const saved = storage.getItem(persisted.key);
          if (saved !== null) {
            const restored = restoredValue(root, target, persisted, saved, config.types?.[target]);
            if (restored === undefined) storage.removeItem(persisted.key);
            else writePath(state, target, restored);
          }
        } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target, error}})); }
      });
      Object.entries(config.shared || {}).forEach(([target, key]) => {
        const type = config.types?.[target] || 'mixed';
        if (sharedTypes[key] && sharedTypes[key] !== type) throw new Error(`Incompatible AML shared state types for ${key}: ${sharedTypes[key]} and ${type}`);
        sharedTypes[key] = type;
        if (Object.prototype.hasOwnProperty.call(sharedState, key)) writePath(state, target, sharedState[key]);
        else sharedState[key] = readPath(state, target);
      });
      restoreContexts(root, state);
      recomputeComputed(root, state, config);
      rootStates.set(root, state);
      rootConfigs.set(root, config);
      mountedRoots.add(root);
      rootControllers.set(root, new Set());
      rootCleanups.set(root, new Set());
      if (typeof ResizeObserver === 'function') {
        const virtualResizeObserver = new ResizeObserver((entries) => {
          if (entries.some((entry) => entry.target.matches?.('[data-aml-virtual-list]'))) renderVirtualLists(root, state);
        });
        root.querySelectorAll('[data-aml-virtual-list]').forEach((list) => virtualResizeObserver.observe(list));
        rootCleanups.get(root).add(() => virtualResizeObserver.disconnect());
      }
      effectRuntimes.set(root, new Map());
      stateHistories.set(root, []);
      root.dataset.amlEngineMounted = 'true';
      root.addEventListener('click', async (event) => {
        const stepControl = event.target.closest('[data-aml-step-next],[data-aml-step-previous]');
        if (stepControl && root.contains(stepControl)) {
          event.preventDefault();
          const form = stepControl.closest('[data-aml-multi-step-form]');
          const rule = JSON.parse(form.dataset.amlMultiStepForm);
          const current = Math.max(0, Math.min(Number(rule.count) - 1, Number(readPath(state, rule.state)) || 0));
          if (stepControl.matches('[data-aml-step-next]')) {
            const panel = form.querySelector(`[data-aml-form-step="${current}"]`);
            let valid = true;
            panel?.querySelectorAll('[data-aml-validate]:not([disabled])').forEach((control) => { if (!validateControl(control)) valid = false; });
            const remote = [...(panel?.querySelectorAll('[data-aml-validate-api]:not([disabled])') || [])];
            if (valid) valid = (await Promise.all(remote.map((control) => validateRemote(root, state, control)))).every(Boolean);
            if (!valid) { panel?.querySelector('[aria-invalid="true"]')?.focus(); return; }
            commit(root, state, rule.state, Math.min(Number(rule.count) - 1, current + 1));
          } else commit(root, state, rule.state, Math.max(0, current - 1));
          return;
        }
        const disclosure = event.target.closest('[data-aml-disclosure-trigger]');
        if (disclosure && root.contains(disclosure)) {
          const rule = JSON.parse(disclosure.dataset.amlDisclosureTrigger);
          commit(root, state, rule.state, !Boolean(readPath(state, rule.state)));
          queueMicrotask(() => {
            const panel = document.getElementById(disclosure.getAttribute('aria-controls'));
            panel?.querySelector('[role="menuitem"],button,a[href],input,[tabindex]:not([tabindex="-1"])')?.focus();
          });
          return;
        }
        root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]').forEach((trigger) => {
          const panel = document.getElementById(trigger.getAttribute('aria-controls'));
          if (panel?.contains(event.target)) return;
          const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
          commit(root, state, rule.state, false);
        });
        const selectedMenuItem = event.target.closest('[role="menuitem"]');
        if (selectedMenuItem) {
          const panel = selectedMenuItem.closest('[data-aml-disclosure-panel]');
          const trigger = panel && root.querySelector(`[data-aml-disclosure-trigger][aria-controls="${CSS.escape(panel.id)}"]`);
          if (trigger) {
            const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
            commit(root, state, rule.state, false);
          }
        }
        const themeChoice = event.target.closest('[data-aml-theme-choice]');
        if (themeChoice && root.contains(themeChoice)) {
          const provider = matchingContextProvider(themeChoice, 'theme', root);
          if (provider) {
            const rule = JSON.parse(provider.dataset.amlContextProvider);
            const value = themeChoice.dataset.amlThemeChoice;
            if (rule.name === 'theme') {
              if (rule.state) commit(root, state, rule.state, value);
              else { rule.value = value; provider.dataset.amlContextProvider = JSON.stringify(rule); renderContexts(root, state); }
              root.querySelectorAll('[data-aml-theme-choice]').forEach((choice) => choice.setAttribute('aria-pressed', choice === themeChoice ? 'true' : 'false'));
              return;
            }
          }
        }
        const accordion = event.target.closest('[data-aml-accordion-trigger]');
        if (accordion && root.contains(accordion)) {
          const rule = JSON.parse(accordion.dataset.amlAccordionTrigger);
          commit(root, state, rule.state, String(readPath(state, rule.state)) === String(rule.value) ? '' : rule.value);
          return;
        }
        const sort = event.target.closest('[data-aml-table-sort]');
        if (sort && root.contains(sort)) {
          const rule = JSON.parse(sort.dataset.amlTableSort);
          const direction = sort.getAttribute('aria-sort') === 'ascending' ? 'desc' : 'asc';
          sort.closest('table')?.querySelectorAll('[data-aml-table-sort]').forEach((header) => header.setAttribute('aria-sort', 'none'));
          sort.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
          apply(root, state, {type: 'sort-by', target: rule.state, value: {key: rule.key, direction}});
          return;
        }
        const trigger = event.target.closest('[data-aml-client-click]');
        if (!trigger || !root.contains(trigger)) return;
        event.preventDefault();
        const actionForm = trigger.closest('form');
        if (actionForm && !validateForm(actionForm)) {
          actionForm.querySelector('[aria-invalid="true"]')?.focus();
          return;
        }
        const action = JSON.parse(trigger.dataset.amlClientClick);
        execute(root, state, action, trigger).catch((error) => {
          root.dispatchEvent(new CustomEvent('aml:error', {detail: {error, action}}));
          console.error(error);
        });
      });
      root.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          const openTriggers = [...root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]')];
          const focusedPanel = document.activeElement?.closest?.('[data-aml-disclosure-panel]');
          const trigger = (focusedPanel && openTriggers.find((candidate) => candidate.getAttribute('aria-controls') === focusedPanel.id))
            || openTriggers.reverse()[0];
          if (trigger) {
            const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
            event.preventDefault(); commit(root, state, rule.state, false); trigger.focus(); return;
          }
        }
        const menuItem = event.target.closest('[role="menuitem"]');
        if (menuItem && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          const items = [...menuItem.closest('[role="menu"]').querySelectorAll('[role="menuitem"]:not([disabled])')];
          let position = items.indexOf(menuItem);
          if (event.key === 'Home') position = 0;
          else if (event.key === 'End') position = items.length - 1;
          else position = (position + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          event.preventDefault(); items[position]?.focus(); return;
        }
        const disclosureTrigger = event.target.closest('[data-aml-disclosure-trigger]');
        if (disclosureTrigger && event.key === 'ArrowDown') {
          event.preventDefault();
          if (disclosureTrigger.getAttribute('aria-expanded') !== 'true') disclosureTrigger.click();
          else document.getElementById(disclosureTrigger.getAttribute('aria-controls'))?.querySelector('[role="menuitem"],button,a[href],[tabindex]:not([tabindex="-1"])')?.focus();
          return;
        }
        const openDialog = root.querySelector('dialog[data-aml-modal][open]');
        if (openDialog && event.key === 'Tab') {
          const focusable = [...openDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
          if (focusable.length) {
            const first = focusable[0]; const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }
        const sortable = event.target.closest('[data-aml-table-sort]');
        if (sortable && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); sortable.click(); return; }
        const sortableItem = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
        if (sortableItem && event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
          const list = sortableItem.parentElement;
          const from = Number(sortableItem.dataset.amlListIndex);
          const to = from + (event.key === 'ArrowUp' ? -1 : 1);
          const collection = readPath(state, list.dataset.amlList);
          const length = Array.isArray(collection) ? collection.length : 0;
          if (to >= 0 && to < length) {
            event.preventDefault();
            apply(root, state, {type: 'move', target: list.dataset.amlList, value: {from, to}});
            queueMicrotask(() => list.querySelector(`[data-aml-list-index="${to}"]`)?.focus());
            root.dispatchEvent(new CustomEvent('aml:sort', {detail: {state: list.dataset.amlList, from, to, input: 'keyboard'}}));
          }
          return;
        }
        const tab = event.target.closest('[data-aml-tab]');
        if (!tab || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[data-aml-tab]')];
        let index = tabs.indexOf(tab);
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = tabs.length - 1;
        else index = (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault(); tabs[index].focus(); tabs[index].click();
      });
      root.addEventListener('cancel', (event) => {
        const dialog = event.target.closest('[data-aml-modal]');
        if (!dialog) return;
        event.preventDefault();
        const rule = JSON.parse(dialog.dataset.amlModal);
        commit(root, state, rule.state, false);
      });
      root.addEventListener('dragstart', (event) => {
        const item = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
        if (!item || !event.dataTransfer) return;
        const list = item.parentElement;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/x-aml-index', JSON.stringify({index: Number(item.dataset.amlListIndex), state: list.dataset.amlList}));
        item.setAttribute('aria-grabbed', 'true');
      });
      root.addEventListener('dragend', (event) => event.target.closest('[aria-grabbed="true"]')?.removeAttribute('aria-grabbed'));
      root.addEventListener('dragover', (event) => {
        if (event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]')) event.preventDefault();
      });
      root.addEventListener('drop', (event) => {
        const destination = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
        if (!destination || !event.dataTransfer || !Array.from(event.dataTransfer.types).includes('text/x-aml-index')) return;
        event.preventDefault();
        const list = destination.parentElement;
        let source;
        try { source = JSON.parse(event.dataTransfer.getData('text/x-aml-index')); } catch (_) { return; }
        if (!source || source.state !== list.dataset.amlList) return;
        const from = Number(source.index);
        const to = Number(destination.dataset.amlListIndex);
        if (Number.isInteger(from) && Number.isInteger(to)) {
          apply(root, state, {type: 'move', target: list.dataset.amlList, value: {from, to}});
          root.dispatchEvent(new CustomEvent('aml:sort', {detail: {state: list.dataset.amlList, from, to, input: 'pointer'}}));
        }
      });
      root.addEventListener('scroll', (event) => {
        if (event.target.matches?.('[data-aml-virtual-list]')) renderVirtualLists(root, state);
      }, true);
      root.addEventListener('input', (event) => {
        const control = event.target.closest('[data-aml-model]');
        if (control && root.contains(control) && control.type !== 'checkbox') {
          updateModel(root, state, control);
          if (control.dataset.amlValidate) validateControl(control);
          scheduleRemoteValidation(root, state, control);
        }
        const preserved = event.target.closest('form[data-aml-form-preserve]');
        if (preserved) preserveForm(preserved);
      });
      root.addEventListener('change', (event) => {
        const control = event.target.closest('[data-aml-model]');
        if (control && root.contains(control)) {
          updateModel(root, state, control);
          if (control.dataset.amlValidate) validateControl(control);
          scheduleRemoteValidation(root, state, control);
        }
        const preserved = event.target.closest('form[data-aml-form-preserve]');
        if (preserved) preserveForm(preserved);
      });
      root.addEventListener('submit', async (event) => {
        const form = event.target.closest('form');
        if (!form || !root.contains(form)) return;
        if (form.dataset.amlValidationPassed === 'true') { delete form.dataset.amlValidationPassed; return; }
        event.preventDefault();
        if (!validateForm(form)) return;
        const controls = [...form.querySelectorAll('[data-aml-validate-api]')];
        const valid = (await Promise.all(controls.map((control) => validateRemote(root, state, control)))).every(Boolean);
        if (valid) {
          form.dataset.amlValidationPassed = 'true'; form.requestSubmit(event.submitter || undefined);
        }
      });
      const revealTooltip = (event, visible) => {
        const trigger = event.target.closest('[data-aml-tooltip-trigger]');
        if (!trigger || !root.contains(trigger)) return;
        if (!visible && event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return;
        const content = document.getElementById(trigger.getAttribute('aria-describedby'));
        if (content) content.hidden = !visible;
      };
      root.addEventListener('pointerover', (event) => revealTooltip(event, true));
      root.addEventListener('pointerout', (event) => revealTooltip(event, false));
      root.addEventListener('focusin', (event) => revealTooltip(event, true));
      root.addEventListener('focusout', (event) => revealTooltip(event, false));
      const closeOutsideDisclosures = (event) => root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]').forEach((trigger) => {
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (trigger.contains(event.target) || panel?.contains(event.target)) return;
        const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
        commit(root, state, rule.state, false);
      });
      document.addEventListener('click', closeOutsideDisclosures);
      rootCleanups.get(root).add(() => document.removeEventListener('click', closeOutsideDisclosures));
      render(root, state);
      root.querySelectorAll('form[data-aml-form-preserve]').forEach(restoreForm);
      root.querySelectorAll('template[data-aml-redirect]').forEach((redirect) => {
        const rule = JSON.parse(redirect.dataset.amlRedirect);
        queueMicrotask(() => navigate(rule.destination, !rule.replace, root));
      });
      remember(root, state, 'mount');
      lifecycle(root, 'mount', {state: clone(state)});
      Object.entries(config.effects).forEach(([id, definition]) => effectRuntimes.get(root).set(id, newEffectRuntime(id, definition)));
      const indexedRestores = Object.entries(config.persisted || {}).filter(([, persisted]) => persisted.storage === 'indexeddb').map(async ([target, persisted]) => {
        try {
          const saved = await indexedState('get', persisted.key);
          if (saved === undefined) return;
          const restored = restoredValue(root, target, persisted, saved, config.types?.[target]);
          if (restored === undefined) await indexedState('delete', persisted.key);
          else {
            writePath(state, target, restored);
            const changes = new Map([[target, restored]]);
            recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
            scheduleUpdate(root, state, changes);
          }
        } catch (error) { root.dispatchEvent(new CustomEvent('aml:storage-error', {detail: {target, error}})); }
      });
      Promise.all(indexedRestores).finally(() => {
        if (!rootStates.has(root)) return;
        Object.entries(config.effects).forEach(([id, definition]) => {
          if (definition.runOnMount) activateEffect(root, state, id, definition);
        });
      });
    });
  };
  const unmount = (root) => {
    if (!root || root.dataset.amlEngineMounted !== 'true') return;
    lifecycle(root, 'unmount', {state: clone(rootStates.get(root) || {})});
    effectRuntimes.get(root)?.forEach((_, id) => cleanupEffect(root, id, 'unmount'));
    rootControllers.get(root)?.forEach((controller) => controller.abort());
    navigationRuntimes.get(root)?.controller?.abort();
    navigationRuntimes.delete(root);
    root.querySelectorAll('[data-aml-validate-api]').forEach((control) => {
      clearTimeout(validationTimers.get(control));
      validationControllers.get(control)?.abort();
    });
    root.querySelectorAll('[data-aml-toast]').forEach((toast) => clearTimeout(toastTimers.get(toast)));
    rootCleanups.get(root)?.forEach((cleanup) => { try { cleanup(); } catch (error) { console.error(error); } });
    rootControllers.delete(root);
    rootCleanups.delete(root);
    effectRuntimes.delete(root);
    rootStates.delete(root);
    rootConfigs.delete(root);
    stateHistories.delete(root);
    mountedRoots.delete(root);
    delete root.dataset.amlEngineMounted;
  };
  const on = (root, phase, handler) => {
    if (!['mount', 'update', 'unmount'].includes(phase)) throw new Error(`Unknown AML lifecycle phase: ${phase}`);
    const eventName = `aml:${phase}`;
    root.addEventListener(eventName, handler);
    const dispose = () => root.removeEventListener(eventName, handler);
    const cleanups = rootCleanups.get(root) || new Set();
    cleanups.add(dispose);
    rootCleanups.set(root, cleanups);
    if (phase === 'mount' && root.dataset.amlEngineMounted === 'true') {
      queueMicrotask(() => handler(new CustomEvent(eventName, {detail: {state: clone(rootStates.get(root) || {})}})));
    }
    return dispose;
  };
  const updateActiveLinks = () => {
    document.querySelectorAll('a[href]').forEach((link) => {
      let url;
      try { url = new URL(link.href, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;
      const active = url.pathname === location.pathname;
      if (active) link.setAttribute('aria-current', 'page');
      else if (link.getAttribute('aria-current') === 'page') link.removeAttribute('aria-current');
    });
  };
  const clearNavigationState = (current) => {
    const boundary = current.querySelector('[data-aml-navigation-boundary]');
    if (!boundary) return;
    boundary.querySelector(':scope > [data-aml-navigation-overlay]')?.remove();
    const content = boundary.querySelector(':scope > [data-aml-navigation-content]');
    content?.removeAttribute('inert');
    content?.removeAttribute('aria-hidden');
  };
  const showNavigationState = (current, status, message = '', url = location.href, signal = null) => {
    const boundary = current.querySelector('[data-aml-navigation-boundary]');
    if (!boundary) return false;
    boundary.querySelector(':scope > [data-aml-navigation-overlay]')?.remove();
    const template = boundary.querySelector(`:scope > template[data-aml-navigation-state="${status}"]`);
    if (!template) return false;
    const overlay = document.createElement('div');
    overlay.dataset.amlNavigationOverlay = status;
    overlay.setAttribute('role', status === 'error' ? 'alert' : 'status');
    overlay.appendChild(template.content.cloneNode(true));
    const content = boundary.querySelector(':scope > [data-aml-navigation-content]');
    content?.setAttribute('inert', '');
    content?.setAttribute('aria-hidden', 'true');
    boundary.appendChild(overlay);
    const live = boundary.querySelector(':scope > [data-aml-navigation-live]');
    if (live) live.textContent = message || status;
    fetch(url, {headers: {'X-AML-Navigation': 'true', 'X-AML-Navigation-State': status}, signal})
      .then((response) => response.text())
      .then((html) => {
        if (signal?.aborted || !overlay.isConnected) return;
        const stateDocument = new DOMParser().parseFromString(html, 'text/html');
        const stateRoot = stateDocument.querySelector('[data-aml-client]');
        const stateContent = stateDocument.querySelector('[data-aml-navigation-state-content]');
        if (!stateRoot || !stateContent || stateContent.dataset.amlNavigationStateContent !== status) return;
        overlay.replaceChildren(document.importNode(stateRoot, true));
        mount(overlay);
        const target = overlay.querySelector('[data-aml-navigation-focus],h1,[role="alert"],[role="status"]');
        if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({preventScroll: true}); }
      })
      .catch((error) => { if (error?.name !== 'AbortError') current.dispatchEvent(new CustomEvent('aml:navigation-state-error', {detail: {status, error}})); });
    return true;
  };
  const focusNavigatedPage = (url) => {
    if (url.hash) { document.querySelector(url.hash)?.scrollIntoView(); return; }
    scrollTo({top: 0, behavior: 'instant'});
    const target = document.querySelector('[data-aml-navigation-focus]')
      || document.querySelector('main,[role="main"]')
      || document.querySelector('h1');
    if (!target) return;
    const hadTabIndex = target.hasAttribute('tabindex');
    if (!hadTabIndex) target.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => target.focus({preventScroll: true}));
    if (!hadTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), {once: true});
  };
  const syncHead = (nextDocument) => {
    document.title = nextDocument.title || document.title;
    const selector = 'meta[name="description"],meta[name="robots"],link[rel="canonical"],meta[property^="og:"],meta[name^="twitter:"]';
    document.head.querySelectorAll(selector).forEach((node) => node.remove());
    nextDocument.head.querySelectorAll(selector).forEach((node) => document.head.appendChild(document.importNode(node, true)));
  };
  const navigate = async (destination, push = true, sourceRoot = null) => {
    const url = new URL(destination, location.href);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported AML navigation protocol: ${url.protocol}`);
    if (url.origin !== location.origin) { location.href = url.href; return; }
    const current = sourceRoot?.matches?.('[data-aml-client]') && document.contains(sourceRoot)
      ? sourceRoot : document.querySelector('[data-aml-client]');
    if (!current) { location.href = url.href; return; }
    const rootIndex = [...document.querySelectorAll('[data-aml-client]')].indexOf(current);
    const previous = navigationRuntimes.get(current);
    previous?.controller?.abort();
    const controller = new AbortController();
    const generation = (previous?.generation || 0) + 1;
    navigationRuntimes.set(current, {controller, generation});
    const active = () => navigationRuntimes.get(current)?.generation === generation && !controller.signal.aborted;
    current.setAttribute('aria-busy', 'true');
    showNavigationState(current, 'loading', 'Loading page', location.href, controller.signal);
    document.dispatchEvent(new CustomEvent('aml:navigation-start', {detail: {url: url.href}}));
    try {
      const response = await fetch(url.href, {headers: {'X-AML-Navigation': 'true'}, signal: controller.signal});
      const html = await response.text();
      if (!active()) return;
      const nextDocument = new DOMParser().parseFromString(html, 'text/html');
      const next = nextDocument.querySelector('[data-aml-client]');
      if (!next) {
        if (response.status === 404 && showNavigationState(current, 'not-found', 'Page not found', location.href, controller.signal)) { current.removeAttribute('aria-busy'); return; }
        throw new Error(`AML navigation failed: ${response.status}`);
      }
      if (!active()) return;
      clearNavigationState(current);
      unmount(current);
      current.replaceWith(document.importNode(next, true));
      syncHead(nextDocument);
      if (push) window.history.pushState({aml: true}, '', url.href);
      else if (location.href !== url.href) window.history.replaceState({aml: true}, '', url.href);
      mount(document);
      updateActiveLinks();
      focusNavigatedPage(url);
      const mounted = document.querySelectorAll('[data-aml-client]');
      const replacement = mounted[Math.min(Math.max(rootIndex, 0), mounted.length - 1)] || mounted[0];
      replacement?.animate?.(
        [{opacity: .82, transform: 'translateY(4px)'}, {opacity: 1, transform: 'none'}],
        {duration: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160, easing: 'ease-out'},
      );
      document.dispatchEvent(new CustomEvent('aml:navigation-end', {detail: {url: url.href, status: response.status}}));
    } catch (error) {
      if (error?.name === 'AbortError' || !active()) return;
      current.removeAttribute('aria-busy');
      const handled = showNavigationState(current, 'error', 'Navigation failed', location.href, controller.signal);
      document.dispatchEvent(new CustomEvent('aml:navigation-error', {detail: {url: url.href, error}}));
      if (!handled) throw error;
    } finally {
      if (navigationRuntimes.get(current)?.generation === generation) navigationRuntimes.delete(current);
    }
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('download') || link.target === '_blank' || link.dataset.amlNativeNavigation !== undefined) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    event.preventDefault();
    navigate(url.href, true, link.closest('[data-aml-client]')).catch((error) => { console.error(error); location.href = url.href; });
  });
  addEventListener('popstate', () => navigate(location.href, false).catch(() => location.reload()));
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
  const context = (root, name, fallback = null) => {
    const providers = [...root.querySelectorAll('[data-aml-context-provider]')];
    const provider = providers.reverse().find((candidate) => JSON.parse(candidate.dataset.amlContextProvider).name === name);
    if (!provider) return fallback;
    try { return JSON.parse(provider.dataset.amlContextValue); } catch (_) { return fallback; }
  };
  const route = () => {
    const url = new URL(location.href);
    const query = {};
    url.searchParams.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(query, key)) query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
      else query[key] = value;
    });
    return Object.freeze({path: url.pathname, query: Object.freeze(query), hash: url.hash});
  };
  const observer = new MutationObserver((records) => records.forEach((record) => record.removedNodes.forEach((node) => {
    if (!(node instanceof Element)) return;
    if (node.matches('[data-aml-client]')) unmount(node);
    node.querySelectorAll?.('[data-aml-client]').forEach(unmount);
  })));
  observer.observe(document.documentElement, {childList: true, subtree: true});
  const clearPersisted = (key, storage = 'local') => storage === 'indexeddb'
    ? indexedState('delete', key)
    : (storage === 'session' ? sessionStorage : localStorage).removeItem(key);
  const clearFormDraft = (formOrKey) => {
    const key = typeof formOrKey === 'string' ? formOrKey : formOrKey?.dataset?.amlFormPreserve;
    if (!key) throw new Error('A form or draft key is required.');
    sessionStorage.removeItem(`phpaml.form.${key}`);
  };
  const inspect = (root) => clone(rootStates.get(root) || {});
  const effects = (root) => {
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
  const pauseEffect = (root, id) => {
    const runtime = effectRuntimes.get(root)?.get(id);
    if (!runtime) throw new Error(`Unknown AML effect: ${id}`);
    cleanupEffect(root, id, 'pause');
    runtime.disabled = true;
    root.dispatchEvent(new CustomEvent('aml:effect-pause', {detail: {id}}));
  };
  const resumeEffect = (root, id, run = false) => {
    const runtime = effectRuntimes.get(root)?.get(id);
    const definition = rootConfigs.get(root)?.effects?.[id];
    if (!runtime || !definition) throw new Error(`Unknown AML effect: ${id}`);
    runtime.disabled = false;
    runtime.selfRuns = [];
    root.dispatchEvent(new CustomEvent('aml:effect-resume', {detail: {id}}));
    if (run) activateEffect(root, rootStates.get(root), id, definition);
  };
  const runEffect = (root, id) => {
    const runtime = effectRuntimes.get(root)?.get(id);
    const definition = rootConfigs.get(root)?.effects?.[id];
    if (!runtime || !definition) throw new Error(`Unknown AML effect: ${id}`);
    if (runtime.disabled) throw new Error(`AML effect is paused or disabled: ${id}`);
    activateEffect(root, rootStates.get(root), id, definition);
  };
  const stateHistory = (root) => clone(stateHistories.get(root) || []);
  const restore = (root, index) => {
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
})();
</script>
HTML;
        if ($nonce === null) return $script;
        return preg_replace(
            '/^<script /',
            '<script nonce="' . htmlspecialchars($nonce, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '" ',
            $script,
            1,
        ) ?? $script;
    }
}
