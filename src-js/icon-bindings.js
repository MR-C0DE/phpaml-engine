import {resolveData} from './state-runtime.js';

const shapes = {path: ['d'], circle: ['cx', 'cy', 'r', 'fill'], ellipse: ['cx', 'cy', 'rx', 'ry'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'], polyline: ['points'], polygon: ['points']};
const cache = new Map(), bindings = new WeakMap();
const retries = new Set(), retryDelays = [500, 1500, 4000];
export const iconName = name => {
  if (typeof name !== 'string' || name.length > 100 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) throw new TypeError('Icon expects a Lucide name such as heart or arrow-right.');
  return name;
};
export const iconGeometry = nodes => {
  if (!Array.isArray(nodes) || !nodes.length || nodes.length > 128) throw new TypeError('Invalid icon geometry.');
  for (const node of nodes) {
    if (!Array.isArray(node) || node.length !== 2 || typeof node[0] !== 'string' || !Object.hasOwn(shapes, node[0]) || !node[1] || typeof node[1] !== 'object' || Array.isArray(node[1]) || !Object.keys(node[1]).length) throw new TypeError('Invalid icon shape.');
    for (const [key, value] of Object.entries(node[1])) {
      if (!shapes[node[0]].includes(key) || typeof value !== 'string' || value.length > 16000 || (key === 'fill' ? value !== 'currentColor' : !(key === 'd' ? /^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\s-]+$/ : /^[Ee0-9.,+\s-]+$/).test(value))) throw new TypeError('Unsafe icon geometry attribute.');
    }
  }
  return nodes;
};
const remember = (key, value) => {
  cache.delete(key); cache.set(key, value);
  if (cache.size > 256) cache.delete(cache.keys().next().value);
  return value;
};
const load = (url) => {
  if (cache.has(url)) return cache.get(url);
  const networkError = error => { error.iconRetryable = true; throw error; };
  const promise = fetch(url, {credentials: 'same-origin', redirect: 'error', cache: 'no-cache', headers: {Accept: 'application/json'}}).catch(networkError).then(async response => {
    if (!response.ok) {
      const error = new Error('Unknown or unavailable Lucide icon: ' + url.split('/').pop().replace(/\.json$/, '') + '.');
      error.iconRetryable = [408, 429].includes(response.status) || response.status >= 500;
      throw error;
    }
    if (Number(response.headers.get('content-length')) > 65536) throw new Error('Icon data is too large.');
    const text = await response.text().catch(networkError);
    if (text.length > 65536) throw new Error('Icon data is too large.');
    return iconGeometry(JSON.parse(text));
  });
  remember(url, promise);
  promise.catch(() => { if (cache.get(url) === promise) cache.delete(url); });
  return promise;
};
const report = (scope, node, binding, error) => {
  const key = error.message;
  if (binding.error === key) return;
  binding.error = key;
  scope.dispatchEvent(new CustomEvent('aml:render-error', {detail: {error, node}}));
  console.error(error);
};
const cancelRetry = binding => {
  if (!binding.retry) return;
  clearTimeout(binding.retry.timer);
  retries.delete(binding.retry);
  binding.retry = null;
};
const retryIcon = retry => {
  const {binding, ticket, url, name, catalog} = retry;
  const scope = retry.scope.deref(), node = retry.node.deref();
  cancelRetry(binding);
  if (!scope || !node?.isConnected || !scope.contains(node) || ticket !== binding.ticket) return;
  requestIcon(scope, node, binding, ticket, url, name, catalog);
};
const requestIcon = (scope, node, binding, ticket, url, name, catalog) => {
  load(url).then(geometry => {
    if (ticket !== binding.ticket || !node.isConnected || !scope.contains(node)) return;
    const children = geometry.map(([tag, attributes]) => {
      const child = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
      return child;
    });
    node.replaceChildren(...children); node.dataset.amlIconName = name; binding.catalog = catalog;
    binding.error = null; binding.attempts = 0;
  }).catch(error => {
    if (ticket !== binding.ticket || !node.isConnected || !scope.contains(node)) return;
    report(scope, node, binding, error);
    if (!error.iconRetryable) return;
    // Failed bindings wait weakly: detached components are not kept alive by an
    // outage. Only three timed retries; a later online event starts a new cycle.
    const retry = {scope: new WeakRef(scope), node: new WeakRef(node), binding, ticket, url, name, catalog};
    binding.retry = retry; retries.add(retry);
    if (navigator.onLine !== false && binding.attempts < retryDelays.length) {
      retry.timer = setTimeout(() => retryIcon(retry), retryDelays[binding.attempts++]);
    }
  });
};
if (typeof window !== 'undefined') window.addEventListener('online', () => {
  for (const retry of [...retries]) { retry.binding.attempts = 0; retryIcon(retry); }
});
export const cleanupIcons = scope => {
  const nodes = [...scope.querySelectorAll('[data-aml-icon], [data-aml-icon-label]')];
  if (scope.matches?.('[data-aml-icon], [data-aml-icon-label]')) nodes.unshift(scope);
  for (const node of nodes) {
    const binding = bindings.get(node);
    if (binding) { ++binding.ticket; cancelRetry(binding); bindings.delete(node); }
  }
  for (const retry of retries) if (!retry.scope.deref() || retry.scope.deref() === scope) cancelRetry(retry.binding);
};
export const renderIcons = (scope, state, context) => {
  const nodes = [...scope.querySelectorAll('[data-aml-icon], [data-aml-icon-label]')];
  if (scope.matches?.('[data-aml-icon], [data-aml-icon-label]')) nodes.unshift(scope);
  for (const node of nodes) {
    let binding = bindings.get(node);
    if (!binding) { binding = {ticket: 0}; bindings.set(node, binding); }
    try {
      if (node.hasAttribute('data-aml-icon-label')) {
        const label = resolveData(JSON.parse(node.dataset.amlIconLabel), state, {...context});
        if (label !== null && (typeof label !== 'string' || !label.trim())) throw new TypeError('Icon label must be a nonempty string or null.');
        if (label === null) { node.removeAttribute('role'); node.removeAttribute('aria-label'); if (node.getAttribute('aria-hidden') !== 'true') node.setAttribute('aria-hidden', 'true'); }
        else { node.removeAttribute('aria-hidden'); if (node.getAttribute('role') !== 'img') node.setAttribute('role', 'img'); if (node.getAttribute('aria-label') !== label) node.setAttribute('aria-label', label); }
      }
      if (!node.hasAttribute('data-aml-icon')) { ++binding.ticket; cancelRetry(binding); binding.requested = null; binding.error = null; continue; }
      const name = iconName(resolveData(JSON.parse(node.dataset.amlIcon), state, {...context}));
      const catalog = node.dataset.amlIconCatalog;
      if (typeof catalog !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/)*assets\/phpaml\/lucide\/\d+\.\d+\.\d+$/.test(catalog)) throw new TypeError('Invalid local icon catalogue URL.');
      const url = new URL(`${catalog}/${name}.json`, location.origin).href;
      if (binding.requested === url) continue;
      cancelRetry(binding);
      const ticket = ++binding.ticket; binding.requested = url; binding.error = null; binding.attempts = 0;
      if (!binding.seeded) {
        binding.seeded = true;
        const initial = iconName(node.dataset.amlIconName);
        remember(new URL(`${catalog}/${initial}.json`, location.origin).href,
          Promise.resolve(iconGeometry([...node.children].map(child => [child.localName, Object.fromEntries([...child.attributes].map(attr => [attr.name, attr.value]))]))));
      }
      if (node.dataset.amlIconName === name && binding.catalog === catalog) continue;
      if (node.dataset.amlIconName === name && binding.catalog === undefined) { binding.catalog = catalog; continue; }
      requestIcon(scope, node, binding, ticket, url, name, catalog);
    } catch (error) { ++binding.ticket; cancelRetry(binding); binding.requested = null; report(scope, node, binding, error); }
  }
};
