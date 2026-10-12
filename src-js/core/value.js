import { readPath } from './state.js';

export const resolveData = (value, state, eventData = null) => {
  if (Array.isArray(value)) return value.map((item) => resolveData(item, state, eventData));
  if (value && typeof value === 'object') {
    if (typeof value.$state === 'string') return readPath(state, value.$state);
    if (typeof value.$event === 'string') return readPath(eventData || {}, value.$event);
    if (value.$expression && typeof value.$expression === 'object') {
      const expression = value.$expression;
      const left = resolveData(expression.left, state, eventData);
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
