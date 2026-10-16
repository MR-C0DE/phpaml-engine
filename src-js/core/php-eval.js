import {instantiateEvalClasses} from './php-eval-classes.js';
import {ENGINE_VERSION} from './version.js';
import {executeFunctionBody} from './php-functions.js';
import {phpString} from './php-values.js';
import {withSource} from './diagnostics.js';
import {builtinNames} from './php-builtins.js';
import {work, bytes} from './php-builtin-support.js';

let compiler = null, loading = null, assetUrl = null, assetNonce = '';
export const installEvalCompiler = (value) => { compiler = value; };
export const configureEvalAsset = (url, nonce = '') => {assetUrl = url; assetNonce = nonce;};
export const needsEvalParser = (node) => {
  if (!node || typeof node !== 'object') return false;
  if (node.$expression?.operation === 'eval' && !node.$expression.right?.program) return true;
  return Object.values(node).some(needsEvalParser);
};
export const prepareEval = async (node) => {
  if (compiler || !needsEvalParser(node)) return;
  if (!loading) loading = new Promise((resolve, reject) => {
    if (!assetUrl || typeof document === 'undefined') {reject(new Error('The optional PHP eval parser has not been configured')); return;}
    const url = new URL(assetUrl, location.href);
    if (url.origin !== location.origin) {reject(new Error('The PHP eval parser must be a same-origin asset')); return;}
    const script = document.createElement('script'); script.src = url.href; if (assetNonce) script.nonce = assetNonce;
    script.onload = () => {
      const module = globalThis.AMLPhpEval;
      if (module?.version !== ENGINE_VERSION || typeof module.compile !== 'function') {reject(new Error('Incompatible PHP eval parser asset')); return;}
      compiler = module.compile; resolve();
    };
    script.onerror = () => {script.remove(); reject(new Error('Unable to load the optional PHP eval parser'));};
    document.head.append(script);
  }).catch((error) => {loading = null; throw error;});
  await loading;
};

export const evaluateEval = (expression, state, context, resolve, type) => {
  if (context.readOnly) throw new Error('eval() is not allowed in reactive text');
  const options = expression.right, origin = options.source || context.source;
  const budget = context.callBudget ||= {depth: 0, remaining: 10000};
  if (budget.depth >= 128 || --budget.remaining < 0) throw Object.assign(new RangeError('Frontend eval/function call limit exceeded'), {code: 'PHP_CALL_LIMIT'});
  const input = resolve(expression.left, state, context), code = phpString(input, type(expression.left, state, context, input), context);
  if (bytes(code).length > 65536) throw Object.assign(new Error('Frontend eval source exceeds 64 KiB'), {name: 'ValueError'});
  work(context, code.length);
  budget.depth++;
  try {
    if (!options.program && !compiler) throw new Error('The optional PHP eval parser must load before this event');
    const program = instantiateEvalClasses(options.program || compiler(code, options, {functions: context.functions || {}, classes: context.classes || {}, builtinNames}));
    if (program.error) throw withSource(Object.assign(new Error(program.error.message), {name: program.error.name}), program.error.source, context.trace);
    const classes = context.classes ||= {};
    if (Object.keys({...classes, ...program.classes}).length > 64) throw Object.assign(new Error('Frontend eval exceeds 64 class definitions'), {name: 'ValueError'});
    Object.assign(classes, Object.fromEntries(Object.entries(program.classes || {}).filter(([,definition])=>!definition.runtimeDeclaration)));
    if (program.empty) return {value: false, kind: 'boolean'};
    const functions = context.functions ||= {}; context.functionDeclarations ||= new Set(); context.functionDefinitionIds ||= new Map();
    if (Object.keys(functions).length + Object.keys(program.functions).filter((id) => !Object.hasOwn(functions, id)).length > 256) throw Object.assign(new Error('Frontend eval exceeds 256 function definitions'), {name: 'ValueError'});
    for (const [id, definition] of Object.entries(program.functions)) {
      functions[id] = definition;
      if (context.evalFunctions) context.evalFunctions[id] = definition;
    }
    const data = {...context, source: program.source, evaluated: new WeakMap(),
      trace: [{file: origin.file, line: origin.line, function: 'eval'}, ...(context.trace || [])]};
    const signal = executeFunctionBody(program.body, state, data);
    return signal?.operation === 'return' ? {value: signal.value, kind: signal.kind} : {value: null, kind: 'NULL'};
  } catch (error) {throw withSource(error, origin, context.trace);}
  finally {budget.depth--;}
};
