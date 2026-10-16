import {rootControllers} from './context.js';
import {commit, resolveData} from './state-runtime.js';
import {readPath} from './core/state.js';
import {csrfToken, prepareApiRequest, refreshCsrfToken} from './http.js';

export const request = async (root, state, action, trigger, executionContext = null) => {
    const owner = executionContext?.owner || executionContext;
    const data = resolveData(action.data || {}, state, executionContext?.eventData);
    const url = new URL(action.url, location.origin);
    if (url.origin !== location.origin) throw new Error('AML API requests must remain same-origin.');
    const executionGeneration = owner?.generation;
    const isCurrent = () => !owner
      || owner.concurrency === 'parallel'
      || owner.generation === executionGeneration;
    const controllers = rootControllers.get(root) || new Set();
    rootControllers.set(root, controllers);
    if (action.loading) commit(root, state, action.loading, true, executionContext);
    if (action.error) commit(root, state, action.error, '', executionContext);
    trigger?.setAttribute('aria-busy', 'true');
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
        if (timeoutMs > 0) timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
        try {
          const options = prepareApiRequest(url, action, data, controller.signal, csrfToken());
          const response = await fetch(url, options);
          refreshCsrfToken(response);
          const contentType = response.headers.get('content-type') || '';
          const result = contentType.includes('application/json') ? await response.json() : await response.text();
          if (!response.ok) {
            const error = new Error(typeof result === 'object' ? (result.message || result.error || `API request failed: ${response.status}`) : result);
            error.retryable = response.status === 429 || response.status >= 500;
            throw error;
          }
          if (!isCurrent()) return;
          const selected = action.select ? readPath(result, action.select) : result;
          if (action.result) commit(root, state, action.result, selected, executionContext);
          root.dispatchEvent(new CustomEvent('aml:api-success', {detail: {url: url.href, result, attempts: attempt + 1}}));
          return;
        } catch (error) {
          if (!isCurrent() || (error?.name === 'AbortError' && !timedOut)) return;
          const failure = timedOut ? new Error(`API request timed out after ${timeoutMs} ms`) : error;
          const retryable = timedOut || error?.retryable === true || error instanceof TypeError;
          if (attempt >= retries || !retryable) throw failure;
          const delay = Math.min(30_000, Math.max(0, Number(action.retryDelay ?? 250)) * (2 ** attempt));
          root.dispatchEvent(new CustomEvent('aml:api-retry', {detail: {url: url.href, attempt: attempt + 1, delay, error: failure}}));
          if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        } finally {
          if (timeout !== null) clearTimeout(timeout);
          controllers.delete(controller);
          owner?.controllers?.delete(controller);
        }
      }
    } catch (error) {
      if (error?.name === 'AbortError' || !isCurrent()) return;
      if (action.error) commit(root, state, action.error, error.message, executionContext);
      root.dispatchEvent(new CustomEvent('aml:api-error', {detail: {url: url.href, error}}));
      if (executionContext) throw error;
    } finally {
      if (action.loading && isCurrent()) commit(root, state, action.loading, false, executionContext);
      trigger?.removeAttribute('aria-busy');
      if (trigger instanceof HTMLButtonElement) trigger.disabled = false;
    }
  };
