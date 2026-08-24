export const dynamicToken = (key) => {
    let hash = 2166136261;
    for (const character of String(key)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return `k${(hash >>> 0).toString(36)}`;
  };
export const dynamicTarget = (target, token) => {
    const segments = safeSegments(target); const property = segments.pop();
    return [...segments, 'items', token, property].join('.');
  };
export const rewriteDynamic = (value, mapping) => {
    if (Array.isArray(value)) return value.map((item) => rewriteDynamic(item, mapping));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteDynamic(item, mapping)]));
    if (typeof value !== 'string') return value;
    const source = Object.keys(mapping).sort((a, b) => b.length - a.length).find((path) => value === path || value.startsWith(`${path}.`));
    return source ? mapping[source] + value.slice(source.length) : value;
  };
export const rewriteDynamicEffectId = (id, mapping) => {
    return rewriteDynamic(id, mapping);
  };
export const hydrateDynamicItem = (root, state, node, key) => {
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
export const releaseDynamicItem = (root, state, node) => {
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
export const animateIn = (node) => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const source = node.closest('[data-aml-transition]') || (node.matches?.('[data-aml-transition]') ? node : null);
    if (!source || typeof node.animate !== 'function') return;
    const duration = Number(source.dataset.amlTransitionDuration || 180);
    const name = source.dataset.amlTransition || 'fade';
    const from = name === 'slide' ? {opacity: 0, transform: 'translateY(10px)'}
      : (name === 'scale' ? {opacity: 0, transform: 'scale(.97)'} : {opacity: 0});
    node.animate([from, {opacity: 1, transform: 'none'}], {duration, easing: 'ease-out'});
  };
export const renderRichComponents = (root, state, target = null) => {
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
export const renderVirtualLists = (root, state, target = null) => {
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
export const matchingContextProvider = (node, name, root = null) => {
    let provider = node?.closest?.('[data-aml-context-provider]') || null;
    while (provider) {
      const rule = JSON.parse(provider.dataset.amlContextProvider);
      if (rule.name === name) return provider;
      provider = provider.parentElement?.closest?.('[data-aml-context-provider]') || null;
      if (root && provider && !root.contains(provider)) return null;
    }
    return null;
  };
export const restoreContexts = (root, state) => {
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
export const renderContexts = (root, state, target = null) => {
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
export const render = (scope, state, target = null) => {
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
import { effectRuntimes, rootConfigs, toastTimers } from './context.js';
import { deletePath, pathAffects, readPath, recomputeComputed, safeSegments, writePath } from './core/state.js';
import { cleanupEffect, registerEffect } from './effects-runtime.js';
import { commit } from './state-runtime.js';
