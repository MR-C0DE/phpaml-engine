import definitions from '../core/date-definitions.json' with {type: 'json'};
export const registerDates = (compiler, name) => {
  const key = name.toLowerCase(); if (!Object.hasOwn(definitions, key)) return false;
  for (const [key, definition] of Object.entries(definitions)) {compiler.classes[key] = definition.class; compiler.environment.classes[key] = definition.class; for (const [id, fn] of Object.entries(definition.functions)) compiler.functions[id] = {...fn, source: compiler.source};}
  return true;
};
