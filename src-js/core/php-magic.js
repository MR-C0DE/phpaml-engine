import {objectData, isPhpObject} from './php-object-values.js';
import {objectMemberLookup} from './php-objects.js';
import {bindMethod, invokeFunction} from './php-functions.js';
import {makeArray, arrayWrite, clonePhp} from './php-arrays.js';
import {phpType} from './php-values.js';
import {warn} from './diagnostics.js';

export const magicMember = (className, name, context) => objectMemberLookup(className, name, 'methods', context, false);
export const callMagic = (value, className, member, args, state, context) => invokeFunction(
  bindMethod(member.id, member.static ? null : value, member.owner, className),
  args.map((item) => ({value: item.value, kind: item.kind || phpType(item.value)})), state, context);
export const hasMagicInvoke = (value, context) => isPhpObject(value) && !!magicMember(objectData(value).definition.name, '__invoke', context);
export const objectInvokeTarget = (value, context) => {
  if (!isPhpObject(value)) return null;
  const name = objectData(value).definition.name, member = magicMember(name, '__invoke', context);
  return member && bindMethod(member.id, value, member.owner, name);
};
export const objectToString = (value, context) => {
  const name = objectData(value).definition.name, member = context && magicMember(name, '__tostring', context);
  if (!member) throw new Error(`Object of class ${name} could not be converted to string`);
  if (context.readOnly) throw new Error('Service objects must be used in frontend events');
  const result = callMagic(value, name, member, [], context.objectState || {}, context);
  if (typeof result.value !== 'string') throw new TypeError(`${name}::__toString() must return a string`);
  return result.value;
};
export const magicArguments = (args) => {
  let result = makeArray(), position = 0, named = false;
  const seen = new Set();
  for (const arg of args) {
    const hasName = Object.hasOwn(arg, 'name');
    if (!hasName && named) throw new Error('Cannot use positional argument after named argument');
    const key = hasName ? arg.name : position++;
    if (hasName) {named = true; if (seen.has(key)) throw new Error(`Named parameter $${key} overwrites previous argument`); seen.add(key);}
    result = arrayWrite(result, key, clonePhp(arg.value), arg.kind, null);
  }
  return result;
};

// By-value __get results cannot be written back through an array offset/reference.
export const detachedMagicReference = (read, className, name, context) => {
  let item, warned = false;
  const notice = () => {if (!warned) {warned = true; warn(context, `Indirect modification of overloaded property ${className}::$${name} has no effect`, 'PHP_NOTICE');}};
  const get = () => item ||= (() => {const result = read(); return {...result, value: clonePhp(result.value)};})();
  return {get, acquire: () => {const result = get(); notice(); return result;}, warnIndirect: notice,
    set: (value, kind) => {notice(); item = {value: clonePhp(value), kind}; return item;}, remove: notice};
};
