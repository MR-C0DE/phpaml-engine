export const updateActiveLinks = () => {
    document.querySelectorAll('a[href]').forEach((link) => {
      let url;
      try { url = new URL(link.href, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;
      const active = url.pathname === location.pathname;
      if (active) link.setAttribute('aria-current', 'page');
      else if (link.getAttribute('aria-current') === 'page') link.removeAttribute('aria-current');
    });
  };
export const clearNavigationState = (current) => {
    const boundary = current.querySelector('[data-aml-navigation-boundary]');
    if (!boundary) return;
    boundary.querySelector(':scope > [data-aml-navigation-overlay]')?.remove();
    const content = boundary.querySelector(':scope > [data-aml-navigation-content]');
    content?.removeAttribute('inert');
    content?.removeAttribute('aria-hidden');
  };
export const showNavigationState = (current, status, message = '', url = location.href, signal = null) => {
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
export const focusNavigatedPage = (url) => {
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
export const syncHead = (nextDocument) => {
    document.title = nextDocument.title || document.title;
    const selector = 'meta[name="description"],meta[name="robots"],link[rel="canonical"],meta[property^="og:"],meta[name^="twitter:"]';
    document.head.querySelectorAll(selector).forEach((node) => node.remove());
    nextDocument.head.querySelectorAll(selector).forEach((node) => document.head.appendChild(document.importNode(node, true)));
  };
export const navigate = async (destination, push = true, sourceRoot = null) => {
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
export const context = (root, name, fallback = null) => {
    const providers = [...root.querySelectorAll('[data-aml-context-provider]')];
    const provider = providers.reverse().find((candidate) => JSON.parse(candidate.dataset.amlContextProvider).name === name);
    if (!provider) return fallback;
    try { return JSON.parse(provider.dataset.amlContextValue); } catch (_) { return fallback; }
  };
export const route = () => {
    const url = new URL(location.href);
    const query = {};
    url.searchParams.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(query, key)) query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
      else query[key] = value;
    });
    return Object.freeze({path: url.pathname, query: Object.freeze(query), hash: url.hash});
  };
import { mountedRoots, navigationRuntimes, rootConfigs, rootStates } from './context.js';
import { recomputeComputed, writePath } from './core/state.js';
import { restoredValue } from './storage.js';
import { scheduleUpdate } from './state-runtime.js';
import { mount, unmount } from './lifecycle-runtime.js';
