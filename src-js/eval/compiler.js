import {registerReflection} from './reflection.js';
import {resolveNamespaces} from './namespaces.js';
import {registerSpl} from './spl.js';
import {registerIntl} from './intl.js';
import {registerDates} from './dates.js';
import {containsYield, markGenerator, validateStaticLocals} from './generators.js';
import Parser from 'php-parser/src/index.js';
import {compileAnonymous} from './anonymous.js';

// This optional bundle translates PHP syntax to Engine's closed instruction set.
// Neither the parser nor the interpreter evaluates JavaScript source.
// php-parser's legacy table groups concatenation with addition; PHP 8 puts it below shifts.
Parser.AST.precedence['.'] = 13.5;

const expression = (operation, left, right = null) => ({$expression: {operation, left, right}});
const sequence = (actions) => ({type: 'sequence', actions});
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
const localId = (name) => 'v' + [...encoder.encode(name)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const binary = {'<<': 'shiftLeft', '>>': 'shiftRight', xor: 'xor', '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide', '%': 'modulo', '**': 'power', '.': 'concat', '&&': 'and', and: 'and', '||': 'or', or: 'or', '??': 'coalesce', '==': 'equal', '!=': 'notEqual', '<>': 'notEqual', '===': 'identical', '!==': 'notIdentical', '<': 'less', '<=': 'lessEqual', '>': 'greater', '>=': 'greaterEqual', '<=>': 'compare', '|': 'bitOr', '&': 'bitAnd', '^': 'bitXor'};
const parents = {
  Exception: ['Throwable', 'Stringable'], Error: ['Throwable', 'Stringable'], ReflectionException: ['Exception'], JsonException: ['Exception'], DateException: ['Exception'], DateMalformedStringException: ['DateException'], DateInvalidTimeZoneException: ['DateException'], DateMalformedIntervalStringException: ['DateException'], DateMalformedPeriodStringException: ['DateException'], DateInvalidOperationException: ['DateException'],
  LogicException: ['Exception'], RuntimeException: ['Exception'], ErrorException: ['Exception'],
  InvalidArgumentException: ['LogicException'], DomainException: ['LogicException'], LengthException: ['LogicException'], OutOfRangeException: ['LogicException'],
  OutOfBoundsException: ['RuntimeException'], OverflowException: ['RuntimeException'], RangeException: ['RuntimeException'], UnderflowException: ['RuntimeException'], UnexpectedValueException: ['RuntimeException'],
  TypeError: ['Error'], ArgumentCountError: ['TypeError'], ValueError: ['Error'], ArithmeticError: ['Error'], DivisionByZeroError: ['ArithmeticError'],
  AssertionError: ['Error'], UnhandledMatchError: ['Error'], CompileError: ['Error'], ParseError: ['CompileError'],
};
const hierarchy = (name) => (parents[name] || []).flatMap((parent) => [parent, ...hierarchy(parent)]);
const hash = (text) => {let value = 2166136261; for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return (value >>> 0).toString(16);};

// PHP escapes denote bytes, whereas JavaScript strings denote Unicode text.
const string = (raw, double) => {
  const output = []; let text = '';
  const flush = () => {output.push(...encoder.encode(text)); text = '';};
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '\\' || i + 1 === raw.length) {text += raw[i]; continue;}
    const next = raw[i + 1];
    if (!double) {if (next === '\\' || next === "'") {text += next; i++;} else text += '\\'; continue;}
    const escapes = {n: '\n', r: '\r', t: '\t', v: '\v', e: '\x1b', f: '\f', '\\': '\\', '$': '$', '"': '"'};
    if (Object.hasOwn(escapes, next)) {text += escapes[next]; i++; continue;}
    let match;
    if ((match = raw.slice(i + 1).match(/^x([\da-f]{1,2})/i))) {flush(); output.push(parseInt(match[1], 16)); i += match[0].length;}
    else if ((match = raw.slice(i + 1).match(/^([0-7]{1,3})/))) {flush(); output.push(parseInt(match[1], 8) % 256); i += match[0].length;}
    else if ((match = raw.slice(i + 1).match(/^u\{([\da-f]+)\}/i))) {text += String.fromCodePoint(parseInt(match[1], 16)); i += match[0].length;}
    else text += '\\';
  }
  flush();
  try {return decoder.decode(new Uint8Array(output));}
  catch {throw Object.assign(new Error('Frontend strings must remain valid UTF-8'), {name: 'ValueError'});}
};

