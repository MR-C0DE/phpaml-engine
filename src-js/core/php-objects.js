import {cloneIntl} from './php-intl.js';
import {cloneSpl} from './php-spl.js';
import {isGenerator, generatorDefinition} from './php-generators.js';
import {cloneDate, dateDefinition} from './php-date-values.js';
import {advancedDateProperty} from './php-date-advanced.js';
import {stdClassDefinition, stdClassReference, copyObjectFields, watchObjectFields, cloneStdClass} from './php-stdclass.js';
import {cloneClosure, bindGeneratorMethod} from './php-functions.js';
import {magicMember, callMagic, detachedMagicReference} from './php-magic.js';
import {warn} from './diagnostics.js';
import {staticPropertyReference} from './php-static-properties.js';
import {objectData, makeObject, isPhpObject, objectIs} from './php-object-values.js';
import {resolveData, resolveType, resolvedNode} from './value.js';
import {bindMethod, evaluateCall} from './php-functions.js';
import {clonePhp, isPhpArray, arrayEntries, ownArray} from './php-arrays.js';
import {assignType} from './php-types.js';
import {createReference} from './php-references.js';
import {phpType, phpBool, phpString} from './php-values.js';
import {evaluateException} from './php-exceptions.js';

const classDefinition = (name, context) => (typeof name === 'string' && Object.hasOwn(context.classes || {}, name.toLowerCase()) && context.classes[name.toLowerCase()]) || (name?.toLowerCase() === 'generator' ? generatorDefinition(context.source?.phpVersion) : name?.toLowerCase() === 'stdclass' ? stdClassDefinition() : null) || dateDefinition(name) || (() => {throw new Error(`Unknown compiled frontend class: ${name}`);})();
const lineage = (name, context) => {
  const result = [];
  while (name) {const item = classDefinition(name, context); result.push(item); name = item.parent;}
  return result;
};
const related = (a, b, context) => !!a && (a.toLowerCase() === b.toLowerCase() || lineage(a, context).some((entry) => entry.name.toLowerCase() === b.toLowerCase()));
export const objectMemberAccessible = (member, context) => member.visibility === 'public' || member.visibility === 'private' && context.objectScope?.toLowerCase() === member.owner.toLowerCase()
  || member.visibility === 'protected' && (related(context.objectScope, member.owner, context) || context.objectScope && related(member.owner, context.objectScope, context));
