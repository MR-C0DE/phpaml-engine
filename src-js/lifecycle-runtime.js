import {restoreArrayMetadata} from './core/php-arrays.js';
import {prepareScopeModules} from './modules/runtime.js';
const formState = (form) => {
    if (!form?.dataset?.amlFormState) return null;
    try { return JSON.parse(form.dataset.amlFormState); }
    catch (_) { return null; }
  };

const commitFormState = (root, state, rule, target, value) => {
    const path = rule?.[target];
    if (path && !Object.is(readPath(state, path), value)) commit(root, state, path, value);
  };

const updateFormValidityState = (root, state, form, rule) => {
    const valid = form.checkValidity() && !form.querySelector('[aria-invalid="true"]');
    commitFormState(root, state, rule, 'valid', valid);
    commitFormState(root, state, rule, 'invalid', !valid);
    return valid;
  };

const pendingMounts = new WeakMap();
export const mount = (scope = document) => {
    const roots = [...scope.querySelectorAll('[data-aml-client]')];
    const loading = prepareScopeModules(scope);
    if (!loading) return mountRoots(roots);
    const requests = roots.map(root => {
      const request = {connected: root.isConnected};
      pendingMounts.set(root, request); return [root, request];
    });
    return loading.then(() => mountRoots(requests.filter(([root, request]) => {
      if (pendingMounts.get(root) !== request) return false;
      pendingMounts.delete(root);
      return !request.connected || root.isConnected;
    }).map(([root]) => root)));
};
const mountRoots = roots => {
    roots.forEach((root) => {
      if (root.dataset.amlEngineMounted === 'true') return;
      const manifests = [...root.querySelectorAll('template[data-aml-state]')];
      const state = {};
      const config = {shared: {}, persisted: {}, types: {}, typeRules: {}, valueTypes: {}, arrayMetadata: {}, computed: {}, effects: {}};
      manifests.forEach((manifest) => {
        const values = JSON.parse(manifest.dataset.amlState || '{}');
        const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"shared":{},"persisted":{},"types":{},"computed":{},"effects":{}}');
        Object.entries(values).forEach(([target, value]) => {
          if (readPath(state, target) !== undefined) throw new Error(`Duplicate AML state target: ${target}`);
          writePath(state, target, restoreArrayMetadata(value, addition.arrayMetadata?.[target]));
        });
        for (const group of ['shared', 'persisted', 'types', 'typeRules', 'valueTypes', 'arrayMetadata', 'computed', 'effects']) {
          if (group === 'effects') Object.keys(addition.effects || {}).forEach((id) => {
            if (Object.prototype.hasOwnProperty.call(config.effects, id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
          });
          Object.assign(config[group], addition[group] || {});
        }
      });
      restorePersisted(root, state, config);
      Object.entries(config.shared || {}).forEach(([target, key]) => {
        const type = config.types?.[target] || 'mixed';
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
      rootControllers.set(root, new Set());
      rootCleanups.set(root, new Set());
      const listen = (type, listener, options) => {
        root.addEventListener(type, listener, options);
        rootCleanups.get(root).add(() => root.removeEventListener(type, listener, options));
      };
      const executeClientEvent = (target, eventName, event = null) => {
        if (!target || !root.contains(target)) return Promise.resolve(false);
        const encoded = target.getAttribute(`data-aml-client-${eventName}`);
        if (!encoded) return Promise.resolve(false);
        let action;
        try { action = JSON.parse(encoded); }
        catch (error) {
          root.dispatchEvent(new CustomEvent('aml:error', {detail: {error, event: eventName}}));
          return Promise.reject(error);
        }
        return execute(root, state, action, target, {eventData: eventPayload(event)}).then(() => true).catch((error) => {
          root.dispatchEvent(new CustomEvent('aml:error', {detail: {error, action, event: eventName}}));
          console.error(error);
          return false;
        });
      };
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
      listen('click', async (event) => {
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
        const action = JSON.parse(trigger.dataset.amlClientClick);
        if (actionForm && action.type !== 'form-state-reset' && !validateForm(actionForm)) {
          const rule = formState(actionForm);
          commitFormState(root, state, rule, 'submitted', true);
          updateFormValidityState(root, state, actionForm, rule);
          actionForm.querySelector('[aria-invalid="true"]')?.focus();
          return;
        }
        execute(root, state, action, trigger, {eventData: eventPayload(event)}).catch((error) => {
          root.dispatchEvent(new CustomEvent('aml:error', {detail: {error, action}}));
          console.error(error);
        });
      });
      listen('keydown', (event) => {
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
        executeClientEvent(event.target.closest('[data-aml-client-keydown]'), 'keydown', event);
        const tab = event.target.closest('[data-aml-tab]');
        if (!tab || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[data-aml-tab]')];
        let index = tabs.indexOf(tab);
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = tabs.length - 1;
        else index = (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault(); tabs[index].focus(); tabs[index].click();
      });
      listen('keyup', (event) => {
        executeClientEvent(event.target.closest('[data-aml-client-keyup]'), 'keyup', event);
      });
      listen('mouseover', (event) => {
        const target = event.target.closest('[data-aml-client-mouseenter]');
        if (target && !target.contains(event.relatedTarget)) executeClientEvent(target, 'mouseenter', event);
      });
      listen('mouseout', (event) => {
        const target = event.target.closest('[data-aml-client-mouseleave]');
        if (target && !target.contains(event.relatedTarget)) executeClientEvent(target, 'mouseleave', event);
      });
      listen('cancel', (event) => {
        const dialog = event.target.closest('[data-aml-modal]');
        if (!dialog) return;
        event.preventDefault();
        const rule = JSON.parse(dialog.dataset.amlModal);
        commit(root, state, rule.state, false);
      });
      listen('dragstart', (event) => {
        executeClientEvent(event.target.closest('[data-aml-client-dragstart]'), 'dragstart', event);
        const item = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
        if (!item || !event.dataTransfer) return;
        const list = item.parentElement;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/x-aml-index', JSON.stringify({index: Number(item.dataset.amlListIndex), state: list.dataset.amlList}));
        item.setAttribute('aria-grabbed', 'true');
      });
      listen('dragend', (event) => {
        event.target.closest('[aria-grabbed="true"]')?.removeAttribute('aria-grabbed');
        executeClientEvent(event.target.closest('[data-aml-client-dragend]'), 'dragend', event);
      });
      listen('dragover', (event) => {
        const clientTarget = event.target.closest('[data-aml-client-dragover]');
        if (clientTarget) { event.preventDefault(); executeClientEvent(clientTarget, 'dragover', event); }
        if (event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]')) event.preventDefault();
      });
      listen('drop', (event) => {
        const clientTarget = event.target.closest('[data-aml-client-drop]');
        if (clientTarget) { event.preventDefault(); executeClientEvent(clientTarget, 'drop', event); }
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
      listen('scroll', (event) => {
        if (event.target.matches?.('[data-aml-virtual-list]')) renderVirtualLists(root, state);
      }, true);
      listen('input', (event) => {
        const control = event.target.closest('[data-aml-model]');
        if (control && root.contains(control) && control.type !== 'checkbox') {
          updateModel(root, state, control);
          if (control.dataset.amlValidate) validateControl(control);
          scheduleRemoteValidation(root, state, control);
        }
        const preserved = event.target.closest('form[data-aml-form-preserve]');
        if (preserved) preserveForm(preserved);
        const tracked = event.target.closest('form[data-aml-form-state]');
        if (tracked) {
          const rule = formState(tracked);
          commitFormState(root, state, rule, 'dirty', true);
          updateFormValidityState(root, state, tracked, rule);
        }
        executeClientEvent(event.target.closest('[data-aml-client-input]'), 'input', event);
      });
      listen('change', (event) => {
        const control = event.target.closest('[data-aml-model]');
        if (control && root.contains(control)) {
          updateModel(root, state, control);
          if (control.dataset.amlValidate) validateControl(control);
          scheduleRemoteValidation(root, state, control);
        }
        const preserved = event.target.closest('form[data-aml-form-preserve]');
        if (preserved) preserveForm(preserved);
        const tracked = event.target.closest('form[data-aml-form-state]');
        if (tracked) {
          const rule = formState(tracked);
          commitFormState(root, state, rule, 'dirty', true);
          updateFormValidityState(root, state, tracked, rule);
        }
        executeClientEvent(event.target.closest('[data-aml-client-change]'), 'change', event);
      });
      listen('focusin', (event) => {
        executeClientEvent(event.target.closest('[data-aml-client-focus]'), 'focus', event);
      });
      listen('focusout', (event) => {
        const tracked = event.target.closest('form[data-aml-form-state]');
        if (tracked) {
          const rule = formState(tracked);
          commitFormState(root, state, rule, 'touched', true);
          updateFormValidityState(root, state, tracked, rule);
        }
        executeClientEvent(event.target.closest('[data-aml-client-blur]'), 'blur', event);
      });
      listen('submit', async (event) => {
        const form = event.target.closest('form');
        if (!form || !root.contains(form)) return;
        if (form.dataset.amlValidationPassed === 'true') { delete form.dataset.amlValidationPassed; return; }
        event.preventDefault();
        const rule = formState(form);
        commitFormState(root, state, rule, 'submitted', true);
        if (!validateForm(form)) {
          updateFormValidityState(root, state, form, rule);
          form.querySelector('[aria-invalid="true"]')?.focus();
          return;
        }
        const controls = [...form.querySelectorAll('[data-aml-validate-api]')];
        const valid = (await Promise.all(controls.map((control) => validateRemote(root, state, control)))).every(Boolean);
        updateFormValidityState(root, state, form, rule);
        if (valid) {
          if (form.hasAttribute('data-aml-client-submit')) {
            await executeClientEvent(form, 'submit', event);
            return;
          }
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
      listen('pointerover', (event) => revealTooltip(event, true));
      listen('pointerout', (event) => revealTooltip(event, false));
      listen('focusin', (event) => revealTooltip(event, true));
      listen('focusout', (event) => revealTooltip(event, false));
      const closeOutsideDisclosures = (event) => root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]').forEach((trigger) => {
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (trigger.contains(event.target) || panel?.contains(event.target)) return;
        const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
        commit(root, state, rule.state, false);
      });
      document.addEventListener('click', closeOutsideDisclosures);
      rootCleanups.get(root).add(() => document.removeEventListener('click', closeOutsideDisclosures));
      render(root, state);
      root.querySelectorAll('form[data-aml-form-state]').forEach((form) => {
        updateFormValidityState(root, state, form, formState(form));
      });
      root.querySelectorAll('form[data-aml-form-preserve]').forEach(restoreForm);
      root.querySelectorAll('template[data-aml-redirect]').forEach((redirect) => {
        const rule = JSON.parse(redirect.dataset.amlRedirect);
        queueMicrotask(() => navigate(rule.destination, !rule.replace, root));
      });
      remember(root, state, 'mount');
      lifecycle(root, 'mount', {state: clone(state)});
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
export const unmount = (root) => {
    if (root) pendingMounts.delete(root);
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
export const on = (root, phase, handler) => {
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
import { effectRuntimes, mountedRoots, navigationRuntimes, rootCleanups, rootConfigs, rootControllers, rootStates, sharedState, sharedTypes, stateHistories } from './context.js';
import { clone, readPath, recomputeComputed, writePath } from './core/state.js';
import {restorePersisted, restoreIndexed} from './browser-storage.js';
import { matchingContextProvider, render, renderContexts, renderVirtualLists, restoreContexts } from './rendering.js';
import { activateEffect, cleanupEffect } from './effects-runtime.js';
import { eventPayload, newEffectRuntime } from './effects.js';
import { apply, commit, scheduleUpdate } from './state-runtime.js';
import { execute } from './actions-runtime.js';
import { preserveForm, restoreForm, scheduleRemoteValidation, updateModel, validateControl, validateForm, validateRemote } from './forms-runtime.js';
import { lifecycle, remember } from './lifecycle.js';
import { navigate } from './navigation.js';

import { sharedValueTypes } from './context.js';
import { phpType } from './core/php-values.js';
