import {resolveData, resolveType, valueReference} from './value.js';
import {assignType} from './php-types.js';

// A constructor prop is a typed view of its originating State, not a second
// state cell. Preserve its read expression when exposing a writable reference.
export const componentInputReference = (expression, state, context) => {
  const {target, rule, property, readonly} = expression.right;
  const parent = valueReference(target, state, context);
  const writable = () => {
    if (context.readOnly) throw new Error('Reactive text cannot modify state');
    if (readonly) throw new Error(`Cannot modify readonly property ${property}`);
  };
  const reference = {
    embeddable: false,
    get: () => {
      const value = resolveData(expression.left, state, context);
      return {value, kind: resolveType(expression.left, state, context, value)};
    },
    set: (value, kind, source = context.source) => {
      writable();
      const checked = assignType(rule, value, kind, source?.strictTypes ?? true, context);
      return parent.set(checked.value, checked.kind, source);
    },
    remove: () => { throw new Error(`Cannot unset bound component property ${property}`); },
    acquire: () => { writable(); return reference.get(); },
    reference: () => { writable(); return reference; },
  };
  return reference;
};