class Compiler {
  constructor(code, options, environment, source) {
    this.code = code; this.options = options; this.environment = {...environment, classes: {...environment.classes}}; this.classes = {}; this.source = source;
    this.functions = Object.create(null); this.declarations = new WeakMap(); this.prefix = 'eval_' + hash(source.file + code) + '_'; this.serial = 0; this.loops = 0;
    this.allowThis = options.boundThis !== false; this.functionName = 'eval';
  }
  predeclare(node) {
    if (!node || typeof node !== 'object') return;
    if (node.kind === 'function') {
      if (Object.keys(this.functions).length >= 256) this.fail(node, 'Frontend eval exceeds 256 function definitions', 'ValueError');
      const id = this.prefix + this.serial++; this.declarations.set(node, id);
      this.functions[id] = {name: this.name(node.name), declared: false};
    }
    for (const [key, value] of Object.entries(node)) if (key !== 'loc') {if (Array.isArray(value)) value.forEach((child) => this.predeclare(child)); else this.predeclare(value);}
  }
  at(node) {return {...this.source, line: node?.loc?.start?.line || 1, function: this.functionName};}
  fail(node, message, name = 'Error') {throw Object.assign(new Error(message), {name, source: this.at(node)});}
  unsupported(node) {this.fail(node, `Frontend eval does not support PHP ${node?.kind || 'syntax'}`);}
  name(node) {if (['staticreference', 'selfreference', 'parentreference'].includes(node?.kind)) return node.raw; if (node?.kind !== 'name' && node?.kind !== 'identifier' && node?.kind !== 'typereference') this.unsupported(node); return node.name.replace(/^\\/, '');}
  variable(node) {
    if (node.name === 'this' && this.options.objectScope && this.allowThis) return expression('objectThis', null);
    if (typeof node.name !== 'string') return expression('dynamicLocal', this.value(node.name));
    if (node.name === 'this' || /^(?:GLOBALS|_SERVER|_GET|_POST|_FILES|_COOKIE|_SESSION|_REQUEST|_ENV)$/.test(node.name)) this.fail(node, 'Frontend eval requires an ordinary local variable');
    return {$local: localId(node.name)};
  }
  hasNullsafeReceiver(node) {
    while (node) {
      if (node.kind === 'nullsafepropertylookup') return true;
      if (['propertylookup','offsetlookup','staticlookup'].includes(node.kind)) node = node.what;
      else if (node.kind === 'call' && ['propertylookup','nullsafepropertylookup','staticlookup'].includes(node.what.kind)) node = node.what;
      else break;
    }
    return false;
  }
  target(node, append = false, write = true) {
    if (write && this.hasNullsafeReceiver(node)) this.fail(node, "Can't use nullsafe operator in write context");
    if (node.kind === 'variable') return this.variable(node);
    if (node.kind === 'propertylookup' && node.what.kind === 'variable' && node.what.name === 'this' && !this.options.objectScope && node.offset.kind === 'identifier') {
      if (!this.allowThis || !Object.hasOwn(this.options.states || {}, node.offset.name)) this.fail(node, `Unknown frontend State $this->${node.offset.name}`);
      return this.options.states[node.offset.name];
    }
    if (node.kind === 'staticlookup' && node.offset.kind === 'variable') return this.staticProperty(node);
    if (node.kind === 'propertylookup') return expression('objectProperty', this.value(node.what), {name: node.offset.kind === 'identifier' ? this.name(node.offset) : this.value(node.offset)});
    if (node.kind === 'offsetlookup') {
      if (!node.offset && !append) this.fail(node, 'Cannot read an array append target');
      return expression(node.offset ? 'offset' : 'appendOffset', ['call', 'new'].includes(node.what.kind) || node.what.kind === 'variable' && node.what.name === 'this' ? this.value(node.what) : this.target(node.what, append, write), node.offset ? this.value(node.offset) : null);
    }
    this.fail(node, 'Frontend eval assignment requires a local, State or array offset');
  }
  staticProperty(node) {
    const target=this.classTarget(node.what);
    return expression('objectStaticProperty',target,{name:typeof node.offset.name==='string'?node.offset.name:this.value(node.offset.name)});
  }
  arguments(nodes) {return nodes.map((node) => node.kind === 'namedargument' ? {name: node.name, value: this.value(node.value)} : node.kind === 'variadic' ? {spread: true, value: this.value(node.what)} : {value: this.value(node)});}
  typeName(node) {
    const name = this.name(node).toLowerCase(), scope = this.environment.classes?.[this.options.objectScope?.toLowerCase()];
    return name === 'self' ? scope?.name?.toLowerCase() || name : name === 'parent' ? scope?.parent?.toLowerCase() || name : name === 'static' && scope ? '@static' : name;
  }
  rule(node, nullable = false) {
    if (!node) return null;
    if (node.kind === 'intersectiontype' && node.types.some((member) => ['int', 'float', 'string', 'bool', 'array', 'object', 'iterable', 'callable', 'mixed', 'null', 'true', 'false', 'void', 'never', 'self', 'parent', 'static'].includes(this.name(member).toLowerCase()))) this.fail(node, 'Intersection members must be class or interface names');
    const types = node.kind === 'uniontype' ? node.types.flatMap((type) => this.rule(type).types) : node.kind === 'intersectiontype' ? [node.types.map((type) => this.name(type).toLowerCase()).join('&')] : [this.typeName(node)];
    for(const type of types.flatMap(group=>group.split('&')))if(!this.environment.classes[type]){registerIntl(this,type)||registerSpl(this,type)||registerReflection(this,type)||registerDates(this,type);}
    if (types.flatMap((group) => group.split('&')).some((type) => !['int', 'float', 'string', 'bool', 'null', 'true', 'false', 'mixed', 'array', 'object', 'iterable', 'callable', 'closure', 'void', 'never', '@static', 'roundingmode', 'unitenum', 'backedenum', 'jsonserializable', 'stringable', 'countable', 'arrayaccess', 'traversable', 'iterator', 'iteratoraggregate', 'generator', 'arrayiterator', 'arrayobject', 'throwable', ...Object.keys(parents).map((name) => name.toLowerCase()), ...Object.values(this.environment.classes || {}).flatMap((item) => [item.name, ...item.ancestors].map((name) => name.toLowerCase()))].includes(type))) this.fail(node, 'Frontend eval supports scalar, array and callable type declarations');
    return {types, nullable: nullable || types.includes('null') || types.includes('mixed'), property: '(function)'};
  }
  function(node) {
    if (node.attrGroups?.length) this.fail(node, 'Frontend eval does not support attributes or returns by reference');
    const id = this.declarations.get(node) || this.prefix + this.serial++, named = node.kind === 'function', name = named ? this.name(node.name) : '{closure}';
    if (!this.declarations.has(node) && Object.keys(this.functions).length >= 256) this.fail(node, 'Frontend eval exceeds 256 function definitions', 'ValueError');
    const parameters = node.arguments.map((arg) => {
      if (arg.attrGroups?.length || arg.flags) this.unsupported(arg);
      return {name: arg.name.name, id: localId(arg.name.name), reference: arg.byref, variadic: arg.variadic, rule: this.rule(arg.type, arg.nullable), ...(arg.value ? {default: this.value(arg.value)} : {})};
    });
    const captures = [];
    if (node.kind === 'closure') for (const use of node.uses || []) captures.push({id: localId(use.name), reference: !!use.byref, value: this.variable(use)});
    if (node.kind === 'arrowfunc') {
      const names = new Set();
      const scan = (child, bound) => {
        if (!child || typeof child !== 'object' || child.kind === 'function') return;
        if (child.kind === 'variable' && typeof child.name === 'string' && child.name !== 'this' && !bound.has(child.name)) names.add(child.name);
        if (child.kind === 'staticlookup' && child.offset.kind === 'variable') {scan(child.what, bound); return;}
        if (child.kind === 'closure') {for (const use of child.uses || []) scan(use, bound); return;}
        if (child.kind === 'arrowfunc') {scan(child.body, new Set([...bound, ...child.arguments.map((arg) => arg.name.name)])); return;}
        for (const [key, value] of Object.entries(child)) if (key !== 'loc') {if (Array.isArray(value)) value.forEach((part) => scan(part, bound)); else scan(value, bound);}
      };
      scan(node.body, new Set(parameters.map((arg) => arg.name)));
      for (const name of names) captures.push({id: localId(name), reference: false, value: {$local: localId(name)}});
    }
    const previous = [this.allowThis, this.functionName, this.loops]; this.allowThis = !named && !node.isStatic && this.allowThis; this.functionName = name; this.loops = 0;
    this.functions[id] = {name, declared: !named};
    try {
      const body = node.kind === 'arrowfunc' ? {type: 'return', value: this.value(node.body), hasValue: true, phpSource: this.at(node.body)} : this.statement(node.body);
      this.functions[id] = {name, returnsReference: !!node.byref, parameters, returnType: this.rule(node.type, node.nullable), body, source: this.at(node), declared: !named, objectScope: named ? null : this.options.objectScope || null, bindThis: !named && !node.isStatic && this.allowThis && !!this.options.objectScope};
      markGenerator(this.functions[id]);
      if (this.functions[id].generator && node.byref && JSON.stringify(this.functions[id].body).includes('\"yieldFrom\"')) this.fail(node,'Cannot use yield from inside a by-reference generator');
    } finally {[this.allowThis, this.functionName, this.loops] = previous;}
    return named ? {type: 'function-declare', id} : expression('closure', id, captures);
  }
  classTarget(node) {
    if (!['name','identifier','typereference','staticreference','selfreference','parentreference'].includes(node?.kind)) return expression('objectClassName',this.value(node));
    const raw=this.name(node), lower=raw.toLowerCase(), scope=this.environment.classes?.[this.options.objectScope?.toLowerCase()];
    registerDates(this,raw); registerSpl(this,raw); registerIntl(this,raw);registerReflection(this,raw);
    return lower==='static'?'@static':lower==='self'?scope?.name:lower==='parent'?scope?.parent:raw;
  }
  value(node) {
    const result=this.rawValue(node);let cursor=result;
    while(cursor?.$expression){const e=cursor.$expression;if(e.operation==='nullsafeChain'||['objectProperty','objectCall'].includes(e.operation)&&e.right?.nullable)return expression('nullsafeChain',result);if(!['objectProperty','objectCall','objectMethodRef','offset','objectClassName','objectStaticProperty','objectClass','objectConstant'].includes(e.operation))break;cursor=e.left??e.right?.class;}
    return result;
  }
  rawValue(node) {
    if (!node) return null;
    switch (node.kind) {
      case 'yield': return expression('yield', this.value(node.key), {value: this.value(node.value), keyed: !!node.key});
      case 'yieldfrom': return expression('yieldFrom', this.value(node.value));
      case 'variable': return this.variable(node);
      case 'boolean': return node.value;
      case 'nullkeyword': return null;
      case 'number': {
        const raw = node.value.replaceAll('_', ''), integer = /^(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+)$/.test(raw);
        const number = /^0[0-7]+$/.test(raw) ? parseInt(raw, 8) : Number(raw);
        if (!Number.isFinite(number) || integer && !Number.isSafeInteger(number)) this.fail(node, 'Frontend numeric literal exceeds its safe range', 'ValueError');
        return integer ? number : {$float: Object.is(number, -0) ? '-0' : number};
      }
      case 'string': return string(node.raw.replace(/^[bB]?(?:'|")/, '').slice(0, -1), node.isDoubleQuote);
      case 'nowdoc': return node.value;
      case 'encapsedpart': return this.value(node.expression);
      case 'encapsed': {
        if (node.type !== 'string') this.unsupported(node);
        return node.value.reduce((left, part) => expression('concat', left, part.expression.kind === 'string' ? string(part.expression.raw, true) : this.value(part.expression)), '');
      }
      case 'name': {
        const name = this.name(node);
        if (Object.hasOwn(this.options.constants || {}, name)) return this.options.constants[name];
        this.fail(node, `Undefined frontend constant ${name}`);
        break;
      }
      case 'magic': if (node.value === '__LINE__') return node.loc.start.line; this.unsupported(node); break;
      case 'array': return expression('array', node.items.map((item) => {
        if (!item) this.fail(node, 'Frontend array entries cannot be references or holes');
        return item.unpack ? {spread: this.value(item.value)} : {value: item.byRef ? this.target(item.value, true) : this.value(item.value), reference: !!item.byRef, ...(item.key ? {key: this.value(item.key)} : {})};
      }));
      case 'offsetlookup': return expression('offset', this.value(node.what), node.offset ? this.value(node.offset) : this.fail(node, 'Cannot read an array append target'));
      case 'propertylookup': return this.target(node, false, false);
      case 'nullsafepropertylookup': return expression('objectProperty', this.value(node.what), {name: node.offset.kind === 'identifier' ? this.name(node.offset) : this.value(node.offset), nullable: true});
      case 'clone': return expression('objectClone', this.value(node.what));
      case 'staticlookup': {
        if (node.offset.kind === 'variable') return this.staticProperty(node);
        if (!['name','identifier','typereference','staticreference','selfreference','parentreference'].includes(node.what.kind)) return expression(this.name(node.offset).toLowerCase()==='class'?'objectClass':'objectConstant', this.name(node.offset).toLowerCase()==='class'?this.value(node.what):this.classTarget(node.what), this.name(node.offset).toLowerCase()==='class'?{dynamic:true}:this.name(node.offset));
        registerIntl(this,this.name(node.what));registerReflection(this,this.name(node.what));
        if (this.name(node.what).toLowerCase() === 'roundingmode') return expression('roundingMode', this.name(node.offset));
        const raw = this.name(node.what), scope = this.environment.classes?.[this.options.objectScope?.toLowerCase()];
        const target = raw.toLowerCase() === 'static' ? '@static' : raw.toLowerCase() === 'self' ? scope?.name : raw.toLowerCase() === 'parent' ? scope?.parent : raw;
        if (target && (this.name(node.offset).toLowerCase()==='class' || target === '@static' || this.environment.classes?.[target.toLowerCase()])) return expression(this.name(node.offset).toLowerCase() === 'class' ? 'objectClass' : 'objectConstant', target, this.name(node.offset));
        this.unsupported(node); break;
      }
      case 'bin': {
        if (node.type === 'instanceof') return expression('exceptionIs', this.value(node.left), ['name','identifier','typereference','staticreference','selfreference','parentreference'].includes(node.right.kind) ? this.classTarget(node.right) : this.value(node.right));
        for (const group of [['<', '<=', '>', '>='], ['==', '!=', '===', '!==', '<>', '<=>']]) if (group.includes(node.type) && [node.left, node.right].some((part) => part.kind === 'bin' && group.includes(part.type) && !part.parenthesizedExpression)) this.fail(node, 'Comparison operators are not associative', 'ParseError');
        if (!Object.hasOwn(binary, node.type)) this.unsupported(node);
        return expression(binary[node.type], this.value(node.left), this.value(node.right));
      }
      case 'unary': {
        const value = this.value(node.what);
        if (node.type === '~') return expression('bitNot', value);
        if (node.type === '!') return expression('not', value);
        if (node.type === '+') return expression('multiply', 1, value);
        if (node.type === '-') return expression('multiply', -1, value);
        this.unsupported(node); break;
      }
      case 'cast': {
        const operation = {int: 'toInt', float: 'toFloat', string: 'toString', bool: 'toBool', array: 'toArray', object: 'toObject'}[node.type];
        if (!operation) this.unsupported(node); return expression(operation, this.value(node.expr));
      }
      case 'retif':
        if ([node.test, node.falseExpr].some((part) => part?.kind === 'retif' && !part.parenthesizedExpression && (part.trueExpr || node.trueExpr))) this.fail(node, 'Unparenthesized nested ternary expressions are not supported by PHP 8', 'ParseError');
        return node.trueExpr ? {$conditional: {left: this.value(node.test), operator: 'truthy', right: true, then: this.value(node.trueExpr), otherwise: this.value(node.falseExpr)}} : expression('elvis', this.value(node.test), this.value(node.falseExpr));
      case 'match': return expression('match', this.value(node.cond), node.arms.map((arm) => ({default: !arm.conds, conditions: arm.conds?.map((cond) => this.value(cond)) || [], value: this.value(arm.body)})));
      case 'isset': return node.variables.map((variable) => expression('isset', this.value(variable))).reduce((a, b) => expression('and', a, b));
      case 'empty': return expression('empty', this.value(node.expression));
      case 'assignref':
        if (this.hasNullsafeReceiver(node.right)) this.fail(node, 'Cannot take reference of a nullsafe chain');
        return expression('assignReference', this.target(node.left, true), node.right.kind === 'call' ? this.value(node.right) : this.target(node.right, true));
      case 'assign': {
        const target = this.target(node.left, true), value = this.value(node.right);
        if (node.operator === '=') return expression('assign', target, value);
        if (node.operator === '??=') return expression('coalesceAssign', target, value);
        const operator = node.operator.slice(0, -1); if (!['+', '-', '*', '/', '%', '**', '.', '<<', '>>', '&', '|', '^'].includes(operator)) this.unsupported(node);
        return expression('compoundAssign', target, {operator, value});
      }
      case 'pre': case 'post': return expression(node.kind + (node.type === '+' ? 'Increment' : 'Decrement'), this.target(node.what));
      case 'closure': case 'arrowfunc': return this.function(node);
      case 'eval': return expression('eval', this.value(node.source), {...this.options, states: this.allowThis ? this.options.states : {}, boundThis: this.allowThis, source: this.at(node), program: undefined});
      case 'call': {
        if (['propertylookup', 'nullsafepropertylookup'].includes(node.what.kind)) {
          const reference = node.arguments[0]?.kind === 'variadicplaceholder';
          if (reference && this.hasNullsafeReceiver(node.what)) this.fail(node, 'Cannot combine nullsafe operator with Closure creation');
          return expression(reference ? 'objectMethodRef' : 'objectCall', this.value(node.what.what), {name: node.what.offset.kind === 'identifier' ? this.name(node.what.offset) : this.value(node.what.offset), nullable: node.what.kind === 'nullsafepropertylookup', arguments: reference ? [] : this.arguments(node.arguments), source: this.at(node)});
        }
        if (node.what.kind === 'staticlookup') {
          const name=this.classTarget(node.what.what),reference=node.arguments[0]?.kind==='variadicplaceholder';
          if (reference && this.hasNullsafeReceiver(node.what)) this.fail(node, 'Cannot combine nullsafe operator with Closure creation');
          const lower=['staticreference','selfreference','parentreference','name'].includes(node.what.what.kind)?this.name(node.what.what).toLowerCase():'';
          return expression(reference?'objectMethodRef':'objectCall',null,{class:name,name:node.what.offset.kind==='identifier'?this.name(node.what.offset):this.value(node.what.offset),forward:['self','parent','static'].includes(lower),arguments:reference?[]:this.arguments(node.arguments),source:this.at(node)});
        }
        const name = node.what.kind === 'name' ? this.name(node.what) : null, target = name || this.value(node.what);
        if (name && /^numfmt_/i.test(name)) registerIntl(this,'NumberFormatter');
        if (name && /^(?:date_|timezone_)/i.test(name)) registerDates(this, 'DateTime');
        if (node.arguments[0]?.kind === 'variadicplaceholder') {
          if (!name) return target;
          const builtin = (this.environment.builtinNames || []).includes(name.toLowerCase());
          const found = Object.entries({...this.environment.functions, ...this.functions}).find(([, fn]) => fn?.name.toLowerCase() === name.toLowerCase());
          if (found) return expression('functionRef', found[0]);
          if (!builtin) this.fail(node, `Unknown frontend callable ${name}`);
          const id = this.prefix + this.serial++; this.functions[id] = {name, builtin: name.toLowerCase(), parameters: [], declared: true, source: this.at(node)}; return expression('functionRef', id);
        }
        const args = this.arguments(node.arguments);
        if (name?.toLowerCase() === 'assert') return expression('assert', args, {description: this.code.slice(node.loc.start.offset, node.loc.end.offset), source: this.at(node)});
        return expression('call', target, {arguments: args, source: {...this.at(node), ...(['call_user_func','call_user_func_array'].includes(name?.toLowerCase()) ? {callbackDirect: true, callbackStrictTypes: this.at(node).strictTypes ?? true} : {})}});
      }
      case 'new': {
        if (!['class','name','identifier','typereference','staticreference','selfreference','parentreference'].includes(node.what.kind)) return expression('objectNew',this.classTarget(node.what),{arguments:this.arguments(node.arguments),source:this.at(node)});
        if (node.what?.kind === 'name') {registerSpl(this, this.name(node.what)); registerDates(this, this.name(node.what)); registerIntl(this,this.name(node.what));registerReflection(this,this.name(node.what));}
        if (node.what.kind === 'class') return compileAnonymous(this, node);
        const requested = this.name(node.what), name = Object.keys(parents).find((key) => key.toLowerCase() === requested.toLowerCase());
        if (!name) {
          const scope = this.environment.classes?.[this.options.objectScope?.toLowerCase()], lower = requested.toLowerCase();
          const target = lower === 'self' ? scope?.name : lower === 'parent' ? scope?.parent : lower === 'static' ? '@static' : requested;
          if (target !== '@static' && !this.environment.classes?.[target?.toLowerCase()]) this.fail(node, `Unknown compiled frontend class ${requested}`);
          return expression('objectNew', target, {arguments: this.arguments(node.arguments), source: this.at(node)});
        }
        return expression('exception', {name, parents: hierarchy(name), ctorKind: name === 'ErrorException' ? name : hierarchy(name).includes('Exception') || name === 'Exception' ? 'Exception' : 'Error'}, {arguments: this.arguments(node.arguments), source: this.at(node)});
      }
      case 'throw': return expression('throw', this.value(node.what), this.at(node));
      default: this.unsupported(node);
    }
  }
  bindings(node, path = [], slots = []) {
    if (node.kind !== 'list' && node.kind !== 'array') return [{target: this.target(node), path}];
    return node.items.flatMap((item, index) => {if (!item || !item.value) return []; if (item.unpack) this.unsupported(item); return this.bindings(item.value, [...path, item.key ? this.value(item.key) : index], [...slots, index]).map(binding=>({...binding,reference:!!item.byRef}));});
  }
  statement(node) {
    if (!node) return sequence([]);
    const source = this.at(node), statement = this.instruction(node);
    return {...statement, phpSource: source};
  }
  instruction(node) {
    const evaluate = (value) => ({type: 'evaluate', value: this.value(value), phpSource: this.at(value)});
    switch (node.kind) {
      case 'program': case 'block': return sequence(node.children.map((child) => this.statement(child)));
      case 'expressionstatement': {
        const expr = node.expression;
        if (expr.kind === 'assign' && ['list', 'array'].includes(expr.left.kind) && expr.operator === '=') return {type: 'destructure', value: this.value(expr.right), bindings: this.bindings(expr.left)};
        if (expr.kind === 'call' && expr.what.kind === 'name' && this.name(expr.what).toLowerCase() === 'var_dump') return {type: 'console', level: 'dump', values: expr.arguments.map((arg) => this.value(arg))};
        return evaluate(expr);
      }
      case 'echo': return {type: 'console', level: 'echo', values: node.expressions.map((expr) => this.value(expr))};
      case 'return': return {type: 'return', value: this.value(node.expr), hasValue: !!node.expr};
      case 'if': return {type: 'condition', left: this.value(node.test), operator: 'truthy', value: true, then: this.statement(node.body), otherwise: node.alternate ? this.statement(node.alternate) : null};
      case 'while': case 'do': case 'for': {
        this.loops++;
        try {return {type: 'loop', kind: node.kind, init: sequence((node.init || []).map(evaluate)), conditions: node.kind === 'for' ? node.test.map((expr) => this.value(expr)) : [this.value(node.test)], update: sequence((node.increment || []).map(evaluate)), action: this.statement(node.body), limit: 1000};}
        finally {this.loops--;}
      }
      case 'foreach': {
        this.loops++;
        try {return {type: 'foreach-local', source: node.value.byref ? this.target(node.source) : this.value(node.source), reference: !!node.value.byref, key: node.key ? this.target(node.key) : null, bindings: this.bindings(node.value), action: this.statement(node.body), limit: 1000};}
        finally {this.loops--;}
      }
      case 'break': case 'continue': {
        const levels = node.level ? this.value(node.level) : 1;
        if (!Number.isInteger(levels) || levels < 1 || levels > this.loops) this.fail(node, `Cannot ${node.kind} ${levels} levels`, 'ParseError');
        return {type: 'loop-control', operation: node.kind, levels};
      }
      case 'switch': {
        this.loops++;
        try {return {type: 'switch', value: this.value(node.test), cases: node.body.children.map((arm) => ({default: !arm.test, ...(arm.test ? {value: this.value(arm.test)} : {}), action: this.statement(arm.body)}))};}
        finally {this.loops--;}
      }
      case 'try': return {type: 'try', action: this.statement(node.body), catches: node.catches.map((branch) => ({types: branch.what.map((type) => this.name(type)), variable: branch.variable ? this.target(branch.variable) : null, action: this.statement(branch.body)})), finally: node.always ? this.statement(node.always) : null};
      case 'throw': return evaluate(node);
      case 'enum': {
        const name=this.name(node.name),backing=node.valueType?.name||null,cases=Object.fromEntries(node.body.filter(member=>member.kind==='enumcase').map(member=>[this.name(member.name),member.value?this.value(member.value):null]));
        compileAnonymous(this,{what:{...node,kind:'class',body:node.body.filter(member=>member.kind!=='enumcase')},arguments:[],loc:node.loc},name);
        const definition=this.classes[name.toLowerCase()];Object.assign(definition,{enum:true,backingType:backing,enumCases:cases,final:true,runtimeDeclaration:true});definition.ancestors.push('UnitEnum',...(backing?['BackedEnum']:[]));
        for(const [property,type]of Object.entries({name:'string',...(backing?{value:backing}:{})}))definition.properties[property]={name:property,owner:name,visibility:'public',readonly:true,rule:{types:[type],nullable:false}};
        for(const key of Object.keys(cases))definition.constants[key]={owner:name,visibility:'public',value:expression('enumCase',name,key)};
        for(const method of ['cases',...(backing?['from','tryFrom']:[])]){const id=this.prefix+this.serial++;definition.methods[method.toLowerCase()]={name:method,id,owner:name,static:true,visibility:'public',abstract:false,final:false};this.functions[id]={name:name+'::'+method,parameters:method==='cases'?[]:[{id:'v76616c7565',name:'value',reference:false,variadic:false,rule:{types:[backing],nullable:false}}],returnType:null,declared:true,internal:true,objectScope:name,source:this.at(node),body:{type:'return',hasValue:true,value:expression(method==='cases'?'enumCases':'enumFrom',name,method==='cases'?null:{value:{$local:'v76616c7565'},nullable:method==='tryFrom'})}};}
        return {type:'evaluate',value:expression('objectDeclare',name,definition)};
      }
      case 'class': {const name=this.name(node.name);compileAnonymous(this,{what:node,arguments:[],loc:node.loc},name);const definition=this.classes[name.toLowerCase()];definition.final=!!node.isFinal;definition.runtimeDeclaration=true;return {type:'evaluate',value:expression('objectDeclare',name,definition)};}
      case 'function': return this.function(node);
      case 'static': return sequence(node.variables.map((item) => {const variable = item.kind === 'staticvariable' ? item.variable : item; const value = item.kind === 'staticvariable' ? this.value(item.defaultValue) : null; const check = (part) => {if (!part || typeof part !== 'object') return; if (part.$local || part.$state || part.$expression && !['array','add','subtract','multiply','divide','modulo','power','concat','not','objectConstant','objectClass','roundingMode','enumCase'].includes(part.$expression.operation)) this.fail(item, 'Frontend static initializers must be constant expressions'); Object.values(part).forEach(check);}; if ((this.source.phpVersion ?? 80400) < 80300) check(value); return {type: 'evaluate', value: expression('staticLocal', localId(variable.name), {value, scope: this.source.file + ':' + this.functionName + ':' + node.loc.start.line})};}));
      case 'unset': return sequence(node.variables.map((variable) => ({type: 'evaluate', value: expression('unsetOffset', this.target(variable))})));
      default: this.unsupported(node);
    }
  }
}

export const compileEval = (code, options = {}, environment = {}) => {
  const origin = options.source || {file: '[browser]', line: 1};
  const source = {...origin, file: `${origin.file}(${origin.line}) : eval()'d code`, line: 1, function: 'eval', strictTypes: false};
  try {
    if (encoder.encode(code).length > 65536) throw Object.assign(new Error('Frontend eval source exceeds 64 KiB'), {name: 'ValueError'});
    if (code === '') return {empty: true, source};
    const parser = new Parser({parser: {version: '8.4'}, ast: {withPositions: true}}), ast = parser.parseEval(code);
    let count = 0;
    const scan = (node, depth = 0) => {
      if (!node || typeof node !== 'object') return;
      if (depth > 128 || node.kind && ++count > 10000) throw Object.assign(new Error('Frontend eval syntax exceeds its size or nesting limit'), {name: 'ValueError'});
      for (const [key, value] of Object.entries(node)) if (key !== 'loc') {if (Array.isArray(value)) value.forEach((child) => scan(child, depth + 1)); else scan(value, depth + 1);}
    };
    scan(ast);resolveNamespaces(ast,environment);
    if (ast.children[0]?.kind === 'declare') {
      const declaration = ast.children.shift(), [directive] = declaration.directives;
      if (declaration.mode !== 'none' || declaration.directives.length !== 1 || directive.key.name !== 'strict_types' || !['0', '1'].includes(directive.value.value)) throw new Error('Frontend eval only supports declare(strict_types=0 or 1);');
      source.strictTypes = directive.value.value === '1';
    }
    const compiler = new Compiler(code, options, environment, source);
    compiler.predeclare(ast);
    // PHP hoists only unconditional declarations at the eval program's top level.
    const declarations = ast.children.filter((node) => node.kind === 'function').map((node) => compiler.statement(node));
    const rest = ast.children.filter((node) => node.kind !== 'function').map((node) => compiler.statement(node));
    validateStaticLocals([...declarations, ...rest], source.phpVersion);
    if (containsYield([...declarations, ...rest])) throw new Error('yield is only allowed inside a generator function.');
    return {body: sequence([...declarations, ...rest]), functions: compiler.functions, classes: compiler.classes, source};
  } catch (error) {
    const parse = error instanceof SyntaxError || error.lineNumber !== undefined;
    return {error: {name: parse || error.name === 'ParseError' ? 'ParseError' : error.name === 'ValueError' || error instanceof RangeError ? 'ValueError' : 'Error', message: error.message, source: error.source || {...source, line: error.lineNumber || 1}}};
  }
};
