import {nativeReflectionMethod} from './php-reflection.js';
import {destructure,destructureReference} from './php-destructure.js';
import {observeValueOwnership} from './php-value-ownership.js';
import {releaseLocalReferences} from './php-references.js';
import {nativeIntlMethod} from './php-intl.js';
import {nativeDateMethod} from './php-date-values.js';
import {createGenerator, generatorMethod, generatorSignature, isGenerator} from './php-generators.js';
import {foreachEntries, spreadEntries, referenceEntries} from './php-iterators.js';
import {bindOffsetPattern} from './php-object-collections.js';
import {isPhpObject, objectData} from './php-object-values.js';
import {objectInvokeTarget, magicArguments, hasMagicInvoke} from './php-magic.js';
import {promoteProperties, methodCallable, isMethodCallable} from './php-objects.js';
import {resolveData, resolveType, valueReference, assignTarget, bindReferenceTarget, promoteReference} from './value.js';
import {clonePhp, arrayEntries, arrayKind, arrayRead, arrayWrite, makeArray, ownArray, releaseArrays} from './php-arrays.js';
import {phpType, phpBool, phpString, phpDump} from './php-values.js';
import {phpMatches, phpIncrement} from './php-operators.js';
import {assignType} from './php-types.js';
import {withSource, warn} from './diagnostics.js';
import {exceptionFlow} from './php-exceptions.js';
import {builtinNames, evaluateBuiltin, invokeBuiltin} from './php-builtins.js';

// Runtime closures are opaque local values, never JavaScript source or eval().
const closures = new WeakMap();
const failure = (name, message) => Object.assign(new Error(message), {name});
export const evaluateDisplay = (expression, state, context) => {
  const data = {...context, functions: expression.right.functions || {}, source: expression.right.source,
    classes: expression.right.classes || {}, componentProjection: expression.right.projection === true,
    thisObject: null, objectScope: null, calledClass: null, objectBudget: {remaining: 10000},
    readOnly: true, builtinBudget: {remaining: 1000000}, builtinMemory: {},
    locals: Object.create(null), localTypes: Object.create(null), localReferences: Object.create(null),
    functionDeclarations: new Set(), functionDefinitionIds: new Map(), callBudget: {depth: 0, remaining: 10000}, loopBudget: {remaining: 10000}, evaluated: new WeakMap(),
    assignState: () => {throw new Error('Reactive text cannot modify state');},
  };
  try {
    const value = resolveData(expression.left, state, data);
    return {value, kind: resolveType(expression.left, state, data, value)};
  } catch (error) {throw withSource(error, data.source, data.trace);}
};
export const isFrontendCallable = (value, context) => isMethodCallable(value, context) || hasMagicInvoke(value, context) || typeof value === 'string' && builtinNames.includes(value.replace(/^\\/, '').toLowerCase()) || typeof value === 'function' && closures.has(value)
  || typeof value === 'string' && Object.values(context.functions || {}).some((fn) => fn.name.toLowerCase() === value.replace(/^\\/, '').toLowerCase() && (fn.declared || context.functionDeclarations?.has(fn.name.toLowerCase())));
