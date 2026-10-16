import {builtinNames, invokeBuiltin} from './php-builtins.js';
import specs from './builtin-signatures.json' with {type: 'json'};
import {isFrontendCallable, callableDefinition, invokeFunction} from './php-functions.js';
import {objectData, isPhpObject} from './php-object-values.js';
import {methodCallable} from './php-objects.js';
import {isPhpArray, arrayEntries, arrayKind, arrayElementReference} from './php-arrays.js';
import {createReference} from './php-references.js';
import {phpString, phpType} from './php-values.js';
import {warn} from './diagnostics.js';
import {runFilter, runFilterArray} from './php-filter.js';

export const utilityNames = ['is_callable', 'function_exists', 'call_user_func', 'call_user_func_array', 'filter_var', 'filter_var_array'];
const normalized = (name) => name.replace(/^\\/, '').toLowerCase();
const functionExists = (name, context) => builtinNames.includes(normalized(name)) || Object.values(context.functions || {}).some((fn) => normalized(fn.name) === normalized(name) && !name.includes('::') && !name.includes('{') && (fn.declared || context.functionDeclarations?.has(normalized(name))));
const callableName = (value, context) => {
  if (typeof value === 'function') return 'Closure::__invoke';
  if (isPhpObject(value)) return objectData(value).definition.name + '::__invoke';
  if (value instanceof Error) return value.name + '::__invoke';
  if (isPhpArray(value)) return arrayEntries(value).length === 2 && Object.hasOwn(value, 0) && (typeof value[0] === 'string' || isPhpObject(value[0])) && typeof value[1] === 'string' ? (isPhpObject(value[0]) ? objectData(value[0]).definition.name : value[0]) + '::' + value[1] : 'Array';
  return phpString(value, phpType(value), context);
};
export const invokeUtilityCallback = (callback, args, state, context) => {
  if (!isFrontendCallable(callback, context)) throw new TypeError('Expected an accessible compiled frontend callable');
  const definition = typeof callback === 'string' && builtinNames.includes(normalized(callback)) ? {builtin: normalized(callback)} : callableDefinition(methodCallable(callback, context) || callback, context);
  const parameters = definition.builtin ? specs[definition.builtin] : definition.parameters || [];
  const items = args.map((argument, index) => {
    const parameter = (argument.name === undefined ? parameters[index] : parameters.find((p) => p.name === argument.name)) || parameters.find((p) => p.variadic);
    if (parameter?.reference && !argument.ref) {warn(context, 'Callback argument must be passed by reference, value given'); return {...argument, ref: createReference({value: argument.value, kind: argument.kind})};}
    return argument;
  });
  return invokeFunction(callback, items, state, context);
};
export const runUtility = (name, items, state, context) => {
  if (!utilityNames.includes(name)) return null;
  const [a, b] = items.map((item) => item.value), result = (value, kind = phpType(value)) => ({value, kind});
  if (name === 'function_exists') return result(functionExists(a, context));
  if (name === 'is_callable') {
    const label = callableName(a, context); items[2]?.ref?.set(label, 'string');
    return result(b ? typeof a === 'string' || isPhpArray(a) && label !== 'Array' || phpType(a) === 'object' && isFrontendCallable(a, context) : isFrontendCallable(a, context));
  }
  if (name === 'filter_var' || name === 'filter_var_array') return (name === 'filter_var' ? runFilter : runFilterArray)(items, context, (callback, args, weak = false) => invokeUtilityCallback(callback, args, state, weak ? {...context, source: {...context.source, strictTypes: false}} : context), (name, args) => invokeBuiltin(name, args, state, context));
  const args = name === 'call_user_func' ? items.slice(1).map(({ref, ...item}) => item) : arrayEntries(b).map(([key, value]) => ({value, kind: arrayKind(b, key), ...(typeof key === 'string' ? {name: key} : {}), ref: arrayElementReference(b, key)}));
  const item = invokeUtilityCallback(a, args, state, {...context, source: {...context.source, strictTypes: context.source?.callbackStrictTypes ?? false, callbackStrictTypes: false, callbackDirect: false}});
  return context.source?.callbackDirect ? item : {value: item.value, kind: item.kind};
};
