import {listItems, listDependencies, listRendered, reportListError, listOptions, applyListOptions} from './list-bindings.js';
import {renderStyles} from './style-bindings.js';
import {renderIcons} from './icon-bindings.js';
import {setBoundText, setDisabledReason, setDisabledRule} from './control-state.js';
import {renderCalendars} from './calendar.js';
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
const rewriteRow = (node, mapping) => {
    const walk = root => root.querySelectorAll('*').forEach(element => {
      for (const attribute of [...element.attributes]) {
        if (!attribute.name.startsWith('data-aml-')) continue;
        try {
          const rewrite = value => Array.isArray(value) ? value.map(rewrite) : value && typeof value === 'object'
            ? Object.fromEntries(Object.entries(value).map(([key, child]) => [rewriteDynamic(key, mapping), rewrite(child)])) : rewriteDynamic(value, mapping);
          element.setAttribute(attribute.name, JSON.stringify(rewrite(JSON.parse(attribute.value))));
        } catch (_) { element.setAttribute(attribute.name, rewriteDynamic(attribute.value, mapping)); }
      }
      if (element.localName === 'template') walk(element.content);
    });
    walk(node);
  };
const trackInitialRow = node => {
    const targets = [], effects = [];
    node.querySelectorAll('template[data-aml-state]').forEach(manifest => {
      targets.push(...Object.keys(JSON.parse(manifest.dataset.amlState || '{}')));
      effects.push(...Object.keys(JSON.parse(manifest.dataset.amlStateConfig || '{}').effects || {}));
    });
    node.dataset.amlDynamicState = JSON.stringify(targets);
    node.dataset.amlDynamicEffects = JSON.stringify(effects);
  };
export const releaseServiceScopes = (root, node) => {
    const scopes = rootConfigs.get(root)?.serviceScopes;
    if (!scopes) return;
    if (node.matches?.('template[data-aml-service-scope]')) scopes.delete(node.dataset.amlServiceScope);
    node.querySelectorAll('template[data-aml-service-scope]').forEach((marker) => scopes.delete(marker.dataset.amlServiceScope));
  };
export const hydrateDynamicItem = (root, state, node, key) => {
    const token = rowToken(key);
    const config = rootConfigs.get(root);
    if (!config) return;
    const mapping = {};
    const dynamicEffects = [];
    const dynamicStateTargets = [];
    // Include inactive branches/templates: two newly inserted rows must never
    // share a component scope when the same branch is opened later.
    const all = [];
    const collect = parent => parent.querySelectorAll('*').forEach(element => {
      all.push(element); if (element.localName === 'template') collect(element.content);
    });
    collect(node);
    all.filter(element => element.matches('template[data-aml-state]')).forEach(manifest => {
      const values = JSON.parse(manifest.dataset.amlState || '{}');
      Object.keys(values).forEach(target => { mapping[target] = dynamicTarget(target, token); });
      const addition = JSON.parse(manifest.dataset.amlStateConfig || '{}');
      Object.keys(addition.effects || {}).forEach(id => {
        const scope = id.split('.').slice(0, -1).join('.');
        if (scope && !mapping[scope]) mapping[scope] = `${scope}.items.${token}`;
      });
    });
    all.forEach(element => {
      const scope = element.dataset.amlServiceScope || element.dataset.amlFileSource;
      if (scope) mapping[scope] = `${scope}.items.${token}`;
    });
    if (Object.keys(mapping).length === 0) return;
    rewriteRow(node, mapping);
    node.querySelectorAll('template[data-aml-state]').forEach(manifest => {
      const values = JSON.parse(manifest.dataset.amlState || '{}');
      const addition = JSON.parse(manifest.dataset.amlStateConfig || '{}');
      Object.entries(values).forEach(([target, initial]) => {
        dynamicStateTargets.push(target); writePath(state, target, initial);
      });
      for (const group of ['shared', 'persisted', 'types', 'typeRules', 'valueTypes', 'arrayMetadata', 'computed', 'effects']) {
        Object.entries(addition[group] || {}).forEach(([target, value]) => {
          if (group === 'persisted') value.key += `.${token}`;
          (config[group] ||= {})[target] = value;
          if (group === 'effects') dynamicEffects.push(target);
        });
      }
      manifest.dataset.amlStateConfig = JSON.stringify(addition);
    });
    node.dataset.amlDynamicState = JSON.stringify(dynamicStateTargets);
    node.dataset.amlDynamicEffects = JSON.stringify(dynamicEffects);
    recomputeComputed(root, state, config);
    dynamicEffects.forEach((id) => registerEffect(root, state, id, config.effects[id], true));
  };
