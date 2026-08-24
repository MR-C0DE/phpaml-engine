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
export const execute = async (root, state, action, trigger = null, executionContext = null) => {
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
import { rootControllers, transactions } from './context.js';
import { clone, readPath } from './core/state.js';
import { apply, commit, resolveData } from './state-runtime.js';
import { csrfToken, prepareApiRequest, refreshCsrfToken } from './http.js';
import { hasAsyncAction } from './core/action-analysis.js';
import { render } from './rendering.js';
import { navigate } from './navigation.js';
