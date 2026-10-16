import {makeObject} from './php-object-values.js';
import {makeArray} from './php-arrays.js';
import {resolveData} from './value.js';

export const enumCase = (name, caseName, context) => {
  const definition = context.classes?.[name.toLowerCase()];
  if (!definition?.enum || !Object.hasOwn(definition.enumCases, caseName)) throw new Error('Unknown frontend enum case');
  const fields = context.staticFields ||= new Map(), key = '@enum:' + name.toLowerCase() + '::' + caseName;
  if (!fields.has(key)) {
    const properties = new Map([['name', {value: caseName, kind: 'string'}]]);
    if (definition.backingType) properties.set('value', {value: definition.enumCases[caseName], kind: definition.backingType === 'int' ? 'integer' : 'string'});
    fields.set(key, {value: makeObject(definition, properties), kind: 'object'});
  }
  return fields.get(key);
};
export const evaluateEnum = (expression, state, context) => {
  const name = expression.left, definition = context.classes?.[name.toLowerCase()];
  if (!definition?.enum) throw new Error('Unknown frontend enum');
  if (expression.operation === 'enumCase') return enumCase(name, expression.right, context);
  if (expression.operation === 'enumCases') return {value: makeArray(Object.keys(definition.enumCases).map((key, index) => [index, enumCase(name, key, context).value, 'object'])), kind: 'array'};
  const value = resolveData(expression.right.value, state, context);
  for (const [key, backing] of Object.entries(definition.enumCases)) if (value === backing) return enumCase(name, key, context);
  if (expression.right.nullable) return {value: null, kind: 'NULL'};
  throw Object.assign(new Error('Invalid backing value for enum ' + name), {name: 'ValueError'});
};
