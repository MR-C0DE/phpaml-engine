import {objectData, objectIs, isPhpObject} from './php-object-values.js';
import {assignType} from './php-types.js';
import {phpBool, phpType} from './php-values.js';
import {arrayEntries, arrayKind, isPhpArray} from './php-arrays.js';
import {withSource} from './diagnostics.js';

const parents = {
  Exception: ['Throwable', 'Stringable'], Error: ['Throwable', 'Stringable'], ReflectionException: ['Exception'], JsonException: ['Exception'], DateException: ['Exception'], DateMalformedStringException: ['DateException'], DateInvalidTimeZoneException: ['DateException'], DateMalformedIntervalStringException: ['DateException'], DateMalformedPeriodStringException: ['DateException'], DateInvalidOperationException: ['DateException'],
  LogicException: ['Exception'], RuntimeException: ['Exception'], ErrorException: ['Exception'],
  InvalidArgumentException: ['LogicException'], DomainException: ['LogicException'], LengthException: ['LogicException'], OutOfRangeException: ['LogicException'],
  OutOfBoundsException: ['RuntimeException'], OverflowException: ['RuntimeException'], RangeException: ['RuntimeException'], UnderflowException: ['RuntimeException'], UnexpectedValueException: ['RuntimeException'],
  TypeError: ['Error'], ArgumentCountError: ['TypeError'], ValueError: ['Error'], ArithmeticError: ['Error'], DivisionByZeroError: ['ArithmeticError'],
  AssertionError: ['Error'], UnhandledMatchError: ['Error'], CompileError: ['Error'], ParseError: ['CompileError'],
};
export const exceptionClass = (error) => {
  if (isPhpObject(error)) return objectData(error).definition.name;
  if (!(error instanceof Error)) throw new TypeError('Expected an object value.');
  if (error.phpHierarchy) return error.name;
  if (error instanceof RangeError) return ['PHP_LOOP_LIMIT', 'PHP_CALL_LIMIT'].includes(error.code) ? 'RuntimeException' : 'ValueError';
  return Object.hasOwn(parents, error.name) ? error.name : 'Error';
};
export const exceptionIs = (error, type) => {
  if (isPhpObject(error)) return objectIs(error, type);
  if (!(error instanceof Error)) return false;
  const wanted = type.replace(/^\\/, '').toLowerCase();
  const visit = (name) => name.toLowerCase() === wanted || (parents[name] || []).some(visit);
  return error.phpHierarchy ? error.phpHierarchy.some((name) => name.toLowerCase() === wanted) : visit(exceptionClass(error));
};
export const raise = (value, source, context) => {
  if (!(value instanceof Error)) throw withSource(new Error(typeof value === 'function' ? 'Cannot throw objects that do not implement Throwable' : 'Can only throw objects'), source);
  value.phpTrace ??= (context?.trace || []).map((frame) => ({...frame}));
  throw withSource(value, source);
};
const bindArguments = (nodes, names, state, context, resolve, type) => {
  const args = [];
  for (const node of nodes || []) {
    const value = resolve(node.value, state, context);
    if (node.spread) {
      if (!isPhpArray(value)) throw new TypeError('Only arrays can be unpacked in exception arguments');
      for (const [key, item] of arrayEntries(value)) args.push({...(typeof key === 'string' ? {name: key} : {}), value: item, kind: arrayKind(value, key)});
    } else args.push({...node, value, kind: type(node.value, state, context, value)});
  }
  const values = Object.create(null); let position = 0, named = false;
  for (const arg of args) {
    let name = arg.name;
    if (name !== undefined) { named = true; if (!names.includes(name)) throw new Error(`Unknown named parameter $${name}`); }
    else { if (named) throw new Error('Cannot use positional argument after named argument'); name = names[position++]; }
    if (name === undefined) throw Object.assign(new Error('Too many exception/assertion arguments'), {name: 'ArgumentCountError'});
    if (Object.hasOwn(values, name)) throw new Error(`Named parameter $${name} overwrites previous argument`);
    values[name] = {value: arg.value, kind: arg.kind};
  }
  return values;
};
const newThrowable = (descriptor, message, code, previous, source, context) => {
  const error = new Error(message);
  error.name = descriptor.name;
  error.phpHierarchy = [descriptor.name, ...descriptor.parents];
  error.phpCode = code; error.phpPrevious = previous; error.phpMessage = message;
  error.phpTrace = (context.trace || []).map((frame) => ({...frame}));
  return withSource(error, source);
};
export const evaluateException = (expression, state, context, resolve, type) => {
  const value = (node) => resolve(node, state, context), options = expression.right || {};
  if (expression.operation === 'throw') return raise(value(expression.left), expression.right || context.source, context);
  if (expression.operation === 'exceptionIs') {
    const left = value(expression.left); let right = expression.right === '@static' ? context.calledClass : value(expression.right);
    if (isPhpObject(right)) right = objectData(right).definition.name;
    else if (right instanceof Error) right = exceptionClass(right);
    if (typeof right !== 'string') throw new Error('Class name must be a valid object or a string');
    return exceptionIs(left, right);
  }
  if (expression.operation === 'exceptionGet') {
    const error = value(expression.left);
    if (error == null && options.nullable) return null;
    const name = exceptionClass(error);
    switch (options.method) {
      case 'class': return name;
      case 'getmessage': return error.phpMessage ?? error.message;
      case 'getcode': return error.phpCode ?? 0;
      case 'getprevious': return error.phpPrevious ?? null;
      case 'getfile': return error.phpFile ?? error.source?.file ?? '[browser]';
      case 'getline': return error.phpLine ?? error.source?.line ?? 0;
      case 'gettrace': return (error.phpTrace || []).map((frame) => ({...frame}));
      case 'gettraceasstring': return traceString(error);
      case '__tostring': return formatThrowable(error);
      case 'getseverity': if (exceptionIs(error, 'ErrorException')) return error.phpSeverity ?? 1; break;
    }
    throw new Error(`Unsupported Throwable method: ${options.method}`);
  }
  if (expression.operation === 'assert') {
    const args = bindArguments(expression.left, ['assertion', 'description'], state, context, resolve, type);
    if (!Object.hasOwn(args, 'assertion')) throw Object.assign(new Error('assert() requires an assertion'), {name: 'ArgumentCountError'});
    const item = args.description || {value: null, kind: 'NULL'};
    const description = item.value instanceof Error ? item.value : assignType({types: ['string'], nullable: true, property: 'assert() description'}, item.value, item.kind, options.source?.strictTypes ?? true, context).value;
    if (phpBool(args.assertion.value)) return true;
    if (description instanceof Error) return raise(description, options.source, context);
    return raise(newThrowable({name: 'AssertionError', parents: ['Error', 'Throwable', 'Stringable']}, description ?? options.description, 0, null, options.source, context), options.source, context);
  }
  const descriptor = expression.left, extended = descriptor.ctorKind === 'ErrorException';
  const args = bindArguments(options.arguments, extended ? ['message', 'code', 'severity', 'filename', 'line', 'previous'] : ['message', 'code', 'previous'], state, context, resolve, type);
  const scalar = (name, typeName, fallback, nullable = false) => {
    const item = args[name] || {value: fallback, kind: phpType(fallback)};
    return assignType({types: [typeName], nullable, property: `${descriptor.name}::__construct($${name})`}, item.value, item.kind, options.source?.strictTypes ?? true, context).value;
  };
  const message = scalar('message', 'string', ''), code = scalar('code', 'int', 0);
  const previous = args.previous?.value ?? null;
  if (previous !== null && !(previous instanceof Error)) throw new TypeError('Exception previous must be Throwable|null');
  const error = newThrowable(descriptor, message, code, previous, options.source || context.source, context);
  if (extended) { error.phpSeverity = scalar('severity', 'int', 1); error.phpFile = scalar('filename', 'string', null, true); error.phpLine = scalar('line', 'int', null, true); }
  return error;
};
const traceString = (error) => [...(error.phpTrace || []).map((frame, index) => `#${index} ${frame.file || '[browser]'}(${frame.line || 0}): ${frame.function || '{closure}'}()`), `#${(error.phpTrace || []).length} {main}`].join('\n');
export const formatThrowable = (error, seen = new Set()) => {
  if (seen.has(error)) return '[cyclic exception]';
  seen.add(error);
  const previous = error.phpPrevious ? formatThrowable(error.phpPrevious, seen) + '\n\nNext ' : '';
  return previous + `${exceptionClass(error)}: ${error.phpMessage ?? error.message} in ${error.phpFile ?? error.source?.file ?? '[browser]'}:${error.phpLine ?? error.source?.line ?? 0}\nStack trace:\n${traceString(error)}`;
};
export const linkPrevious = (error, pending) => {
  if (!(error instanceof Error) || !(pending instanceof Error) || error === pending) return;
  const seen = new Set();
  for (let cause = pending; cause; cause = cause.phpPrevious) { if (seen.has(cause)) return; seen.add(cause); }
  let tail = error;
  while (tail) {
    if (seen.has(tail)) return;
    seen.add(tail);
    if (!tail.phpPrevious) { tail.phpPrevious = pending; return; }
    tail = tail.phpPrevious;
  }
};

// A shared generator keeps event and synchronous function try/finally semantics identical.
export function* exceptionFlow(action, bind, context) {
  let pending, signal;
  try { signal = yield action.action; }
  catch (error) {
    error.phpTrace ??= (context.trace || []).map((frame) => ({...frame}));
    const branch = (action.catches || []).find((branch) => branch.types.some((type) => exceptionIs(error, type)));
    if (!branch) pending = error;
    else {
      try { if (branch.variable) bind(branch.variable, error); signal = yield branch.action; }
      catch (failure) { pending = failure; }
    }
  }
  if (action.finally) {
    try { const final = yield action.finally; if (final) return final; }
    catch (error) { linkPrevious(error, pending); throw error; }
  }
  if (pending) throw pending;
  return signal;
}
