import { readPath } from './state.js';

export const resolveData = (value, state, eventData = null) => {
  if (Array.isArray(value)) return value.map((item) => resolveData(item, state, eventData));
  if (value && typeof value === 'object') {
    if (typeof value.$state === 'string') return readPath(state, value.$state);
    if (typeof value.$event === 'string') return readPath(eventData || {}, value.$event);
    if (typeof value.$loop === 'string') return readPath(eventData?.loop || {}, value.$loop);
    if (typeof value.$collection === 'string') return readPath(eventData?.collection || {}, value.$collection);
    if (value.$expression && typeof value.$expression === 'object') {
      const expression = value.$expression;
      const left = resolveData(expression.left, state, eventData);
      if (['filter', 'map', 'reduce', 'find', 'any', 'all', 'sortBy'].includes(expression.operation)) {
        const callback = expression.right?.$callback;
        if (!callback || !Array.isArray(callback.parameters) || callback.parameters.length === 0) {
          throw new Error(`Invalid AML ${expression.operation} callback`);
        }
        if (!Array.isArray(left)) {
          if (expression.operation === 'all') return true;
          if (expression.operation === 'any') return false;
          if (['find', 'reduce'].includes(expression.operation)) return null;
          return [];
        }
        const evaluate = (values) => resolveData(callback.expression, state, {
          ...(eventData || {}),
          collection: {...(eventData?.collection || {}), ...values},
        });
        if (expression.operation === 'filter') {
          return left.filter((item) => Boolean(evaluate({[callback.parameters[0]]: item})));
        }
        if (expression.operation === 'map') {
          return left.map((item) => evaluate({[callback.parameters[0]]: item}));
        }
        if (expression.operation === 'find') {
          return left.find((item) => Boolean(evaluate({[callback.parameters[0]]: item}))) ?? null;
        }
        if (expression.operation === 'any') {
          return left.some((item) => Boolean(evaluate({[callback.parameters[0]]: item})));
        }
        if (expression.operation === 'all') {
          return left.every((item) => Boolean(evaluate({[callback.parameters[0]]: item})));
        }
        if (expression.operation === 'sortBy') {
          if (callback.parameters.length !== 2) throw new Error('Invalid AML sortBy callback');
          return [...left].sort((first, second) => Number(evaluate({
            [callback.parameters[0]]: first,
            [callback.parameters[1]]: second,
          })) || 0);
        }
        if (callback.parameters.length !== 2) throw new Error('Invalid AML reduce callback');
        return left.reduce(
          (carry, item) => evaluate({[callback.parameters[0]]: carry, [callback.parameters[1]]: item}),
          resolveData(expression.right.initial, state, eventData),
        );
      }
      const right = resolveData(expression.right, state, eventData);
      if (expression.operation === 'add') return Number(left ?? 0) + Number(right ?? 0);
      if (expression.operation === 'subtract') return Number(left ?? 0) - Number(right ?? 0);
      if (expression.operation === 'multiply') return Number(left ?? 0) * Number(right ?? 0);
      if (expression.operation === 'divide') {
        if (Number(right ?? 0) === 0) throw new Error('Division by zero in AML state expression');
        return Number(left ?? 0) / Number(right);
      }
      if (expression.operation === 'modulo') {
        if (Number(right ?? 0) === 0) throw new Error('Modulo by zero in AML state expression');
        return Number(left ?? 0) % Number(right);
      }
      if (expression.operation === 'concat') return String(left ?? '') + String(right ?? '');
      if (expression.operation === 'not') return !Boolean(left);
      if (expression.operation === 'count') {
        if (Array.isArray(left) || typeof left === 'string') return left.length;
        if (left && typeof left === 'object') return Object.keys(left).length;
        return 0;
      }
      if (expression.operation === 'sum') {
        if (!Array.isArray(left)) return 0;
        return left.reduce((total, item) => total + Number(item || 0), 0);
      }
      if (expression.operation === 'contains') {
        return Array.isArray(left) && left.includes(right);
      }
      if (expression.operation === 'column') {
        if (!Array.isArray(left) || typeof right !== 'string') return [];
        return left.map((item) => item && typeof item === 'object' ? readPath(item, right) : null);
      }
      if (expression.operation === 'unique') {
        return Array.isArray(left) ? [...new Set(left)] : [];
      }
      if (expression.operation === 'reverse') {
        return Array.isArray(left) ? [...left].reverse() : [];
      }
      if (expression.operation === 'slice') {
        if (!Array.isArray(left)) return [];
        const offset = Number(resolveData(expression.right?.offset, state, eventData) ?? 0);
        const length = expression.right && Object.hasOwn(expression.right, 'length')
          ? Number(resolveData(expression.right.length, state, eventData))
          : null;
        if (!Number.isInteger(offset) || (length !== null && !Number.isInteger(length))) return [];
        if (length === null) return left.slice(offset);
        const start = offset < 0 ? Math.max(0, left.length + offset) : offset;
        const end = length >= 0 ? start + length : Math.max(start, left.length + length);
        return left.slice(start, end);
      }
      if (expression.operation === 'merge') {
        const collections = Array.isArray(expression.right) ? expression.right : [];
        return [left, ...collections]
          .map((collection) => resolveData(collection, state, eventData))
          .filter(Array.isArray)
          .flat();
      }
      if (expression.operation === 'search') {
        if (!Array.isArray(left)) return false;
        const position = left.findIndex((item) => item === right);
        return position === -1 ? false : position;
      }
      if (expression.operation === 'keyExists') {
        return left !== null && typeof left === 'object' && Object.hasOwn(left, String(right));
      }
      if (expression.operation === 'isset') return left !== null && left !== undefined;
      if (expression.operation === 'ceil') return Math.ceil(Number(left ?? 0));
      if (expression.operation === 'floor') return Math.floor(Number(left ?? 0));
      if (expression.operation === 'round') {
        const precision = Number(right ?? 0);
        const factor = 10 ** precision;
        return Math.round((Number(left ?? 0) + Number.EPSILON) * factor) / factor;
      }
      if (expression.operation === 'min') return Math.min(Number(left ?? 0), Number(right ?? 0));
      if (expression.operation === 'max') return Math.max(Number(left ?? 0), Number(right ?? 0));
      if (expression.operation === 'toInt') return Math.trunc(Number(left ?? 0));
      if (expression.operation === 'toFloat') return Number(left ?? 0);
      if (expression.operation === 'toString') return String(left ?? '');
      if (expression.operation === 'toBool') return Boolean(left);
      if (expression.operation === 'sort') {
        if (!Array.isArray(left)) return [];
        return [...left].sort((first, second) => {
          if (first === second) return 0;
          return first < second ? -1 : 1;
        });
      }
      if (expression.operation === 'compare') {
        if (left === right) return 0;
        return left < right ? -1 : 1;
      }
      throw new Error(`Unknown AML state expression: ${expression.operation}`);
    }
    if (value.$conditional && typeof value.$conditional === 'object') {
      const condition = value.$conditional;
      const left = resolveData(condition.left, state, eventData);
      const right = resolveData(condition.right, state, eventData);
      const matches = condition.operator === 'eq' ? left === right
        : condition.operator === 'neq' ? left !== right
        : condition.operator === 'gt' ? left > right
        : condition.operator === 'gte' ? left >= right
        : condition.operator === 'lt' ? left < right
        : condition.operator === 'lte' ? left <= right
        : condition.operator === 'truthy' ? Boolean(left)
        : condition.operator === 'falsy' ? !Boolean(left)
        : false;
      return resolveData(matches ? condition.then : condition.otherwise, state, eventData);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveData(item, state, eventData)]));
  }
  return value;
};
