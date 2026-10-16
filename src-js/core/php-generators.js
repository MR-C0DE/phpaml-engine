import {makeObject} from './php-object-values.js';
import {clonePhp} from './php-arrays.js';
import {withSource} from './diagnostics.js';
import {executeGeneratorBody} from './php-generator-body.js';

const generators = new WeakMap();
export const generatorDefinition = (version = 80400) => ({name: 'Generator', ancestors: ['Iterator', 'Traversable'], parent: null, interfaces: ['Iterator'], properties: {}, staticProperties: {}, constants: {}, final: true, abstract: false, methods: Object.fromEntries(['rewind', 'valid', 'current', 'key', 'next', 'send', 'throw', 'getReturn', ...(version >= 80400 ? ['__debugInfo'] : [])].map((name) => [name.toLowerCase(), {name, id: '@generator:' + name.toLowerCase(), visibility: 'public', owner: 'Generator', static: false, abstract: false}]))});
const empty = () => ({value: null, kind: 'NULL'});
const failure = (message) => Object.assign(new Error(message), {name: 'Exception'});
export const generatorMethods = ['current', 'key', 'next', 'rewind', 'valid', 'send', 'throw', 'getreturn', '__debuginfo', '__wakeup'];
export const generatorSignature = (method) => ({parameters: ['send', 'throw'].includes(method) ? [{name: method === 'send' ? 'value' : 'exception', reference: false, variadic: false}] : []});
export const isGenerator = (value) => generators.has(value);
export const createGenerator = (definition, state, context) => {
  if (--(context.objectBudget ||= {remaining: 10000}).remaining < 0) throw new RangeError('Frontend object allocation limit exceeded');
  const value = makeObject(generatorDefinition(context.source?.phpVersion));
  const frame = {definition, state, context, started: false, done: false, running: false, advanced: false, packet: null, result: null, index: -1};
  frame.caller = {...context};
  for (const key of ['loopBudget', 'callBudget', 'objectBudget', 'builtinBudget']) {
    const original = context[key] ||= {remaining: key === 'builtinBudget' ? 1000000 : 10000}; frame.caller[key] = original;
    const proxy = {};
    for (const field of key === 'callBudget' ? ['remaining', 'depth'] : ['remaining']) Object.defineProperty(proxy, field, {enumerable: true, get: () => frame.caller[key][field], set: (value) => {frame.caller[key][field] = value;}});
    context[key] = proxy;
  }
  const assign = context.assignState;
  frame.caller.assignState = assign;
  context.assignState = (...args) => frame.caller.assignState(...args);
  frame.iterator = executeGeneratorBody(definition.body, state, context, frame);
  generators.set(value, frame);
  return value;
};
export const generatorClosed = (value) => generators.get(value)?.done === true;
// A suspended generator does not keep the previous click's resource budgets.
const refresh = (frame, caller) => {
  frame.caller = {...caller};
};
const advance = (frame, method, item, caller) => {
  if (frame.running) throw new Error('Cannot resume an already running generator');
  refresh(frame, caller);
  const budget = caller.callBudget ||= {depth: 0, remaining: 10000};
  if (budget.depth >= 128 || --budget.remaining < 0) throw Object.assign(new RangeError('Frontend function call limit exceeded'), {code: 'PHP_CALL_LIMIT'});
  budget.depth++; frame.running = true;
  try {
    const step = method === 'throw' ? frame.iterator.throw(item.value) : frame.iterator.next(item);
    frame.started = true; frame.done = step.done;
    if (step.done) {frame.result = step.value?.operation === 'return' ? {value: clonePhp(step.value.value), kind: step.value.kind} : empty(); frame.packet = null;}
    else frame.packet = step.value;
  } catch (error) {frame.done = true; frame.started = true; frame.packet = null; throw withSource(error, frame.definition.source, frame.context.trace);}
  finally {frame.running = false; budget.depth--;}
};
export const generatorMethod = (value, method, args, context) => {
  const frame = generators.get(value); method = method.toLowerCase();
  if (!frame || !generatorMethods.includes(method)) throw new Error(`Call to undefined method Generator::${method}()`);
  if (context.readOnly) throw new Error('Generators must be used in frontend events');
  const names = generatorSignature(method).parameters.map((p) => p.name), values = []; let named = false;
  for (const arg of args) {
    if (arg.name !== undefined) {named = true; if (!names.includes(arg.name)) throw new Error(`Unknown named parameter $${arg.name}`);}
    else if (named) throw new Error('Cannot use positional argument after named argument');
    if (values.length) {if (arg.name !== undefined) throw new Error('Named parameter overwrites previous argument'); throw Object.assign(new Error('Too many Generator arguments'), {name: 'ArgumentCountError'});}
    values.push(arg);
  }
  if (values.length !== names.length) throw Object.assign(new Error(`Generator::${method}() expects ${names.length} arguments`), {name: 'ArgumentCountError'});
  if (method === 'throw' && !(values[0].value instanceof Error)) throw new TypeError('Generator::throw(): expected Throwable');
  if (frame.running) throw new Error('Cannot resume an already running generator');
  if (method === '__wakeup') throw failure('Unserialization of Generator is not allowed');
  if (method === '__debuginfo') return {value: {function: frame.definition.name}, kind: 'array'};
  if (!frame.started) advance(frame, 'next', empty(), context);
  if (method === 'getreturn') {if (!frame.done || !frame.result) throw failure("Cannot get return value of a generator that hasn't returned"); return frame.result;}
  if (method === 'rewind') {if (frame.advanced) throw failure('Cannot rewind a generator that was already run'); return empty();}
  if (method === 'valid') return {value: !frame.done, kind: 'boolean'};
  if (method === 'current') return frame.packet?.reference?.get() || frame.packet?.item || empty();
  if (method === 'key') return frame.packet?.key || empty();
  if (!frame.done) {frame.advanced = true; advance(frame, method === 'throw' ? 'throw' : 'next', values[0] || empty(), context);}
  else if (method === 'throw') throw values[0].value;
  return method === 'next' ? empty() : frame.packet?.reference?.get() || frame.packet?.item || empty();
};

export const generatorReference = (value,context) => {const frame=generators.get(value);if(!frame?.definition.returnsReference)throw new Error('You can only iterate a generator by-reference if it declared that it yields by-reference');generatorMethod(value,'valid',[],context);return frame.packet?.reference;};
