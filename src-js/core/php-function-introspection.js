import {resolveData, resolveType} from './value.js';
import {clonePhp, makeArray} from './php-arrays.js';
export const staticLocal = (expression, state, context) => {
  if (context.readOnly) throw new Error('Static locals require a frontend event');
  const store = context.functionStatics || (context.staticFields ||= new Map()), id = expression.left, key = '@local:' + expression.right.scope + ':' + id;
  if (!store.has(key)) {const value = resolveData(expression.right.value, state, context); store.set(key, {value, kind: resolveType(expression.right.value, state, context, value)});}
  context.localReferences[id] = {get: () => store.get(key), set: (value, kind) => {const item = {value: clonePhp(value), kind}; store.set(key, item); return item;}};
  return null;
};
export const runFunctionIntrospection = (name, items, context) => {
  if (!['func_get_args', 'func_num_args', 'func_get_arg'].includes(name)) return null;
  if (context.readOnly) throw new Error('Function argument introspection requires a frontend event');
  const args = context.functionArguments || [];
  if (name === 'func_num_args') return {value: args.length, kind: 'integer'};
  const get = (item) => item.id ? context.localReferences[item.id]?.get() || {value: context.locals[item.id], kind: context.localTypes[item.id]} : item;
  if (name === 'func_get_args') return {value: makeArray(args.map((item, index) => {const value = get(item); return [index, clonePhp(value.value), value.kind];})), kind: 'array'};
  const index = items[0].value;
  if (index < 0 || index >= args.length) throw Object.assign(new Error('func_get_arg(): Argument must be a valid argument index'), {name: 'ValueError'});
  return get(args[index]);
};
