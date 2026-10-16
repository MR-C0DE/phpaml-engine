// The identity and fields of service instances never become JavaScript properties.
const objects = new WeakMap();
export const isPhpObject = (value) => value !== null && typeof value === 'object' && objects.has(value);
export const objectData = (value) => objects.get(value);
export const makeObject = (definition, fields = new Map()) => {
  const value = Object.freeze(Object.create(null));
  objects.set(value, {definition, fields, unsetFields: new Set(), magicGuards: new Set(), cloneWritable: null});
  return value;
};
export const objectIs = (value, name) => {
  const data = objectData(value), wanted = name.replace(/^\\/, '').toLowerCase();
  return !!data && [data.definition.name, ...data.definition.ancestors].some((part) => part.toLowerCase() === wanted);
};
