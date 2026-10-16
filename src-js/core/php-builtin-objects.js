import {generatorDefinition} from './php-generators.js';
import {advancedDateEntries} from './php-date-advanced.js';
import {dateDefinition, dateStorage} from './php-date-values.js';
import {stdClassDefinition} from './php-stdclass.js';
import {isPhpObject, objectData} from './php-object-values.js';
import {objectMemberAccessible} from './php-objects.js';
import {phpType} from './php-values.js';
import {makeArray, clonePhp} from './php-arrays.js';
import {exceptionClass, exceptionIs} from './php-exceptions.js';
import {isRoundingMode} from './php-rounding-mode.js';
import {warn} from './diagnostics.js';

export const introspectionNames = ['is_object', 'get_class', 'get_parent_class', 'get_called_class', 'class_exists', 'enum_exists', 'interface_exists', 'method_exists', 'property_exists', 'is_a', 'is_subclass_of', 'get_object_vars', 'get_class_methods'];
const normalized = (name) => name.replace(/^\\/, '').toLowerCase();
const definitionOf = (name, context) => typeof name === 'string' && Object.hasOwn(context.classes || {}, normalized(name)) ? context.classes[normalized(name)] : typeof name === 'string' && normalized(name) === 'generator' ? generatorDefinition(context.source?.phpVersion) : typeof name === 'string' && normalized(name) === 'stdclass' ? stdClassDefinition() : dateDefinition(name);
const lineage = (definition, context) => {const result = []; while (definition) {result.push(definition); definition = definitionOf(definition.parent, context);} return result;};
const nameOf = (value) => isPhpObject(value) ? objectData(value).definition.name : value instanceof Error ? exceptionClass(value) : typeof value === 'function' ? 'Closure' : isRoundingMode(value) ? 'RoundingMode' : value;
export const runObjects = (name, items, context) => {
  if (!introspectionNames.includes(name)) return null;
  if (context.readOnly && name !== 'is_object') throw new Error('Use object introspection in an event, then display its result through State');
  const [a, b, c] = items.map((item) => item.value), result = (value, kind = phpType(value)) => ({value, kind});
  if (['method_exists', 'property_exists'].includes(name) && phpType(a) !== 'object' && typeof a !== 'string') throw new TypeError(`${name}(): expected object|string`);
  if (name === 'is_object') return result(phpType(a) === 'object');
  if (name === 'get_class' && items[0].provided) return result(nameOf(a));
  if (name === 'get_called_class') {
    if (!context.calledClass) throw new Error('get_called_class() must be called from within a class');
    return result(context.calledClass);
  }
  if ((name === 'get_class' || name === 'get_parent_class') && !items[0].provided) {
    if (name === 'get_class' && !context.objectScope) throw new Error('get_class() without arguments must be called from within a class');
    if ((context.source?.phpVersion ?? 80400) >= 80300) warn(context, `Calling ${name}() without arguments is deprecated`, 'PHP_DEPRECATED');
    if (name === 'get_class') {if (!context.objectScope) throw new Error('get_class() without arguments must be called from within a class'); return result(context.objectScope);}
    return result(definitionOf(context.objectScope, context)?.parent || false);
  }
  const definition = definitionOf(nameOf(a), context);
  if (name === 'enum_exists') return result(!!definition?.enum);
  if (name === 'class_exists') return result(!!definition && !definition.interface);
  if (name === 'interface_exists') return result(!!definition?.interface);
  if (name === 'is_a' || name === 'is_subclass_of') {
    if (typeof a === 'string' && !c) return result(false);
    if (a instanceof Error) return result(exceptionIs(a, b) && (name === 'is_a' || normalized(exceptionClass(a)) !== normalized(b)));
    if (typeof a === 'function') return result(name === 'is_a' && normalized(b) === 'closure');
    if (isRoundingMode(a)) return result(normalized(b) === 'unitenum' || name === 'is_a' && normalized(b) === 'roundingmode');
    return result(!!definition && (name === 'is_a' ? [definition.name, ...definition.ancestors] : definition.ancestors).some((part) => normalized(part) === normalized(definitionOf(b, context)?.name || b)));
  }
  if (!definition) {
    if (phpType(a) === 'object') throw new TypeError(`${name}(): member introspection requires a compiled service object`);
    if (name === 'method_exists' || name === 'property_exists') return result(false);
    throw new TypeError(`${name}(): expected an object or a compiled class name`);
  }
  if (name === 'get_parent_class') return result(definition.parent || false);
  if (name === 'property_exists' && definition.name === 'DateInterval' && b === 'from_string') return result(!!dateStorage.get(a)?.inspected);
  if (definition.name === 'stdClass' && name === 'property_exists') return result(isPhpObject(a) && objectData(a).fields.has(b));
  if (name === 'get_object_vars' && advancedDateEntries(a, context)) {const fields = advancedDateEntries(a, context); return result(makeArray(fields.map(([key, item]) => [key, clonePhp(item.value)]), new Map(fields.map(([key, item]) => [key, item.kind]))), 'array');}
  if (definition.name === 'stdClass' && name === 'get_object_vars') return result(makeArray([...objectData(a).fields].map(([key, item]) => [key, clonePhp(item.value)]), new Map([...objectData(a).fields].map(([key, item]) => [key, item.kind]))), 'array');
  const chain = lineage(definition, context);
  if (name === 'method_exists' || name === 'property_exists') {
    const tables = name === 'method_exists' ? ['methods'] : ['properties', 'staticProperties'], key = name === 'method_exists' ? b.toLowerCase() : b;
    for (const [index, entry] of chain.entries()) for (const table of tables) if (Object.hasOwn(entry[table] || {}, key)) {
      return result(index === 0 || entry[table][key].visibility !== 'private' || name === 'method_exists' && isPhpObject(a));
    }
    return result(false);
  }
  if (name === 'get_class_methods') {
    const methods = new Map();
    for (const entry of chain) for (const [key, member] of Object.entries(entry.methods)) if (!methods.has(key)) methods.set(key, member);
    const order = new Set(chain.flatMap((entry) => entry.methodOrder || Object.keys(entry.methods)));
    return result([...order].map((key) => methods.get(key)).filter((member) => member && objectMemberAccessible(member, context)).map((member) => member.name), 'array');
  }
  const properties = new Map(), fields = objectData(a).fields, entries = [];
  for (const entry of chain.toReversed()) for (const property of Object.values(entry.properties)) properties.set(property.visibility === 'private' ? property.owner + '::$' + property.name : property.name, property);
  for (const [key, property] of properties) {
    const scoped = definitionOf(context.objectScope, context)?.properties?.[property.name];
    if (scoped?.visibility === 'private' && chain.some((entry) => normalized(entry.name) === normalized(scoped.owner)) && key !== scoped.owner + '::$' + scoped.name) continue;
    if (objectMemberAccessible(property, context) && fields.has(key)) {const item = fields.get(key); entries.push([property.name, clonePhp(item.value), item.kind]);}
  }
  return result(makeArray(entries), 'array');
};