const contract = (rule, item, strict, context, label) => {
  if (!rule) return item;
  if (rule.types.includes('@static')) rule = {...rule, types: rule.types.map((type) => type === '@static' ? context.calledClass || '(static)' : type)};
  if (rule.types.includes('callable') && isFrontendCallable(item.value, context) || rule.types.includes('closure') && typeof item.value === 'function' && closures.has(item.value)
    || rule.types.includes('iterable') && item.kind === 'array') return item;
  try {return assignType(rule, item.value, item.kind, strict, context);}
  catch (error) {if (error instanceof TypeError) throw new TypeError(`${label}: expected ${rule.types.join('|')}, received ${item.kind}`); throw error;}
};
export const createClosure = (id, captures, state, context) => {
  if (!Object.hasOwn(context.functions || {}, id)) throw new Error(`Unknown frontend function: ${id}`);
  const definition = context.functions[id];
  if (!definition.declared) {
    if (!context.functionDeclarations?.has(definition.name.toLowerCase())) throw new Error(`Call to undefined function ${definition.name}()`);
    id = context.functionDefinitionIds?.get(definition.name.toLowerCase()) || id;
  }
  const fn = function () {};
  const values = Object.create(null), types = Object.create(null), refs = Object.create(null);
  for (const capture of captures || []) {
    if (capture.reference) {
      refs[capture.id] = promoteReference(capture.value, state, context); const ref = refs[capture.id]; if (ref.cell) observeValueOwnership(fn, (active) => active ? ref.cell.bindings.add(fn) : ref.cell.bindings.delete(fn));
      if (capture.value?.$local && !Object.hasOwn(context.locals || {}, capture.value.$local) && !context.localReferences?.[capture.value.$local]) refs[capture.id].set(null, 'NULL');
    }
    else {const item = resolveData(capture.value, state, context); values[capture.id] = clonePhp(item); ownArray(values, capture.id, values[capture.id]); types[capture.id] = resolveType(capture.value, state, context, item);}
  }
  closures.set(fn, {id, values, types, refs, staticLocals: definition.name.includes('{closure') ? new Map() : null, thisObject: definition.bindThis ? context.thisObject : null, objectScope: definition.objectScope || null, calledClass: definition.objectScope ? context.calledClass : null});
  return fn;
};
export const bindGeneratorMethod = (value, method) => {if (!Object.hasOwn(objectData(value).definition.methods, method.toLowerCase())) throw new Error(`Call to undefined method Generator::${method}()`); const fn = function () {}; closures.set(fn, {generator: value, method: method.toLowerCase()}); return fn;};
export const callableDefinition = (target, context) => {const fn = callable(target, context); return fn.generator ? generatorSignature(fn.method) : context.functions?.[fn.id];};
export const bindMethod = (id, thisObject, objectScope, calledClass, magicName = null) => {if (isGenerator(thisObject)) return bindGeneratorMethod(thisObject, id.slice(11)); const fn = function () {}; closures.set(fn, {id, thisObject, objectScope, calledClass, magicName}); return fn;};
export const declareFunction = (id, context) => {
  const definition = context.functions?.[id];
  if (!definition) throw new Error(`Unknown frontend function declaration: ${id}`);
  const key = definition.name.toLowerCase();
  if (definition.declared || builtinNames.includes(key) || context.functionDeclarations.has(key) || Object.values(context.functions).some((fn) => fn.declared && fn.name.toLowerCase() === key)) throw new Error(`Cannot redeclare ${definition.name}()`);
  context.functionDeclarations.add(key);
  (context.functionDefinitionIds ||= new Map()).set(key, id);
};
const callable = (value, context) => {
  const objectTarget = methodCallable(value, context) || objectInvokeTarget(value, context);
  if (objectTarget) return closures.get(objectTarget);
  if (isPhpObject(value)) throw new Error(`Object of type ${objectData(value).definition.name} is not callable`);
  if (typeof value === 'function' && closures.has(value)) return closures.get(value);
  if (typeof value === 'string') {
    const key = value.replace(/^\\/, '').toLowerCase();
    const id = context.functionDefinitionIds?.get(key) || Object.keys(context.functions || {}).find((id) => context.functions[id].name.toLowerCase() === key);
    if (id) return {id};
    throw new Error(`Call to undefined frontend function ${value}()`);
  }
  if(typeof value==='function')throw new TypeError('Value is not a compiled frontend callable');
  throw new Error('Value is not a compiled frontend callable');
};
const assignable = (node) => node?.$local || node?.$state || node?.$collection || ['dynamicLocal', 'offset', 'appendOffset', 'objectProperty', 'objectStaticProperty'].includes(node?.$expression?.operation);
export const evaluateCall = (expression, state, context, target = resolveData(expression.left, state, context)) => {
  if (typeof target === 'string' && builtinNames.includes(target.replace(/^\\/, '').toLowerCase())) return evaluateBuiltin({...expression, left: target.replace(/^\\/, '').toLowerCase()}, state, context, resolveData, resolveType, valueReference);
  const source = expression.right.source || context.source;
  try {
    const args = [];
    const definition = callableDefinition(target, context);
    if (definition.builtin) return evaluateBuiltin({...expression, left: definition.builtin}, state, context, resolveData, resolveType, valueReference);
    for (const argument of expression.right.arguments || []) {
      const parameter = Object.hasOwn(argument, 'name') ? definition.parameters.find((p) => p.name === argument.name) || definition.parameters.find((p) => p.variadic) : definition.parameters[args.length] || definition.parameters.find((p) => p.variadic);
      let ref = assignable(argument.value) && (parameter?.reference || argument.spread) ? valueReference(argument.value, state, context, false, false, !!argument.spread) : null;
      if (argument.spread) {
        const collection = ref ? ref.get().value : resolveData(argument.value, state, context);
        if (isPhpObject(collection)) {
          for (const {key, item} of spreadEntries(collection, context)) args.push({...item, ...(key.kind === 'string' ? {name: key.value} : {})});
          continue;
        }
        let temporary = collection;
        const unpacked = ref || {get: () => ({value: temporary, kind: 'array'}), set: (value) => {temporary = value; return {value, kind: 'array'};}};
        for (const [key, value] of arrayEntries(collection)) args.push({...(typeof key === 'string' ? {name: key} : {}), value: clonePhp(value), kind: arrayKind(collection, key), ref: {get: () => arrayRead(unpacked.get().value, key, context), set: (value, kind, source = context.source) => {unpacked.set(arrayWrite(unpacked.get().value, key, value, kind, context), 'array', source); return {value, kind};}}});
      } else {
        if (parameter?.reference) ref = ref?.indirect?.() || ref;
        const item = ref ? (parameter?.reference ? (ref.acquire?.() || ref.get(true)) : ref.get()) : {value: resolveData(argument.value, state, context)};
        if (!item.kind) item.kind = resolveType(argument.value, state, context, item.value);
        args.push({...argument, value: clonePhp(item.value), kind: item.kind, ref});
      }
    }
    return invokeFunction(target, args, state, {...context, source});
  } catch (error) {throw withSource(error, source);}
};
export const invokeFunction = (target, argumentsList, state, context) => {
  if (typeof target === 'string' && builtinNames.includes(target.replace(/^\\/, '').toLowerCase())) return invokeBuiltin(target, argumentsList, state, context);
  const closure = callable(target, context), definition = context.functions?.[closure.id];
  if (definition?.internal && argumentsList.length > definition.parameters.length) throw failure('ArgumentCountError', 'Too many enum method arguments');
  if (closure.generator) return generatorMethod(closure.generator, closure.method, argumentsList, context);
  if (closure.magicName !== null && closure.magicName !== undefined) argumentsList = [{value: closure.magicName, kind: 'string'}, {value: magicArguments(argumentsList), kind: 'array'}];
  if (definition?.builtin) return invokeBuiltin(definition.builtin, argumentsList, state, context);
  if (!definition || !definition.declared && !context.functionDeclarations?.has(definition.name.toLowerCase())) throw new Error(`Call to undefined function ${definition?.name || closure.id}()`);
  const budget = context.callBudget ||= {depth: 0, remaining: 10000};
  if (budget.depth >= 128 || --budget.remaining < 0) throw Object.assign(new RangeError('Frontend function call limit exceeded'), {code: 'PHP_CALL_LIMIT'});
  const data = {...context, returnsReference: !!definition.returnsReference, functionStatics: closure.staticLocals || null, thisObject: closure.thisObject || null, objectScope: closure.objectScope || definition.objectScope || null, calledClass: closure.calledClass || null, locals: clonePhp(closure.values || {}), localTypes: {...closure.types}, localReferences: {...closure.refs}, evaluated: new WeakMap(), source: definition.source};
  data.trace = [{file: context.source?.file, line: context.source?.line, function: definition.name}, ...(context.trace || [])];
  // An assignment in the callee uses that file's strict_types setting.
  data.assignState = (target, value, kind, source = data.source) => context.assignState(target, value, kind, source);
  const parameters = definition.parameters || [], assigned = new Map(), rest = [], seen = new Set();
  let positional = 0, named = false;
  for (const argument of argumentsList) {
    let index;
    if (Object.hasOwn(argument, 'name')) {
      named = true;
      if (seen.has(argument.name)) throw new Error(`Named parameter $${argument.name} overwrites previous argument`);
      seen.add(argument.name);
      index = parameters.findIndex((parameter) => parameter.name === argument.name && !parameter.variadic);
      if (index < 0) {if (!parameters.some((parameter) => parameter.variadic)) throw new Error(`Unknown named parameter $${argument.name}`); rest.push(argument); continue;}
    } else {
      if (named) throw new Error('Cannot use positional argument after named argument');
      index = positional++;
      if (index >= parameters.length || parameters[index].variadic) {rest.push(argument); continue;}
    }
    if (assigned.has(index)) throw new Error(`Named parameter $${parameters[index].name} overwrites previous argument`);
    assigned.set(index, argument);
  }
  const bind = (parameter, argument) => {
    if (parameter.reference && !argument.ref) throw new Error(`${definition.name}(): Argument $${parameter.name} cannot be passed by reference`);
    const original = parameter.reference ? argument.ref.get(true) : argument;
    let item;
    try {item = contract(parameter.rule, original, context.source?.strictTypes ?? true, data, `${definition.name}(): Argument $${parameter.name}`);}
    catch (error) {throw withSource(error, definition.source, data.trace);}
    if (parameter.reference) argument.ref.set(item.value, item.kind, context.source);
    return item;
  };
  for (let index = 0; index < parameters.length; index++) {
    const parameter = parameters[index];
    if (parameter.variadic) {
      const refs = new Map(); let values = makeArray(), position = 0;
      for (const argument of rest) {
        const item = bind(parameter, argument), key = argument.name ?? position++;
        values = arrayWrite(values, key, item.value, item.kind, data);
        if (parameter.reference) refs.set(key, argument.ref);
      }
      data.locals[parameter.id] = values; data.localTypes[parameter.id] = 'array';
      if (parameter.reference) data.localReferences[parameter.id] = {
        get: () => {for (const [key, ref] of refs) {const item = ref.get(); values = arrayWrite(values, key, item.value, item.kind, data);} return {value: values, kind: 'array'};},
        set: (value, kind, source = data.source) => {for (const [key, ref] of refs) {if (!Object.hasOwn(value, key)) {refs.delete(key); continue;} ref.set(value[key], arrayKind(value, key), source);} values = clonePhp(value); return {value: values, kind: 'array'};},
      };
      continue;
    }
    let argument = assigned.get(index);
    if (!argument) {
      if (!Object.hasOwn(parameter, 'default')) throw withSource(failure('ArgumentCountError', `${definition.name}(): Missing argument $${parameter.name}`), definition.source, data.trace);
      const value = resolveData(parameter.default, state, data), kind = resolveType(parameter.default, state, data, value);
      let item = {value, kind};
      argument = {value, kind, ref: {get: () => item, set: (value, kind) => (item = {value, kind})}};
    }
    const item = bind(parameter, argument);
    data.locals[parameter.id] = clonePhp(item.value); ownArray(data.locals, parameter.id, data.locals[parameter.id]); data.localTypes[parameter.id] = item.kind;
    if (parameter.reference) data.localReferences[parameter.id] = argument.ref;
  }
  const last = assigned.size ? Math.max(...assigned.keys()) : -1;
  data.functionArguments = [...parameters.slice(0, last + 1).map((parameter) => ({id: parameter.id})), ...rest.filter((argument) => !Object.hasOwn(argument, 'name')).map((argument) => ({value: clonePhp(argument.value), kind: argument.kind}))];
  if (definition.generator) return contract(definition.returnType, {value: createGenerator(definition, state, data), kind: 'object'}, true, data, `${definition.name}(): Return value`);
  budget.depth++;
  try {
    if(definition.nativeReflection)return nativeReflectionMethod(definition,data);
    if (definition.nativeIntl) {if(rest.length)throw failure('ArgumentCountError',`${definition.name}(): too many arguments`);return nativeIntlMethod(definition,data);}
    if (definition.nativeDate) {if (rest.length) throw failure('ArgumentCountError', `${definition.name}(): too many arguments`); return nativeDateMethod(definition, data);}
    promoteProperties(definition, state, data);
    const signal = executeFunctionBody(definition.body, state, data);
    let result = signal?.operation === 'return' ? {value: clonePhp(signal.value), kind: signal.kind} : {value: null, kind: 'NULL'};
    const types = definition.returnType?.types || [];
    if (types.includes('never')) throw new TypeError(`${definition.name}(): never-returning function must not return`);
    if (types.includes('void')) {
      if (signal?.hasValue) throw new TypeError(`${definition.name}(): void function must not return a value`);
      return {value: null, kind: 'NULL'};
    }
    if (!signal && definition.returnType) throw new TypeError(`${definition.name}(): Return value is required`);
    try {const output = contract(definition.returnType, result, definition.source?.strictTypes ?? true, data, `${definition.name}(): Return value`); if (definition.returnsReference && signal?.reference) {signal.reference.set(output.value, output.kind); return {...output, reference: signal.reference};} return output;}
    catch (error) {throw withSource(error, signal?.source || definition.source, data.trace);}
  } catch (error) {
    error.phpStack ||= []; error.phpStack.push({function: definition.name, source: context.source});
    throw withSource(error, definition.source, data.trace);
  } finally {releaseLocalReferences(data); releaseArrays(data.locals); budget.depth--;}
};