export const releaseDynamicItem = (root, state, node) => {
    releaseServiceScopes(root, node);
    if (node.dataset.amlRowScope) unbindRows(state, node.dataset.amlRowScope);
    node.querySelectorAll('[data-aml-row-scope]').forEach(child => unbindRows(state, child.dataset.amlRowScope));
    const owned = [node, ...node.querySelectorAll('[data-aml-dynamic-state], [data-aml-dynamic-effects]')];
    const targets = new Set(owned.flatMap(child => JSON.parse(child.dataset.amlDynamicState || '[]')));
    const effects = new Set(owned.flatMap(child => JSON.parse(child.dataset.amlDynamicEffects || '[]')));
    const config = rootConfigs.get(root) || {};
    targets.forEach((target) => {
      deletePath(state, target);
      for (const group of ['shared', 'persisted', 'types', 'typeRules', 'valueTypes', 'arrayMetadata', 'computed']) delete config[group]?.[target];
    });
    effects.forEach((id) => {
      cleanupEffect(root, id, 'dynamic-unmount');
      effectRuntimes.get(root)?.delete(id);
      delete config.effects?.[id];
    });
  };
import {animateIn} from './animations-runtime.js';
export {animateIn} from './animations-runtime.js';
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
          setDisabledReason(control, panel, !active);
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
export {restoreContexts} from './browser-storage.js';
import {persistContext} from './browser-storage.js';
export const renderContexts = (root, state, target = null) => {
    root.querySelectorAll('[data-aml-context-provider]').forEach((provider) => {
      const rule = JSON.parse(provider.dataset.amlContextProvider);
      if (target && rule.state && !pathAffects(rule.state, target)) return;
      let value = rule.state ? readPath(state, rule.state) : rule.value;
      if (rule.persist) persistContext(root, rule, value);
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
    const config = rootConfigs.get(scope) || rootConfigs.get(scope.closest?.('[data-aml-client]')) || {};
    const textContext = {valueTypes: config.valueTypes || {}, stateTypes: config.types || {}};
    // Resolve structural branches before binding their descendants. New nested
    // branches must join this traversal rather than wait for another State change.
    const structureSelector = '[data-aml-list], [data-aml-list-value], [data-aml-ilist], [data-aml-when]';
    const pendingLists = [...scope.querySelectorAll(structureSelector)];
    const visitedLists = new Set();
    while (pendingLists.length) {
      let list = pendingLists.shift();
      if (!scope.contains(list) || visitedLists.has(list)) continue;
      visitedLists.add(list);
      if (list.dataset.amlWhen !== undefined) {
        const row = list.closest('[data-aml-row-scope]');
        const rule = JSON.parse(list.dataset.amlWhen);
        const branch = readPath(state, rule.state) === rule.equals ? 'then' : 'else';
        const content = list.querySelector(':scope > [data-aml-when-content]');
        if (content && list.dataset.amlWhenActive !== branch) {
          const template = list.querySelector(`:scope > template[data-aml-when-${branch}]`);
          if (row) releaseDynamicItem(scope, state, content);
          else releaseServiceScopes(scope, content);
          content.replaceChildren(template?.content.cloneNode(true) || document.createDocumentFragment());
          if (row) hydrateDynamicItem(scope, state, content, branch);
          list.dataset.amlWhenActive = branch;
          // A fresh subtree needs every binding, even when another State caused it.
          target = null;
        }
        if (row && content && !content.dataset.amlDynamicState) trackInitialRow(content);
        pendingLists.unshift(...list.querySelectorAll(structureSelector));
        continue;
      }
      try {
        const options = listOptions(list, state, textContext);
        const items = listItems(list, state, target, textContext);
        if (items === null) { applyListOptions(list, options); continue; }
        const labelPath = list.dataset.amlListLabel || '';
        const keyPath = list.dataset.amlListKey || '';
        const itemTag = list.dataset.amlListItemTag || 'li';
        const template = list.querySelector(':scope > template[data-aml-list-template]');
        const existing = new Map([...list.children]
          .filter((child) => child !== template && child.dataset.amlListKey !== undefined)
          .map((child) => [child.dataset.amlListKey, child]));
        const seenKeys = new Set();
        const calculated = list.dataset.amlListValue !== undefined || list.dataset.amlIlist !== undefined;
        // Validate the entire projection before touching the last valid DOM.
        const rows = items.map((item, index) => {
          const record = item !== null && typeof item === 'object';
          const itemValues = record ? item : {value: item};
          const label = record && labelPath ? readPath(item, labelPath) : item;
          const key = (keyPath ? readPath(item, keyPath) : index) ?? index;
          if (calculated && typeof key !== 'string' && !(typeof key === 'number' && Number.isSafeInteger(key))) throw new TypeError('AML collection keys must be strings or integers.');
          const keyString = String(key);
          if (seenKeys.has(keyString)) throw new Error(`Duplicate AML collection key: ${keyString}`);
          if (calculated && !template && label != null && !['string', 'number', 'boolean'].includes(typeof label)) throw new TypeError('AML collection labels must be scalar values.');
          seenKeys.add(keyString);
          return {index, itemValues, label, keyString};
        });
        list = applyListOptions(list, options);
        const focus = list.contains(document.activeElement) ? document.activeElement : null;
        const selection = focus && typeof focus.selectionStart === 'number' ? [focus.selectionStart, focus.selectionEnd] : null;
        let cursor = [...list.children].find(child => child.dataset.amlListKey !== undefined) || null;
        rows.forEach(({index, itemValues, label, keyString}) => {
          const node = existing.get(keyString) || document.createElement(itemTag);
          const isNew = !node.hasChildNodes();
          existing.delete(keyString);
          node.dataset.amlListIndex = String(index); node.dataset.amlListKey = keyString;
          const rowScope = list.dataset.amlIlist ? `${list.dataset.amlIlist}.rows.${rowToken(keyString)}` : null;
          if (rowScope) {
            bindRow(state, rowScope, {dependencies: listDependencies(list), value: itemValues, key: keyString, keyPath, source: list.dataset.amlListEditable || list.dataset.amlList, direct: list.dataset.amlListValue === undefined});
            node.dataset.amlRowScope = rowScope;
          }
          if (template && isNew) {
            node.appendChild(template.content.cloneNode(true));
            if (rowScope) {
              const mapping = {[`${list.dataset.amlIlist}.rows.template`]: rowScope};
              const scopes = root => root.querySelectorAll('*').forEach(child => {
                if (child.dataset.amlIlist) mapping[child.dataset.amlIlist] = `${child.dataset.amlIlist}.items.${rowToken(keyString)}`;
                if (child.localName === 'template') scopes(child.content);
              });
              scopes(node); rewriteRow(node, mapping);
            }
            hydrateDynamicItem(scope, state, node, keyString);
          }
          if (template) {
            node.querySelectorAll('[data-aml-item-bind]').forEach((binding) => {
              if (binding.closest('[data-aml-list-key]') !== node) return;
              binding.textContent = phpString(readPath(itemValues, binding.dataset.amlItemBind) ?? '');
            });
          } else node.textContent = phpString(label ?? '');
          node.dataset.amlListIndex = String(index);
          node.dataset.amlListKey = keyString;
          if (list.dataset.amlSortable === 'true') {
            node.draggable = true; node.tabIndex = 0;
            node.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
          }
          if (node !== cursor) { if (list.moveBefore && node.parentNode === list) list.moveBefore(node, cursor); else list.insertBefore(node, cursor); }
          cursor = node.nextElementSibling;
          if (rowScope && !node.dataset.amlDynamicState) trackInitialRow(node);
          pendingLists.unshift(...node.querySelectorAll(structureSelector));
          if (isNew) animateIn(node);
        });
        existing.forEach((node) => { releaseDynamicItem(scope, state, node); node.remove(); });
        const empty = list.querySelector(':scope > [data-aml-list-empty]');
        if (empty) empty.hidden = items.length > 0;
        if (focus?.isConnected && document.activeElement !== focus) { focus.focus({preventScroll: true}); if (selection) focus.setSelectionRange(...selection); }
        if (list.dataset.amlIlist) target = null;
        listRendered(list);
      } catch (error) { reportListError(scope, list, error); }
    }
    renderIcons(scope, state, textContext);
    scope.querySelectorAll('[data-aml-href]').forEach(node => {
      try {
        const value = resolveData(JSON.parse(node.dataset.amlHref), state, {...textContext});
        if (typeof value !== 'string' || /[\x00-\x1f\x7f]/.test(value) || (/^([a-z][a-z0-9+.-]*):/i.test(value.trim()) && !/^(https?|mailto|tel):/i.test(value.trim()))) throw new TypeError('Unsafe or unsupported reactive link URL.');
        if (node.getAttribute('href') !== value.trim()) node.setAttribute('href', value.trim());
      } catch (error) { scope.dispatchEvent(new CustomEvent('aml:render-error', {detail: {error, node}})); }
    });
    scope.querySelectorAll('[data-aml-bind-value]').forEach((node) => {
      const expression = JSON.parse(node.dataset.amlBindValue), context = {...textContext};
      const value = resolveData(expression, state, context);
      setBoundText(node, phpString(value, resolveType(expression, state, context, value), context));
    });
    scope.querySelectorAll('[data-aml-bind]').forEach((node) => {
      if (target && !pathAffects(node.dataset.amlBind, target)) return;
      const value = readPath(state, node.dataset.amlBind);
      if (node.matches('progress,meter')) {
        node.value = Number(value ?? 0);
      } else if (node.matches('button[data-aml-model]')) {
        node.value = value == null ? '' : String(value);
      } else if (node.matches('input,textarea,select')) {
        if (node.type === 'file') return; // Selection is owned by the browser; state contains metadata only.
        if (node.type === 'checkbox') node.checked = Boolean(value);
        else if (node.type === 'radio') node.checked = node.value === String(value ?? '');
        else if (node.matches('select[multiple]')) {
          const selected = new Set((Array.isArray(value) ? value : [value ?? '']).map(String));
          [...node.options].forEach(option => { option.selected = selected.has(option.value); });
        }
        else if (document.activeElement !== node) node.value = value ?? '';
      } else {
        setBoundText(node, phpString(value, resolveType({$state: node.dataset.amlBind}, state, textContext, value), textContext));
      }
    });
    scope.querySelectorAll('[data-aml-show-when]').forEach((node) => {
      const rule = JSON.parse(node.dataset.amlShowWhen);
      if (target && !pathAffects(rule.state, target)) return;
      const hidden = readPath(state, rule.state) !== rule.equals;
      node.toggleAttribute('hidden', hidden);
      if (hidden) node.setAttribute('inert', ''); else node.removeAttribute('inert');
      const controls = [...node.querySelectorAll('input,select,textarea,button')];
      if (node.matches('input,select,textarea,button')) controls.push(node);
      controls.forEach(control => setDisabledReason(control, node, hidden));
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
      setDisabledRule(node, disabled);
    });
    renderRichComponents(scope, state, target);
    renderVirtualLists(scope, state);
    renderContexts(scope, state, target);
    renderCalendars(scope);
    renderStyles(scope, state, target, textContext);
  };
import { effectRuntimes, rootConfigs, toastTimers } from './context.js';
import { bindRow, rowToken, unbindRows, deletePath, pathAffects, readPath, recomputeComputed, safeSegments, writePath } from './core/state.js';
import { cleanupEffect, registerEffect } from './effects-runtime.js';
import { commit, resolveData } from './state-runtime.js';
import {resolveType} from './core/value.js';
import {phpString} from './core/php-values.js';
