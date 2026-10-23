import {pathAffects} from './core/state.js';
import {resolveData} from './state-runtime.js';

const dimensions = /^(?:(?:min-|max-)?(?:width|height)|(?:margin|padding)(?:-(?:top|right|bottom|left|inline|block)(?:-start|-end)?)?|(?:row-|column-)?gap|top|right|bottom|left|inset|font-size|letter-spacing|word-spacing|text-indent|outline-(?:width|offset)|border(?:-(?:top|right|bottom|left))?-width|border(?:-(?:top|bottom)-(?:left|right))?-radius)$/;
const bindings = new WeakMap();
const keywords = ['initial', 'inherit', 'unset', 'revert', 'revert-layer'];

// Keep these contracts in step with View's StyleValue::normalize().
export const normalizeStyleValue = (property, value, rule = 'css') => {
  const invalid = message => { throw new TypeError(`CSS ${property}: ${message}`); };
  if (!['string', 'number'].includes(typeof value) || typeof value === 'number' && !Number.isFinite(value)) invalid('expected a string or finite number');
  if (rule === 'iconDimension') {
    const plain = typeof value === 'string' ? styleDeclaration(property, value).value.replace(/\/\*.*?\*\//gs, ' ').trim() : value;
    const number = typeof plain === 'string' && plain.match(/^(-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)(?:[a-zA-Z]+|%)?$/);
    if (typeof plain === 'number' ? plain < 0 : number && Number(number[1]) < 0) invalid('icon dimension must not be negative');
  }
  if (['padding', 'fontSize', 'letterSpacing', 'lineHeight'].includes(rule)) {
    if (typeof value !== 'number') invalid('expected a number');
    if (rule === 'padding') value = Math.max(0, value);
    if (rule === 'fontSize' && (value <= 0 || value > 1000) || rule === 'lineHeight' && (value <= 0 || value > 20)
        || rule === 'letterSpacing' && (value < -100 || value > 100)) invalid('out of range');
  }
  if (rule === 'fontWeight') {
    value = String(value).toLowerCase();
    if (!['normal', 'bold', 'bolder', 'lighter'].includes(value) && !(/^\d+$/.test(value) && Number(value) >= 100 && Number(value) <= 900 && Number(value) % 100 === 0)) invalid('unknown font weight');
  }
  if (rule === 'textAlign') {
    value = String(value).toLowerCase();
    if (!['start', 'end', 'left', 'right', 'center', 'justify'].includes(value)) invalid('unknown alignment');
  }
  if (rule === 'alignment') {
    value = ({leading: 'flex-start', start: 'flex-start', top: 'flex-start', center: 'center', trailing: 'flex-end', end: 'flex-end', bottom: 'flex-end', stretch: 'stretch'})[String(value).toLowerCase()];
    if (!value) invalid('unknown alignment');
  }
  if (rule === 'textColor' && value === '') invalid('empty color');
  if (rule !== 'raw' && typeof value === 'number') value = String(value) + (dimensions.test(property) ? 'px' : '');
  value = String(value);
  if (/[;{}<>\x00-\x1F\x7F]/.test(value)) invalid('unsafe value');
  styleDeclaration(property, value);
  return value;
};

export const styleDeclaration = (property, value, keyframe = false) => {
  const stack = []; let quote = null, priority = null;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '\\') { if (++i >= value.length) throw new TypeError('Unclosed CSS escape.'); continue; }
    if (quote !== null) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (value.slice(i, i + 2) === '/*') {
      const end = value.indexOf('*/', i + 2);
      if (end === -1) throw new TypeError('Unclosed CSS comment.');
      i = end + 1; continue;
    }
    if (char === '(' || char === '[') stack.push(char);
    if ((char === ')' || char === ']') && stack.pop() !== (char === ')' ? '(' : '[')) throw new TypeError('Unbalanced CSS value.');
    if (char === '!' && !stack.length) priority = i;
  }
  if (quote !== null || stack.length) throw new TypeError('Unbalanced CSS value.');
  const important = priority !== null && /^!\s*important\s*$/i.test(value.slice(priority).replace(/\/\*.*?\*\//gs, ' '));
  if (important) value = value.slice(0, priority).trimEnd();
  const plain = value.replace(/\/\*.*?\*\//gs, ' ').trim();
  const keyword = keywords.includes(plain.toLowerCase()) ? plain.toLowerCase() : null;
  if (keyframe && keyword !== null && !important) throw new TypeError('Write CSS-wide keywords statically in keyframes; reactive keyframe values require a concrete value.');
  const active = (plain !== '' || property.startsWith('--')) && !(keyframe && important);
  if (active && value === '') value = ' ';
  return {value, important: important && active, active, keyword};
};

const dependencies = (value, paths = new Set()) => {
  if (value && typeof value === 'object') {
    if (typeof value.$state === 'string') paths.add(value.$state);
    Object.values(value).forEach(child => dependencies(child, paths));
  }
  return [...paths];
};

export const renderStyles = (scope, state, target, context) => {
  const nodes = [...scope.querySelectorAll('[data-aml-style-bindings]')];
  if (scope.matches?.('[data-aml-style-bindings]')) nodes.unshift(scope);
  for (const node of nodes) {
    const active = new Set((node.getAttribute('data-aml-style-active') || '').split(/\s+/).filter(Boolean));
    const important = new Set((node.getAttribute('data-aml-style-important') || '').split(/\s+/).filter(Boolean));
    const source = node.dataset.amlStyleBindings;
    let cached = bindings.get(node);
    if (!cached || cached.source !== source) {
      cached = {source, rules: Object.entries(JSON.parse(source)).map(([variable, rule]) => ({variable, ...rule, dependencies: dependencies(rule.value), initialized: false}))};
      bindings.set(node, cached);
    }
    for (const binding of cached.rules) {
      if (binding.initialized && target && !binding.dependencies.some(path => pathAffects(path, target))) continue;
      try {
        const normalized = normalizeStyleValue(binding.property, resolveData(binding.value, state, {...context}), binding.rule);
        const declaration = styleDeclaration(binding.property, normalized, binding.keyframe);
        for (const suffix of ['', ...keywords.map(keyword => '-' + keyword)]) { active.delete(binding.variable + suffix); important.delete(binding.variable + suffix); }
        const token = binding.variable + (declaration.keyword === null ? '' : '-' + declaration.keyword);
        if (declaration.active && declaration.keyword === null) {
          if (node.style.getPropertyValue(binding.variable) !== declaration.value) node.style.setProperty(binding.variable, declaration.value);
        } else node.style.removeProperty(binding.variable);
        if (declaration.active) active.add(token);
        if (declaration.important) important.add(token);
        binding.initialized = true;
        binding.error = null;
      } catch (error) {
        // A bad style must neither destroy the last valid CSS nor stop sibling bindings.
        if (binding.error !== error.message) {
          binding.error = error.message;
          scope.dispatchEvent(new CustomEvent('aml:render-error', {detail: {error, node, property: binding.property}}));
          console.error(error);
        }
      }
    }
    for (const [attribute, tokens] of [['data-aml-style-active', active], ['data-aml-style-important', important]]) {
      const value = [...tokens].join(' ');
      if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
    }
  }
};
