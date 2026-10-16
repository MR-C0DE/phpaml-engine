import {isRoundingMode} from './php-rounding-mode.js';
import {advancedDateEntries} from './php-date-advanced.js';
import {invokeCollectionMethod} from './php-object-collections.js';
import {isPhpObject, objectData} from './php-object-values.js';
import {makeStdClass, makeStdClassFromArray, stdClassArray} from './php-stdclass.js';
import {makeArray, clonePhp, arrayKey, ownArray, isPhpArray} from './php-arrays.js';
export const compoundCast = (operation, value, kind, context) => {
  if (operation === 'toObject' && (isPhpObject(value) || value instanceof Error || typeof value === 'function' || isRoundingMode(value))) return {value, kind: 'object'};
  if (value instanceof Error || typeof value === 'function') throw new TypeError('Frontend compound casts do not expose exception or closure internals');
  if (operation === 'toObject') {
    if (context.readOnly) throw new Error('Create objects inside frontend events');
    if (--(context.objectBudget ||= {remaining: 10000}).remaining < 0) throw new RangeError('Frontend object allocation limit exceeded');
    const temporary = {}; ownArray(temporary, 'source', value);
    try {
      return {value: isPhpArray(value) ? makeStdClassFromArray(value) : makeStdClass(value == null ? [] : [['scalar', {value, kind}]]), kind: 'object'};
    } finally {ownArray(temporary, 'source', null);}
  }
  if (isRoundingMode(value)) return {value: makeArray([['name', value.name, 'string']]), kind: 'array'};
  if (isPhpObject(value)) {
    const name = objectData(value).definition.name.toLowerCase();
    if (name === 'stdclass') return {value: stdClassArray(value) || makeArray(), kind: 'array'};
    if (['dateinterval', 'dateperiod'].includes(name)) {const entries = advancedDateEntries(value, context);return {value:makeArray(entries.map(([key,item])=>[key,item.value,item.kind])),kind:'array'};}
    if (['arrayiterator', 'arrayobject'].includes(name)) return invokeCollectionMethod(value, 'getarraycopy', [], context);
    if (['datetime', 'datetimeimmutable', 'datetimezone'].includes(name)) throw new TypeError('Frontend array casts do not expose internal date fields; use format()');
    const data = objectData(value), properties = new Map(), chain = []; let item = data.definition;
    while (item) {chain.unshift(item); item = item.parent && context.classes?.[item.parent.toLowerCase()];}
    for (const definition of chain) for (const property of Object.values(definition.properties || {})) properties.set(property.visibility === 'private' ? property.owner + '::$' + property.name : property.name, property);
    const types = new Map();
    const entries = [...data.fields].map(([key, item]) => {const property = properties.get(key), name = arrayKey(property && property.visibility !== 'public' ? '\0' + (property.visibility === 'private' ? property.owner : '*') + '\0' + property.name : key, context); types.set(name, item.kind); return [name, clonePhp(item.value)];});
    return {value: makeArray(entries, types), kind: 'array'};
  }
  return {value: isPhpArray(value) ? clonePhp(value) : makeArray(value == null ? [] : [[0, value, kind]]), kind: 'array'};
};
