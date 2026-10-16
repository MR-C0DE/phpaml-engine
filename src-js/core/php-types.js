import {isPhpObject, objectIs} from './php-object-values.js';
import {phpBool, phpFloat, phpInt, phpString, phpType} from './php-values.js';
import {warn} from './diagnostics.js';
import {exceptionIs} from './php-exceptions.js';
import {isRoundingMode} from './php-rounding-mode.js';

const nativeType = (type) => ({integer: 'int', double: 'float', boolean: 'bool', NULL: 'null'}[type] || type);
const numeric = (value) => typeof value === 'number' || typeof value === 'string' && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);

// Property assignments obey the strict_types mode of the PHP assignment site.
// Values keep ordinary JS representations; PHP numeric kinds live in metadata.
export const assignType = (rule, value, kind = phpType(value), strict = true, context = null) => {
  if (!rule) return {value, kind};
  const types = rule.types.map((type) => type.replace(/^\?/, ''));
  const actual = nativeType(kind);
  if (isPhpObject(value) && types.some((type) => type.split('&').every((member) => objectIs(value, member)))) return {value, kind: 'object'};
  if (isRoundingMode(value) && types.some((type) => type.toLowerCase() === 'roundingmode')) return {value, kind: 'object'};
  if (value instanceof Error && types.some((type) => type.split('&').every((member) => exceptionIs(value, member)))) return {value, kind: 'object'};
  if (types.includes('iterable') && (kind === 'array' || objectIs(value, 'Traversable'))) return {value, kind};
  if (types.includes('mixed') || value == null && rule.nullable) return {value, kind};
  if (types.includes(actual) || value === true && types.includes('true') || value === false && types.includes('false')) {
    if (actual === 'int' && !Number.isSafeInteger(value)) throw new RangeError('Frontend integer exceeds JavaScript safe integer precision');
    return {value, kind};
  }
  if (actual === 'int' && types.includes('float')) return {value, kind: 'double'};
  if (!strict && isPhpObject(value) && types.includes('string') && objectIs(value, 'Stringable')) return {value: phpString(value, kind, context), kind: 'string'};
  if (!strict && value != null && ['int', 'float', 'string', 'bool'].includes(actual)) {
    // PHP prefers int, float, string, bool for weak scalar union assignments.
    // A decimal numeric string prefers float when both numeric types are present.
    let preferred = ['int', 'float', 'string', 'bool'];
    if (actual === 'string' && numeric(value) && /[.eE]/.test(value) && types.includes('float')) preferred = ['float', 'int', 'string', 'bool'];
    for (const type of preferred.filter((item) => types.includes(item))) {
      if (type === 'string') return {value: phpString(value, kind, context), kind: 'string'};
      if (type === 'bool') return {value: phpBool(value), kind: 'boolean'};
      if (actual === 'string' && !numeric(value)) continue;
      if (type === 'float') return {value: phpFloat(value), kind: 'double'};
      const number = phpFloat(value);
      if (!Number.isFinite(number)) continue;
      if (!Number.isInteger(number)) warn(context, `Implicit conversion from ${actual} to int loses precision`, 'PHP_DEPRECATED');
      return {value: phpInt(value), kind: 'integer'};
    }
  }
  throw new TypeError(`Cannot assign ${actual} to property ${rule.property || '(state)'} of type ${types.join('|')}${rule.nullable && !types.includes('null') ? '|null' : ''}`);
};
