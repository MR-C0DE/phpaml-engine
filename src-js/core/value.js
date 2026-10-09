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
      throw new Error(`Unknown AML state expression: ${expression.operation}`);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveData(item, state, eventData)]));
  }
  return value;
};
