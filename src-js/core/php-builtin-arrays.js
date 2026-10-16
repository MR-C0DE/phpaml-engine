import {countObject} from './php-object-collections.js';
import {isPhpObject} from './php-object-values.js';
import {arrayEntries, arrayElementReference, arrayKey, arrayKind, arrayWrite, makeArray, nextArrayKey, clonePhp, isPhpArray, arrayCursor, withArrayCursor} from './php-arrays.js';
import {phpType, phpBool, phpString, phpFloat, phpInt, phpNumber, hasFloatNumericPrefix} from './php-values.js';
import {phpMatches, phpCompare, compareStrings} from './php-operators.js';
import {randomInt} from './php-builtins.js';
import {warn} from './diagnostics.js';
import {failure, arrayLimit, work, naturalCompare, asciiLower, bytes, text} from './php-builtin-support.js';

const records = (array) => arrayEntries(array).map(([key, value]) => ({key, value, kind: arrayKind(array, key), reference: arrayElementReference(array, key)}));
const array = (items, reindex = false, next) => {
  arrayLimit(items.length); let index = 0;
  const normalized = new Map();
  for (const item of items) {const key = reindex === true || reindex === 'numeric' && typeof item.key === 'number' ? index++ : item.key; normalized.set(key, {...item, key});}
  return makeArray([...normalized].map(([key, item]) => [key, clonePhp(item.value)]), new Map([...normalized].map(([key, item]) => [key, item.kind])), next, 0, new Map([...normalized].filter(([, item]) => item.reference).map(([key, item]) => [key, item.reference])));
};
const valueError = (message) => {throw failure('ValueError', message);};
const compare = (left, right, flag, context) => {
  if (![0, 1, 2, 6, 10, 14].includes(flag)) valueError('Unsupported frontend sort flag; locale-dependent sorting belongs to PHP');
  if (flag === 0) return phpCompare(left.value, right.value, left.kind, right.kind);
  if (flag === 1) return phpFloat(left.value, context) - phpFloat(right.value, context);
  const x = phpString(left.value, left.kind, context), y = phpString(right.value, right.kind, context);
  if ((flag & ~8) === 6) return naturalCompare(x, y, Boolean(flag & 8));
  return compareStrings(flag & 8 ? asciiLower(x) : x, flag & 8 ? asciiLower(y) : y);
};
export const runArrays = (name, items, context, invoke) => {
  if (!name.startsWith('array_') && !['count', 'current', 'end', 'in_array', 'key', 'krsort', 'ksort', 'natcasesort', 'natsort', 'next', 'prev', 'range', 'reset', 'rsort', 'shuffle', 'sort', 'uasort', 'uksort', 'usort', 'arsort', 'asort'].includes(name)) return null;
  const [a, b, c, d] = items.map((item) => item.value);
  const result = (value, kind = phpType(value)) => ({value, kind});
  const call = (fn, args) => {work(context); return invoke(fn, args);};
  const valuesEqual = (x, y, strict = false) => phpMatches(strict ? 'eq' : 'looseEq', x.value, y.value, x.kind, y.kind);
  if (name === 'array_map') {
    const sources = items.slice(1).map((item) => records(item.value)), size = Math.max(...sources.map((source) => source.length)); arrayLimit(size);
    if (a === null && sources.length === 1) return result(clonePhp(b));
    const mapped = [];
    for (let index = 0; index < size; index++) {
      const args = sources.map((source) => source[index] || {value: null, kind: 'NULL'});
      const item = a === null ? result(array(args, true)) : call(a, args);
      mapped.push({...item, key: sources.length === 1 ? sources[0][index].key : index});
    }
    return result(array(mapped));
  }
  if (name === 'range') {
    const numericString = (value) => typeof value !== 'string' || /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);
    const modern = (context.source?.phpVersion ?? 80400) >= 80300;
    let first = a, last = b, step = Math.abs(c), character = typeof a === 'string' && typeof b === 'string' && a !== '' && b !== '' && (modern ? !numericString(a) || !numericString(b) : !numericString(a) && !numericString(b));
    if (step === 0 || !Number.isFinite(step)) valueError('range(): step must be a non-zero finite number');
    if (character && (!Number.isInteger(step) || !modern && items[2].kind === 'double')) {if (modern) warn(context, 'range(): character boundaries converted to 0 for a fractional step'); first = last = 0; character = false;}
    else if (character) {if (modern && (bytes(a).length > 1 || bytes(b).length > 1)) warn(context, 'range(): character boundaries must contain a single byte'); first = bytes(a)[0]; last = bytes(b)[0];}
    else {if (modern && [a, b].some((value) => typeof value === 'string' && !numericString(value))) warn(context, 'range(): non-numeric or empty boundary converted to 0'); first = phpFloat(first); last = phpFloat(last);}
    if (!Number.isFinite(first) || !Number.isFinite(last)) valueError('range(): boundaries must be finite');
    if (modern && c < 0 && first <= last) valueError('range(): step must be positive for increasing ranges');
    const distance = Math.abs(last - first); if (step > distance && distance > 0) valueError('range(): step exceeds the specified range');
    const size = Math.floor(distance / step) + 1; arrayLimit(size);
    const kind = character ? 'string' : items.slice(0, 2).some((item) => item.kind === 'double' || hasFloatNumericPrefix(item.value)) || !Number.isInteger(step) || !modern && items[2].kind === 'double' ? 'double' : 'integer';
    return result(array(Array.from({length: size}, (_, key) => ({key, value: character ? text(Uint8Array.of(first + key * step * (last < first ? -1 : 1))) : first + key * step * (last < first ? -1 : 1), kind}))));
  }
  if (name === 'array_fill') {
    if (b < 0) valueError('array_fill(): count must be greater than or equal to 0'); arrayLimit(b);
    return result(array(Array.from({length: b}, (_, index) => ({key: a + index, value: c, kind: items[2].kind}))));
  }
  if (name === 'array_merge' || name === 'array_merge_recursive' || name === 'array_replace' || name === 'array_replace_recursive') {
    if (!items.length) return result(makeArray());
    const merge = (left, right, depth = 0) => {
      if (depth > 64) valueError('Array merge exceeds 64 nested levels');
      const pairs = new Map(records(left).map((item) => [item.key, item])); let next = name.startsWith('array_replace') ? nextArrayKey(left, context) : records(left).filter((item) => typeof item.key === 'number').length;
      for (const item of records(right)) {
        work(context); let key = item.key, value = item.value, kind = item.kind, reference = item.reference;
        if (name.startsWith('array_merge') && typeof key === 'number') key = next++;
        else if (pairs.has(key) && name.endsWith('_recursive')) {
          const old = pairs.get(key);
          if (name === 'array_merge_recursive') {const x = isPhpArray(old.value) ? old.value : array([{key: 0, ...old}], true), y = isPhpArray(value) ? value : array([{key: 0, value, kind}]); value = merge(x, y, depth + 1); kind = 'array'; reference = null;}
          else if (isPhpArray(old.value) && isPhpArray(value)) {value = merge(old.value, value, depth + 1); kind = 'array'; reference = null;}
        }
        pairs.set(key, {key, value, kind, reference}); arrayLimit(pairs.size);
      }
      return array([...pairs.values()]);
    };
    let output = name.startsWith('array_merge') ? makeArray() : clonePhp(a);
    for (const item of items.slice(name.startsWith('array_merge') ? 0 : 1)) output = merge(output, item.value);
    return result(output);
  }
  if (name === 'array_multisort') {
    const columns = [];
    for (const item of items) {
      if (isPhpArray(item.value)) {if (!item.ref) throw new Error('array_multisort(): arrays must be passed by reference'); columns.push({item, values: records(item.value), order: 4, flag: 0});}
      else {
        const column = columns.at(-1); if (!column || typeof item.value !== 'number') throw new TypeError('array_multisort(): expected an array or sort flag');
        if ([3, 4].includes(item.value)) {if (column.orderSet) throw new TypeError('array_multisort(): duplicate sort order'); column.order = item.value; column.orderSet = true;}
        else {if (column.flagSet) throw new TypeError('array_multisort(): duplicate sort flag'); column.flag = item.value; column.flagSet = true;}
      }
    }
    if (!columns.length) throw new TypeError('array_multisort(): expected an array');
    if (columns.some((column) => column.values.length !== columns[0].values.length)) valueError('array_multisort(): inconsistent array sizes');
    const indexes = columns[0].values.map((_, index) => index);
    indexes.sort((x, y) => {work(context); for (const column of columns) {const order = compare(column.values[x], column.values[y], column.flag, context) * (column.order === 3 ? -1 : 1); if (order) return order;} return 0;});
    for (const column of columns) column.item.ref.set(array(indexes.map((index) => column.values[index]), 'numeric'), 'array');
    return result(true);
  }
  if (name === 'in_array' || name === 'array_search') {
    const found = records(b).find((item) => valuesEqual(item, items[0], c)); return result(name === 'in_array' ? Boolean(found) : found ? found.key : false);
  }
  if (name === 'array_key_exists') return result(Object.hasOwn(b, arrayKey(a, context)));
  if (name === 'count' && isPhpObject(a)) return countObject(a, b, context);
  const entries = records(a); arrayLimit(entries.length);
  if (name === 'count') {
    if (![0, 1].includes(b)) valueError('count(): mode must be COUNT_NORMAL or COUNT_RECURSIVE');
    const count = (values, depth = 0) => {if (depth > 64) valueError('count(): nested array limit exceeded'); let size = values.length; if (b === 1) for (const item of values) {work(context); if (isPhpArray(item.value)) size += count(records(item.value), depth + 1);} return size;};
    return result(count(entries));
  }
  if (name === 'array_is_list') return result(entries.every((item, index) => item.key === index));
  if (name === 'array_key_first' || name === 'array_key_last') return result((name.endsWith('first') ? entries[0] : entries.at(-1))?.key ?? null);
  if (['current', 'key', 'next', 'prev', 'reset', 'end'].includes(name)) {
    let cursor = arrayCursor(a);
    if (name === 'next') cursor = cursor >= 0 && cursor < entries.length ? cursor + 1 : entries.length;
    if (name === 'prev') cursor = cursor >= 0 && cursor < entries.length ? cursor - 1 : entries.length;
    if (name === 'reset') cursor = 0;
    if (name === 'end') cursor = entries.length - 1;
    if (items[0].ref) items[0].ref.set(withArrayCursor(a, cursor), 'array');
    return name === 'key' ? result(entries[cursor]?.key ?? null) : entries[cursor] || result(false);
  }
  if (name === 'array_values') return result(array(entries, true));
  if (name === 'array_keys') return result(entries.filter((item) => !items[1].provided || valuesEqual(item, items[1], c)).map((item) => item.key));
  if (name === 'array_reverse') return result(array(entries.reverse(), b ? false : 'numeric'));
  if (name === 'array_slice') {const start = b < 0 ? Math.max(0, entries.length + b) : b, end = c === null ? entries.length : c < 0 ? Math.max(start, entries.length + c) : start + c; return result(array(entries.slice(start, end), d ? false : 'numeric'));}
  if (name === 'array_chunk') {if (b < 1) valueError('array_chunk(): length must be greater than 0'); const chunks = []; for (let i = 0; i < entries.length; i += b) chunks.push(array(entries.slice(i, i + b), !c)); return result(chunks);}
  if (name === 'array_fill_keys') return result(array(entries.map((item) => ({key: arrayKey(typeof item.value === 'number' && item.kind === 'integer' ? item.value : phpString(item.value, item.kind, context), context), value: b, kind: items[1].kind}))));
  if (name === 'array_combine') {const values = records(b); if (entries.length !== values.length) valueError('array_combine(): both arrays must have an equal number of elements'); return result(array(entries.map((item, i) => ({...values[i], key: arrayKey(item.kind === 'integer' ? item.value : phpString(item.value, item.kind, context), context)}))));}
  if (name === 'array_change_key_case') {if (![0, 1].includes(b)) valueError('array_change_key_case(): case must be CASE_LOWER or CASE_UPPER'); return result(array(entries.map((item) => ({...item, key: typeof item.key === 'string' ? arrayKey(b === 1 ? item.key.replace(/[a-z]/g, (c) => c.toUpperCase()) : asciiLower(item.key), context) : item.key}))));}
  if (name === 'array_flip' || name === 'array_count_values') {
    const output = new Map();
    for (const item of entries) {
      if (!['integer', 'string'].includes(item.kind)) {warn(context, `${name}(): can only process string and integer values`); continue;}
      const key = arrayKey(item.value, context); output.set(key, {key, value: name === 'array_flip' ? item.key : (output.get(key)?.value ?? 0) + 1, kind: name === 'array_flip' ? phpType(item.key) : 'integer'});
    }
    return result(array([...output.values()]));
  }
  if (name === 'array_sum' || name === 'array_product') {
    let value = name === 'array_sum' ? 0 : 1, kind = 'integer';
    for (const item of entries) {
      if (isPhpArray(item.value) || typeof item.value === 'function' || item.value instanceof Error) {if ((context.source?.phpVersion ?? 80400) >= 80300) warn(context, `${name}(): addition/multiplication is not supported on ${item.kind}`); continue;}
      let numeric;
      try {numeric = phpNumber(item.value, context);} catch (error) {if (!(error instanceof TypeError)) throw error; numeric = 0; if ((context.source?.phpVersion ?? 80400) >= 80300) warn(context, `${name}(): addition/multiplication is not supported on ${item.kind}`);}
      value = name === 'array_sum' ? value + numeric : value * numeric;
      if (item.kind === 'double' || hasFloatNumericPrefix(item.value) || !Number.isSafeInteger(value)) kind = 'double';
    }
    return result(value, kind);
  }
  if (name === 'array_pad') {
    const size = Math.abs(b); arrayLimit(size); const extra = Math.max(0, size - entries.length), padding = Array.from({length: extra}, () => ({key: 0, value: c, kind: items[2].kind}));
    return result(array(b < 0 ? [...padding, ...entries] : [...entries, ...padding], 'numeric'));
  }
  if (name === 'array_unique') {const selected = []; for (const item of entries) {work(context, selected.length); if (!selected.some((other) => compare(item, other, b, context) === 0)) selected.push(item);} return result(array(selected));}
  if (name === 'array_column') {
    const output = []; let next = 0;
    for (const row of entries) {
      if (!isPhpArray(row.value)) continue;
      const column = b === null ? null : arrayKey(b, context); if (column !== null && !Object.hasOwn(row.value, column)) continue;
      const value = column === null ? row.value : row.value[column], kind = column === null ? 'array' : arrayKind(row.value, column);
      const index = c === null ? null : arrayKey(c, context); let key = next;
      if (index !== null && Object.hasOwn(row.value, index)) key = arrayKey(row.value[index], context);
      output.push({key, value, kind}); if (typeof key === 'number') next = Math.max(next, key + 1);
    }
    return result(array(output));
  }
  if (name === 'array_filter' || ['array_find', 'array_find_key', 'array_any', 'array_all'].includes(name)) {
    const selected = [];
    for (const item of entries) {
      const key = {value: item.key, kind: phpType(item.key)};
      const args = name === 'array_filter' ? c === 2 ? [key] : c === 1 ? [item, key] : [item] : [item, key];
      const yes = b === null ? phpBool(item.value) : phpBool(call(b, args).value);
      if (name === 'array_all' && !yes) return result(false);
      if (yes && name === 'array_any') return result(true);
      if (yes && name === 'array_find') return item;
      if (yes && name === 'array_find_key') return result(item.key);
      if (yes) selected.push(item);
    }
    return name === 'array_filter' ? result(array(selected)) : result(name === 'array_all' ? true : name === 'array_any' ? false : null);
  }
  if (name === 'array_reduce') {let value = items[2]; for (const item of entries) value = call(b, [value, item]); return value;}
  if (/^array_(?:u?diff|u?intersect)/.test(name)) {
    const intersection = name.includes('intersect'), dataCallback = /^array_u/.test(name), keyCallback = /uassoc|ukey/.test(name), keysOnly = name.endsWith('key'), withKeys = /assoc|key/.test(name);
    const rest = items.slice(1); let keyFn, dataFn;
    if (keyCallback) keyFn = rest.pop()?.value;
    if (dataCallback) dataFn = rest.pop()?.value;
    if (!rest.length) throw failure('ArgumentCountError', `${name}(): at least two arrays are required`);
    const others = rest.map((item) => records(item.value));
    const matches = (x, y) => {
      work(context);
      if (withKeys && (keyCallback ? phpInt(call(keyFn, [{value: x.key, kind: phpType(x.key)}, {value: y.key, kind: phpType(y.key)}]).value) !== 0 : String(x.key) !== String(y.key))) return false;
      return keysOnly || (dataCallback ? phpInt(call(dataFn, [x, y]).value) === 0 : phpString(x.value, x.kind, context) === phpString(y.value, y.kind, context));
    };
    const selected = entries.filter((item) => intersection
      ? others.every((source) => source.some((other) => matches(item, other)))
      : !others.some((source) => source.some((other) => matches(item, other))));
    return result(array(selected));
  }
  if (name === 'array_walk' || name === 'array_walk_recursive') {
    const visit = (path, depth = 0) => {
      if (depth > 64) valueError('array_walk_recursive(): nesting limit exceeded');
      const get = () => {let value = items[0].ref.get().value; for (const key of path) value = value[key]; return value;};
      const put = (key, value, kind) => {
        const update = (current, index) => index === path.length ? arrayWrite(current, key, value, kind, context) : arrayWrite(current, path[index], update(current[path[index]], index + 1), 'array', context);
        items[0].ref.set(update(items[0].ref.get().value, 0), 'array');
      };
      for (const item of records(get())) {
        if (name.endsWith('_recursive') && isPhpArray(item.value)) visit([...path, item.key], depth + 1);
        else {
          const ref = {get: () => ({value: get()[item.key], kind: arrayKind(get(), item.key)}), set: (value, kind) => {put(item.key, value, kind); return {value, kind};}};
          const args = [{...item, ref}, {value: item.key, kind: phpType(item.key)}]; if (items[2].provided) args.push(items[2]); call(b, args);
        }
      }
    };
    visit([]); return result(true);
  }
  if (name === 'array_pop' || name === 'array_shift') {
    const removed = name === 'array_pop' ? entries.pop() : entries.shift(), previous = nextArrayKey(a, context);
    items[0].ref.set(array(entries, name === 'array_shift' ? 'numeric' : false, name === 'array_pop' ? removed && typeof removed.key === 'number' && removed.key === previous - 1 ? removed.key : previous : undefined), 'array');
    return removed || result(null);
  }
  if (name === 'array_push' || name === 'array_unshift') {
    const extra = items.slice(1).map((item, index) => ({...item, key: index})); let output;
    if (name === 'array_push') {const next = nextArrayKey(a, context); output = array([...entries, ...extra.map((item, index) => ({...item, key: next + index}))]);}
    else output = array([...extra, ...entries], 'numeric');
    items[0].ref.set(output, 'array'); return result(arrayEntries(output).length);
  }
  if (name === 'array_splice') {
    const start = b < 0 ? Math.max(0, entries.length + b) : Math.min(b, entries.length), length = c === null ? entries.length - start : c < 0 ? Math.max(0, entries.length - start + c) : c;
    const replacement = isPhpArray(d) ? records(d) : d === null ? [] : [{value: d, kind: items[3].kind}];
    const removed = entries.splice(start, length, ...replacement.map((item) => ({...item, key: 0})));
    items[0].ref.set(array(entries, 'numeric'), 'array'); return result(array(removed, 'numeric'));
  }
  if (name === 'array_rand') {
    if (b < 1 || b > entries.length) valueError('array_rand(): number of elements must be between 1 and array length');
    if (b === 1) return result(entries[randomInt(0, entries.length - 1)].key);
    const indexes = entries.map((_, index) => index), chosen = new Set();
    for (let i = 0; i < b; i++) {const j = randomInt(i, indexes.length - 1); [indexes[i], indexes[j]] = [indexes[j], indexes[i]]; chosen.add(indexes[i]);}
    return result(entries.filter((_, index) => chosen.has(index)).map((item) => item.key));
  }
  if (name === 'shuffle') {for (let i = entries.length - 1; i > 0; i--) {const j = randomInt(0, i); [entries[i], entries[j]] = [entries[j], entries[i]];} items[0].ref.set(array(entries, true), 'array'); return result(true);}
  if (['sort', 'rsort', 'asort', 'arsort', 'ksort', 'krsort', 'usort', 'uasort', 'uksort', 'natsort', 'natcasesort'].includes(name)) {
    const user = name.startsWith('u'), keys = ['ksort', 'krsort', 'uksort'].includes(name), flag = name === 'natsort' ? 6 : name === 'natcasesort' ? 14 : user ? 0 : b;
    // Validate flags even for an empty array.
    if (!user) compare({value: '', kind: 'string'}, {value: '', kind: 'string'}, flag, context);
    entries.sort((x, y) => {work(context); const left = keys ? {value: x.key, kind: phpType(x.key)} : x, right = keys ? {value: y.key, kind: phpType(y.key)} : y; return (user ? phpInt(call(b, [left, right]).value) : compare(left, right, flag, context)) * (['rsort', 'arsort', 'krsort'].includes(name) ? -1 : 1);});
    items[0].ref.set(array(entries, ['sort', 'rsort', 'usort'].includes(name)), 'array'); return result(true);
  }
  return null;
};
