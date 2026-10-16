import {objectMemberLookup, objectMemberAccessible} from './php-objects.js';
import {resolveData, resolveType} from './value.js';
import {clonePhp, ownArray} from './php-arrays.js';
import {phpString} from './php-values.js';
import {createReference} from './php-references.js';
import {assignType} from './php-types.js';

// One store per mounted component, shared by its handlers but never serialized into State.
export const serviceRuntime = (config, action) => {
  if (!action.serviceScope && !Object.keys(action.classes || {}).length) return {fields: new Map(), classes: {}, functions: action.functions || {}};
  const scopes = config ? (config.serviceScopes ||= new Map()) : new Map();
  const scope = action.serviceScope || '__aml_services';
  const runtime = scopes.get(scope) || {fields: new Map(), classes: {}, functions: {}};
  const classes = {...runtime.classes, ...action.classes}, functions = {...runtime.functions, ...action.functions};
  if (Object.keys(classes).length > 64 || Object.keys(functions).length > 256) throw new RangeError('Frontend component service catalogue exceeds 64 classes or 256 functions');
  runtime.classes = classes; runtime.functions = functions; scopes.set(scope, runtime);
  return runtime;
};

const stores=new WeakMap();
export const staticPropertyReference = (expression, state, context) => {
  const className = expression.left === '@static' ? context.calledClass : resolveData(expression.left,state,context);
  const name = phpString(resolveData(expression.right.name,state,context),undefined,context), property = objectMemberLookup(className, name, 'staticProperties', context, false);
  const allowed = property && objectMemberAccessible(property, context);
  const fields = context.staticFields ||= new Map();
  const key = property && property.owner.toLowerCase() + '::$' + name;
  const check = (quiet = false) => {
    if (!property) {if (quiet) return false; throw new Error(`Access to undeclared static property ${className}::$${name}`);}
    if (!allowed) {if (quiet) return false; throw new Error(`Cannot access ${property.visibility} property ${property.owner}::$${name}`);}
    return true;
  };
  const initialize = () => {
    if (!fields.has(key) && Object.hasOwn(property, 'default')) {
      const value = resolveData(property.default, state, {...context, objectScope: property.owner, calledClass: className});
      fields.set(key, assignType(property.rule, clonePhp(value), resolveType(property.default, state, {...context, objectScope: property.owner, calledClass: className}, value), true, context));
      ownArray(fields, key, fields.get(key).value);
    }
  };
  let bindings=stores.get(fields);if(!bindings){bindings=new Map();stores.set(fields,bindings);}
  const reference = {
    initialized: () => {check(); initialize(); return fields.has(key);},
    get: (quiet = false) => {
      if (!check(quiet)) return {value: null, kind: 'NULL'};
      initialize();
      if (!fields.has(key)) {if (quiet) return {value: null, kind: 'NULL'}; throw new Error(`Typed static property ${property.owner}::$${name} must not be accessed before initialization`);}
      return fields.get(key);
    },
    acquire: () => {
      check(); initialize();
      if (!fields.has(key)) {
        if (property.rule && !property.rule.nullable) throw new Error(`Cannot access uninitialized non-nullable property ${property.owner}::$${name} by reference`);
        fields.set(key, {value: null, kind: 'NULL'});
      }
      return fields.get(key);
    },
    set: (value, kind, source = context.source) => {
      check();
      if (context.readOnly) throw new Error('Static properties must be modified in frontend events');
      const result = assignType(property.rule, value, kind, source?.strictTypes ?? true, context);
      if(bindings.has(key))return bindings.get(key).ref.set(result.value,result.kind);
      fields.set(key, {value: clonePhp(result.value), kind: result.kind}); ownArray(fields, key, fields.get(key).value); return result;
    },
    remove: () => {check(); throw new Error(`Attempt to unset static property ${property.owner}::$${name}`);},
    bind: (ref) => {
      check();if(!ref.cell)throw new Error('Property binding requires a reference cell');
      const item=ref.get(),checked=assignType(property.rule,item.value,item.kind,context.source?.strictTypes??true,context);ref.set(checked.value,checked.kind);
      const previous=bindings.get(key);previous?.ref.cell.guards.delete(previous.token);previous?.ref.cell.bindings.delete(previous.token);
      const token={};bindings.set(key,{ref,token});ref.cell.bindings.add(token);ref.cell.guards.set(token,(value,kind)=>assignType(property.rule,value,kind,context.source?.strictTypes??true,context));
      fields.set(key,{get value(){return ref.get().value;},get kind(){return ref.get().kind;},reference:ref});return ref;
    },
    reference: () => bindings.get(key)?.ref || reference.bind(createReference(reference.get())),
  };
  return reference;
};
