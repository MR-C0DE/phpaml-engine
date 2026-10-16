export const containsYield = (node) => {
  if (!node || typeof node !== 'object') return false;
  const rule = node.$expression;
  if (['yield', 'yieldFrom'].includes(rule?.operation)) return true;
  if (rule?.operation === 'eval') return containsYield(rule.left);
  return Object.values(node).some(containsYield);
};
export const markGenerator = (fn) => {
  validateStaticLocals(fn.body, fn.source?.phpVersion);
  fn.generator = containsYield(fn.body);
  if (fn.generator && fn.name.toLowerCase().endsWith('::__construct')) throw new Error('A constructor cannot be a generator.');
  if (fn.generator && fn.returnType && !fn.returnType.types.some((type) => ['generator', 'iterator', 'traversable', 'iterable', 'object', 'mixed'].includes(type))) throw new Error('A generator return type must accept Generator.');
};

export const validateStaticLocals = (body, version = 80400) => {
  if (version < 80300) return;
  const seen = new Set();
  const scan = (node) => {
    if (!node || typeof node !== 'object' || node.$expression?.operation === 'eval') return;
    if (node.$expression?.operation === 'staticLocal') {
      const id = node.$expression.left;
      if (seen.has(id)) throw Object.assign(new Error('Duplicate declaration of static variable'), {name: 'ParseError'});
      seen.add(id);
    }
    for (const child of Object.values(node)) scan(child);
  };
  scan(body);
};
