// Only signatures are exposed; implementations still come from compiled services.
export const internalInterface = (key) => {
  const name = {jsonserializable: 'JsonSerializable', stringable: 'Stringable', countable: 'Countable', arrayaccess: 'ArrayAccess', traversable: 'Traversable', iterator: 'Iterator', iteratoraggregate: 'IteratorAggregate'}[key];
  if (!name) return null;
  // These internal interfaces have tentative return types in PHP. Explicit
  // method return contracts are checked when invoking their implementation.
  const signatures = {
    jsonserializable: [['jsonSerialize', [], null]],
    stringable: [['__toString', [], {types: ['string'], nullable: false}]],
    countable: [['count', [], null]],
    arrayaccess: [['offsetExists', ['offset'], null], ['offsetGet', ['offset'], null], ['offsetSet', ['offset', 'value'], null], ['offsetUnset', ['offset'], null]],
    traversable: [],
    iterator: ['current', 'next', 'key', 'valid', 'rewind'].map((method) => [method, [], null]),
    iteratoraggregate: [['getIterator', [], null]],
  }[key];
  return {name, parent: null, ancestors: ['iterator', 'iteratoraggregate'].includes(key) ? ['Traversable'] : [], interface: true, abstract: true, properties: {}, staticProperties: {}, constants: {}, methods: Object.fromEntries(signatures.map(([method, args, returnType]) => [method.toLowerCase(), {
    name: method, owner: name, visibility: 'public', static: false, abstract: true,
    contract: {parameters: args.map((parameter) => ({name: parameter, reference: false, variadic: false, rule: {types: ['mixed'], nullable: false}})), returnType},
  }]))};
};
