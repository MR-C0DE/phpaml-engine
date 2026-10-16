import catalogue from './catalogue.json' with {type: 'json'};
import callbacks from './callables.json' with {type: 'json'};

export const moduleNames = Object.freeze(Object.keys(catalogue));
export const phpModuleNames = Object.freeze(moduleNames.filter(name => catalogue[name].kind !== 'browser'));
export const moduleDependencies = Object.fromEntries(Object.entries(catalogue).map(([name, item]) => [name, item.dependencies]));
const functions = new Map(Object.entries(catalogue).flatMap(([module, item]) => item.functions.map(name => [name, module])));
const classes = new Map(Object.entries(catalogue).flatMap(([module, item]) => item.classes.map(name => [name, module])));
const nativeModules = {nativeDate: 'date', nativeIntl: 'intl', nativeSpl: 'spl', nativeReflection: 'reflection'};
const normalize = name => typeof name === 'string' ? name.replace(/^\\/, '').toLowerCase() : '';

// Walk instructions, never execute PHP to discover dependencies. Dynamic targets
// retain the complete supported catalogue rather than changing callable semantics.
export const requiredModules = node => {
  const needed = new Set(), seen = new WeakSet();
  const add = name => {
    if (!Object.hasOwn(catalogue, name) || needed.has(name)) return;
    needed.add(name); moduleDependencies[name].forEach(add);
  };
  const all = () => phpModuleNames.forEach(add);
  const builtin = (name, args = []) => {
    name = normalize(name); if (functions.has(name)) add(functions.get(name));
    if (Object.hasOwn(callbacks, name)) {
      // Unpacking can move the callback to any parameter; do not infer its target
      // from the unexpanded argument positions.
      if (args.some(argument => argument.spread)) all();
      // A compiled closure/function reference carries its own body in the scope.
      for (const parameter of callbacks[name]) {
        const argument = args.find(argument => argument.name && argument.name === parameter.name) || args.at(parameter.index);
        const value = argument?.value;
        if (typeof value === 'string') {if (functions.has(normalize(value))) add(functions.get(normalize(value)));}
        else if (value && typeof value === 'object' && !['closure', 'functionRef'].includes(value.$expression?.operation)) all();
      }
    }
    if (name === 'filter_var' || name === 'filter_var_array') {
      add('regex');
      const optionsIndex = name === 'filter_var_array' ? 1 : 2;
      if (args.some((argument, index) => argument.spread || argument.name === 'options' || index === optionsIndex)) all();
    }
  };
  const visit = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (value.type === 'file') add('files');
    if (value.type === 'api') add('browser');
    if (Array.isArray(value.phpModules)) value.phpModules.forEach(add);
    for (const [key, module] of Object.entries(nativeModules)) if (value[key]) add(module);
    if (typeof value.builtin === 'string') builtin(value.builtin);
    const expression = value.$expression;
    if (expression) {
      const {operation, left, right} = expression;
      if (operation === 'builtin') builtin(left, right?.arguments || []);
      if (operation === 'call') {if (typeof left === 'string') builtin(left, right?.arguments || []); else if (!['closure', 'functionRef'].includes(left?.$expression?.operation)) all();}
      if (operation === 'eval' && !right?.program) all();
      if (operation === 'splMethod') add('spl');
      if (['objectNew', 'objectCall', 'objectConstant', 'objectStaticProperty', 'isObject'].includes(operation)) {
        const name = normalize(left); if (classes.has(name)) add(classes.get(name));
      }
    }
    Object.values(value).forEach(visit);
  };
  visit(node);
  return moduleNames.filter(name => needed.has(name));
};

export const scopeRequirements = scope => {
  const needed = new Set();
  const scan = parent => {
    const elements = [...(parent.matches?.('*') ? [parent] : []), ...parent.querySelectorAll('*')];
    for (const element of elements) {
      if (element.hasAttribute('data-aml-transition')) needed.add('animations');
      if (element.hasAttribute('data-aml-form-preserve') || element.hasAttribute('data-aml-validate-api')) needed.add('browser');
      for (const attribute of element.attributes) {
        if (!attribute.name.startsWith('data-aml-') || attribute.name === 'data-aml-state' || !/^[\[{]/.test(attribute.value)) continue;
        let value; try { value = JSON.parse(attribute.value); } catch { continue; }
        if (attribute.name === 'data-aml-state-config' && Object.keys(value.persisted || {}).length) needed.add('browser');
        if (attribute.name === 'data-aml-context-provider' && value.persist) needed.add('browser');
        requiredModules(value).forEach(name => needed.add(name));
      }
      if (element.tagName === 'TEMPLATE') scan(element.content);
    }
  };
  scan(scope);
  return moduleNames.filter(name => needed.has(name));
};
