let serial = 0;
// Each evaluation declares fresh anonymous types. Objects returned by an older
// evaluation retain their own methods and static fields in the component store.
export const instantiateEvalClasses = (program) => {
  const names = Object.values(program.classes || {}).filter((item) => item.name.startsWith('class@anonymous:')).map((item) => item.name);
  if (!names.length) return program;
  const suffix = ':eval' + ++serial, replacements = new Map(names.map((name) => [name, name + suffix]));
  for (const id of Object.keys(program.functions || {})) replacements.set(id, id + suffix);
  const text = (value) => {for (const [before, after] of replacements) value = value.replaceAll(before, after); return value;};
  const copy = (value) => typeof value === 'string' ? text(value) : Array.isArray(value) ? value.map(copy) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [text(key), copy(item)])) : value;
  return copy(program);
};
