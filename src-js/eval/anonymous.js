import {markGenerator} from './generators.js';
import {internalInterface} from './internal-interfaces.js';
// Anonymous declarations use the same closed class catalogue as named services.
const expr = (operation, left, right = null) => ({$expression: {operation, left, right}});
const idFor = (name) => 'v' + [...new TextEncoder().encode(name)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const visibility = (flags) => flags === 4 ? 'private' : flags === 2 ? 'protected' : 'public';
const subtype = (a, b, classes) => {
  if (!b || b.types.includes('mixed')) return true;
  if (!a) return false;
  return [...a.types, ...(a.nullable ? ['null'] : [])].every((group) => group === 'never' || [...b.types, ...(b.nullable ? ['null'] : [])].some((target) => target.split('&').every((sup) => group.split('&').some((sub) => sub === sup || sub === 'generator' && ['iterator', 'traversable', 'iterable', 'object'].includes(sup) || ['true', 'false'].includes(sub) && sup === 'bool' || (sub === 'array' || sub === 'traversable' || classes[sub]?.ancestors.some((name) => name.toLowerCase() === 'traversable')) && sup === 'iterable' || sup === 'object' && !!classes[sub] || classes[sub]?.ancestors.some((name) => name.toLowerCase() === sup)))));
};
const constant = (c, node) => {
  const value = c.value(node);
  const check = (item) => {
    if (!item || typeof item !== 'object') return;
    const op = item.$expression?.operation;
    if (item.$local || item.$state || op && !['array', 'add', 'subtract', 'multiply', 'divide', 'modulo', 'power', 'concat', 'negate', 'positive', 'not', 'objectConstant', 'objectClass', 'roundingMode'].includes(op)) c.fail(node, 'Anonymous member defaults must be constant expressions');
    Object.values(item).forEach(check);
  };
  check(value); return value;
};
export const compileAnonymous = (c, creation, declaredName = null) => {
  const node = creation.what, args = c.arguments(creation.arguments);
  if (!node.isAnonymous && !declaredName || node.attrGroups?.length || node.isAbstract) c.unsupported(node);
  if (node.isReadonly && (c.source.phpVersion ?? 80400) < 80300) c.fail(node, 'Readonly anonymous classes require PHP 8.3');
  const name = declaredName || 'class@anonymous:' + c.prefix + node.loc.start.offset, key = name.toLowerCase();
  if (c.environment.classes?.[key]) return expr('objectNew', name, {arguments: args, source: c.at(creation)});
  c.environment.classes ||= {};
  if (Object.keys(c.environment.classes).length >= 64) c.fail(node, 'Frontend class graph exceeds 64 definitions', 'ValueError');
  const parentName = node.extends ? c.name(node.extends) : null, parent = parentName && c.environment.classes[parentName.toLowerCase()];
  if (['arrayiterator', 'arrayobject'].includes(parentName?.toLowerCase())) c.fail(node, 'Frontend classes cannot extend internal SPL classes');
  if (parent?.nativeDate) c.fail(node, 'Frontend classes cannot extend internal date classes');
  if (parentName && !parent || parent?.final || parent?.interface) c.fail(node, 'Anonymous classes require a compiled, non-final parent class');
  if (parent && !!parent.readonly !== !!node.isReadonly) c.fail(node, 'A class and its parent must agree on readonly');
  const interfaces = (node.implements || []).map((item) => {
    const requested = c.name(item).toLowerCase();
    let found = c.environment.classes[requested];
    if (!found && (found = internalInterface(requested))) {
      if (Object.keys(c.environment.classes).length >= 64) c.fail(item, 'Frontend class graph exceeds 64 definitions');
      c.classes[requested] = c.environment.classes[requested] = found;
      for (const ancestor of found.ancestors) if (!c.environment.classes[ancestor.toLowerCase()]) {
        if (Object.keys(c.environment.classes).length >= 64) c.fail(item, 'Frontend class graph exceeds 64 definitions');
        c.classes[ancestor.toLowerCase()] = c.environment.classes[ancestor.toLowerCase()] = internalInterface(ancestor.toLowerCase());
      }
    }
    if (!found?.interface) c.fail(item, 'Anonymous classes require compiled interfaces');
    return found;
  });
  const definition = {name, parent: parent?.name || null, ancestors: [...new Set([...(parent ? [parent.name, ...parent.ancestors] : []), ...interfaces.flatMap((i) => [i.name, ...i.ancestors])])], abstract: false, readonly: !!node.isReadonly, final: false, properties: {}, staticProperties: {}, methods: {}, constants: Object.assign({}, ...interfaces.map((i) => i.constants))};
  const ancestry = definition.ancestors.map((name) => name.toLowerCase());
  const iterator = ancestry.includes('iterator'), aggregate = ancestry.includes('iteratoraggregate');
  if (iterator && aggregate || ancestry.includes('traversable') && !iterator && !aggregate) c.fail(node, 'A frontend Traversable class must implement either Iterator or IteratorAggregate, not both');
  c.classes[key] = c.environment.classes[key] = definition;
  const previous = [c.options, c.allowThis, c.functionName, c.loops];
  c.options = {...c.options, objectScope: name};
  const pending = [];
  try {
    for (const member of node.body) {
      if (member.attrGroups?.length) c.unsupported(member);
      if (member.kind === 'method') {
        const method = c.name(member.name), lower = method.toLowerCase(), access = member.visibility || 'public';
        if (member.isAbstract || !member.body || definition.methods[lower]) c.fail(member, 'Anonymous methods need a unique body and cannot return a reference');
        if (lower.startsWith('__') && (!['__construct', '__get', '__set', '__isset', '__unset', '__call', '__callstatic', '__invoke', '__tostring', '__clone', '__debuginfo', '__serialize', '__unserialize', '__sleep', '__wakeup'].includes(lower) || !['__construct', '__clone'].includes(lower) && access !== 'public')) c.fail(member, 'Unsupported or non-public frontend magic method');
        const promoted = [];
        const parameters = member.arguments.map((arg) => {
          if (arg.attrGroups?.length || arg.hooks?.length || arg.flagsSet) c.unsupported(arg);
          const field = c.name(arg.name), rule = c.rule(arg.type, arg.nullable);
          if (arg.flags) {
            if (lower !== '__construct' || arg.variadic || definition.properties[field]) c.fail(arg, 'Invalid promoted property');
            const readonly = !!node.isReadonly || !!arg.readonly;
            if (readonly && !rule) c.fail(arg, 'Readonly properties must be typed');
            definition.properties[field] = {name: field, owner: name, visibility: visibility(arg.flags), readonly, rule, ...(!rule ? {default: null} : {})};
            promoted.push({name: field, id: idFor(field)});
          }
          return {name: field, id: idFor(field), rule, reference: !!arg.byref, variadic: !!arg.variadic, ...(arg.value ? {default: constant(c, arg.value)} : {})};
        });
        const id = c.prefix + c.serial++;
        if (Object.keys(c.functions).length >= 256) c.fail(member, 'Frontend eval exceeds 256 function definitions', 'ValueError');
        const fn = {name: name + '::' + method, returnsReference: !!member.byref, parameters, returnType: c.rule(member.type, member.nullable) || (lower === '__tostring' ? {types: ['string'], nullable: false, property: '(function)'} : null), source: {...c.at(member), function: method}, objectScope: name, bindThis: !member.isStatic, declared: true, promoted};
        if (lower === '__debuginfo' && (member.isStatic || parameters.length || fn.returnType && fn.returnType.types.some((type) => !['array', 'null'].includes(type)))) c.fail(member, '__debugInfo() must be non-static, take no arguments and declare array or ?array if typed');
        c.functions[id] = fn;
        definition.methods[lower] = {name: method, id, owner: name, visibility: access, static: !!member.isStatic, abstract: false, final: !!member.isFinal};
        pending.push([id, member]);
        if (lower === '__tostring' && !definition.ancestors.includes('Stringable')) definition.ancestors.push('Stringable');
      } else if (member.kind === 'propertystatement') {
        if (member.visibilitySet || member.isAbstract || member.isFinal) c.unsupported(member);
        let rule = null;
        for (const [index, property] of member.properties.entries()) {
          if (property.hooks?.length || property.attrGroups?.length) c.unsupported(property);
          if (!index) rule = c.rule(property.type, property.nullable);
          const field = c.name(property.name), readonly = !!node.isReadonly || !!member.properties[0].readonly, table = member.isStatic ? definition.staticProperties : definition.properties;
          if (table[field]) c.fail(property, 'Cannot redeclare anonymous property');
          if (readonly && (member.isStatic || !rule || property.value)) c.fail(property, 'Readonly properties must be typed instance properties without a default');
          table[field] = {name: field, owner: name, visibility: member.visibility || 'public', readonly, rule, ...(property.value ? {default: constant(c, property.value)} : !rule ? {default: null} : {})};
        }
      } else if (member.kind === 'classconstant') {
        if (member.type) c.fail(member, 'Anonymous constants require an untyped constant declaration');
        for (const entry of member.constants) definition.constants[c.name(entry.name)] = {owner: name, visibility: member.visibility || 'public', value: constant(c, entry.value)};
      } else c.unsupported(member);
    }
    for (const [id, method] of pending) {
      c.allowThis = !method.isStatic; c.functionName = c.name(method.name); c.loops = 0;
      c.functions[id].body = c.statement(method.body);
      markGenerator(c.functions[id]);
      if (c.functions[id].generator && c.functions[id].returnsReference && JSON.stringify(c.functions[id].body).includes('\"yieldFrom\"')) c.fail(method,'Cannot use yield from inside a by-reference generator');
    }
    for (const table of ['properties', 'staticProperties']) for (const [field, property] of Object.entries(definition[table])) {
      if (Object.hasOwn(property, 'default') && property.rule && (property.default == null || typeof property.default !== 'object')) {
        const value = property.default, actual = value == null ? 'null' : typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : typeof value;
        const rule = property.rule;
        if (!rule.types.includes('mixed') && !rule.types.includes(actual) && !(value == null && rule.nullable) && !(actual === 'int' && rule.types.includes('float')) && !(value === true && rule.types.includes('true')) && !(value === false && rule.types.includes('false'))) c.fail(node, `Invalid default for typed property ${field}`);
      }
      let base = parent;
      while (base) {
        const inherited = base.properties[field] || base.staticProperties[field];
        if (inherited && inherited.visibility !== 'private') {
          if (!base[table][field] || !!property.readonly !== !!inherited.readonly || !subtype(property.rule, inherited.rule, c.environment.classes) || !subtype(inherited.rule, property.rule, c.environment.classes) || ['public', 'protected', 'private'].indexOf(property.visibility) > ['public', 'protected', 'private'].indexOf(inherited.visibility)) c.fail(node, `Incompatible inherited property ${field}`);
          break;
        }
        base = base.parent && c.environment.classes[base.parent.toLowerCase()];
      }
    }
    const inherited = {}; let base = parent;
    while (base) {for (const [key, member] of Object.entries(base.methods)) inherited[key] ||= member; base = base.parent && c.environment.classes[base.parent.toLowerCase()];}
    const methods = {...inherited, ...definition.methods};
    const validate = (actual, required, key) => {
      if (!actual || actual.abstract || actual.static !== required.static || ['public', 'protected', 'private'].indexOf(actual.visibility) > ['public', 'protected', 'private'].indexOf(required.visibility)) c.fail(node, `Anonymous method ${key}() does not implement its inherited contract`);
      const a = actual.contract || c.functions[actual.id] || c.environment.functions?.[actual.id], b = required.contract || c.functions[required.id] || c.environment.functions?.[required.id];
      if (!a || !b) c.fail(node, 'Missing inherited method signature');
      for (const [i, param] of b.parameters.entries()) {
        const candidate = a.parameters[i] || a.parameters.at(-1);
        if (!candidate || !a.parameters[i] && !candidate.variadic || !!param.reference !== !!candidate.reference || param.variadic && !candidate.variadic || Object.hasOwn(param, 'default') && !Object.hasOwn(candidate, 'default') && !candidate.variadic || !subtype(param.rule, candidate.rule, c.environment.classes)) c.fail(node, `Incompatible anonymous method ${key}() parameter`);
      }
      if (a.parameters.slice(b.parameters.length).some((param) => !Object.hasOwn(param, 'default') && !param.variadic) || !subtype(a.returnType, b.returnType, c.environment.classes)) c.fail(node, `Incompatible anonymous method ${key}() signature`);
    };
    for (const protocol of interfaces) for (const [key, required] of Object.entries(protocol.methods)) validate(methods[key], required, key);
    for (const [key, required] of Object.entries(inherited)) {
      if (required.abstract) validate(methods[key], required, key);
      else if (definition.methods[key] && required.visibility !== 'private') {
        if (required.final) c.fail(node, `Cannot override final method ${key}()`);
        if (key !== '__construct') validate(methods[key], required, key);
      }
    }
  } finally {[c.options, c.allowThis, c.functionName, c.loops] = previous;}
  return expr('objectNew', name, {arguments: args, source: c.at(creation)});
};
