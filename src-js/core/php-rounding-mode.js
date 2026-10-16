// Closed native enum, with identity preserved in locals and callback arguments.
const names = ['HalfAwayFromZero', 'HalfTowardsZero', 'HalfEven', 'HalfOdd', 'TowardsZero', 'AwayFromZero', 'NegativeInfinity', 'PositiveInfinity'];
const values = new Map(names.map((name) => [name, Object.freeze({name})]));
const identities = new WeakSet(values.values());
export const isRoundingMode = (value) => value !== null && typeof value === 'object' && identities.has(value);
export const roundingMode = (name) => {
  if (!values.has(name)) throw new Error('Unknown RoundingMode case');
  return values.get(name);
};