// Synchronous function bodies use the same serializable instructions as events.
// They cannot suspend an expression on an API request or navigation.
export const executeFunctionBody = (action, state, context) => {
  if (!action) return;
  const data = {...context, source: action.phpSource || context.source};
  const value = (node) => resolveData(node, state, data);
  const item = (node) => {const result = value(node); return {value: result, kind: resolveType(node, state, data, result)};};
  const run = (child) => executeFunctionBody(child, state, data);
  const iteration = (count) => {if (count > (action.limit || 1000) || --data.loopBudget.remaining < 0) throw Object.assign(new RangeError('Frontend loop exceeds its safe iteration limit'), {code: 'PHP_LOOP_LIMIT'});};
  const outer = (signal) => signal.operation === 'return' ? signal : {...signal, levels: signal.levels - 1};
  const bindings = (rules, source, kind) => bindOffsetPattern(rules, {value: source, kind}, item, (target, current) => assignTarget(target, current.value, current.kind, state, data), data);
  try {
    if (action.type === 'try') {
      const flow = exceptionFlow(action, (target, error) => assignTarget(target, error, 'object', state, data), data);
      let step = flow.next();
      while (!step.done) { try { step = flow.next(run(step.value)); } catch (error) { step = flow.throw(error); } }
      return step.value;
    }
    if (['sequence', 'transaction'].includes(action.type)) {for (const child of action.actions || []) {const signal = run(child); if (signal) return signal;} return;}
    if (action.type === 'return') {
      let reference; if (data.returnsReference && action.hasValue) {if (assignable(action.value) || ['call', 'objectCall'].includes(action.value?.$expression?.operation)) reference = promoteReference(action.value, state, data); else warn(data, 'Only variable references should be returned by reference', 'PHP_NOTICE');}
      return {operation: 'return', ...(reference ? reference.get() : item(action.value)), reference, hasValue: action.hasValue, source: data.source};
    }
    if (action.type === 'function-declare') {declareFunction(action.id, data); return;}
    if (action.type === 'evaluate') {value(action.value); return;}
    if (action.type === 'local-set') {const result = item(action.value); assignTarget({$local: action.name}, result.value, result.kind, state, data); return;}
    if (action.type === 'condition') {
      const a = item(Object.hasOwn(action, 'left') ? action.left : {$state: action.state}), b = item(action.value);
      return run(phpMatches(action.operator, a.value, b.value, a.kind, b.kind) ? action.then : action.otherwise);
    }
    if (action.type === 'loop-control') return {operation: action.operation, levels: action.levels || 1};
    if (action.type === 'console') {
      const values = (action.values || []).map(item);
      if (action.level === 'echo') console.log(values.map((entry) => phpString(entry.value, entry.kind, data)).join(''));
      else if (action.level === 'dump') console.log(values.map((entry) => phpDump(entry.value, entry.kind, 0, undefined, data)).join(''));
      else console[action.level === 'warn' ? 'warn' : action.level === 'error' ? 'error' : 'log'](...values.map((entry) => entry.value));
      return;
    }
    if (action.type === 'set') {const result = item(action.value); data.assignState(action.target, result.value, result.kind, data.source); return;}
    if (action.type === 'increment' || action.type === 'decrement') {const current = item({$state: action.target}); const next = phpIncrement(current.value, current.kind, action.type === 'increment' ? 1 : -1, data); data.assignState(action.target, next.value, next.kind, data.source); return;}
    if (action.type === 'destructure') {destructure(action,state,data);return;}
    if (action.type === 'switch') {
      const subject = item(action.value); let start = -1, fallback = -1;
      for (let i = 0; i < action.cases.length; i++) {const branch = action.cases[i]; if (branch.default) {fallback = i; continue;} const candidate = item(branch.value); if (phpMatches('looseEq', subject.value, candidate.value, subject.kind, candidate.kind)) {start = i; break;}}
      if (start < 0) start = fallback;
      for (let i = start; i >= 0 && i < action.cases.length; i++) {const signal = run(action.cases[i].action); if (!signal) continue; if (signal.operation === 'return' || signal.levels > 1) return outer(signal); if (signal.operation === 'continue') warn(data, 'continue targeting switch is equivalent to break'); break;}
      return;
    }
    if (action.type === 'foreach-local') {
      const patternReference=action.bindings.some(binding=>binding.reference), byReference=action.reference||patternReference;
      const source = byReference ? null : clonePhp(value(action.source));
      let count = 0;
      for (const {key, item, reference} of (byReference ? referenceEntries(action.source, state, data, () => iteration(++count)) : foreachEntries(source, !!action.key, data, () => iteration(++count)))) {if (reference && patternReference) destructureReference(action.bindings,reference,state,data); else if (reference) bindReferenceTarget(action.bindings[0].target, reference, state, data); else bindings(action.bindings, item.value, item.kind); if (action.key) assignTarget(action.key, key.value, key.kind, state, data); const signal = run(action.action); if (signal?.operation === 'return' || signal?.levels > 1) return outer(signal); if (signal?.operation === 'break') break;}
      return;
    }
    if (action.type === 'loop') {
      run(action.init); let count = 0;
      const condition = () => {let result = true; for (const node of action.conditions) result = value(node); return phpBool(result);};
      while (action.kind === 'do' && count === 0 || condition()) {iteration(++count); const signal = run(action.action); if (signal?.operation === 'return' || signal?.levels > 1) return outer(signal); if (signal?.operation === 'break') break; run(action.update);}
      return;
    }
    throw new Error(`Unsupported instruction in a synchronous frontend function: ${action.type}`);
  } catch (error) {throw withSource(error, data.source, data.trace);}
};

export const cloneClosure = value => {const data=closures.get(value);if(!data)return null;const fn=function(){};const copy={...data,values:clonePhp(data.values||{}),types:{...data.types},refs:{...data.refs},staticLocals:data.staticLocals?new Map([...data.staticLocals].map(([key,item])=>[key,{...item,value:clonePhp(item.value)}])):null};closures.set(fn,copy);for(const ref of Object.values(copy.refs))if(ref.cell)observeValueOwnership(fn,active=>active?ref.cell.bindings.add(fn):ref.cell.bindings.delete(fn));return fn;};
