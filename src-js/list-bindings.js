import {withSource} from './core/diagnostics.js';
import {pathAffects, readPath} from './core/state.js';
import {resolveData} from './state-runtime.js';
import {arrayEntries, isPhpArray} from './core/php-arrays.js';

const bindings = new WeakMap();
const errors = new WeakMap();
const dependencies = (value, paths = new Set()) => {
  if (value && typeof value === 'object') {
    if (typeof value.$state === 'string') paths.add(value.$state);
    Object.values(value).forEach(child => dependencies(child, paths));
  }
  return [...paths];
};

// Null means this source is unaffected; an empty array is a real empty result.
export const listItems = (list, state, target, context) => {
  const source = list.dataset.amlListValue;
  if (source === undefined) {
    if (target && list.dataset.amlList && !pathAffects(list.dataset.amlList, target) && !list.dataset.amlList.includes('.rows.')) return null;
    if (list.dataset.amlList === undefined) return null;
    const items = readPath(state, list.dataset.amlList);
    if (list.dataset.amlIlist !== undefined && !Array.isArray(items)) throw new TypeError('IList expects an indexed array of items.');
    return Array.isArray(items) ? items : [];
  }
  let cached = bindings.get(list);
  if (!cached || cached.source !== source) {
    const expression = JSON.parse(source);
    cached = {source, expression, dependencies: dependencies(expression), initialized: false};
    bindings.set(list, cached);
  }
  if (cached.initialized && target && !cached.dependencies.some(path => pathAffects(path, target))) return null;
  const value = resolveData(cached.expression, state, {...context});
  if (!isPhpArray(value)) throw new TypeError('A calculated IList must return an array.');
  cached.initialized = true;
  return arrayEntries(value).map(([, item]) => item);
};

export const listDependencies = list => bindings.get(list)?.dependencies || [];

export const listRendered = list => { errors.delete(list); };
export const reportListError = (scope, list, error) => {
  if (list.dataset.amlListValue === undefined && list.dataset.amlIlist === undefined) throw error;
  const binding = bindings.get(list);
  error = withSource(error, binding?.expression?.$expression?.right?.source);
  if (errors.get(list) === error.message) return;
  errors.set(list, error.message);
  scope.dispatchEvent(new CustomEvent('aml:render-error', {detail: {error, node: list}}));
  console.error(error);
};

export const listOptions = (list, state, context) => {
  if (!list.dataset.amlListOptions) return null;
  const expressions = JSON.parse(list.dataset.amlListOptions);
  const values = Object.fromEntries(Object.entries(expressions).map(([name, expression]) => [name, resolveData(expression, state, {...context})]));
  const markers = ['disc','circle','square','none','decimal','decimal-leading-zero','lower-alpha','upper-alpha','lower-latin','upper-latin','lower-roman','upper-roman','lower-greek','armenian','georgian'];
  for (const [name, value] of Object.entries(values)) {
    const valid = name === 'type' ? typeof value === 'string' && ['unordered', 'ordered'].includes(value.trim().toLowerCase())
      : name === 'start' ? Number.isSafeInteger(value)
      : name === 'reversed' ? typeof value === 'boolean'
      : name === 'marker' ? markers.includes(value)
      : name === 'markerPosition' ? ['inside', 'outside'].includes(value) : false;
    if (!valid) throw new TypeError('Invalid IList ' + name + ' value.');
  }
  return values;
};
export const applyListOptions = (list, values) => {
  if (!values) return list;
  const tag = values.type === undefined ? list.localName : values.type.trim().toLowerCase() === 'ordered' ? 'ol' : 'ul';
  const focus = list.contains(document.activeElement) ? document.activeElement : null;
  const selection = focus && typeof focus.selectionStart === 'number' ? [focus.selectionStart, focus.selectionEnd] : null;
  if (tag !== list.localName) {
    const replacement = document.createElement(tag);
    for (const attribute of list.attributes) replacement.setAttribute(attribute.name, attribute.value);
    replacement.append(...list.childNodes); list.replaceWith(replacement); list = replacement;
    if (focus) { focus.focus({preventScroll: true}); if (selection) focus.setSelectionRange(...selection); }
  }
  if (tag === 'ol' && values.start !== undefined) { if (list.getAttribute('start') !== String(values.start)) list.setAttribute('start', values.start); }
  else list.removeAttribute('start');
  if (list.hasAttribute('reversed') !== (tag === 'ol' && values.reversed === true)) list.toggleAttribute('reversed', tag === 'ol' && values.reversed === true);
  if (values.marker !== undefined && list.style.listStyleType !== values.marker) list.style.listStyleType = values.marker;
  if (values.markerPosition !== undefined && list.style.listStylePosition !== values.markerPosition) list.style.listStylePosition = values.markerPosition;
  return list;
};