export const objectMemberLookup = (name, member, table, context, virtual = true) => {
  // A parent's private member has its own identity, even when a child uses the same name.
  const scoped = context.objectScope && context.classes?.[context.objectScope.toLowerCase()]?.[table]?.[member];
  if (virtual && scoped?.visibility === 'private' && related(name, context.objectScope, context)) return scoped;
  for (const item of lineage(name, context)) if (Object.hasOwn(item[table] || {}, member)) return item[table][member];
  return null;
};
const keyOf = (property) => property.visibility === 'private' ? property.owner + '::$' + property.name : property.name;
export const objectPropertyReference = (expression, state, context) => {
  const value = resolveData(expression.left, state, context), name = value == null && expression.right.nullable ? '' : phpString(resolveData(expression.right.name, state, context), undefined, context), data = objectData(value);
  const dynamic = stdClassReference(value, name, context); if (dynamic) return dynamic;
  const dateProperty = advancedDateProperty(value, name, context, expression.left?.$expression?.operation === 'objectProperty' ? context.evaluated?.get(expression.left.$expression.left)?.value : null); if (dateProperty) return dateProperty;
  const property = data && objectMemberLookup(data.definition.name, name, 'properties', context);
  const key = property && keyOf(property), allowed = property && objectMemberAccessible(property, context);
  const overloaded = () => data && (!allowed || data.unsetFields.has(key));
  const hook = (method, args = []) => {
    const member = data && magicMember(data.definition.name, method, context), guard = method + ':' + name;
    if (!member || data.magicGuards.has(guard)) return null;
    if (context.readOnly && !context.componentProjection) throw new Error('Service objects must be used in frontend events');
    data.magicGuards.add(guard);
    try {return callMagic(value, data.definition.name, member, [{value: name, kind: 'string'}, ...args], state, context);}
    finally {data.magicGuards.delete(guard);}
  };
  const check = (quiet = false) => {
    if (!data) {if (quiet || value == null && expression.right.nullable) return false; throw new Error(`Attempt to read property ${name} on ${phpType(value)}`);}
    if (!property) {if (quiet) return false; throw new Error(`Undefined frontend property ${data.definition.name}::$${name}`);}
    if (!allowed) {if (quiet) return false; throw new Error(`Cannot access ${property.visibility} property ${property.owner}::$${name}`);}
    return true;
  };
  const hookAccess=(operation,item=null)=>{const member=property?.hooks?.[operation],guard='property:'+key+':'+operation;if(!member||data.magicGuards.has(guard))return null;data.magicGuards.add(guard);try{return callMagic(value,data.definition.name,member,item?[item]:[],state,context);}finally{data.magicGuards.delete(guard);}};
  const writeAccess=()=>{if(property?.setVisibility&&!objectMemberAccessible({...property,visibility:property.setVisibility},context))throw new Error('Cannot modify '+property.setVisibility+'(set) property '+property.owner+'::$'+name);};
  const reference = {
    initialized: () => {check(); return !!property.virtual || data.fields.has(key);},
    get: (quiet = false) => {
      if (!data) {if (!quiet && !expression.right.nullable) warn(context, `Attempt to read property ${name} on ${phpType(value)}`); return {value:null,kind:'NULL'};}
      if (overloaded()) {
        const result = hook('__get'); if (result) return allowed ? assignType(property.rule, result.value, result.kind, context.source?.strictTypes ?? true, context) : result;
        if (!property && data.magicGuards.has('__get:' + name)) {if (!quiet) warn(context, `Undefined property: ${data.definition.name}::$${name}`); return {value: null, kind: 'NULL'};}
      }
      if (!check(quiet)) return {value: null, kind: 'NULL'};
      const hooked=hookAccess('get');if(hooked)return hooked;
      if(property?.virtual)throw new Error('Property has no getter');
      if (!data.fields.has(key)) {if (quiet) return {value: null, kind: 'NULL'}; throw new Error(`Typed property ${property.owner}::$${name} must not be accessed before initialization`);}
      return data.fields.get(key);
    },
    probe: (issetOnly = false) => {
      if (overloaded()) {
        const exists = hook('__isset');
        if (!exists || !phpBool(exists.value)) return {value: null, kind: 'NULL'};
        return issetOnly ? {value: true, kind: 'boolean'} : reference.get(true);
      }
      return reference.get(true);
    },
    set: (value, kind, source = context.source) => {
      if (context.readOnly && !context.componentProjection) throw new Error('Reactive text cannot modify service objects');
      if (expression.right.nullable) throw new Error('Cannot write through a nullsafe property');
      writeAccess();
      if (overloaded() && hook('__set', [{value, kind}])) return {value, kind};
      check();
      if (!data || !property) throw new Error('Cannot create dynamic frontend properties');
      if (property.readonly && ((data.fields.has(key) && !data.cloneWritable?.has(key)) || !((source?.phpVersion ?? 80400) >= 80400 ? related(context.objectScope, property.owner, context) : context.objectScope?.toLowerCase() === property.owner.toLowerCase()))) throw new Error(`Cannot modify readonly property ${property.owner}::$${name}`);
      if(property.hooks?.set&&!data.magicGuards.has('property:'+key+':set')){
        const parameter=context.functions[property.hooks.set.id].parameters[0];
        const argument=assignType(parameter?.rule,value,kind,source?.strictTypes??true,context);
        hookAccess('set',argument);return argument;
      }
      const result = assignType(property.rule, value, kind, source?.strictTypes ?? true, context);
      const hooked=hookAccess('set',result);if(hooked)return result;if(property.virtual)throw new Error('Property has no setter');
      data.cloneWritable?.delete(key); data.unsetFields.delete(key);
      if (data.fieldReferences?.has(key)) return data.fieldReferences.get(key).set(result.value,result.kind);
      data.fields.set(key, {value: clonePhp(result.value), kind: result.kind}); ownArray(data.fields, key, data.fields.get(key).value); return result;
    },
    remove: () => {
      writeAccess();
      if (overloaded()) {if (hook('__unset')) return; if (!property) return;}
      check(); if (!data || !property) return;
      if (property.readonly && (!data.cloneWritable?.has(key) || !((context.source?.phpVersion ?? 80400) >= 80400 ? related(context.objectScope, property.owner, context) : context.objectScope?.toLowerCase() === property.owner.toLowerCase()))) throw new Error(`Cannot unset readonly property ${property.owner}::$${name}`);
      const previous=data.fieldReferences?.get(key);previous?.cell?.guards.delete(data.fieldTokens?.get(key));previous?.cell?.bindings.delete(data.fieldTokens?.get(key));data.fieldReferences?.delete(key);
      ownArray(data.fields, key, null); data.fields.delete(key); data.unsetFields.add(key);
    },
    indirect: () => overloaded() && magicMember(data.definition.name, '__get', context)
      ? reference.reference() : reference,
  };
  reference.bind = (ref) => {
    check();writeAccess();if(property.readonly||property.hooks?.set||property.virtual)throw new Error('Cannot bind a reference to this property');
    if(!ref.cell)throw new Error('Property binding requires a reference cell');
    const item=ref.get(), checked=assignType(property.rule,item.value,item.kind,context.source?.strictTypes??true,context);ref.set(checked.value,checked.kind);
    data.fieldReferences ||= new Map();data.fieldTokens ||= new Map();
    const token=data.fieldTokens.get(key)||{};data.fieldTokens.set(key,token);
    const previous=data.fieldReferences.get(key);previous?.cell?.guards.delete(token);previous?.cell?.bindings.delete(token);
    data.fieldReferences.set(key,ref);ref.cell.bindings.add(token);ref.cell.guards.set(token,(value,kind)=>assignType(property.rule,value,kind,context.source?.strictTypes??true,context));
    data.fields.set(key,{get value(){return ref.get().value;},get kind(){return ref.get().kind;},reference:ref});data.unsetFields.delete(key);return ref;
  };
  reference.reference = () => {writeAccess();if(property?.hooks?.set||property?.virtual)throw new Error('Cannot acquire a reference to a hooked property');if (property?.readonly && !overloaded()) throw new Error(`Cannot acquire reference to readonly property ${property.owner}::$${name}`); if (overloaded() && magicMember(data.definition.name, '__get', context)) {const item = hook('__get'); if (item?.reference) return item.reference; return detachedMagicReference(() => item, data.definition.name, name, context);}return data.fieldReferences?.get(key)||reference.bind(createReference(reference.get()));};
  return reference;
};
export const promoteProperties = (definition, state, context) => {
  for (const property of definition.promoted || []) objectPropertyReference({left: {$expression: {operation: 'objectThis'}}, right: {name: property.name}}, state, context)
    .set(context.locals[property.id], context.localTypes[property.id], definition.source);
};
const method = (value, options, context) => {
  const instance = objectData(value);
  const name = options.class === '@static' ? context.calledClass : options.class || instance?.definition.name;
  if (!name) throw new Error(`Call to a member function ${options.name}() on ${phpType(value)}`);
  const found = objectMemberLookup(name, options.name.toLowerCase(), 'methods', context, !options.class);
  if (!found || !objectMemberAccessible(found, context)) {
    const bound = value || (options.forward && objectIs(context.thisObject, name) ? context.thisObject : null);
    const magic = magicMember(name, bound ? '__call' : '__callstatic', context);
    if (magic) return bindMethod(magic.id, bound, magic.owner, options.forward ? context.calledClass || name : instance?.definition.name || name, options.name, options.firstClass || false);
  }
  if (!found) throw new Error(`Call to undefined method ${name}::${options.name}()`);
  if (!objectMemberAccessible(found, context)) throw new Error(`Call to ${found.visibility} method ${found.owner}::${options.name}()`);
  if (found.abstract) throw new Error(`Cannot call abstract method ${found.owner}::${options.name}()`);
  const bound = found.static ? null : value || (options.forward ? context.thisObject : null);
  if (!found.static && !objectIs(bound, found.owner)) throw new Error(`Non-static method ${found.owner}::${options.name}() cannot be called statically`);
  const called = options.forward ? context.calledClass || name : instance?.definition.name || name;
  return bindMethod(found.id, bound, found.owner, called);
};
export const evaluateObject = (expression, state, context) => {
  let options = expression.right || {};
  if (context.readOnly && !context.componentProjection) throw new Error('Service objects must be used in frontend events');
  if(expression.operation==='objectDeclare'){const key=expression.left.toLowerCase();if(context.classes[key])throw new Error('Cannot declare class '+expression.left+', because the name is already in use');context.classes[key]={...expression.right,runtimeDeclaration:false};return {value:null,kind:'NULL'};}
  if (expression.operation === 'objectClassName') {const value=resolveData(expression.left,state,context);if(isPhpObject(value))return {value:objectData(value).definition.name,kind:'string'};if(typeof value!=='string')throw new Error('Class name must be a valid object or a string');return {value:value.replace(/^\\/,''),kind:'string'};}
  if (expression.operation==='objectClass'&&options.dynamic){const value=resolveData(expression.left,state,context);if(!isPhpObject(value))throw new TypeError('Cannot use ::class on a non-object');return {value:objectData(value).definition.name,kind:'string'};}
  if (expression.operation === 'objectClass' || expression.operation === 'objectConstant') {
    const name = expression.left === '@static' ? context.calledClass : resolveData(expression.left,state,context);
    if (expression.operation === 'objectClass') return {value: name, kind: 'string'};
    const item = objectMemberLookup(name, expression.right, 'constants', context, false);
    if (!item || !objectMemberAccessible(item, context)) throw new Error(`Undefined or inaccessible class constant ${name}::${expression.right}`);
    const budget = context.constantBudget ||= {depth: 0};
    if (budget.depth >= 64) throw new Error('Circular or excessively nested class constant');
    budget.depth++;
    const data = {...context, objectScope: item.owner, calledClass: name};
    try {const value = resolveData(item.value, state, data); return {value, kind: resolveType(item.value, state, data, value)};}
    finally {budget.depth--;}
  }
  if (expression.operation === 'objectThis') {
    if (!isPhpObject(context.thisObject)) throw new Error('Using $this when not in object context');
    return {value: context.thisObject, kind: 'object'};
  }
  if (expression.operation === 'objectStaticProperty') return staticPropertyReference(expression, state, context).get();
  if (expression.operation === 'objectProperty') return objectPropertyReference(expression, state, context).get();
  if (expression.operation === 'objectNew') {
    const name = expression.left === '@static' ? context.calledClass : resolveData(expression.left,state,context), descriptor = classDefinition(name, context);
    if (descriptor.enum) throw new Error(`Cannot instantiate enum ${name}`);
    if (descriptor.abstract) throw new Error(`Cannot instantiate abstract class ${name}`);
    const budget = context.objectBudget ||= {remaining: 10000};
    if (--budget.remaining < 0) throw new RangeError('Frontend object allocation limit exceeded');
    const fields = new Map();
    for (const ancestor of lineage(name, context).reverse()) for (const property of Object.values(ancestor.properties)) {
      const key = keyOf(property); fields.delete(key);
      if (Object.hasOwn(property, 'default')) {const value = resolveData(property.default, state, {...context, objectScope: property.owner, calledClass: name}); fields.set(key, assignType(property.rule, clonePhp(value), resolveType(property.default, state, {...context, objectScope: property.owner, calledClass: name}, value), true, context));}
    }
    const value = watchObjectFields(makeObject(descriptor, fields)), constructor = objectMemberLookup(name, '__construct', 'methods', context, false);
    if (constructor&&!options.skipConstructor) evaluateCall({right: options}, state, context, method(value, {name: '__construct', class: name}, context));
    else if (options.arguments?.length) {
      const id = '@emptyConstructor', fn = {name: name + '::__construct', parameters: [], declared: true, source: options.source || context.source, body: {type: 'sequence', actions: []}};
      evaluateCall({right: options}, state, {...context, functions: {...context.functions, [id]: fn}}, bindMethod(id, value, name, name));
    }
    return {value, kind: 'object'};
  }
  const value = expression.left === null ? null : resolveData(expression.left, state, context);
  if (expression.operation === 'objectClone') {
    const closure=cloneClosure(value);if(closure)return {value:closure,kind:'object'};
    if (!isPhpObject(value)) throw new Error('__clone method called on non-object');
    if (--(context.objectBudget ||= {remaining: 10000}).remaining < 0) throw new RangeError('Frontend object allocation limit exceeded');
    const intlCopy=cloneIntl(value);if(intlCopy)return {value:intlCopy,kind:'object'};
    const dateCopy = cloneDate(value, context); if (dateCopy) return {value: dateCopy, kind: 'object'};
    const stdClassCopy = cloneStdClass(value); if (stdClassCopy) return {value: stdClassCopy, kind: 'object'};
    const data = objectData(value);
    const hook = objectMemberLookup(data.definition.name, '__clone', 'methods', context, false);
    if (hook && !objectMemberAccessible(hook, context)) throw new Error(`Call to ${hook.visibility} method ${hook.owner}::__clone()`);
    if (data.definition.enum) throw new Error('Trying to clone an uncloneable enum');
    if (isGenerator(value)) throw new Error('Trying to clone an uncloneable object of class Generator');
    const copy = watchObjectFields(makeObject(data.definition, copyObjectFields(data.fields))), cloned = objectData(copy);
    for(const [key,item]of cloned.fields)if(item.reference){const name=key.includes('::$')?key.split('::$').at(-1):key,owner=key.includes('::$')?key.split('::$')[0]:data.definition.name;objectPropertyReference({left:resolvedNode({value:copy,kind:'object'}),right:{name}},state,{...context,objectScope:owner}).bind(item.reference);}
    cloned.unsetFields = new Set(data.unsetFields);
    cloneSpl(value, copy);
    if ((context.source?.phpVersion ?? 80400) >= 80300) cloned.cloneWritable = new Set(data.fields.keys());
    try {if (hook) callMagic(copy, data.definition.name, hook, [], state, context);}
    finally {cloned.cloneWritable = null;}
    return {value: copy, kind: 'object'};
  }
  if (value == null && options.nullable) return {value: null, kind: 'NULL'};
  options = {...options, ...(options.class!=null&&options.class!=='@static'?{class:resolveData(options.class,state,context)}:{}), name: resolveData(options.name, state, context)};
  if (typeof options.name !== 'string') throw new Error('Method name must be a string');
  if (value instanceof Error && expression.operation === 'objectCall') {
    if (options.arguments?.length) throw new Error('Throwable getters do not accept arguments');
    const result = evaluateException({operation: 'exceptionGet', left: expression.left, right: {...options, method: options.name.toLowerCase()}}, state, context, () => value, resolveType);
    return {value: result, kind: phpType(result)};
  }
  const callable = isGenerator(value) ? bindGeneratorMethod(value, options.name) : method(value, {...options, firstClass: expression.operation === 'objectMethodRef'}, context);
  return expression.operation === 'objectMethodRef' ? {value: callable, kind: 'object'} : evaluateCall({right: options}, state, context, callable);
};

export const methodCallable = (value, context) => {
  if (typeof value === 'string' && value.includes('::')) {const [className, name] = value.replace(/^\\/, '').split('::'); return method(null, {class: className, name}, context);}
  if (isPhpArray(value) && arrayEntries(value).length === 2 && Object.hasOwn(value, 0) && typeof value[1] === 'string') {
    if (isPhpObject(value[0])) return isGenerator(value[0]) ? bindGeneratorMethod(value[0], value[1]) : method(value[0], {name: value[1]}, context);
    if (typeof value[0] === 'string') return method(null, {class: value[0].replace(/^\\/, ''), name: value[1]}, context);
  }
  return null;
};
export const isMethodCallable = (value, context) => {try {return !!methodCallable(value, context);} catch {return false;}};
