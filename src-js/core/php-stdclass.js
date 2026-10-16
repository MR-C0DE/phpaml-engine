import {makeObject, objectData} from './php-object-values.js';
import {clonePhp, ownArray, makeArray, arrayEntries, arrayKey, arrayKind, arrayRead, arrayWrite, arrayUnset, arrayReference} from './php-arrays.js';
import {observeValueOwnership} from './php-value-ownership.js';
import {warn} from './diagnostics.js';

export const stdClassDefinition = () => ({name: 'stdClass', parent: null, ancestors: [], properties: {}, staticProperties: {}, constants: {}, methods: {}, abstract: false, final: false});
const synchronize = (data, value) => {
  data.fieldsArray = value;
  data.fields = new Map(arrayEntries(value).map(([key]) => [String(key), {get value() {return arrayRead(data.fieldsArray, key, null, true).value;}, get kind() {return arrayKind(data.fieldsArray, key);}}]));
  ownArray(data, 'fieldsArray', data.fieldsActive === false ? null : value);
};
export const watchObjectFields = (value) => {
  const data = objectData(value);
  observeValueOwnership(value, (active) => {
    data.fieldsActive = active;
    if (data.fieldsArray) ownArray(data, 'fieldsArray', active ? data.fieldsArray : null);
    else for (const [name, item] of data.fields) ownArray(data.fields, name, active ? item.value : null);
  });
  return value;
};
export const makeStdClassFromArray = (array) => {const value = makeObject(stdClassDefinition()); synchronize(objectData(value), clonePhp(array)); return watchObjectFields(value);};
export const makeStdClass = (entries = []) => makeStdClassFromArray(makeArray(entries.map(([key, item]) => [arrayKey(key), item.value]), new Map(entries.map(([key, item]) => [arrayKey(key), item.kind]))));
export const stdClassArray = (value) => {const data = objectData(value); return data?.definition.name === 'stdClass' && data.fieldsArray ? clonePhp(data.fieldsArray) : null;};
export const cloneStdClass = (value) => {
  const data = objectData(value); if (data?.definition.name !== 'stdClass') return null;
  return makeStdClassFromArray(data.fieldsArray || makeArray());
};
export const copyObjectFields = (fields) => new Map([...fields].map(([name, item]) => [name, item.reference?.cell.bindings.size>1?item:{value: clonePhp(item.value), kind: item.kind}]));
export const stdClassReference = (value, name, context) => {
  const data = objectData(value);
  if (data?.definition.name !== 'stdClass') return null;
  if (!data.fieldsArray) synchronize(data, makeArray());
  const key = arrayKey(name, context);
  return {
    get: (quiet = false) => {if (!Object.hasOwn(data.fieldsArray, key) && !quiet) warn(context, `Undefined property: stdClass::$${name}`); return arrayRead(data.fieldsArray, key, context, true);},
    probe: () => arrayRead(data.fieldsArray, key, context, true),
    set: (value, kind) => {if (context.readOnly) throw new Error('Reactive text cannot modify objects'); synchronize(data, arrayWrite(data.fieldsArray, key, value, kind, context)); return arrayRead(data.fieldsArray, key, context, true);},
    remove: () => synchronize(data, arrayUnset(data.fieldsArray, key, context)),
    reference: () => {const item = arrayReference(data.fieldsArray, key, context); synchronize(data, item.array); return item.reference;},
  };
};
