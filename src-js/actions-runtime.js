export const request = async (root, state, action, trigger, executionContext = null) => {
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
    const options = prepareApiRequest(url, action, data, controller.signal, csrfToken());
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
export const matches = (state, action) => {
    const current = Object.hasOwn(action, 'left') ? resolveData(action.left, state) : readPath(state, action.state);
    const expected = resolveData(action.value, state);
    if (action.operator === 'eq') return current === expected;
    if (action.operator === 'neq') return current !== expected;
    if (action.operator === 'gt') return current > expected;
    if (action.operator === 'gte') return current >= expected;
    if (action.operator === 'lt') return current < expected;
    if (action.operator === 'lte') return current <= expected;
    if (action.operator === 'truthy') return Boolean(current);
    if (action.operator === 'falsy') return !Boolean(current);
    return false;
  };
export const execute = async (root, state, action, trigger = null, executionContext = null) => {
    if (action.type === 'element-ref') {
      const element = root.querySelector(`[data-aml-ref="${CSS.escape(String(action.ref || ''))}"]`);
      if (!element) throw new Error(`Unknown AML element ref: ${action.ref}`);
      if (!['focus', 'blur', 'select', 'play', 'pause'].includes(action.operation)) throw new Error(`Unsupported AML ref operation: ${action.operation}`);
      if (typeof element[action.operation] !== 'function') throw new Error(`Element ref does not support ${action.operation}`);
      const result = element[action.operation]();
      if (result && typeof result.then === 'function') await result;
      return;
    }
    if (action.type === 'form-state-reset') {
      const form = trigger?.closest?.('form[data-aml-form-state]');
      form?.reset();
      if (form) queueMicrotask(() => form.querySelectorAll('[data-aml-model]').forEach((control) => updateModel(root, state, control)));
      commit(root, state, action.dirty, false, executionContext);
      commit(root, state, action.touched, false, executionContext);
      commit(root, state, action.valid, true, executionContext);
      commit(root, state, action.invalid, false, executionContext);
      commit(root, state, action.submitting, false, executionContext);
      commit(root, state, action.submitted, false, executionContext);
      commit(root, state, action.error, '', executionContext);
      return;
    }
    if (action.type === 'form-state-action') {
      const childContext = executionContext || {};
      commit(root, state, action.submitting, true, executionContext);
      commit(root, state, action.submitted, true, executionContext);
      commit(root, state, action.error, '', executionContext);
      try {
        await execute(root, state, action.action, trigger, childContext);
        root.dispatchEvent(new CustomEvent('aml:form-success', {detail: {action}}));
      } catch (error) {
        commit(root, state, action.error, error?.message || String(error), executionContext);
        root.dispatchEvent(new CustomEvent('aml:form-error', {detail: {action, error}}));
      } finally {
        commit(root, state, action.submitting, false, executionContext);
      }
      return;
    }
    if (action.type === 'action-state') {
      const childContext = executionContext || {};
      commit(root, state, action.pending, true, executionContext);
      commit(root, state, action.success, false, executionContext);
      commit(root, state, action.error, '', executionContext);
      try {
        await execute(root, state, action.action, trigger, childContext);
        commit(root, state, action.success, true, executionContext);
        root.dispatchEvent(new CustomEvent('aml:action-success', {detail: {action}}));
      } catch (error) {
        commit(root, state, action.error, error?.message || String(error), executionContext);
        root.dispatchEvent(new CustomEvent('aml:action-error', {detail: {action, error}}));
      } finally {
        commit(root, state, action.pending, false, executionContext);
      }
      return;
    }
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
    if (action.type === 'console') {
      const method = action.level === 'warn' ? 'warn' : action.level === 'error' ? 'error' : 'log';
      console[method](...resolveData(action.values || [], state, executionContext?.eventData));
      return;
    }
    if (action.type === 'navigate') await navigate(action.destination, !action.replace, root);
    else if (action.type === 'api') await request(root, state, action, trigger, executionContext);
    else apply(root, state, action, executionContext);
  };
import { rootControllers, transactions } from './context.js';
import { clone, readPath } from './core/state.js';
import { apply, commit, resolveData } from './state-runtime.js';
import { csrfToken, prepareApiRequest, refreshCsrfToken } from './http.js';
import { hasAsyncAction } from './core/action-analysis.js';
import { render } from './rendering.js';
import { navigate } from './navigation.js';
import { updateModel } from './forms-runtime.js';
