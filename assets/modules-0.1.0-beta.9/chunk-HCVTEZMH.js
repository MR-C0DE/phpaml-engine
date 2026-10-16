import {
  ENGINE_VERSION,
  moduleExport
} from "./chunk-RFV3LKK7.js";

// src-js/core/php-object-values.js
var objects = /* @__PURE__ */ new WeakMap();
var isPhpObject = (value) => value !== null && typeof value === "object" && objects.has(value);
var objectData = (value) => objects.get(value);
var makeObject = (definition, fields = /* @__PURE__ */ new Map()) => {
  const value = Object.freeze(/* @__PURE__ */ Object.create(null));
  objects.set(value, { definition, fields, unsetFields: /* @__PURE__ */ new Set(), magicGuards: /* @__PURE__ */ new Set(), cloneWritable: null });
  return value;
};
var objectIs = (value, name) => {
  const data = objectData(value), wanted = name.replace(/^\\/, "").toLowerCase();
  return !!data && [data.definition.name, ...data.definition.ancestors].some((part) => part.toLowerCase() === wanted);
};

// src-js/core/diagnostics.js
var withSource = (error, source, trace) => {
  if (!(error instanceof Error)) error = new Error(String(error));
  error.phpMessage ??= error.message;
  if (trace) error.phpTrace ??= trace.map((frame) => ({ ...frame }));
  if (!error.code) error.code = error instanceof TypeError ? "PHP_TYPE_ERROR" : error instanceof RangeError ? "PHP_RANGE_ERROR" : "PHP_RUNTIME_ERROR";
  if (source && !error.source) {
    error.source = source;
    error.message += ` [PHP ${source.file}:${source.line}]`;
  }
  return error;
};
var warn = (context, message, code = "PHP_WARNING") => {
  const warning = { code, message, source: context?.source || null };
  if (context?.reportWarning) context.reportWarning(warning);
  else console.warn(message);
};
var localName = (id) => {
  if (!/^v(?:[0-9a-f]{2})+$/.test(id)) return id;
  return "$" + new TextDecoder().decode(Uint8Array.from(id.slice(1).match(/../g), (byte) => parseInt(byte, 16)));
};

// src-js/core/php-references.js
var tokens = /* @__PURE__ */ new WeakMap();
var token = (table, name) => {
  let map = tokens.get(table);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    tokens.set(table, map);
  }
  if (!map.has(name)) map.set(name, {});
  return map.get(name);
};
var createReference = (item) => {
  const cell = { item, bindings: /* @__PURE__ */ new Set(), guards: /* @__PURE__ */ new Map(), shared: false };
  const reference = { cell, get: () => cell.item, set: (value, kind) => {
    for (const guard of cell.guards.values()) ({ value, kind } = guard(value, kind));
    cell.item = { value: clonePhp(value, sameArrayOrigin(value, cell.item.value)), kind };
    ownArray(cell, "value", cell.item.value);
    return cell.item;
  } };
  ownArray(cell, "value", item.value);
  return reference;
};
var bindLocalReference = (context, name, reference) => {
  const table = context.localReferences ||= /* @__PURE__ */ Object.create(null), key = token(table, name);
  if (context.locals) ownArray(context.locals, name, null);
  table[name]?.cell?.bindings.delete(key);
  table[name] = reference;
  reference.cell?.bindings.add(key);
  if (context.locals) Object.defineProperty(context.locals, name, { enumerable: true, configurable: true, get: () => reference.get().value, set: (value) => reference.set(value, value == null ? "NULL" : typeof value === "number" ? Number.isInteger(value) ? "integer" : "double" : typeof value === "boolean" ? "boolean" : typeof value === "string" ? "string" : isPhpArray(value) ? "array" : "object") });
  return reference;
};
var unbindLocalReference = (context, name) => {
  const table = context.localReferences;
  if (!table) return;
  table[name]?.cell?.bindings.delete(token(table, name));
  delete table[name];
};
var hasLocalBinding = (context, name) => !!tokens.get(context.localReferences)?.has(name);
var releaseLocalReferences = (context) => {
  for (const name of Object.keys(context.localReferences || {})) unbindLocalReference(context, name);
};

// src-js/core/php-value-ownership.js
var lifetimes = /* @__PURE__ */ new WeakMap();
var slots = /* @__PURE__ */ new WeakMap();
var lifetime = (value) => {
  let item = lifetimes.get(value);
  if (!item) {
    item = { owners: /* @__PURE__ */ new Set(), active: true, observers: /* @__PURE__ */ new Set() };
    lifetimes.set(value, item);
  }
  return item;
};
var update = (item) => {
  const active = item.owners.size > 0;
  if (active === item.active) return;
  item.active = active;
  for (const observer of item.observers) observer(active);
};
var observeValueOwnership = (value, observer) => {
  const item = lifetime(value);
  item.observers.add(observer);
  observer(item.active);
};
var ownValues = (table, key, value) => {
  let entries = slots.get(table);
  if (!entries) {
    entries = /* @__PURE__ */ new Map();
    slots.set(table, entries);
  }
  let slot = entries.get(key);
  if (!slot) {
    slot = { values: /* @__PURE__ */ new Set() };
    entries.set(key, slot);
  }
  const values2 = /* @__PURE__ */ new Set(), visit = (value2) => {
    if (value2 === null || !["object", "function"].includes(typeof value2) || values2.has(value2)) return;
    values2.add(value2);
    if (typeof value2 === "object") for (const item of Object.values(value2)) visit(item);
  };
  visit(value);
  const previous = slot.values;
  slot.values = values2;
  for (const item of values2) if (!previous.has(item)) {
    const data = lifetime(item);
    data.owners.add(slot);
    update(data);
  }
  for (const item of previous) if (!values2.has(item)) {
    const data = lifetime(item);
    data.owners.delete(slot);
    update(data);
  }
};

// src-js/core/php-rounding-mode.js
var names = ["HalfAwayFromZero", "HalfTowardsZero", "HalfEven", "HalfOdd", "TowardsZero", "AwayFromZero", "NegativeInfinity", "PositiveInfinity"];
var values = new Map(names.map((name) => [name, Object.freeze({ name })]));
var identities = new WeakSet(values.values());
var isRoundingMode = (value) => value !== null && typeof value === "object" && identities.has(value);
var roundingMode = (name) => {
  if (!values.has(name)) throw new Error("Unknown RoundingMode case");
  return values.get(name);
};

// src-js/core/php-arrays.js
var metadata = /* @__PURE__ */ new WeakMap();
var owners = /* @__PURE__ */ new WeakMap();
var group = () => ({ origins: /* @__PURE__ */ new Map(), everOwned: false });
var storageCount = (cell) => [...cell?.storages || []].reduce((sum, [group2, keys]) => sum + (group2.origins.size || !group2.everOwned ? keys.size : 0), 0);
var retainsReference = (ref) => !ref.cell || ref.cell.bindings.size > 0 || storageCount(ref.cell) > 1;
var ownArray = (table, key, value) => {
  ownValues(table, key, value);
  let slots2 = owners.get(table);
  if (!slots2) {
    slots2 = /* @__PURE__ */ new Map();
    owners.set(table, slots2);
  }
  for (const origin of slots2.get(key) || []) {
    const g = origin.group, n = g.origins.get(origin) || 0;
    if (n <= 1) g.origins.delete(origin);
    else g.origins.set(origin, n - 1);
  }
  const origins = /* @__PURE__ */ new Set(), visit = (value2) => {
    if (!isPhpArray(value2)) return;
    const origin = metadata.get(value2)?.origin;
    if (origin) {
      if (origins.has(origin)) return;
      origins.add(origin);
      origin.group.everOwned = true;
      origin.group.origins.set(origin, (origin.group.origins.get(origin) || 0) + 1);
    }
    for (const [, item] of arrayEntries(value2)) visit(item);
  };
  visit(value);
  slots2.set(key, origins);
};
var releaseArrays = (table) => {
  for (const key of owners.get(table)?.keys() || []) ownArray(table, key, null);
};
var prepareArrayMutation = (value) => {
  const info = metadata.get(value);
  if (!info?.origin) return;
  const origin = info.origin, previous = origin.group;
  if (previous.origins.size > 1) {
    const next2 = group(), count = previous.origins.get(origin);
    if (count) {
      previous.origins.delete(origin);
      next2.origins.set(origin, count);
      next2.everOwned = true;
    }
    origin.group = next2;
  }
};
var kindOf = (value) => value == null ? "NULL" : typeof value === "number" ? Number.isInteger(value) ? "integer" : "double" : typeof value === "boolean" ? "boolean" : typeof value === "string" ? "string" : typeof value === "function" || value instanceof Error || isPhpObject(value) || isRoundingMode(value) ? "object" : "array";
var isPhpArray = (value) => value !== null && typeof value === "object" && !(value instanceof Error) && !isPhpObject(value) && !isRoundingMode(value);
var arrayKey = (value, context = null) => {
  if (value == null) return "";
  if (typeof value === "boolean") return Number(value);
  if (typeof value === "number") {
    if (!Number.isInteger(value)) warn(context, "Implicit conversion from float to int loses precision", "PHP_DEPRECATED");
    const key = Number.isFinite(value) ? Math.trunc(value) : 0;
    if (!Number.isSafeInteger(key)) throw new RangeError("Frontend array key exceeds safe integer precision");
    return key;
  }
  if (typeof value !== "string") throw new TypeError("Illegal offset type");
  if (["__proto__", "prototype", "constructor"].includes(value.toLowerCase())) throw new Error(`Reserved frontend array key: ${value}`);
  if (/^(?:0|-[1-9]\d*|[1-9]\d*)$/.test(value)) {
    const integer = BigInt(value);
    if (integer >= -9223372036854775808n && integer <= 9223372036854775807n) {
      if (!Number.isSafeInteger(Number(value))) throw new RangeError("Frontend array key exceeds safe integer precision");
      return Number(value);
    }
  }
  return value;
};
var arrayEntries = (value) => {
  if (!isPhpArray(value)) throw new TypeError("Expected a PHP array");
  const info = metadata.get(value);
  const keys = info?.keys.filter((key) => Object.hasOwn(value, key)) || Object.keys(value).map((key) => arrayKey(key));
  const known = new Set(keys);
  for (const key of Object.keys(value).map((key2) => arrayKey(key2))) if (!known.has(key)) {
    keys.push(key);
    known.add(key);
  }
  return keys.map((key) => [key, value[key]]);
};
var arrayElementReference = (value, key) => {
  const ref = metadata.get(value)?.refs?.get(key);
  return ref && retainsReference(ref) ? ref : null;
};
var arrayKind = (value, key) => metadata.get(value)?.refs?.get(key)?.get().kind || metadata.get(value)?.types?.get(key) || kindOf(value?.[key]);
var makeArray = (entries = [], types = /* @__PURE__ */ new Map(), next2 = void 0, cursor = 0, refs = /* @__PURE__ */ new Map(), origin = {}) => {
  origin.group ||= group();
  for (const [key, reference] of refs) if (reference.cell) {
    const storages = reference.cell.storages ||= /* @__PURE__ */ new Map();
    const keys = storages.get(origin.group) || /* @__PURE__ */ new Set();
    keys.add(key);
    storages.set(origin.group, keys);
  }
  const list = entries.every(([key], index) => key === index);
  const value = list ? [] : {};
  for (const [key, item] of entries) Object.defineProperty(value, key, refs.has(key) ? { get: () => refs.get(key).get().value, set: (value2) => refs.get(key).set(value2, kindOf(value2)), enumerable: true, configurable: true } : { value: item, enumerable: true, writable: true, configurable: true });
  const numeric3 = entries.map(([key]) => key).filter((key) => typeof key === "number");
  metadata.set(value, { keys: entries.map(([key]) => key), types: new Map(types), next: next2 ?? (numeric3.length ? Math.max(...numeric3) + 1 : 0), cursor, refs: new Map(refs), origin });
  origin.current = value;
  return value;
};
var nextArrayKey = (value, context = null) => {
  const info = metadata.get(value);
  let next2 = info?.next;
  if (next2 == null) {
    const integers = arrayEntries(value).map(([key]) => key).filter((key) => typeof key === "number");
    next2 = integers.length ? Math.max(...integers) + 1 : 0;
  }
  if ((context?.source?.phpVersion ?? 80400) < 80300) next2 = Math.max(0, next2);
  if (!Number.isSafeInteger(next2)) throw new RangeError("Frontend array index exceeds safe integer precision");
  return next2;
};
var arrayWrite = (value, key, item, kind = kindOf(item), context = null, append = false) => {
  if (value == null) value = makeArray();
  if (!isPhpArray(value)) throw new Error("Cannot use a scalar value as an array");
  const refs = new Map([...metadata.get(value)?.refs || []].filter(([, reference]) => retainsReference(reference)));
  prepareArrayMutation(value);
  key = append ? nextArrayKey(value, context) : arrayKey(key, context);
  const entries = arrayEntries(value), types = new Map(entries.map(([key2]) => [key2, arrayKind(value, key2)]));
  const position = entries.findIndex(([candidate]) => candidate === key);
  if (position < 0) entries.push([key, clonePhp(item)]);
  else entries[position] = [key, clonePhp(item)];
  if (refs.has(key)) refs.get(key).set(item, kind);
  types.set(key, kind);
  const previous = nextArrayKey(value, context);
  const numericCount = arrayEntries(value).filter(([candidate]) => typeof candidate === "number").length;
  const next2 = typeof key === "number" ? numericCount === 0 && previous === 0 ? key + 1 : Math.max(previous, key + 1) : previous;
  return makeArray(entries, types, next2, metadata.get(value)?.cursor ?? 0, refs, metadata.get(value)?.origin);
};
var arrayUnset = (value, key, context = null) => {
  if (value == null) return value;
  if (!isPhpArray(value)) throw new TypeError("Cannot unset an offset in a scalar value");
  prepareArrayMutation(value);
  key = arrayKey(key, context);
  const entries = arrayEntries(value), removed = entries.findIndex(([candidate]) => candidate === key), previous = arrayCursor(value);
  if (removed >= 0) {
    for (const iterator of metadata.get(value)?.origin?.iterators || []) if (removed <= iterator.position) iterator.position--;
  }
  const cursor = removed >= 0 && removed < previous ? previous - 1 : previous;
  return makeArray(entries.filter(([candidate]) => candidate !== key), metadata.get(value)?.types, nextArrayKey(value, context), cursor, new Map([...metadata.get(value)?.refs || []].filter(([candidate]) => candidate !== key)), metadata.get(value)?.origin);
};
var arrayRead = (value, key, context = null, quiet = false) => {
  key = arrayKey(key, context);
  if (isPhpArray(value) && Object.hasOwn(value, key)) return { value: value[key], kind: arrayKind(value, key) };
  if (typeof value === "string" && typeof key === "number") {
    const index = key < 0 ? value.length + key : key;
    if (index >= 0 && index < value.length) return { value: value[index], kind: "string" };
  }
  if (!quiet) warn(context, isPhpArray(value) ? `Undefined array key ${JSON.stringify(key)}` : "Trying to access array offset on a scalar value");
  return { value: null, kind: "NULL" };
};
var sameArrayOrigin = (a, b) => isPhpArray(a) && isPhpArray(b) && !!metadata.get(a)?.origin && metadata.get(a).origin === metadata.get(b)?.origin;
var arrayReference = (value, key, context, append = false) => {
  if (value == null) value = makeArray();
  key = append ? nextArrayKey(value, context) : arrayKey(key, context);
  prepareArrayMutation(value);
  const existing = metadata.get(value)?.refs?.get(key);
  if (existing) return { array: value, reference: existing };
  const reference = createReference(arrayRead(value, key, context, true));
  return { array: arrayWithReference(value, key, reference, context), reference };
};
var arrayWithReference = (value, key, reference, context, append = false) => {
  if (reference.embeddable === false) throw new Error("Property references cannot be embedded in frontend arrays; reference an array element or a local instead");
  if (value == null) value = makeArray();
  key = append ? nextArrayKey(value, context) : arrayKey(key, context);
  const refs = new Map(metadata.get(value)?.refs || []);
  refs.delete(key);
  const clean2 = makeArray(arrayEntries(value), metadata.get(value)?.types, nextArrayKey(value, context), metadata.get(value)?.cursor || 0, refs, metadata.get(value)?.origin);
  const next2 = arrayWrite(clean2, key, reference.get().value, reference.get().kind, context);
  refs.set(key, reference);
  return makeArray(arrayEntries(next2), metadata.get(next2).types, nextArrayKey(next2, context), metadata.get(next2).cursor, refs, metadata.get(value)?.origin);
};
var clonePhp = (value, transfer = false, depth = 0) => {
  if (!isPhpArray(value)) return value;
  if (depth > 64) throw new RangeError("Frontend array reference graph exceeds 64 levels");
  if (metadata.has(value)) {
    const info = metadata.get(value), refs = /* @__PURE__ */ new Map();
    for (const [key, reference] of info.refs || []) {
      if (transfer || retainsReference(reference)) refs.set(key, reference);
    }
    return makeArray(arrayEntries(value).map(([key, item]) => [key, refs.has(key) ? item : clonePhp(item, false, depth + 1)]), info.types, info.next, info.cursor, refs, transfer ? info.origin : { group: info.origin?.group });
  }
  if (Array.isArray(value)) return value.map((item) => clonePhp(item, false, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clonePhp(item, false, depth + 1)]));
};
var restoreArrayMetadata = (value, descriptor) => {
  if (!isPhpArray(value) || !descriptor) return value;
  metadata.set(value, { keys: descriptor.entries.map((entry) => entry.key), types: new Map(descriptor.entries.map((entry) => [entry.key, entry.type])), next: descriptor.next });
  for (const entry of descriptor.entries) if (entry.array) restoreArrayMetadata(value[entry.key], entry.array);
  return value;
};
var describeArray = (value) => isPhpArray(value) ? { next: nextArrayKey(value), entries: arrayEntries(value).map(([key, item]) => ({ key, type: arrayKind(value, key), ...isPhpArray(item) ? { array: describeArray(item) } : {} })) } : null;
var arrayCursor = (value) => metadata.get(value)?.cursor ?? 0;
var withArrayCursor = (value, cursor) => makeArray(arrayEntries(value), new Map(arrayEntries(value).map(([key]) => [key, arrayKind(value, key)])), nextArrayKey(value), cursor, new Map([...metadata.get(value)?.refs || []].filter(([, ref]) => retainsReference(ref))), metadata.get(value)?.origin);
var validatePhpValue = (value, kind = kindOf(value), depth = 0) => {
  if (isPhpObject(value)) throw new TypeError("Frontend service objects must remain local; store scalar or array results in State");
  if (isRoundingMode(value)) throw new TypeError("RoundingMode values must remain local; store decimal results as strings in State");
  if (value instanceof Error) throw new TypeError("Frontend exceptions must remain local; store their message or code in state.");
  if (typeof value === "function") throw new TypeError("Frontend callables must remain local; component state must be serializable");
  if (depth >= 512) throw new RangeError("Frontend state exceeds JSON nesting depth");
  if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Frontend state must contain finite floats");
  if (typeof value === "number" && kind === "integer" && !Number.isSafeInteger(value)) throw new RangeError("Frontend integer exceeds JavaScript safe integer precision");
  if (isPhpArray(value)) for (const [key, item] of arrayEntries(value)) validatePhpValue(item, arrayKind(value, key), depth + 1);
};
var arrayOrigin = (value) => metadata.get(value)?.origin;
var snapshotPhp = (value, depth = 0, cells = /* @__PURE__ */ new Map()) => {
  if (!isPhpArray(value)) return value;
  if (depth > 512) throw new RangeError("Frontend snapshot exceeds its nesting limit");
  const entries = arrayEntries(value), refs = /* @__PURE__ */ new Map();
  for (const [key] of entries) {
    const reference = arrayElementReference(value, key);
    if (!reference) continue;
    const identity = reference.cell || reference;
    if (!cells.has(identity)) {
      const copy = createReference({ value: null, kind: "NULL" });
      cells.set(identity, copy);
      const item = reference.get();
      copy.set(snapshotPhp(item.value, depth + 1, cells), item.kind);
    }
    refs.set(key, cells.get(identity));
  }
  return makeArray(entries.map(([key, item]) => [key, refs.has(key) ? refs.get(key).get().value : snapshotPhp(item, depth + 1, cells)]), new Map(entries.map(([key]) => [key, arrayKind(value, key)])), nextArrayKey(value), arrayCursor(value), refs);
};
var validateStateReferences = (state, types) => {
  const visit = (value, kind, path) => {
    if (isPhpArray(value)) {
      for (const [key, item] of arrayEntries(value)) {
        const child = path ? `${path}.${key}` : String(key);
        visit(item, types[child] || arrayKind(value, key), child);
      }
      return;
    }
    validatePhpValue(value, types[path] || kind);
  };
  visit(state, "array", "");
};

// src-js/core/state.js
var clone = (value) => clonePhp(value);
var safeSegments = (path) => {
  const segments = String(path).split(".");
  if (!segments.length || segments.some((segment, index) => !(index === 0 ? /^[a-zA-Z_][a-zA-Z0-9_-]*$/ : /^(?:[a-zA-Z_][a-zA-Z0-9_-]*|\d+)$/).test(segment) || ["__proto__", "prototype", "constructor"].includes(segment.toLowerCase()))) {
    throw new Error(`Unsafe AML state path: ${path}`);
  }
  return segments;
};
var readPath = (state, path) => safeSegments(path).reduce((value, key) => value?.[key], state);
var writePath = (state, path, value) => {
  const keys = safeSegments(path);
  const leaf = keys.pop();
  const parent = keys.reduce((current, key) => current[key] ??= {}, state);
  parent[leaf] = value;
};
var pathAffects = (binding, target) => binding === target || binding.startsWith(`${target}.`) || target.startsWith(`${binding}.`);
var owningTarget = (group2, target) => Object.keys(group2 || {}).sort((left, right) => right.length - left.length).find((candidate) => target === candidate || target.startsWith(`${candidate}.`));
var computedValue = (rule, state) => {
  const values2 = (rule.dependencies || []).map((dependency) => readPath(state, dependency));
  if (rule.operation === "sum") return values2.reduce((total, value) => total + Number(value || 0), 0);
  if (rule.operation === "count") return Array.isArray(values2[0]) || typeof values2[0] === "string" ? values2[0].length : values2[0] && typeof values2[0] === "object" ? Object.keys(values2[0]).length : 0;
  if (rule.operation === "all") return values2.every(Boolean);
  if (rule.operation === "any") return values2.some(Boolean);
  return values2.map((value) => value ?? "").join(rule.separator || "");
};
var recomputeComputed = (root, state, config, changedTarget = null) => {
  const changes = /* @__PURE__ */ new Map();
  let unstable = false;
  for (let pass = 0; pass < 20; pass++) {
    let passChanged = false;
    Object.entries(config.computed || {}).forEach(([target, rule]) => {
      if (changedTarget && !rule.dependencies.some((dependency) => pathAffects(dependency, changedTarget)) && ![...changes.keys()].some((dependency) => rule.dependencies.some((item) => pathAffects(item, dependency)))) return;
      const next2 = computedValue(rule, state);
      if (Object.is(readPath(state, target), next2)) return;
      writePath(state, target, next2);
      changes.set(target, next2);
      passChanged = true;
    });
    if (!passChanged) {
      unstable = false;
      break;
    }
    unstable = pass === 19;
  }
  if (unstable && root) root.dispatchEvent(new CustomEvent("aml:reactivity-error", { detail: { reason: "computed-cycle" } }));
  return changes;
};
var coerce = (type, value) => {
  if (type === "int") return value === "" ? 0 : Number.parseInt(value, 10);
  if (type === "float") return value === "" ? 0 : Number.parseFloat(value);
  if (type === "bool") return value === true || value === 1 || value === "1" || value === "true";
  if (type === "string") return value == null ? "" : String(value);
  if (type === "array") return Array.isArray(value) || value && typeof value === "object" ? value : [];
  return value;
};
var deletePath = (state, path) => {
  const keys = safeSegments(path);
  const leaf = keys.pop();
  const parent = keys.reduce((current, key) => current?.[key], state);
  if (parent && typeof parent === "object") delete parent[leaf];
};

// phpaml-proxy:php-date-values.js
var dateStorage = { get: (key) => moduleExport("date", "dateStorage", true)?.get(key), has: (key) => moduleExport("date", "dateStorage", true)?.has(key) || false };
var dateDefinition = (...args) => moduleExport("date", "dateDefinition", true)?.(...args) ?? null;
var dateData = (...args) => moduleExport("date", "dateData", true)?.(...args) ?? null;
var dateDebugEntries = (...args) => moduleExport("date", "dateDebugEntries", true)?.(...args) ?? null;
var timezone = (...args) => moduleExport("date", "timezone")(...args);
var dateParts = (...args) => moduleExport("date", "dateParts")(...args);
var formatDate = (...args) => moduleExport("date", "formatDate")(...args);
var cloneDate = (...args) => moduleExport("date", "cloneDate", true)?.(...args) ?? null;
var nativeDateMethod = (...args) => moduleExport("date", "nativeDateMethod")(...args);
var runDates = (...args) => moduleExport("date", "runDates", true)?.(...args) ?? null;

// phpaml-proxy:php-spl.js
var isSplObject = (...args) => moduleExport("spl", "isSplObject", true)?.(...args) ?? null;
var cloneSpl = (...args) => moduleExport("spl", "cloneSpl", true)?.(...args) ?? null;
var splMethod = (...args) => moduleExport("spl", "splMethod")(...args);
var runIterators = (...args) => moduleExport("spl", "runIterators", true)?.(...args) ?? null;
var splStorageReference = (...args) => moduleExport("spl", "splStorageReference")(...args);

// phpaml-proxy:php-intl.js
var nativeIntlMethod = (...args) => moduleExport("intl", "nativeIntlMethod")(...args);
var runIntl = (...args) => moduleExport("intl", "runIntl", true)?.(...args) ?? null;
var cloneIntl = (...args) => moduleExport("intl", "cloneIntl", true)?.(...args) ?? null;

// src-js/core/php-object-collections.js
var invokeCollectionMethod = (value, method2, args, context) => {
  if (context?.readOnly) throw new Error("Collection objects must be used in frontend events");
  if (isGenerator(value)) return generatorMethod(value, method2, args, context);
  const name = objectData(value).definition.name, member = magicMember(name, method2, context);
  if (!member || member.abstract || member.static || member.visibility !== "public") throw new Error(`Invalid collection method ${name}::${method2}()`);
  return callMagic(value, name, member, args, context.objectState || {}, context);
};
var isCountable = (value) => isPhpArray(value) || objectIs(value, "Countable");
var countObject = (value, mode, context) => {
  if (![0, 1].includes(mode)) throw Object.assign(new Error("count(): mode must be COUNT_NORMAL or COUNT_RECURSIVE"), { name: "ValueError" });
  if (!objectIs(value, "Countable")) throw new TypeError("count(): expected Countable|array");
  const result = invokeCollectionMethod(value, "count", [], context);
  if (result.kind === "object") {
    warn(context, "Object could not be converted to int by count()");
    return { value: 1, kind: "integer" };
  }
  return { value: phpInt(result.value), kind: "integer" };
};
var objectOffsetReference = (value, key, keyKind, context) => {
  if (!objectIs(value, "ArrayAccess")) throw new Error(`Cannot use object of type ${objectData(value).definition.name} as array`);
  const args = [{ value: key, kind: keyKind }], read2 = () => invokeCollectionMethod(value, "offsetget", args, context);
  const ref = {
    get: read2,
    probe: (issetOnly = false) => {
      if (!phpBool(invokeCollectionMethod(value, "offsetexists", args, context).value)) return { value: null, kind: "NULL" };
      return issetOnly && !isSplObject(value) ? { value: true, kind: "boolean" } : read2();
    },
    set: (next2, kind) => {
      invokeCollectionMethod(value, "offsetset", [...args, { value: next2, kind }], context);
      return { value: next2, kind };
    },
    remove: () => invokeCollectionMethod(value, "offsetunset", args, context)
  };
  ref.reference = () => {
    if (isSplObject(value)) {
      const parent = splStorageReference(value), result = arrayReference(parent.get().value, key, context, key === null);
      parent.set(result.array);
      return result.reference;
    }
    const item = read2();
    if (item.reference) return item.reference;
    warn(context, `Indirect modification of overloaded element of ${objectData(value).definition.name} has no effect`, "PHP_NOTICE");
    let current = { ...item, value: clonePhp(item.value) };
    return { get: () => current, set: (value2, kind) => current = { value: value2, kind } };
  };
  ref.indirect = () => {
    if (isSplObject(value)) return ref;
    const member = magicMember(objectData(value).definition.name, "offsetget", context);
    if (context.functions?.[member?.id]?.returnsReference) return ref.reference();
    let item;
    const get = () => {
      if (!item) {
        const result = read2();
        item = { ...result, value: clonePhp(result.value) };
        if (result.kind !== "object") warn(context, `Indirect modification of overloaded element of ${objectData(value).definition.name} has no effect`, "PHP_NOTICE");
      }
      return item;
    };
    return { get, acquire: get, set: (value2, kind) => {
      get();
      return item = { value: clonePhp(value2), kind };
    }, remove: () => {
      get();
    } };
  };
  ref.increment = ref.indirect;
  return ref;
};
var readOffset = (value, key, keyKind, context, quiet = false, issetOnly = false) => {
  if (isPhpObject(value)) {
    const ref = objectOffsetReference(value, key, keyKind, context);
    return quiet ? ref.probe(issetOnly) : ref.get();
  }
  if (phpType(value) === "object") throw new Error("Cannot use object as array");
  return arrayRead(value, key, context, quiet);
};
var bindOffsetPattern = (bindings, source, read2, write, context, cache = /* @__PURE__ */ new Map()) => {
  for (const binding of bindings) {
    let current = source;
    for (const [depth, key] of binding.path.entries()) {
      const slot = binding.slots && depth + 1 < binding.path.length ? binding.slots.slice(0, depth + 1).join(".") : null;
      if (slot !== null && cache.has(slot)) current = cache.get(slot);
      else {
        const offset = read2(key);
        current = readOffset(current.value, offset.value, offset.kind, context);
        if (slot !== null) cache.set(slot, current);
      }
    }
    write(binding.target, current);
  }
};

// src-js/core/php-destructure.js
var destructure = (action, state, context) => {
  const references = action.bindings.some((binding) => binding.reference);
  const ref = references ? valueReference(action.value, state, context) : null;
  const value = ref ? ref.get().value : resolveData2(action.value, state, context), kind = resolveType(action.value, state, context, value);
  const root = resolvedNode2({ value, kind }, ref);
  const cache = /* @__PURE__ */ new Map();
  for (const binding of action.bindings) {
    if (binding.reference) {
      let node = root;
      for (const key of binding.path) node = { $expression: { operation: "offset", left: node, right: key } };
      bindReferenceTarget(binding.target, promoteReference(node, state, context), state, context);
    } else bindOffsetPattern([binding], { value: clonePhp(value), kind }, (key) => {
      const value2 = resolveData2(key, state, context);
      return { value: value2, kind: resolveType(key, state, context, value2) };
    }, (target, item) => assignTarget(target, item.value, item.kind, state, context), context, cache);
  }
};
var destructureReference = (bindings, reference, state, context) => destructure({ bindings, value: resolvedNode2(reference.get(), reference) }, state, context);

// phpaml-proxy:php-reflection.js
var nativeReflectionMethod = (...args) => moduleExport("reflection", "nativeReflectionMethod")(...args);

// src-js/core/php-builtin-support.js
var failure = (name, message) => Object.assign(new Error(message), { name });
var limit = (message) => Object.assign(new RangeError(message), { code: "PHP_BUILTIN_LIMIT" });
var encoder = new TextEncoder();
var decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
var bytes = (value) => encoder.encode(value);
var text = (value) => {
  try {
    return decoder.decode(value);
  } catch {
    throw Object.assign(new RangeError("This byte operation produced invalid UTF-8; frontend strings must remain valid UTF-8"), { code: "PHP_INVALID_UTF8" });
  }
};
var bounded = (value) => {
  if (value.length > 1048576 || bytes(value).length > 1048576) throw limit("Frontend string result exceeds 1 MiB");
  return value;
};
var arrayLimit = (size) => {
  if (size > 1e4) throw limit("Frontend arrays are limited to 10000 pieces");
};
var validateResult = (value, depth = 0) => {
  if (depth > 64) throw limit("Frontend builtin result exceeds 64 nested levels");
  if (typeof value === "string") bounded(value);
  if (isPhpArray(value)) {
    const entries = arrayEntries(value);
    arrayLimit(entries.length);
    for (const [, part] of entries) validateResult(part, depth + 1);
  }
};
var asciiUpper = (value) => value.replace(/[a-z]/g, (letter) => letter.toUpperCase());
var asciiLower = (value) => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
var work = (context, amount = 1) => {
  const budget = context.builtinBudget ||= { remaining: 1e6 };
  if ((budget.remaining -= amount) < 0) throw limit("Frontend builtin work budget exceeded");
};
var byteString = (value) => {
  const input = bytes(value);
  let result = "";
  for (let start = 0; start < input.length; start += 8192) result += String.fromCharCode(...input.subarray(start, start + 8192));
  return result;
};
var fromByteString = (value) => text(Uint8Array.from(value, (char) => char.charCodeAt(0)));
var fixedDecimal = (value, digits) => {
  const buffer = new DataView(new ArrayBuffer(8));
  buffer.setFloat64(0, Math.abs(value));
  const bits = buffer.getBigUint64(0), exponent = Number(bits >> 52n) & 2047;
  const mantissa = (bits & (1n << 52n) - 1n) + (exponent ? 1n << 52n : 0n), shift = (exponent || 1) - 1023 - 52;
  let numerator = mantissa * 10n ** BigInt(digits), denominator = 1n;
  if (shift >= 0) numerator <<= BigInt(shift);
  else denominator <<= BigInt(-shift);
  let integer = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n > denominator || remainder * 2n === denominator && integer % 2n !== 0n) integer++;
  const all = integer.toString().padStart(digits + 1, "0");
  return digits ? all.slice(0, -digits) + "." + all.slice(-digits) : all;
};
var naturalCompare = (a, b, insensitive = false) => {
  a = byteString(insensitive ? asciiLower(a) : a);
  b = byteString(insensitive ? asciiLower(b) : b);
  let i = 0, j = 0;
  while (true) {
    while (/\s/.test(a[i] || "") && i < a.length) i++;
    while (/\s/.test(b[j] || "") && j < b.length) j++;
    if (/[0-9]/.test(a[i] || "") && /[0-9]/.test(b[j] || "")) {
      const x = a.slice(i).match(/^\d+/)[0], y = b.slice(j).match(/^\d+/)[0];
      const difference = x[0] === "0" || y[0] === "0" ? x < y ? -1 : x > y ? 1 : 0 : x.length - y.length || (x < y ? -1 : x > y ? 1 : 0);
      if (difference) return Math.sign(difference);
      i += x.length;
      j += y.length;
      continue;
    }
    if (i === a.length || j === b.length) return Math.sign((i < a.length ? 1 : 0) - (j < b.length ? 1 : 0));
    if (a[i] !== b[j]) return a[i] < b[j] ? -1 : 1;
    i++;
    j++;
  }
};

// src-js/core/php-operators.js
var numericString = (value) => typeof value === "string" && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);
var compareStrings = (left, right) => {
  const a = new TextEncoder().encode(left), b = new TextEncoder().encode(right);
  for (let index = 0; index < Math.min(a.length, b.length); index++) if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
};
var compareNumbers = (left, right, leftType, rightType) => {
  const operand = (value, kind) => {
    if (typeof value === "number") return kind === "integer" && Number.isSafeInteger(value) ? BigInt(value) : value;
    if (/^[\t\n\r\f\v ]*[+-]?\d+[\t\n\r\f\v ]*$/.test(value)) {
      const integer = BigInt(value.trim());
      if (integer >= -9223372036854775808n && integer <= 9223372036854775807n) return integer;
    }
    return Number(value);
  };
  let a = operand(left, leftType), b = operand(right, rightType);
  if (typeof a !== "bigint" || typeof b !== "bigint") {
    a = Number(a);
    b = Number(b);
  }
  return Number.isNaN(a) || Number.isNaN(b) ? NaN : a === b ? 0 : a < b ? -1 : 1;
};
var phpIdentical = (left, right, leftType = phpType(left), rightType = phpType(right)) => {
  if (leftType !== rightType) return false;
  if (isPhpObject(left) || isPhpObject(right) || isRoundingMode(left) || isRoundingMode(right)) return left === right;
  if (left instanceof Error || right instanceof Error) return left === right;
  if (left && right && typeof left === "object" && typeof right === "object") {
    const a = arrayEntries(left), b = arrayEntries(right);
    return a.length === b.length && a.every(([key, value], index) => key === b[index][0] && phpIdentical(value, b[index][1], arrayKind(left, key), arrayKind(right, b[index][0])));
  }
  return left === right;
};
var objectComparisonDepth = 0;
var phpCompare = (left, right, leftType = phpType(left), rightType = phpType(right)) => {
  if (typeof left === "boolean" || typeof right === "boolean") {
    const a = phpBool(left), b = phpBool(right);
    return a === b ? 0 : a ? 1 : -1;
  }
  if (left == null || right == null) {
    if (typeof left === "string" || typeof right === "string") return compareStrings(left ?? "", right ?? "");
    const a = phpBool(left), b = phpBool(right);
    return a === b ? 0 : a ? 1 : -1;
  }
  if (isPhpObject(left) || isPhpObject(right)) {
    const dateLeft = dateStorage.get(left), dateRight = dateStorage.get(right);
    if (dateLeft || dateRight) {
      if (dateLeft && dateLeft.timestamp === void 0 || dateRight && dateRight.timestamp === void 0) throw new TypeError("Use === or compare explicit fields for DateInterval, DatePeriod, DateTimeZone and InternalIterator");
      if (dateLeft && dateRight) return dateLeft.timestamp === dateRight.timestamp ? Math.sign(dateLeft.microsecond - dateRight.microsecond) : dateLeft.timestamp < dateRight.timestamp ? -1 : 1;
    }
    if (left === right) return 0;
    if (!isPhpObject(left) || !isPhpObject(right)) throw new TypeError("Compare service objects with other service objects or use ===");
    const a = objectData(left), b = objectData(right);
    if (a.definition.enum || b.definition.enum) return NaN;
    if (a.definition.name !== b.definition.name) return NaN;
    if (++objectComparisonDepth > 128) {
      objectComparisonDepth--;
      throw new Error("Recursive object comparison limit exceeded");
    }
    try {
      if (a.fields.size !== b.fields.size) return a.fields.size < b.fields.size ? -1 : 1;
      for (const [key, item] of a.fields) {
        const other = b.fields.get(key);
        if (!other) return 1;
        const result = phpCompare(item.value, other.value, item.kind, other.kind);
        if (result !== 0) return result;
      }
      return 0;
    } finally {
      objectComparisonDepth--;
    }
  }
  if (left instanceof Error || right instanceof Error) {
    if (left === right) return 0;
    throw new TypeError("Use === or compare Throwable messages/codes instead of ordering or loosely comparing exceptions.");
  }
  if (isRoundingMode(left) || isRoundingMode(right)) return left === right ? 0 : NaN;
  if (typeof left === "object" || typeof right === "object") {
    if (typeof left !== "object") return -1;
    if (typeof right !== "object") return 1;
    const a = arrayEntries(left).map(([key]) => key), b = arrayEntries(right).map(([key]) => key);
    if (a.length !== b.length) return a.length < b.length ? -1 : 1;
    for (const key of a) {
      if (!Object.hasOwn(right, key)) return 1;
      const result = phpCompare(left[key], right[key], arrayKind(left, key), arrayKind(right, key));
      if (result !== 0) return result;
    }
    return 0;
  }
  if (typeof left === "string" && typeof right === "string") {
    if (numericString(left) && numericString(right)) return compareNumbers(left, right, leftType, rightType);
    else return compareStrings(left, right);
  } else if (typeof left === "number" && typeof right === "string") {
    if (numericString(right)) return compareNumbers(left, right, leftType, rightType);
    else return compareStrings(phpString(left, leftType), right);
  } else if (typeof left === "string" && typeof right === "number") {
    if (numericString(left)) return compareNumbers(left, right, leftType, rightType);
    else return compareStrings(left, phpString(right, rightType));
  }
  return compareNumbers(left, right, leftType, rightType);
};
var phpMatches = (operator, left, right, leftType = phpType(left), rightType = phpType(right)) => {
  if (operator === "truthy") return phpBool(left);
  if (operator === "falsy") return !phpBool(left);
  if (["eq", "identical"].includes(operator)) return phpIdentical(left, right, leftType, rightType);
  if (["neq", "notIdentical"].includes(operator)) return !phpIdentical(left, right, leftType, rightType);
  const comparison = phpCompare(left, right, leftType, rightType);
  if (["looseEq", "equal"].includes(operator)) return comparison === 0;
  if (["looseNeq", "notEqual"].includes(operator)) return comparison !== 0;
  if (["gt", "greater"].includes(operator)) return comparison > 0;
  if (["gte", "greaterEqual"].includes(operator)) return comparison >= 0;
  if (["lt", "less"].includes(operator)) return comparison < 0;
  if (["lte", "lessEqual"].includes(operator)) return comparison <= 0;
  throw new Error(`Unknown PHP comparison: ${operator}`);
};
var phpIncrement = (value, kind, direction, context = null) => {
  const deprecated = (message) => {
    if ((context?.source?.phpVersion ?? 80400) >= 80300) warn(context, message, "PHP_DEPRECATED");
  };
  if (typeof value === "boolean" || value == null && direction < 0) {
    deprecated(`${direction > 0 ? "Increment" : "Decrement"} on type ${value == null ? "null" : "bool"} has no effect`);
    return { value, kind };
  }
  if (value == null) return { value: 1, kind: "integer" };
  if (typeof value === "number" || numericString(value)) {
    const floating = kind === "double" || typeof value === "string" && /[.eE]/.test(value);
    const next2 = phpArithmetic("add", phpNumber(value), direction, floating, context);
    return { value: next2, kind: floating ? "double" : "integer" };
  }
  if (typeof value !== "string") throw new TypeError("Cannot increment or decrement an array or object");
  if (value === "") {
    deprecated("Increment/decrement on empty string is deprecated");
    return direction > 0 ? { value: "1", kind: "string" } : { value: -1, kind: "integer" };
  }
  if (direction < 0) {
    deprecated("Decrement on non-numeric string has no effect and is deprecated");
    return { value, kind };
  }
  if (!/^[a-zA-Z0-9]+$/.test(value)) deprecated("Increment on non-alphanumeric string is deprecated");
  const chars = [...value];
  let carry = true, prefix = "1";
  for (let index = chars.length - 1; index >= 0 && carry; index--) {
    const c = chars[index];
    if (c === "9") {
      chars[index] = "0";
      prefix = "1";
    } else if (c === "z") {
      chars[index] = "a";
      prefix = "a";
    } else if (c === "Z") {
      chars[index] = "A";
      prefix = "A";
    } else if (/[a-yA-Y0-8]/.test(c)) {
      chars[index] = String.fromCharCode(c.charCodeAt(0) + 1);
      carry = false;
    } else carry = false;
  }
  return { value: (carry ? prefix : "") + chars.join(""), kind: "string" };
};
var phpBitwise = (operation, left, right, context) => {
  if (operation === "bitNot" && typeof left === "string") return text(bytes(left).map((value2) => ~value2 & 255));
  if (operation === "bitNot" && typeof left !== "number") throw new TypeError("Cannot perform bitwise not on this value");
  const integer = (value2) => {
    const number = phpNumber(value2, context);
    if (!Number.isFinite(number) || !Number.isSafeInteger(Math.trunc(number))) throw new RangeError("Bitwise operand exceeds safe frontend integer precision");
    if (!Number.isInteger(number)) warn(context, "Implicit conversion from float to int loses precision", "PHP_DEPRECATED");
    return BigInt(Math.trunc(number));
  };
  const a = integer(left);
  let result;
  if (operation === "bitNot") result = ~a;
  else {
    const b = integer(right);
    if (["bitAnd", "bitOr", "bitXor"].includes(operation)) result = operation === "bitAnd" ? a & b : operation === "bitOr" ? a | b : a ^ b;
    else {
      if (b < 0n) throw Object.assign(new Error("Bit shift by negative number"), { name: "ArithmeticError" });
      result = b >= 64n ? operation === "shiftRight" && a < 0n ? -1n : 0n : operation === "shiftLeft" ? BigInt.asIntN(64, a << b) : a >> b;
    }
  }
  const value = Number(result);
  if (!Number.isSafeInteger(value)) throw new RangeError("Bitwise result exceeds safe frontend integer precision");
  return value;
};

// src-js/core/php-exceptions.js
var parents = {
  Exception: ["Throwable", "Stringable"],
  Error: ["Throwable", "Stringable"],
  ReflectionException: ["Exception"],
  JsonException: ["Exception"],
  DateException: ["Exception"],
  DateMalformedStringException: ["DateException"],
  DateInvalidTimeZoneException: ["DateException"],
  DateMalformedIntervalStringException: ["DateException"],
  DateMalformedPeriodStringException: ["DateException"],
  DateInvalidOperationException: ["DateException"],
  LogicException: ["Exception"],
  RuntimeException: ["Exception"],
  ErrorException: ["Exception"],
  InvalidArgumentException: ["LogicException"],
  DomainException: ["LogicException"],
  LengthException: ["LogicException"],
  OutOfRangeException: ["LogicException"],
  OutOfBoundsException: ["RuntimeException"],
  OverflowException: ["RuntimeException"],
  RangeException: ["RuntimeException"],
  UnderflowException: ["RuntimeException"],
  UnexpectedValueException: ["RuntimeException"],
  TypeError: ["Error"],
  ArgumentCountError: ["TypeError"],
  ValueError: ["Error"],
  ArithmeticError: ["Error"],
  DivisionByZeroError: ["ArithmeticError"],
  AssertionError: ["Error"],
  UnhandledMatchError: ["Error"],
  CompileError: ["Error"],
  ParseError: ["CompileError"]
};
var exceptionClass = (error) => {
  if (isPhpObject(error)) return objectData(error).definition.name;
  if (!(error instanceof Error)) throw new TypeError("Expected an object value.");
  if (error.phpHierarchy) return error.name;
  if (error instanceof RangeError) return ["PHP_LOOP_LIMIT", "PHP_CALL_LIMIT"].includes(error.code) ? "RuntimeException" : "ValueError";
  return Object.hasOwn(parents, error.name) ? error.name : "Error";
};
var exceptionIs = (error, type) => {
  if (isPhpObject(error)) return objectIs(error, type);
  if (!(error instanceof Error)) return false;
  const wanted = type.replace(/^\\/, "").toLowerCase();
  const visit = (name) => name.toLowerCase() === wanted || (parents[name] || []).some(visit);
  return error.phpHierarchy ? error.phpHierarchy.some((name) => name.toLowerCase() === wanted) : visit(exceptionClass(error));
};
var raise = (value, source, context) => {
  if (!(value instanceof Error)) throw withSource(new Error(typeof value === "function" ? "Cannot throw objects that do not implement Throwable" : "Can only throw objects"), source);
  value.phpTrace ??= (context?.trace || []).map((frame) => ({ ...frame }));
  throw withSource(value, source);
};
var bindArguments = (nodes, names2, state, context, resolve, type) => {
  const args = [];
  for (const node of nodes || []) {
    const value = resolve(node.value, state, context);
    if (node.spread) {
      if (!isPhpArray(value)) throw new TypeError("Only arrays can be unpacked in exception arguments");
      for (const [key, item] of arrayEntries(value)) args.push({ ...typeof key === "string" ? { name: key } : {}, value: item, kind: arrayKind(value, key) });
    } else args.push({ ...node, value, kind: type(node.value, state, context, value) });
  }
  const values2 = /* @__PURE__ */ Object.create(null);
  let position = 0, named = false;
  for (const arg of args) {
    let name = arg.name;
    if (name !== void 0) {
      named = true;
      if (!names2.includes(name)) throw new Error(`Unknown named parameter $${name}`);
    } else {
      if (named) throw new Error("Cannot use positional argument after named argument");
      name = names2[position++];
    }
    if (name === void 0) throw Object.assign(new Error("Too many exception/assertion arguments"), { name: "ArgumentCountError" });
    if (Object.hasOwn(values2, name)) throw new Error(`Named parameter $${name} overwrites previous argument`);
    values2[name] = { value: arg.value, kind: arg.kind };
  }
  return values2;
};
var newThrowable = (descriptor, message, code, previous, source, context) => {
  const error = new Error(message);
  error.name = descriptor.name;
  error.phpHierarchy = [descriptor.name, ...descriptor.parents];
  error.phpCode = code;
  error.phpPrevious = previous;
  error.phpMessage = message;
  error.phpTrace = (context.trace || []).map((frame) => ({ ...frame }));
  return withSource(error, source);
};
var evaluateException = (expression, state, context, resolve, type) => {
  const value = (node) => resolve(node, state, context), options = expression.right || {};
  if (expression.operation === "throw") return raise(value(expression.left), expression.right || context.source, context);
  if (expression.operation === "exceptionIs") {
    const left = value(expression.left);
    let right = expression.right === "@static" ? context.calledClass : value(expression.right);
    if (isPhpObject(right)) right = objectData(right).definition.name;
    else if (right instanceof Error) right = exceptionClass(right);
    if (typeof right !== "string") throw new Error("Class name must be a valid object or a string");
    return exceptionIs(left, right);
  }
  if (expression.operation === "exceptionGet") {
    const error2 = value(expression.left);
    if (error2 == null && options.nullable) return null;
    const name = exceptionClass(error2);
    switch (options.method) {
      case "class":
        return name;
      case "getmessage":
        return error2.phpMessage ?? error2.message;
      case "getcode":
        return error2.phpCode ?? 0;
      case "getprevious":
        return error2.phpPrevious ?? null;
      case "getfile":
        return error2.phpFile ?? error2.source?.file ?? "[browser]";
      case "getline":
        return error2.phpLine ?? error2.source?.line ?? 0;
      case "gettrace":
        return (error2.phpTrace || []).map((frame) => ({ ...frame }));
      case "gettraceasstring":
        return traceString(error2);
      case "__tostring":
        return formatThrowable(error2);
      case "getseverity":
        if (exceptionIs(error2, "ErrorException")) return error2.phpSeverity ?? 1;
        break;
    }
    throw new Error(`Unsupported Throwable method: ${options.method}`);
  }
  if (expression.operation === "assert") {
    const args2 = bindArguments(expression.left, ["assertion", "description"], state, context, resolve, type);
    if (!Object.hasOwn(args2, "assertion")) throw Object.assign(new Error("assert() requires an assertion"), { name: "ArgumentCountError" });
    const item = args2.description || { value: null, kind: "NULL" };
    const description = item.value instanceof Error ? item.value : assignType({ types: ["string"], nullable: true, property: "assert() description" }, item.value, item.kind, options.source?.strictTypes ?? true, context).value;
    if (phpBool(args2.assertion.value)) return true;
    if (description instanceof Error) return raise(description, options.source, context);
    return raise(newThrowable({ name: "AssertionError", parents: ["Error", "Throwable", "Stringable"] }, description ?? options.description, 0, null, options.source, context), options.source, context);
  }
  const descriptor = expression.left, extended = descriptor.ctorKind === "ErrorException";
  const args = bindArguments(options.arguments, extended ? ["message", "code", "severity", "filename", "line", "previous"] : ["message", "code", "previous"], state, context, resolve, type);
  const scalar2 = (name, typeName, fallback, nullable2 = false) => {
    const item = args[name] || { value: fallback, kind: phpType(fallback) };
    return assignType({ types: [typeName], nullable: nullable2, property: `${descriptor.name}::__construct($${name})` }, item.value, item.kind, options.source?.strictTypes ?? true, context).value;
  };
  const message = scalar2("message", "string", ""), code = scalar2("code", "int", 0);
  const previous = args.previous?.value ?? null;
  if (previous !== null && !(previous instanceof Error)) throw new TypeError("Exception previous must be Throwable|null");
  const error = newThrowable(descriptor, message, code, previous, options.source || context.source, context);
  if (extended) {
    error.phpSeverity = scalar2("severity", "int", 1);
    error.phpFile = scalar2("filename", "string", null, true);
    error.phpLine = scalar2("line", "int", null, true);
  }
  return error;
};
var traceString = (error) => [...(error.phpTrace || []).map((frame, index) => `#${index} ${frame.file || "[browser]"}(${frame.line || 0}): ${frame.function || "{closure}"}()`), `#${(error.phpTrace || []).length} {main}`].join("\n");
var formatThrowable = (error, seen = /* @__PURE__ */ new Set()) => {
  if (seen.has(error)) return "[cyclic exception]";
  seen.add(error);
  const previous = error.phpPrevious ? formatThrowable(error.phpPrevious, seen) + "\n\nNext " : "";
  return previous + `${exceptionClass(error)}: ${error.phpMessage ?? error.message} in ${error.phpFile ?? error.source?.file ?? "[browser]"}:${error.phpLine ?? error.source?.line ?? 0}
Stack trace:
${traceString(error)}`;
};
var linkPrevious = (error, pending) => {
  if (!(error instanceof Error) || !(pending instanceof Error) || error === pending) return;
  const seen = /* @__PURE__ */ new Set();
  for (let cause = pending; cause; cause = cause.phpPrevious) {
    if (seen.has(cause)) return;
    seen.add(cause);
  }
  let tail = error;
  while (tail) {
    if (seen.has(tail)) return;
    seen.add(tail);
    if (!tail.phpPrevious) {
      tail.phpPrevious = pending;
      return;
    }
    tail = tail.phpPrevious;
  }
};
function* exceptionFlow(action, bind, context) {
  let pending, signal;
  try {
    signal = yield action.action;
  } catch (error) {
    error.phpTrace ??= (context.trace || []).map((frame) => ({ ...frame }));
    const branch = (action.catches || []).find((branch2) => branch2.types.some((type) => exceptionIs(error, type)));
    if (!branch) pending = error;
    else {
      try {
        if (branch.variable) bind(branch.variable, error);
        signal = yield branch.action;
      } catch (failure5) {
        pending = failure5;
      }
    }
  }
  if (action.finally) {
    try {
      const final = yield action.finally;
      if (final) return final;
    } catch (error) {
      linkPrevious(error, pending);
      throw error;
    }
  }
  if (pending) throw pending;
  return signal;
}

// src-js/core/php-types.js
var nativeType = (type) => ({ integer: "int", double: "float", boolean: "bool", NULL: "null" })[type] || type;
var numeric = (value) => typeof value === "number" || typeof value === "string" && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);
var assignType = (rule, value, kind = phpType(value), strict = true, context = null) => {
  if (!rule) return { value, kind };
  const types = rule.types.map((type) => type.replace(/^\?/, ""));
  const actual = nativeType(kind);
  if (isPhpObject(value) && types.some((type) => type.split("&").every((member) => objectIs(value, member)))) return { value, kind: "object" };
  if (isRoundingMode(value) && types.some((type) => type.toLowerCase() === "roundingmode")) return { value, kind: "object" };
  if (value instanceof Error && types.some((type) => type.split("&").every((member) => exceptionIs(value, member)))) return { value, kind: "object" };
  if (types.includes("iterable") && (kind === "array" || objectIs(value, "Traversable"))) return { value, kind };
  if (types.includes("mixed") || value == null && rule.nullable) return { value, kind };
  if (types.includes(actual) || value === true && types.includes("true") || value === false && types.includes("false")) {
    if (actual === "int" && !Number.isSafeInteger(value)) throw new RangeError("Frontend integer exceeds JavaScript safe integer precision");
    return { value, kind };
  }
  if (actual === "int" && types.includes("float")) return { value, kind: "double" };
  if (!strict && isPhpObject(value) && types.includes("string") && objectIs(value, "Stringable")) return { value: phpString(value, kind, context), kind: "string" };
  if (!strict && value != null && ["int", "float", "string", "bool"].includes(actual)) {
    let preferred = ["int", "float", "string", "bool"];
    if (actual === "string" && numeric(value) && /[.eE]/.test(value) && types.includes("float")) preferred = ["float", "int", "string", "bool"];
    for (const type of preferred.filter((item) => types.includes(item))) {
      if (type === "string") return { value: phpString(value, kind, context), kind: "string" };
      if (type === "bool") return { value: phpBool(value), kind: "boolean" };
      if (actual === "string" && !numeric(value)) continue;
      if (type === "float") return { value: phpFloat(value), kind: "double" };
      const number = phpFloat(value);
      if (!Number.isFinite(number)) continue;
      if (!Number.isInteger(number)) warn(context, `Implicit conversion from ${actual} to int loses precision`, "PHP_DEPRECATED");
      return { value: phpInt(value), kind: "integer" };
    }
  }
  throw new TypeError(`Cannot assign ${actual} to property ${rule.property || "(state)"} of type ${types.join("|")}${rule.nullable && !types.includes("null") ? "|null" : ""}`);
};

// src-js/core/php-stdclass.js
var stdClassDefinition = () => ({ name: "stdClass", parent: null, ancestors: [], properties: {}, staticProperties: {}, constants: {}, methods: {}, abstract: false, final: false });
var synchronize = (data, value) => {
  data.fieldsArray = value;
  data.fields = new Map(arrayEntries(value).map(([key]) => [String(key), { get value() {
    return arrayRead(data.fieldsArray, key, null, true).value;
  }, get kind() {
    return arrayKind(data.fieldsArray, key);
  } }]));
  ownArray(data, "fieldsArray", data.fieldsActive === false ? null : value);
};
var watchObjectFields = (value) => {
  const data = objectData(value);
  observeValueOwnership(value, (active) => {
    data.fieldsActive = active;
    if (data.fieldsArray) ownArray(data, "fieldsArray", active ? data.fieldsArray : null);
    else for (const [name, item] of data.fields) ownArray(data.fields, name, active ? item.value : null);
  });
  return value;
};
var makeStdClassFromArray = (array2) => {
  const value = makeObject(stdClassDefinition());
  synchronize(objectData(value), clonePhp(array2));
  return watchObjectFields(value);
};
var makeStdClass = (entries = []) => makeStdClassFromArray(makeArray(entries.map(([key, item]) => [arrayKey(key), item.value]), new Map(entries.map(([key, item]) => [arrayKey(key), item.kind]))));
var stdClassArray = (value) => {
  const data = objectData(value);
  return data?.definition.name === "stdClass" && data.fieldsArray ? clonePhp(data.fieldsArray) : null;
};
var cloneStdClass = (value) => {
  const data = objectData(value);
  if (data?.definition.name !== "stdClass") return null;
  return makeStdClassFromArray(data.fieldsArray || makeArray());
};
var copyObjectFields = (fields) => new Map([...fields].map(([name, item]) => [name, item.reference?.cell.bindings.size > 1 ? item : { value: clonePhp(item.value), kind: item.kind }]));
var stdClassReference = (value, name, context) => {
  const data = objectData(value);
  if (data?.definition.name !== "stdClass") return null;
  if (!data.fieldsArray) synchronize(data, makeArray());
  const key = arrayKey(name, context);
  return {
    get: (quiet = false) => {
      if (!Object.hasOwn(data.fieldsArray, key) && !quiet) warn(context, `Undefined property: stdClass::$${name}`);
      return arrayRead(data.fieldsArray, key, context, true);
    },
    probe: () => arrayRead(data.fieldsArray, key, context, true),
    set: (value2, kind) => {
      if (context.readOnly) throw new Error("Reactive text cannot modify objects");
      synchronize(data, arrayWrite(data.fieldsArray, key, value2, kind, context));
      return arrayRead(data.fieldsArray, key, context, true);
    },
    remove: () => synchronize(data, arrayUnset(data.fieldsArray, key, context)),
    reference: () => {
      const item = arrayReference(data.fieldsArray, key, context);
      synchronize(data, item.array);
      return item.reference;
    }
  };
};

// src-js/core/php-enums.js
var enumCase = (name, caseName, context) => {
  const definition = context.classes?.[name.toLowerCase()];
  if (!definition?.enum || !Object.hasOwn(definition.enumCases, caseName)) throw new Error("Unknown frontend enum case");
  const fields = context.staticFields ||= /* @__PURE__ */ new Map(), key = "@enum:" + name.toLowerCase() + "::" + caseName;
  if (!fields.has(key)) {
    const properties = /* @__PURE__ */ new Map([["name", { value: caseName, kind: "string" }]]);
    if (definition.backingType) properties.set("value", { value: definition.enumCases[caseName], kind: definition.backingType === "int" ? "integer" : "string" });
    fields.set(key, { value: makeObject(definition, properties), kind: "object" });
  }
  return fields.get(key);
};
var evaluateEnum = (expression, state, context) => {
  const name = expression.left, definition = context.classes?.[name.toLowerCase()];
  if (!definition?.enum) throw new Error("Unknown frontend enum");
  if (expression.operation === "enumCase") return enumCase(name, expression.right, context);
  if (expression.operation === "enumCases") return { value: makeArray(Object.keys(definition.enumCases).map((key, index) => [index, enumCase(name, key, context).value, "object"])), kind: "array" };
  const value = resolveData2(expression.right.value, state, context);
  for (const [key, backing] of Object.entries(definition.enumCases)) if (value === backing) return enumCase(name, key, context);
  if (expression.right.nullable) return { value: null, kind: "NULL" };
  throw Object.assign(new Error("Invalid backing value for enum " + name), { name: "ValueError" });
};

// src-js/core/php-serialization.js
var runSerialization = (name, items, state, context) => {
  if (!["serialize", "unserialize"].includes(name)) return null;
  if (context.readOnly) throw new Error("Serialization requires an event scope");
  let nodes = 0;
  const budget = (depth) => {
    work(context);
    if (depth > 64 || ++nodes > 1e4) throw new RangeError("Frontend serialization exceeds its nesting or value limit");
  };
  const string = (value) => `s:${bytes(value).length}:"${value}";`;
  const member = (value, method2) => objectMemberLookup(objectData(value).definition.name, method2, "methods", context, false);
  const invoke = (value, method2, args = []) => callMagic(value, objectData(value).definition.name, member(value, method2), args, state, context);
  if (name === "serialize") {
    if ((context.source?.serializePrecision ?? -1) !== -1) throw new RangeError("Frontend serialization requires serialize_precision=-1");
    const objects3 = /* @__PURE__ */ new Map();
    let sequence2 = 0;
    const encode2 = (value, kind, depth = 0) => {
      budget(depth);
      const id = ++sequence2;
      if (value === null) return "N;";
      if (kind === "boolean") return `b:${value ? 1 : 0};`;
      if (kind === "integer") return `i:${value};`;
      if (kind === "double") return "d:" + (Number.isNaN(value) ? "NAN" : value === Infinity ? "INF" : value === -Infinity ? "-INF" : floatString(value)) + ";";
      if (typeof value === "string") return string(value);
      if (isPhpArray(value)) {
        const entries = arrayEntries(value);
        for (const [key] of entries) if (arrayElementReference(value, key)) throw new Error("Serialization of array reference cells is not supported");
        return `a:${entries.length}:{` + entries.map(([key, part]) => (typeof key === "number" ? `i:${key};` : string(key)) + encode2(part, arrayKind(value, key), depth + 1)).join("") + "}";
      }
      if (!isPhpObject(value)) throw failure("Exception", "Serialization of this value is not allowed");
      if (objects3.has(value)) return `r:${objects3.get(value)};`;
      objects3.set(value, id);
      const data = objectData(value), definition = data.definition;
      if (definition.enum) {
        const label = definition.name + ":" + data.fields.get("name").value;
        return `E:${bytes(label).length}:"${label}";`;
      }
      if (definition.nativeDate || definition.nativeIntl || definition.nativeSpl || definition.nativeReflection || definition.name.includes("@anonymous")) throw failure("Exception", "Serialization of this internal or anonymous class is not supported");
      let fields = [];
      if (member(value, "__serialize")) {
        const result = invoke(value, "__serialize").value;
        if (!isPhpArray(result)) throw new TypeError("__serialize() must return an array");
        fields = arrayEntries(result).map(([key, part]) => [key, { value: part, kind: arrayKind(result, key) }]);
      } else {
        const sleep = member(value, "__sleep") ? invoke(value, "__sleep").value : null;
        if (sleep !== null && !isPhpArray(sleep)) throw new TypeError("__sleep() must return an array");
        const wanted = sleep === null ? null : arrayEntries(sleep).map(([, part]) => part);
        for (const [key, item] of data.fields) {
          const raw2 = key.includes("::$") ? key.split("::$").at(-1) : key;
          if (wanted && !wanted.includes(raw2)) continue;
          const owner = key.includes("::$") ? key.split("::$")[0] : definition.name;
          const property = objectMemberLookup(owner, raw2, "properties", context, false);
          const wire = property?.visibility === "private" ? "\0" + property.owner + "\0" + raw2 : property?.visibility === "protected" ? "\0*\0" + raw2 : raw2;
          fields.push([wire, item]);
        }
      }
      return `O:${bytes(definition.name).length}:"${definition.name}":${fields.length}:{` + fields.map(([key, item]) => (typeof key === "number" ? `i:${key};` : string(key)) + encode2(item.value, item.kind, depth + 1)).join("") + "}";
    };
    return { value: bounded(encode2(items[0].value, items[0].kind)), kind: "string" };
  }
  const raw = byteString(items[0].value), options = items[1].value, allowed = options.allowed_classes ?? true, maxDepth = options.max_depth ?? 4096;
  if (typeof allowed !== "boolean" && !isPhpArray(allowed)) throw new TypeError("unserialize(): allowed_classes must be an array or boolean");
  if (!Number.isInteger(maxDepth) || maxDepth < 0) throw failure("ValueError", "unserialize(): max_depth must be a non-negative integer");
  let position = 0, sequence = 0;
  const objects2 = /* @__PURE__ */ new Map(), pending = [];
  const malformed = () => {
    throw { serializationParse: true };
  };
  const expect = (s) => {
    if (raw.slice(position, position + s.length) !== s) malformed();
    position += s.length;
  };
  const number = (separator) => {
    const end = raw.indexOf(separator, position);
    if (end < 0) malformed();
    const token2 = raw.slice(position, end);
    position = end + separator.length;
    return token2;
  };
  const natural = (separator) => {
    const n = number(separator);
    if (!/^\d+$/.test(n) || Number(n) > 1048576) malformed();
    return Number(n);
  };
  const quoted = () => {
    const length = natural(':"'), part = raw.slice(position, position + length);
    if (part.length !== length) malformed();
    position += length;
    expect('"');
    return fromByteString(part);
  };
  const parse = (depth = 0, key = false) => {
    budget(depth);
    if (maxDepth && depth > maxDepth) malformed();
    const tag = raw[position++], id = key ? 0 : ++sequence;
    if (tag === "N") {
      expect(";");
      return { value: null, kind: "NULL" };
    }
    expect(":");
    if (tag === "s") {
      const value2 = quoted();
      expect(";");
      return { value: value2, kind: "string" };
    }
    if (tag === "i" || tag === "d" || tag === "b") {
      const token2 = number(";");
      if (tag === "b") {
        if (!["0", "1"].includes(token2)) malformed();
        return { value: token2 === "1", kind: "boolean" };
      }
      const value2 = token2 === "INF" ? Infinity : token2 === "-INF" ? -Infinity : token2 === "NAN" ? NaN : Number(token2);
      if (tag === "i" && !/^[+-]?\d+$/.test(token2) || tag === "d" && !/^(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|NAN|-?INF)$/.test(token2)) malformed();
      if (tag === "i" && !Number.isSafeInteger(value2)) throw new RangeError("Serialized integer exceeds frontend safe precision");
      return { value: value2, kind: tag === "i" ? "integer" : "double" };
    }
    if (tag === "R") throw new Error("Unserialization of array reference cells is not supported");
    if (tag === "r") {
      const ref = natural(";");
      if (!objects2.has(ref)) malformed();
      return objects2.get(ref);
    }
    if (tag === "E") {
      const label = quoted();
      expect(";");
      const split2 = label.lastIndexOf(":");
      const item2 = enumCase(label.slice(0, split2), label.slice(split2 + 1), context);
      objects2.set(id, item2);
      return item2;
    }
    if (tag !== "a" && tag !== "O") malformed();
    let className = null, definition = null, item = null;
    if (tag === "O") {
      className = quoted();
      expect(":");
      definition = context.classes?.[className.toLowerCase()];
      if (className === "stdClass") definition = { name: "stdClass" };
      if (!definition || definition.enum || definition.abstract || definition.interface || definition.nativeDate || definition.nativeIntl || definition.nativeSpl || definition.nativeReflection) throw new Error("Unserialization requires a concrete compiled frontend class: " + className);
      if (allowed === false || isPhpArray(allowed) && !arrayEntries(allowed).some(([, part]) => typeof part === "string" && part.toLowerCase() === className.toLowerCase())) throw new Error("Serialized class is not allowed: " + className);
      item = { value: className === "stdClass" ? makeStdClass() : evaluateObject({ operation: "objectNew", left: className, right: { skipConstructor: true } }, state, context).value, kind: "object" };
      objects2.set(id, item);
    }
    const count = natural(":{");
    if (count > 1e4) throw new RangeError("Serialized collection exceeds 10000 values");
    const entries = [];
    for (let i = 0; i < count; i++) {
      const k = parse(depth + 1, true);
      if (!["integer", "string"].includes(k.kind)) malformed();
      entries.push([k.value, parse(depth + 1)]);
    }
    expect("}");
    if (tag === "a") return { value: makeArray(entries.map(([k, v]) => [k, v.value, v.kind])), kind: "array" };
    const value = item.value, data = objectData(value);
    if (member(value, "__unserialize")) pending.push(() => invoke(value, "__unserialize", [{ value: makeArray(entries.map(([k, v]) => [k, v.value, v.kind])), kind: "array" }]));
    else {
      if (className === "stdClass") {
        const replacement = makeStdClass(entries);
        objectData(value).fieldsArray = objectData(replacement).fieldsArray;
        objectData(value).fields = objectData(replacement).fields;
      } else for (const [wire, part] of entries) {
        const parts = String(wire).split("\0"), name2 = parts.at(-1), owner = parts.length === 3 && parts[1] !== "*" ? parts[1] : className;
        const property = objectMemberLookup(owner, name2, "properties", context, false);
        if (!property || property.virtual) throw new Error("Unknown serialized frontend property: " + name2);
        const key2 = property.visibility === "private" ? property.owner + "::$" + name2 : name2;
        data.fields.set(key2, assignType(property.rule, part.value, part.kind, true, context));
      }
      if (member(value, "__wakeup")) pending.push(() => invoke(value, "__wakeup"));
    }
    return item;
  };
  try {
    const result = parse();
    if (position < raw.length) warn(context, "unserialize(): Extra data starting at offset " + position);
    for (const callback of pending) callback();
    return result;
  } catch (error) {
    if (!error.serializationParse) throw error;
    warn(context, `unserialize(): Error at offset ${position} of ${raw.length} bytes`);
    return { value: false, kind: "boolean" };
  }
};

// node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n, title = "") {
  if (!Number.isSafeInteger(n) || n < 0) {
    const prefix = title && `"${title}" `;
    throw new Error(`${prefix}expected integer >= 0, got ${n}`);
  }
}
function abytes(value, length, title = "") {
  const bytes3 = isBytes(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes3 || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes3 ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
  }
  return value;
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "digestInto() output");
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error('"digestInto() output" expected to be of length >=' + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function rotl(word, shift) {
  return word << shift | word >>> 32 - shift >>> 0;
}
var hasHexBuiltin = /* @__PURE__ */ (() => (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
))();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes3) {
  abytes(bytes3);
  if (hasHexBuiltin)
    return bytes3.toHex();
  let hex = "";
  for (let i = 0; i < bytes3.length; i++) {
    hex += hexes[bytes3[i]];
  }
  return hex;
}
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var oidNist = (suffix) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class {
  blockLen;
  outputLen;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    clean(this.buffer.subarray(pos));
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    view.setBigUint64(blockLen - 8, BigInt(this.length * 8), isLE);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to ||= new this.constructor();
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA224_IV = /* @__PURE__ */ Uint32Array.from([
  3238371032,
  914150663,
  812702999,
  4144912697,
  4290775857,
  1750603025,
  1694076839,
  3204075428
]);
var SHA384_IV = /* @__PURE__ */ Uint32Array.from([
  3418070365,
  3238371032,
  1654270250,
  914150663,
  2438529370,
  812702999,
  355462360,
  4144912697,
  1731405415,
  4290775857,
  2394180231,
  1750603025,
  3675008525,
  1694076839,
  1203062813,
  3204075428
]);
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]);

// node_modules/@noble/hashes/legacy.js
var SHA1_IV = /* @__PURE__ */ Uint32Array.from([
  1732584193,
  4023233417,
  2562383102,
  271733878,
  3285377520
]);
var SHA1_W = /* @__PURE__ */ new Uint32Array(80);
var _SHA1 = class extends HashMD {
  A = SHA1_IV[0] | 0;
  B = SHA1_IV[1] | 0;
  C = SHA1_IV[2] | 0;
  D = SHA1_IV[3] | 0;
  E = SHA1_IV[4] | 0;
  constructor() {
    super(64, 20, 8, false);
  }
  get() {
    const { A, B, C, D, E } = this;
    return [A, B, C, D, E];
  }
  set(A, B, C, D, E) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA1_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 80; i++)
      SHA1_W[i] = rotl(SHA1_W[i - 3] ^ SHA1_W[i - 8] ^ SHA1_W[i - 14] ^ SHA1_W[i - 16], 1);
    let { A, B, C, D, E } = this;
    for (let i = 0; i < 80; i++) {
      let F, K2;
      if (i < 20) {
        F = Chi(B, C, D);
        K2 = 1518500249;
      } else if (i < 40) {
        F = B ^ C ^ D;
        K2 = 1859775393;
      } else if (i < 60) {
        F = Maj(B, C, D);
        K2 = 2400959708;
      } else {
        F = B ^ C ^ D;
        K2 = 3395469782;
      }
      const T = rotl(A, 5) + F + E + K2 + SHA1_W[i] | 0;
      E = D;
      D = C;
      C = rotl(B, 30);
      B = A;
      A = T;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    this.set(A, B, C, D, E);
  }
  roundClean() {
    clean(SHA1_W);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var sha1 = /* @__PURE__ */ createHasher(() => new _SHA1());
var p32 = /* @__PURE__ */ Math.pow(2, 32);
var K = /* @__PURE__ */ Array.from({ length: 64 }, (_, i) => Math.floor(p32 * Math.abs(Math.sin(i + 1))));
var MD5_IV = /* @__PURE__ */ SHA1_IV.slice(0, 4);
var MD5_W = /* @__PURE__ */ new Uint32Array(16);
var _MD5 = class extends HashMD {
  A = MD5_IV[0] | 0;
  B = MD5_IV[1] | 0;
  C = MD5_IV[2] | 0;
  D = MD5_IV[3] | 0;
  constructor() {
    super(64, 16, 8, true);
  }
  get() {
    const { A, B, C, D } = this;
    return [A, B, C, D];
  }
  set(A, B, C, D) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      MD5_W[i] = view.getUint32(offset, true);
    let { A, B, C, D } = this;
    for (let i = 0; i < 64; i++) {
      let F, g, s;
      if (i < 16) {
        F = Chi(B, C, D);
        g = i;
        s = [7, 12, 17, 22];
      } else if (i < 32) {
        F = Chi(D, B, C);
        g = (5 * i + 1) % 16;
        s = [5, 9, 14, 20];
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
        s = [4, 11, 16, 23];
      } else {
        F = C ^ (B | ~D);
        g = 7 * i % 16;
        s = [6, 10, 15, 21];
      }
      F = F + A + K[i] + MD5_W[g];
      A = D;
      D = C;
      C = B;
      B = B + rotl(F, s[i % 4]);
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    this.set(A, B, C, D);
  }
  roundClean() {
    clean(MD5_W);
  }
  destroy() {
    this.set(0, 0, 0, 0);
    clean(this.buffer);
  }
};
var md5 = /* @__PURE__ */ createHasher(() => new _MD5());
var Rho160 = /* @__PURE__ */ Uint8Array.from([
  7,
  4,
  13,
  1,
  10,
  6,
  15,
  3,
  12,
  0,
  9,
  5,
  2,
  14,
  11,
  8
]);
var Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
var Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
var idxLR = /* @__PURE__ */ (() => {
  const L = [Id160];
  const R = [Pi160];
  const res = [L, R];
  for (let i = 0; i < 4; i++)
    for (let j of res)
      j.push(j[i].map((k) => Rho160[k]));
  return res;
})();
var idxL = /* @__PURE__ */ (() => idxLR[0])();
var idxR = /* @__PURE__ */ (() => idxLR[1])();
var shifts160 = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((i) => Uint8Array.from(i));
var shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
var shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
var Kl160 = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]);
var Kr160 = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function ripemd_f(group2, x, y, z) {
  if (group2 === 0)
    return x ^ y ^ z;
  if (group2 === 1)
    return x & y | ~x & z;
  if (group2 === 2)
    return (x | ~y) ^ z;
  if (group2 === 3)
    return x & z | y & ~z;
  return x ^ (y | ~z);
}
var BUF_160 = /* @__PURE__ */ new Uint32Array(16);
var _RIPEMD160 = class extends HashMD {
  h0 = 1732584193 | 0;
  h1 = 4023233417 | 0;
  h2 = 2562383102 | 0;
  h3 = 271733878 | 0;
  h4 = 3285377520 | 0;
  constructor() {
    super(64, 20, 8, true);
  }
  get() {
    const { h0, h1, h2, h3, h4 } = this;
    return [h0, h1, h2, h3, h4];
  }
  set(h0, h1, h2, h3, h4) {
    this.h0 = h0 | 0;
    this.h1 = h1 | 0;
    this.h2 = h2 | 0;
    this.h3 = h3 | 0;
    this.h4 = h4 | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      BUF_160[i] = view.getUint32(offset, true);
    let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
    for (let group2 = 0; group2 < 5; group2++) {
      const rGroup = 4 - group2;
      const hbl = Kl160[group2], hbr = Kr160[group2];
      const rl = idxL[group2], rr = idxR[group2];
      const sl = shiftsL160[group2], sr = shiftsR160[group2];
      for (let i = 0; i < 16; i++) {
        const tl = rotl(al + ripemd_f(group2, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el | 0;
        al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl;
      }
      for (let i = 0; i < 16; i++) {
        const tr = rotl(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er | 0;
        ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr;
      }
    }
    this.set(this.h1 + cl + dr | 0, this.h2 + dl + er | 0, this.h3 + el + ar | 0, this.h4 + al + br | 0, this.h0 + bl + cr | 0);
  }
  roundClean() {
    clean(BUF_160);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0);
  }
};
var ripemd160 = /* @__PURE__ */ createHasher(() => new _RIPEMD160());

// node_modules/@noble/hashes/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

// node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
  constructor(outputLen) {
    super(64, outputLen, 8, false);
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var _SHA256 = class extends SHA2_32B {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = SHA256_IV[0] | 0;
  B = SHA256_IV[1] | 0;
  C = SHA256_IV[2] | 0;
  D = SHA256_IV[3] | 0;
  E = SHA256_IV[4] | 0;
  F = SHA256_IV[5] | 0;
  G = SHA256_IV[6] | 0;
  H = SHA256_IV[7] | 0;
  constructor() {
    super(32);
  }
};
var _SHA224 = class extends SHA2_32B {
  A = SHA224_IV[0] | 0;
  B = SHA224_IV[1] | 0;
  C = SHA224_IV[2] | 0;
  D = SHA224_IV[3] | 0;
  E = SHA224_IV[4] | 0;
  F = SHA224_IV[5] | 0;
  G = SHA224_IV[6] | 0;
  H = SHA224_IV[7] | 0;
  constructor() {
    super(28);
  }
};
var K512 = /* @__PURE__ */ (() => split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA2_64B = class extends HashMD {
  constructor(outputLen) {
    super(128, outputLen, 16, false);
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4) {
      SHA512_W_H[i] = view.getUint32(offset);
      SHA512_W_L[i] = view.getUint32(offset += 4);
    }
    for (let i = 16; i < 80; i++) {
      const W15h = SHA512_W_H[i - 15] | 0;
      const W15l = SHA512_W_L[i - 15] | 0;
      const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
      const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i - 2] | 0;
      const W2l = SHA512_W_L[i - 2] | 0;
      const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
      const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
      const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
      const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
      SHA512_W_H[i] = SUMh | 0;
      SHA512_W_L[i] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i = 0; i < 80; i++) {
      const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
      const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
      const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
      const T1l = T1ll | 0;
      const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
      const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = add3L(T1l, sigma0l, MAJl);
      Ah = add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    clean(SHA512_W_H, SHA512_W_L);
  }
  destroy() {
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var _SHA512 = class extends SHA2_64B {
  Ah = SHA512_IV[0] | 0;
  Al = SHA512_IV[1] | 0;
  Bh = SHA512_IV[2] | 0;
  Bl = SHA512_IV[3] | 0;
  Ch = SHA512_IV[4] | 0;
  Cl = SHA512_IV[5] | 0;
  Dh = SHA512_IV[6] | 0;
  Dl = SHA512_IV[7] | 0;
  Eh = SHA512_IV[8] | 0;
  El = SHA512_IV[9] | 0;
  Fh = SHA512_IV[10] | 0;
  Fl = SHA512_IV[11] | 0;
  Gh = SHA512_IV[12] | 0;
  Gl = SHA512_IV[13] | 0;
  Hh = SHA512_IV[14] | 0;
  Hl = SHA512_IV[15] | 0;
  constructor() {
    super(64);
  }
};
var _SHA384 = class extends SHA2_64B {
  Ah = SHA384_IV[0] | 0;
  Al = SHA384_IV[1] | 0;
  Bh = SHA384_IV[2] | 0;
  Bl = SHA384_IV[3] | 0;
  Ch = SHA384_IV[4] | 0;
  Cl = SHA384_IV[5] | 0;
  Dh = SHA384_IV[6] | 0;
  Dl = SHA384_IV[7] | 0;
  Eh = SHA384_IV[8] | 0;
  El = SHA384_IV[9] | 0;
  Fh = SHA384_IV[10] | 0;
  Fl = SHA384_IV[11] | 0;
  Gh = SHA384_IV[12] | 0;
  Gl = SHA384_IV[13] | 0;
  Hh = SHA384_IV[14] | 0;
  Hl = SHA384_IV[15] | 0;
  constructor() {
    super(48);
  }
};
var T224_IV = /* @__PURE__ */ Uint32Array.from([
  2352822216,
  424955298,
  1944164710,
  2312950998,
  502970286,
  855612546,
  1738396948,
  1479516111,
  258812777,
  2077511080,
  2011393907,
  79989058,
  1067287976,
  1780299464,
  286451373,
  2446758561
]);
var T256_IV = /* @__PURE__ */ Uint32Array.from([
  573645204,
  4230739756,
  2673172387,
  3360449730,
  596883563,
  1867755857,
  2520282905,
  1497426621,
  2519219938,
  2827943907,
  3193839141,
  1401305490,
  721525244,
  746961066,
  246885852,
  2177182882
]);
var _SHA512_224 = class extends SHA2_64B {
  Ah = T224_IV[0] | 0;
  Al = T224_IV[1] | 0;
  Bh = T224_IV[2] | 0;
  Bl = T224_IV[3] | 0;
  Ch = T224_IV[4] | 0;
  Cl = T224_IV[5] | 0;
  Dh = T224_IV[6] | 0;
  Dl = T224_IV[7] | 0;
  Eh = T224_IV[8] | 0;
  El = T224_IV[9] | 0;
  Fh = T224_IV[10] | 0;
  Fl = T224_IV[11] | 0;
  Gh = T224_IV[12] | 0;
  Gl = T224_IV[13] | 0;
  Hh = T224_IV[14] | 0;
  Hl = T224_IV[15] | 0;
  constructor() {
    super(28);
  }
};
var _SHA512_256 = class extends SHA2_64B {
  Ah = T256_IV[0] | 0;
  Al = T256_IV[1] | 0;
  Bh = T256_IV[2] | 0;
  Bl = T256_IV[3] | 0;
  Ch = T256_IV[4] | 0;
  Cl = T256_IV[5] | 0;
  Dh = T256_IV[6] | 0;
  Dl = T256_IV[7] | 0;
  Eh = T256_IV[8] | 0;
  El = T256_IV[9] | 0;
  Fh = T256_IV[10] | 0;
  Fl = T256_IV[11] | 0;
  Gh = T256_IV[12] | 0;
  Gl = T256_IV[13] | 0;
  Hh = T256_IV[14] | 0;
  Hl = T256_IV[15] | 0;
  constructor() {
    super(32);
  }
};
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);
var sha224 = /* @__PURE__ */ createHasher(
  () => new _SHA224(),
  /* @__PURE__ */ oidNist(4)
);
var sha512 = /* @__PURE__ */ createHasher(
  () => new _SHA512(),
  /* @__PURE__ */ oidNist(3)
);
var sha384 = /* @__PURE__ */ createHasher(
  () => new _SHA384(),
  /* @__PURE__ */ oidNist(2)
);
var sha512_256 = /* @__PURE__ */ createHasher(
  () => new _SHA512_256(),
  /* @__PURE__ */ oidNist(6)
);
var sha512_224 = /* @__PURE__ */ createHasher(
  () => new _SHA512_224(),
  /* @__PURE__ */ oidNist(5)
);

// node_modules/@noble/hashes/hmac.js
var _HMAC = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = false;
  destroyed = false;
  constructor(hash, key) {
    ahash(hash);
    abytes(key, void 0, "key");
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    abytes(out, this.outputLen, "output");
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = (hash, key, message) => new _HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new _HMAC(hash, key);

// src-js/core/php-builtin-common.js
var patterns = {
  ctype_alnum: /^[A-Za-z0-9]+$/,
  ctype_alpha: /^[A-Za-z]+$/,
  ctype_cntrl: /^[\x00-\x1f\x7f]+$/,
  ctype_digit: /^[0-9]+$/,
  ctype_graph: /^[\x21-\x7e]+$/,
  ctype_lower: /^[a-z]+$/,
  ctype_print: /^[\x20-\x7e]+$/,
  ctype_punct: /^[!-/:-@\[-`{-~]+$/,
  ctype_space: /^[\x09-\x0d ]+$/,
  ctype_upper: /^[A-Z]+$/,
  ctype_xdigit: /^[A-Fa-f0-9]+$/
};
var hashAlgorithms = Object.freeze({ md5, sha1, ripemd160, sha224, sha256, sha384, sha512, "sha512/224": sha512_224, "sha512/256": sha512_256 });
var runCommon = (name, items, context) => {
  const [a, b, c, d] = items.map((item) => item.value);
  if (Object.hasOwn(patterns, name)) {
    let value = a;
    if (typeof value !== "string") {
      warn(context, `${name}(): Non-string arguments are deprecated`, "PHP_DEPRECATED");
      if (items[0].kind !== "integer") return { value: false, kind: "boolean" };
      value = a >= -128 && a <= 255 ? String.fromCharCode(a & 255) : String(a);
    }
    bounded(value);
    work(context, value.length);
    return { value: value.match(patterns[name])?.[0] === value, kind: "boolean" };
  }
  if (name === "hash_algos" || name === "hash_hmac_algos") return { value: Object.keys(hashAlgorithms), kind: "array" };
  if (name === "hash_equals") {
    bounded(a);
    bounded(b);
    work(context, a.length + b.length);
    const left = bytes(a), right = bytes(b);
    if (left.length !== right.length) return { value: false, kind: "boolean" };
    let difference = 0;
    for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
    return { value: difference === 0, kind: "boolean" };
  }
  if (name !== "hash" && name !== "hash_hmac") return null;
  const algorithm = a.toLowerCase();
  if (!Object.hasOwn(hashAlgorithms, algorithm)) throw failure("ValueError", "Unsupported frontend hash algorithm: " + a);
  if (name === "hash" ? c : d) throw failure("ValueError", "Frontend hashes return hexadecimal text; binary output is not supported");
  bounded(b);
  if (name === "hash_hmac") bounded(c);
  const input = bytes(b), key = name === "hash_hmac" ? bytes(c) : null;
  work(context, input.length + (key?.length || 0) + 256);
  const digest = key ? hmac(hashAlgorithms[algorithm], key, input) : hashAlgorithms[algorithm](input);
  return { value: bytesToHex(digest), kind: "string" };
};

// src-js/core/php-random.js
var seed = (value, mode) => {
  const words = new Uint32Array(624);
  words[0] = Number(BigInt.asUintN(32, BigInt(value)));
  for (let i = 1; i < 624; i++) words[i] = Math.imul(1812433253, words[i - 1] ^ words[i - 1] >>> 30) + i >>> 0;
  return { words, index: 624, mode };
};
var next = (rng) => {
  const a = rng.words;
  if (rng.index === 624) {
    for (let i = 0; i < 624; i++) {
      const u = a[i], v = a[(i + 1) % 624], joined = u & 2147483648 | v & 2147483647;
      a[i] = (a[(i + 397) % 624] ^ joined >>> 1 ^ ((rng.mode === 1 ? u : v) & 1 ? 2567483615 : 0)) >>> 0;
    }
    rng.index = 0;
  }
  let x = a[rng.index++];
  x ^= x >>> 11;
  x ^= x << 7 & 2636928640;
  x ^= x << 15 & 4022730752;
  return (x ^ x >>> 18) >>> 0;
};
var freshSeed = () => {
  const word = new Uint32Array(1);
  globalThis.crypto.getRandomValues(word);
  return word[0];
};
var runRandom = (name, items, context) => {
  if (!["rand", "mt_rand", "srand", "mt_srand", "getrandmax", "mt_getrandmax"].includes(name)) return null;
  if (name.endsWith("getrandmax")) return { value: 2147483647, kind: "integer" };
  if (context.readOnly) throw new Error("Random state requires a frontend event");
  const memory = context.builtinMemory ||= {};
  if (name.endsWith("srand")) {
    const mode = items[1].value === 1 ? 1 : 0;
    if (mode === 1 && (context.source?.phpVersion ?? 80400) >= 80300) warn(context, "The MT_RAND_PHP variant of Mt19937 is deprecated", "PHP_DEPRECATED");
    memory.mt = seed(items[0].value ?? freshSeed(), mode);
    return { value: null, kind: "NULL" };
  }
  const rng = memory.mt ||= seed(freshSeed(), 0);
  work(context);
  if (!items.some((i) => i.provided)) return { value: next(rng) >>> 1, kind: "integer" };
  if (!items[0].provided || !items[1].provided) throw failure("ArgumentCountError", name + "() expects exactly 2 arguments, 1 given");
  let min = items[0].value, max = items[1].value;
  if (max < min) {
    if (name === "mt_rand") throw failure("ValueError", "mt_rand(): Argument #2 ($max) must be greater than or equal to argument #1 ($min)");
    [min, max] = [max, min];
  }
  if (rng.mode === 1) return { value: min + Math.floor((max - min + 1) * ((next(rng) >>> 1) / 2147483648)), kind: "integer" };
  const width = BigInt(max) - BigInt(min) + 1n, bits = width > 4294967296n ? 64n : 32n, space = 1n << bits, ceiling = space - space % width;
  for (let i = 0; i < 100; i++) {
    let n = BigInt(next(rng));
    if (bits === 64n) n |= BigInt(next(rng)) << 32n;
    if (n < ceiling) return { value: Number(BigInt(min) + n % width), kind: "integer" };
    work(context);
  }
  throw failure("Random\\BrokenRandomEngineError", "Unable to generate an unbiased random integer");
};

// src-js/core/builtin-signatures.json
var builtin_signatures_default = {
  ctype_alnum: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_alpha: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_cntrl: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_graph: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_lower: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_print: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_punct: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_space: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_upper: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  ctype_xdigit: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  hash: [
    {
      name: "algo",
      types: "string"
    },
    {
      name: "data",
      types: "string"
    },
    {
      name: "binary",
      types: "bool",
      default: false
    },
    {
      name: "options",
      types: "array",
      default: []
    }
  ],
  hash_hmac: [
    {
      name: "algo",
      types: "string"
    },
    {
      name: "data",
      types: "string"
    },
    {
      name: "key",
      types: "string"
    },
    {
      name: "binary",
      types: "bool",
      default: false
    }
  ],
  hash_equals: [
    {
      name: "known_string",
      types: "string"
    },
    {
      name: "user_string",
      types: "string"
    }
  ],
  hash_algos: [],
  hash_hmac_algos: [],
  is_callable: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "syntax_only",
      types: "bool",
      default: false
    },
    {
      name: "callable_name",
      types: "mixed",
      default: null,
      reference: true
    }
  ],
  function_exists: [
    {
      name: "function",
      types: "string"
    }
  ],
  call_user_func: [
    {
      name: "callback",
      types: "callable"
    },
    {
      name: "args",
      types: "mixed",
      variadic: true
    }
  ],
  call_user_func_array: [
    {
      name: "callback",
      types: "callable"
    },
    {
      name: "args",
      types: "array"
    }
  ],
  filter_var: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "filter",
      types: "int",
      default: 516
    },
    {
      name: "options",
      types: "array|int",
      default: 0
    }
  ],
  filter_var_array: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "options",
      types: "array|int",
      default: 516
    },
    {
      name: "add_empty",
      types: "bool",
      default: true
    }
  ],
  get_debug_type: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  settype: [
    {
      name: "var",
      types: "mixed",
      reference: true
    },
    {
      name: "type",
      types: "string"
    }
  ],
  get_defined_vars: [],
  compact: [
    {
      name: "var_name",
      types: "mixed"
    },
    {
      name: "var_names",
      types: "mixed",
      variadic: true
    }
  ],
  extract: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    },
    {
      name: "prefix",
      types: "string",
      default: ""
    }
  ],
  rand: [
    {
      name: "min",
      types: "int",
      optional: true
    },
    {
      name: "max",
      types: "int",
      optional: true
    }
  ],
  mt_rand: [
    {
      name: "min",
      types: "int",
      optional: true
    },
    {
      name: "max",
      types: "int",
      optional: true
    }
  ],
  srand: [
    {
      name: "seed",
      types: "?int",
      default: null
    },
    {
      name: "mode",
      types: "int",
      default: 0
    }
  ],
  mt_srand: [
    {
      name: "seed",
      types: "?int",
      default: null
    },
    {
      name: "mode",
      types: "int",
      default: 0
    }
  ],
  getrandmax: [],
  mt_getrandmax: [],
  preg_replace_callback_array: [
    {
      name: "pattern",
      types: "array"
    },
    {
      name: "subject",
      types: "array|string"
    },
    {
      name: "limit",
      types: "int",
      default: -1
    },
    {
      name: "count",
      types: "mixed",
      default: null,
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  serialize: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  unserialize: [
    {
      name: "data",
      types: "string"
    },
    {
      name: "options",
      types: "array",
      default: []
    }
  ],
  is_object: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  get_class: [
    {
      name: "object",
      types: "object",
      optional: true
    }
  ],
  get_parent_class: [
    {
      name: "object_or_class",
      types: "object|string",
      optional: true
    }
  ],
  get_called_class: [],
  class_exists: [
    {
      name: "class",
      types: "string"
    },
    {
      name: "autoload",
      types: "bool",
      default: true
    }
  ],
  enum_exists: [
    {
      name: "enum",
      types: "string"
    },
    {
      name: "autoload",
      types: "bool",
      default: true
    }
  ],
  interface_exists: [
    {
      name: "interface",
      types: "string"
    },
    {
      name: "autoload",
      types: "bool",
      default: true
    }
  ],
  method_exists: [
    {
      name: "object_or_class",
      types: "mixed"
    },
    {
      name: "method",
      types: "string"
    }
  ],
  property_exists: [
    {
      name: "object_or_class",
      types: "mixed"
    },
    {
      name: "property",
      types: "string"
    }
  ],
  is_a: [
    {
      name: "object_or_class",
      types: "mixed"
    },
    {
      name: "class",
      types: "string"
    },
    {
      name: "allow_string",
      types: "bool",
      default: false
    }
  ],
  is_subclass_of: [
    {
      name: "object_or_class",
      types: "mixed"
    },
    {
      name: "class",
      types: "string"
    },
    {
      name: "allow_string",
      types: "bool",
      default: true
    }
  ],
  get_object_vars: [
    {
      name: "object",
      types: "object"
    }
  ],
  get_class_methods: [
    {
      name: "object_or_class",
      types: "object|string"
    }
  ],
  parse_url: [
    {
      name: "url",
      types: "string"
    },
    {
      name: "component",
      types: "int",
      default: -1
    }
  ],
  http_build_query: [
    {
      name: "data",
      types: "object|array"
    },
    {
      name: "numeric_prefix",
      types: "string",
      default: ""
    },
    {
      name: "arg_separator",
      types: "?string",
      default: null
    },
    {
      name: "encoding_type",
      types: "int",
      default: 1
    }
  ],
  urlencode: [
    {
      name: "string",
      types: "string"
    }
  ],
  urldecode: [
    {
      name: "string",
      types: "string"
    }
  ],
  rawurlencode: [
    {
      name: "string",
      types: "string"
    }
  ],
  rawurldecode: [
    {
      name: "string",
      types: "string"
    }
  ],
  base64_encode: [
    {
      name: "string",
      types: "string"
    }
  ],
  base64_decode: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "strict",
      types: "bool",
      default: false
    }
  ],
  grapheme_strlen: [
    {
      name: "string",
      types: "string"
    }
  ],
  grapheme_substr: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "offset",
      types: "int"
    },
    {
      name: "length",
      types: "?int",
      default: null
    }
  ],
  grapheme_str_split: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "length",
      types: "int",
      default: 1
    }
  ],
  grapheme_strpos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  grapheme_stripos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  grapheme_strrpos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  grapheme_strripos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  grapheme_strstr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "beforeNeedle",
      types: "bool",
      default: false
    }
  ],
  grapheme_stristr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "beforeNeedle",
      types: "bool",
      default: false
    }
  ],
  grapheme_extract: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "size",
      types: "int"
    },
    {
      name: "type",
      types: "int",
      default: 0
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "next",
      types: "mixed",
      default: null,
      reference: true
    }
  ],
  numfmt_create: [
    {
      name: "locale",
      types: "string"
    },
    {
      name: "style",
      types: "int"
    },
    {
      name: "pattern",
      types: "?string",
      default: null
    }
  ],
  numfmt_format: [
    {
      name: "formatter",
      types: "NumberFormatter"
    },
    {
      name: "num",
      types: "int|float"
    },
    {
      name: "type",
      types: "int",
      default: 0
    }
  ],
  numfmt_format_currency: [
    {
      name: "formatter",
      types: "NumberFormatter"
    },
    {
      name: "amount",
      types: "float"
    },
    {
      name: "currency",
      types: "string"
    }
  ],
  numfmt_get_attribute: [
    {
      name: "formatter",
      types: "NumberFormatter"
    },
    {
      name: "attribute",
      types: "int"
    }
  ],
  numfmt_set_attribute: [
    {
      name: "formatter",
      types: "NumberFormatter"
    },
    {
      name: "attribute",
      types: "int"
    },
    {
      name: "value",
      types: "int|float"
    }
  ],
  numfmt_get_text_attribute: [
    {
      name: "formatter",
      types: "NumberFormatter"
    },
    {
      name: "attribute",
      types: "int"
    }
  ],
  numfmt_set_text_attribute: [
    {
      name: "formatter",
      types: "NumberFormatter"
    },
    {
      name: "attribute",
      types: "int"
    },
    {
      name: "value",
      types: "string"
    }
  ],
  normalizer_normalize: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "form",
      types: "int",
      default: 16
    }
  ],
  normalizer_is_normalized: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "form",
      types: "int",
      default: 16
    }
  ],
  normalizer_get_raw_decomposition: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "form",
      types: "int",
      default: 16
    }
  ],
  func_get_args: [],
  func_num_args: [],
  func_get_arg: [
    {
      name: "position",
      types: "int"
    }
  ],
  iterator_to_array: [
    {
      name: "iterator",
      types: "Traversable|array"
    },
    {
      name: "preserve_keys",
      types: "bool",
      default: true
    }
  ],
  iterator_count: [
    {
      name: "iterator",
      types: "Traversable|array"
    }
  ],
  iterator_apply: [
    {
      name: "iterator",
      types: "Traversable"
    },
    {
      name: "callback",
      types: "callable"
    },
    {
      name: "args",
      types: "?array",
      default: null
    }
  ],
  json_encode: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "flags",
      types: "int",
      default: 0
    },
    {
      name: "depth",
      types: "int",
      default: 512
    }
  ],
  json_decode: [
    {
      name: "json",
      types: "string"
    },
    {
      name: "associative",
      types: "?bool",
      default: null
    },
    {
      name: "depth",
      types: "int",
      default: 512
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  json_validate: [
    {
      name: "json",
      types: "string"
    },
    {
      name: "depth",
      types: "int",
      default: 512
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  json_last_error: [],
  json_last_error_msg: [],
  preg_match: [
    {
      name: "pattern",
      types: "string"
    },
    {
      name: "subject",
      types: "string"
    },
    {
      name: "matches",
      types: "mixed",
      default: null,
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  preg_match_all: [
    {
      name: "pattern",
      types: "string"
    },
    {
      name: "subject",
      types: "string"
    },
    {
      name: "matches",
      types: "mixed",
      default: null,
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  preg_replace: [
    {
      name: "pattern",
      types: "array|string"
    },
    {
      name: "replacement",
      types: "array|string"
    },
    {
      name: "subject",
      types: "array|string"
    },
    {
      name: "limit",
      types: "int",
      default: -1
    },
    {
      name: "count",
      types: "mixed",
      default: null,
      reference: true
    }
  ],
  preg_replace_callback: [
    {
      name: "pattern",
      types: "array|string"
    },
    {
      name: "callback",
      types: "callable"
    },
    {
      name: "subject",
      types: "array|string"
    },
    {
      name: "limit",
      types: "int",
      default: -1
    },
    {
      name: "count",
      types: "mixed",
      default: null,
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  preg_filter: [
    {
      name: "pattern",
      types: "array|string"
    },
    {
      name: "replacement",
      types: "array|string"
    },
    {
      name: "subject",
      types: "array|string"
    },
    {
      name: "limit",
      types: "int",
      default: -1
    },
    {
      name: "count",
      types: "mixed",
      default: null,
      reference: true
    }
  ],
  preg_split: [
    {
      name: "pattern",
      types: "string"
    },
    {
      name: "subject",
      types: "string"
    },
    {
      name: "limit",
      types: "int",
      default: -1
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  preg_grep: [
    {
      name: "pattern",
      types: "string"
    },
    {
      name: "array",
      types: "array"
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  preg_quote: [
    {
      name: "str",
      types: "string"
    },
    {
      name: "delimiter",
      types: "?string",
      default: null
    }
  ],
  preg_last_error: [],
  preg_last_error_msg: [],
  time: [],
  microtime: [
    {
      name: "as_float",
      types: "bool",
      default: false
    }
  ],
  date: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "timestamp",
      types: "?int",
      default: null
    }
  ],
  gmdate: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "timestamp",
      types: "?int",
      default: null
    }
  ],
  strtotime: [
    {
      name: "datetime",
      types: "string"
    },
    {
      name: "baseTimestamp",
      types: "?int",
      default: null
    }
  ],
  mktime: [
    {
      name: "hour",
      types: "int"
    },
    {
      name: "minute",
      types: "?int",
      default: null
    },
    {
      name: "second",
      types: "?int",
      default: null
    },
    {
      name: "month",
      types: "?int",
      default: null
    },
    {
      name: "day",
      types: "?int",
      default: null
    },
    {
      name: "year",
      types: "?int",
      default: null
    }
  ],
  gmmktime: [
    {
      name: "hour",
      types: "int"
    },
    {
      name: "minute",
      types: "?int",
      default: null
    },
    {
      name: "second",
      types: "?int",
      default: null
    },
    {
      name: "month",
      types: "?int",
      default: null
    },
    {
      name: "day",
      types: "?int",
      default: null
    },
    {
      name: "year",
      types: "?int",
      default: null
    }
  ],
  checkdate: [
    {
      name: "month",
      types: "int"
    },
    {
      name: "day",
      types: "int"
    },
    {
      name: "year",
      types: "int"
    }
  ],
  getdate: [
    {
      name: "timestamp",
      types: "?int",
      default: null
    }
  ],
  date_default_timezone_get: [],
  date_default_timezone_set: [
    {
      name: "timezoneId",
      types: "string"
    }
  ],
  date_create: [
    {
      name: "datetime",
      types: "string",
      default: "now"
    },
    {
      name: "timezone",
      types: "?DateTimeZone",
      default: null
    }
  ],
  date_create_immutable: [
    {
      name: "datetime",
      types: "string",
      default: "now"
    },
    {
      name: "timezone",
      types: "?DateTimeZone",
      default: null
    }
  ],
  date_format: [
    {
      name: "object",
      types: "DateTimeInterface"
    },
    {
      name: "format",
      types: "string"
    }
  ],
  date_timestamp_get: [
    {
      name: "object",
      types: "DateTimeInterface"
    }
  ],
  date_timestamp_set: [
    {
      name: "object",
      types: "DateTime"
    },
    {
      name: "timestamp",
      types: "int"
    }
  ],
  date_modify: [
    {
      name: "object",
      types: "DateTime"
    },
    {
      name: "modifier",
      types: "string"
    }
  ],
  date_timezone_get: [
    {
      name: "object",
      types: "DateTimeInterface"
    }
  ],
  date_timezone_set: [
    {
      name: "object",
      types: "DateTime"
    },
    {
      name: "timezone",
      types: "DateTimeZone"
    }
  ],
  timezone_open: [
    {
      name: "timezone",
      types: "string"
    }
  ],
  timezone_name_get: [
    {
      name: "object",
      types: "DateTimeZone"
    }
  ],
  timezone_offset_get: [
    {
      name: "object",
      types: "DateTimeZone"
    },
    {
      name: "datetime",
      types: "DateTimeInterface"
    }
  ],
  date_create_from_format: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "datetime",
      types: "string"
    },
    {
      name: "timezone",
      types: "?DateTimeZone",
      default: null
    }
  ],
  date_create_immutable_from_format: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "datetime",
      types: "string"
    },
    {
      name: "timezone",
      types: "?DateTimeZone",
      default: null
    }
  ],
  date_get_last_errors: [],
  date_diff: [
    {
      name: "baseObject",
      types: "DateTimeInterface"
    },
    {
      name: "targetObject",
      types: "DateTimeInterface"
    },
    {
      name: "absolute",
      types: "bool",
      default: false
    }
  ],
  date_add: [
    {
      name: "object",
      types: "DateTime"
    },
    {
      name: "interval",
      types: "DateInterval"
    }
  ],
  date_sub: [
    {
      name: "object",
      types: "DateTime"
    },
    {
      name: "interval",
      types: "DateInterval"
    }
  ],
  date_interval_format: [
    {
      name: "object",
      types: "DateInterval"
    },
    {
      name: "format",
      types: "string"
    }
  ],
  strlen: [
    {
      name: "string",
      types: "string"
    }
  ],
  str_contains: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    }
  ],
  str_starts_with: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    }
  ],
  str_ends_with: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    }
  ],
  substr: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "offset",
      types: "int"
    },
    {
      name: "length",
      types: "?int",
      default: null
    }
  ],
  str_replace: [
    {
      name: "search",
      types: "array|string"
    },
    {
      name: "replace",
      types: "array|string"
    },
    {
      name: "subject",
      types: "array|string"
    },
    {
      name: "count",
      types: "mixed",
      default: null,
      reference: true
    }
  ],
  explode: [
    {
      name: "separator",
      types: "string"
    },
    {
      name: "string",
      types: "string"
    },
    {
      name: "limit",
      types: "int",
      default: 9007199254740991
    }
  ],
  implode: [
    {
      name: "separator",
      types: "array|string"
    },
    {
      name: "array",
      types: "?array",
      default: null
    }
  ],
  strtolower: [
    {
      name: "string",
      types: "string"
    }
  ],
  strtoupper: [
    {
      name: "string",
      types: "string"
    }
  ],
  ucfirst: [
    {
      name: "string",
      types: "string"
    }
  ],
  lcfirst: [
    {
      name: "string",
      types: "string"
    }
  ],
  ucwords: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "separators",
      types: "string",
      default: " 	\r\n\f\v"
    }
  ],
  trim: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string",
      default: " \n\r	\v\0"
    }
  ],
  ltrim: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string",
      default: " \n\r	\v\0"
    }
  ],
  rtrim: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string",
      default: " \n\r	\v\0"
    }
  ],
  is_numeric: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  ctype_digit: [
    {
      name: "text",
      types: "mixed"
    }
  ],
  abs: [
    {
      name: "num",
      types: "int|float"
    }
  ],
  ceil: [
    {
      name: "num",
      types: "int|float"
    }
  ],
  floor: [
    {
      name: "num",
      types: "int|float"
    }
  ],
  round: [
    {
      name: "num",
      types: "int|float"
    },
    {
      name: "precision",
      types: "int",
      default: 0
    },
    {
      name: "mode",
      types: "int",
      default: 1
    }
  ],
  intdiv: [
    {
      name: "num1",
      types: "int"
    },
    {
      name: "num2",
      types: "int"
    }
  ],
  random_int: [
    {
      name: "min",
      types: "int"
    },
    {
      name: "max",
      types: "int"
    }
  ],
  number_format: [
    {
      name: "num",
      types: "float"
    },
    {
      name: "decimals",
      types: "int",
      default: 0
    },
    {
      name: "decimal_separator",
      types: "?string",
      default: "."
    },
    {
      name: "thousands_separator",
      types: "?string",
      default: ","
    }
  ],
  acos: [
    {
      name: "num",
      types: "float"
    }
  ],
  acosh: [
    {
      name: "num",
      types: "float"
    }
  ],
  asin: [
    {
      name: "num",
      types: "float"
    }
  ],
  asinh: [
    {
      name: "num",
      types: "float"
    }
  ],
  atan: [
    {
      name: "num",
      types: "float"
    }
  ],
  atan2: [
    {
      name: "y",
      types: "float"
    },
    {
      name: "x",
      types: "float"
    }
  ],
  atanh: [
    {
      name: "num",
      types: "float"
    }
  ],
  base_convert: [
    {
      name: "num",
      types: "string"
    },
    {
      name: "from_base",
      types: "int"
    },
    {
      name: "to_base",
      types: "int"
    }
  ],
  bindec: [
    {
      name: "binary_string",
      types: "string"
    }
  ],
  cos: [
    {
      name: "num",
      types: "float"
    }
  ],
  cosh: [
    {
      name: "num",
      types: "float"
    }
  ],
  decbin: [
    {
      name: "num",
      types: "int"
    }
  ],
  dechex: [
    {
      name: "num",
      types: "int"
    }
  ],
  decoct: [
    {
      name: "num",
      types: "int"
    }
  ],
  deg2rad: [
    {
      name: "num",
      types: "float"
    }
  ],
  exp: [
    {
      name: "num",
      types: "float"
    }
  ],
  expm1: [
    {
      name: "num",
      types: "float"
    }
  ],
  fdiv: [
    {
      name: "num1",
      types: "float"
    },
    {
      name: "num2",
      types: "float"
    }
  ],
  fmod: [
    {
      name: "num1",
      types: "float"
    },
    {
      name: "num2",
      types: "float"
    }
  ],
  fpow: [
    {
      name: "num",
      types: "float"
    },
    {
      name: "exponent",
      types: "float"
    }
  ],
  hexdec: [
    {
      name: "hex_string",
      types: "string"
    }
  ],
  hypot: [
    {
      name: "x",
      types: "float"
    },
    {
      name: "y",
      types: "float"
    }
  ],
  is_finite: [
    {
      name: "num",
      types: "float"
    }
  ],
  is_infinite: [
    {
      name: "num",
      types: "float"
    }
  ],
  is_nan: [
    {
      name: "num",
      types: "float"
    }
  ],
  log: [
    {
      name: "num",
      types: "float"
    },
    {
      name: "base",
      types: "float",
      default: 2.718281828459045
    }
  ],
  log10: [
    {
      name: "num",
      types: "float"
    }
  ],
  log1p: [
    {
      name: "num",
      types: "float"
    }
  ],
  max: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "values",
      types: "mixed",
      variadic: true
    }
  ],
  min: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "values",
      types: "mixed",
      variadic: true
    }
  ],
  octdec: [
    {
      name: "octal_string",
      types: "string"
    }
  ],
  pi: [],
  pow: [
    {
      name: "num",
      types: "mixed"
    },
    {
      name: "exponent",
      types: "mixed"
    }
  ],
  rad2deg: [
    {
      name: "num",
      types: "float"
    }
  ],
  sin: [
    {
      name: "num",
      types: "float"
    }
  ],
  sinh: [
    {
      name: "num",
      types: "float"
    }
  ],
  sqrt: [
    {
      name: "num",
      types: "float"
    }
  ],
  tan: [
    {
      name: "num",
      types: "float"
    }
  ],
  tanh: [
    {
      name: "num",
      types: "float"
    }
  ],
  addcslashes: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string"
    }
  ],
  addslashes: [
    {
      name: "string",
      types: "string"
    }
  ],
  bin2hex: [
    {
      name: "string",
      types: "string"
    }
  ],
  chop: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string",
      default: " \n\r	\v\0"
    }
  ],
  chr: [
    {
      name: "codepoint",
      types: "int"
    }
  ],
  chunk_split: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "length",
      types: "int",
      default: 76
    },
    {
      name: "separator",
      types: "string",
      default: "\r\n"
    }
  ],
  convert_uudecode: [
    {
      name: "string",
      types: "string"
    }
  ],
  convert_uuencode: [
    {
      name: "string",
      types: "string"
    }
  ],
  count_chars: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "mode",
      types: "int",
      default: 0
    }
  ],
  crc32: [
    {
      name: "string",
      types: "string"
    }
  ],
  get_html_translation_table: [
    {
      name: "table",
      types: "int",
      default: 0
    },
    {
      name: "flags",
      types: "int",
      default: 11
    },
    {
      name: "encoding",
      types: "string",
      default: "UTF-8"
    }
  ],
  hex2bin: [
    {
      name: "string",
      types: "string"
    }
  ],
  html_entity_decode: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "flags",
      types: "int",
      default: 11
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  htmlentities: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "flags",
      types: "int",
      default: 11
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    },
    {
      name: "double_encode",
      types: "bool",
      default: true
    }
  ],
  htmlspecialchars: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "flags",
      types: "int",
      default: 11
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    },
    {
      name: "double_encode",
      types: "bool",
      default: true
    }
  ],
  htmlspecialchars_decode: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "flags",
      types: "int",
      default: 11
    }
  ],
  join: [
    {
      name: "separator",
      types: "array|string"
    },
    {
      name: "array",
      types: "?array",
      default: null
    }
  ],
  levenshtein: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    },
    {
      name: "insertion_cost",
      types: "int",
      default: 1
    },
    {
      name: "replacement_cost",
      types: "int",
      default: 1
    },
    {
      name: "deletion_cost",
      types: "int",
      default: 1
    }
  ],
  md5: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "binary",
      types: "bool",
      default: false
    }
  ],
  metaphone: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "max_phonemes",
      types: "int",
      default: 0
    }
  ],
  nl2br: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "use_xhtml",
      types: "bool",
      default: true
    }
  ],
  ord: [
    {
      name: "character",
      types: "string"
    }
  ],
  parse_str: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "result",
      types: "mixed",
      reference: true
    }
  ],
  printf: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "values",
      types: "mixed",
      variadic: true
    }
  ],
  quoted_printable_decode: [
    {
      name: "string",
      types: "string"
    }
  ],
  quoted_printable_encode: [
    {
      name: "string",
      types: "string"
    }
  ],
  quotemeta: [
    {
      name: "string",
      types: "string"
    }
  ],
  sha1: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "binary",
      types: "bool",
      default: false
    }
  ],
  similar_text: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    },
    {
      name: "percent",
      types: "mixed",
      default: null,
      reference: true
    }
  ],
  soundex: [
    {
      name: "string",
      types: "string"
    }
  ],
  sprintf: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "values",
      types: "mixed",
      variadic: true
    }
  ],
  sscanf: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "format",
      types: "string"
    },
    {
      name: "vars",
      types: "mixed",
      variadic: true,
      reference: true
    }
  ],
  str_decrement: [
    {
      name: "string",
      types: "string"
    }
  ],
  str_getcsv: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "separator",
      types: "string",
      default: ","
    },
    {
      name: "enclosure",
      types: "string",
      default: '"'
    },
    {
      name: "escape",
      types: "string",
      default: "\\"
    }
  ],
  str_increment: [
    {
      name: "string",
      types: "string"
    }
  ],
  str_ireplace: [
    {
      name: "search",
      types: "array|string"
    },
    {
      name: "replace",
      types: "array|string"
    },
    {
      name: "subject",
      types: "array|string"
    },
    {
      name: "count",
      types: "mixed",
      default: null,
      reference: true
    }
  ],
  str_pad: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "length",
      types: "int"
    },
    {
      name: "pad_string",
      types: "string",
      default: " "
    },
    {
      name: "pad_type",
      types: "int",
      default: 1
    }
  ],
  str_repeat: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "times",
      types: "int"
    }
  ],
  str_rot13: [
    {
      name: "string",
      types: "string"
    }
  ],
  str_shuffle: [
    {
      name: "string",
      types: "string"
    }
  ],
  str_split: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "length",
      types: "int",
      default: 1
    }
  ],
  str_word_count: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "format",
      types: "int",
      default: 0
    },
    {
      name: "characters",
      types: "?string",
      default: null
    }
  ],
  strcasecmp: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    }
  ],
  strchr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    }
  ],
  strcmp: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    }
  ],
  strcspn: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "length",
      types: "?int",
      default: null
    }
  ],
  strip_tags: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "allowed_tags",
      types: "array|string|null",
      default: null
    }
  ],
  stripcslashes: [
    {
      name: "string",
      types: "string"
    }
  ],
  stripos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  stripslashes: [
    {
      name: "string",
      types: "string"
    }
  ],
  stristr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    }
  ],
  strnatcasecmp: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    }
  ],
  strnatcmp: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    }
  ],
  strncasecmp: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    },
    {
      name: "length",
      types: "int"
    }
  ],
  strncmp: [
    {
      name: "string1",
      types: "string"
    },
    {
      name: "string2",
      types: "string"
    },
    {
      name: "length",
      types: "int"
    }
  ],
  strpbrk: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string"
    }
  ],
  strpos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  strrchr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    }
  ],
  strrev: [
    {
      name: "string",
      types: "string"
    }
  ],
  strripos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  strrpos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    }
  ],
  strspn: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "length",
      types: "?int",
      default: null
    }
  ],
  strstr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    }
  ],
  strtok: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "token",
      types: "?string",
      default: null
    }
  ],
  strtr: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "from",
      types: "array|string"
    },
    {
      name: "to",
      types: "?string",
      default: null
    }
  ],
  substr_compare: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int"
    },
    {
      name: "length",
      types: "?int",
      default: null
    },
    {
      name: "case_insensitive",
      types: "bool",
      default: false
    }
  ],
  substr_count: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "length",
      types: "?int",
      default: null
    }
  ],
  substr_replace: [
    {
      name: "string",
      types: "array|string"
    },
    {
      name: "replace",
      types: "array|string"
    },
    {
      name: "offset",
      types: "array|int"
    },
    {
      name: "length",
      types: "array|int|null",
      default: null
    }
  ],
  vprintf: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "values",
      types: "array"
    }
  ],
  vsprintf: [
    {
      name: "format",
      types: "string"
    },
    {
      name: "values",
      types: "array"
    }
  ],
  wordwrap: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "width",
      types: "int",
      default: 75
    },
    {
      name: "break",
      types: "string",
      default: "\n"
    },
    {
      name: "cut_long_words",
      types: "bool",
      default: false
    }
  ],
  array_all: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "callback",
      types: "callable"
    }
  ],
  array_any: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "callback",
      types: "callable"
    }
  ],
  array_change_key_case: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "case",
      types: "int",
      default: 0
    }
  ],
  array_chunk: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "length",
      types: "int"
    },
    {
      name: "preserve_keys",
      types: "bool",
      default: false
    }
  ],
  array_column: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "column_key",
      types: "string|int|null"
    },
    {
      name: "index_key",
      types: "string|int|null",
      default: null
    }
  ],
  array_combine: [
    {
      name: "keys",
      types: "array"
    },
    {
      name: "values",
      types: "array"
    }
  ],
  array_count_values: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_diff: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_diff_assoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_diff_key: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_diff_uassoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_diff_ukey: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_fill: [
    {
      name: "start_index",
      types: "int"
    },
    {
      name: "count",
      types: "int"
    },
    {
      name: "value",
      types: "mixed"
    }
  ],
  array_fill_keys: [
    {
      name: "keys",
      types: "array"
    },
    {
      name: "value",
      types: "mixed"
    }
  ],
  array_filter: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "callback",
      types: "?callable",
      default: null
    },
    {
      name: "mode",
      types: "int",
      default: 0
    }
  ],
  array_find: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "callback",
      types: "callable"
    }
  ],
  array_find_key: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "callback",
      types: "callable"
    }
  ],
  array_flip: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_intersect: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_intersect_assoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_intersect_key: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_intersect_uassoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_intersect_ukey: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_is_list: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_key_exists: [
    {
      name: "key",
      types: "mixed"
    },
    {
      name: "array",
      types: "array"
    }
  ],
  array_key_first: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_key_last: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_keys: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "filter_value",
      types: "mixed",
      optional: true
    },
    {
      name: "strict",
      types: "bool",
      default: false
    }
  ],
  array_map: [
    {
      name: "callback",
      types: "?callable"
    },
    {
      name: "array",
      types: "array"
    },
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_merge: [
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_merge_recursive: [
    {
      name: "arrays",
      types: "array",
      variadic: true
    }
  ],
  array_multisort: [
    {
      name: "array",
      types: "mixed",
      reference: true
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true,
      reference: true
    }
  ],
  array_pad: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "length",
      types: "int"
    },
    {
      name: "value",
      types: "mixed"
    }
  ],
  array_pop: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  array_product: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_push: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "values",
      types: "mixed",
      variadic: true
    }
  ],
  array_rand: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "num",
      types: "int",
      default: 1
    }
  ],
  array_reduce: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "callback",
      types: "callable"
    },
    {
      name: "initial",
      types: "mixed",
      default: null
    }
  ],
  array_replace: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "replacements",
      types: "array",
      variadic: true
    }
  ],
  array_replace_recursive: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "replacements",
      types: "array",
      variadic: true
    }
  ],
  array_reverse: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "preserve_keys",
      types: "bool",
      default: false
    }
  ],
  array_search: [
    {
      name: "needle",
      types: "mixed"
    },
    {
      name: "haystack",
      types: "array"
    },
    {
      name: "strict",
      types: "bool",
      default: false
    }
  ],
  array_shift: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  array_slice: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "offset",
      types: "int"
    },
    {
      name: "length",
      types: "?int",
      default: null
    },
    {
      name: "preserve_keys",
      types: "bool",
      default: false
    }
  ],
  array_splice: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "offset",
      types: "int"
    },
    {
      name: "length",
      types: "?int",
      default: null
    },
    {
      name: "replacement",
      types: "mixed",
      default: []
    }
  ],
  array_sum: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_udiff: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_udiff_assoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_udiff_uassoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_uintersect: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_uintersect_assoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_uintersect_uassoc: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "rest",
      types: "mixed",
      variadic: true
    }
  ],
  array_unique: [
    {
      name: "array",
      types: "array"
    },
    {
      name: "flags",
      types: "int",
      default: 2
    }
  ],
  array_unshift: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "values",
      types: "mixed",
      variadic: true
    }
  ],
  array_values: [
    {
      name: "array",
      types: "array"
    }
  ],
  array_walk: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "callback",
      types: "callable"
    },
    {
      name: "arg",
      types: "mixed",
      optional: true
    }
  ],
  array_walk_recursive: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "callback",
      types: "callable"
    },
    {
      name: "arg",
      types: "mixed",
      optional: true
    }
  ],
  arsort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  asort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  count: [
    {
      name: "value",
      types: "Countable|array"
    },
    {
      name: "mode",
      types: "int",
      default: 0
    }
  ],
  current: [
    {
      name: "array",
      types: "array"
    }
  ],
  end: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  in_array: [
    {
      name: "needle",
      types: "mixed"
    },
    {
      name: "haystack",
      types: "array"
    },
    {
      name: "strict",
      types: "bool",
      default: false
    }
  ],
  key: [
    {
      name: "array",
      types: "array"
    }
  ],
  key_exists: [
    {
      name: "key",
      types: "mixed"
    },
    {
      name: "array",
      types: "array"
    }
  ],
  krsort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  ksort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  natcasesort: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  natsort: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  next: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  pos: [
    {
      name: "array",
      types: "array"
    }
  ],
  prev: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  range: [
    {
      name: "start",
      types: "string|int|float"
    },
    {
      name: "end",
      types: "string|int|float"
    },
    {
      name: "step",
      types: "int|float",
      default: 1
    }
  ],
  reset: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  rsort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  shuffle: [
    {
      name: "array",
      types: "array",
      reference: true
    }
  ],
  sizeof: [
    {
      name: "value",
      types: "Countable|array"
    },
    {
      name: "mode",
      types: "int",
      default: 0
    }
  ],
  sort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "flags",
      types: "int",
      default: 0
    }
  ],
  uasort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "callback",
      types: "callable"
    }
  ],
  uksort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "callback",
      types: "callable"
    }
  ],
  usort: [
    {
      name: "array",
      types: "array",
      reference: true
    },
    {
      name: "callback",
      types: "callable"
    }
  ],
  print_r: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "return",
      types: "bool",
      default: false
    }
  ],
  var_export: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "return",
      types: "bool",
      default: false
    }
  ],
  gettype: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  intval: [
    {
      name: "value",
      types: "mixed"
    },
    {
      name: "base",
      types: "int",
      default: 10
    }
  ],
  floatval: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  doubleval: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  strval: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  boolval: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_array: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_bool: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_float: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_double: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_int: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_integer: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_long: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_null: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_scalar: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_string: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_countable: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  is_iterable: [
    {
      name: "value",
      types: "mixed"
    }
  ],
  mb_strlen: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_substr: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "start",
      types: "int"
    },
    {
      name: "length",
      types: "?int",
      default: null
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strpos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strrpos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_stripos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strripos: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "offset",
      types: "int",
      default: 0
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strstr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_stristr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strrchr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strrichr: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "before_needle",
      types: "bool",
      default: false
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_substr_count: [
    {
      name: "haystack",
      types: "string"
    },
    {
      name: "needle",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strtolower: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strtoupper: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_convert_case: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "mode",
      types: "int"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_str_split: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "length",
      types: "int",
      default: 1
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strcut: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "start",
      types: "int"
    },
    {
      name: "length",
      types: "?int",
      default: null
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strwidth: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_strimwidth: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "start",
      types: "int"
    },
    {
      name: "width",
      types: "int"
    },
    {
      name: "trim_marker",
      types: "string",
      default: ""
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_ord: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_chr: [
    {
      name: "codepoint",
      types: "int"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_check_encoding: [
    {
      name: "value",
      types: "array|string|null",
      default: null
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_scrub: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_str_pad: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "length",
      types: "int"
    },
    {
      name: "pad_string",
      types: "string",
      default: " "
    },
    {
      name: "pad_type",
      types: "int",
      default: 1
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_ucfirst: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_lcfirst: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_trim: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "?string",
      default: null
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_ltrim: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "?string",
      default: null
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  mb_rtrim: [
    {
      name: "string",
      types: "string"
    },
    {
      name: "characters",
      types: "?string",
      default: null
    },
    {
      name: "encoding",
      types: "?string",
      default: null
    }
  ],
  bcadd: [
    {
      name: "num1",
      types: "string"
    },
    {
      name: "num2",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcsub: [
    {
      name: "num1",
      types: "string"
    },
    {
      name: "num2",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcmul: [
    {
      name: "num1",
      types: "string"
    },
    {
      name: "num2",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcdiv: [
    {
      name: "num1",
      types: "string"
    },
    {
      name: "num2",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcmod: [
    {
      name: "num1",
      types: "string"
    },
    {
      name: "num2",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcdivmod: [
    {
      name: "num1",
      types: "string"
    },
    {
      name: "num2",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcpowmod: [
    {
      name: "num",
      types: "string"
    },
    {
      name: "exponent",
      types: "string"
    },
    {
      name: "modulus",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcpow: [
    {
      name: "num",
      types: "string"
    },
    {
      name: "exponent",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcsqrt: [
    {
      name: "num",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bccomp: [
    {
      name: "num1",
      types: "string"
    },
    {
      name: "num2",
      types: "string"
    },
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcscale: [
    {
      name: "scale",
      types: "?int",
      default: null
    }
  ],
  bcfloor: [
    {
      name: "num",
      types: "string"
    }
  ],
  bcceil: [
    {
      name: "num",
      types: "string"
    }
  ],
  bcround: [
    {
      name: "num",
      types: "string"
    },
    {
      name: "precision",
      types: "int",
      default: 0
    },
    {
      name: "mode",
      types: "RoundingMode",
      default: {
        roundingMode: "HalfAwayFromZero"
      }
    }
  ]
};

// src-js/core/php-filter.js
var scalar = 33554432;
var required = 16777216;
var force = 67108864;
var nullable = 134217728;
var failed = /* @__PURE__ */ Symbol("filter failure");
var specific = { 257: 3, 258: 0, 259: 8192, 272: 0, 273: 786432, 274: 1048576, 275: 15728640, 276: 0, 277: 1048576, 514: 60, 515: 60, 516: 380, 517: 0, 518: 0, 519: 0, 520: 28672, 522: 128, 523: 0, 1024: 0 };
var unsupported = (message) => failure("ValueError", "Frontend filter_var(): " + message);
var trim = (value) => value.replace(/^[\x09-\x0d ]+|[\x09-\x0d ]+$/g, "");
var ipv4 = (value) => /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) && value.split(".").every((n) => Number(n) <= 255);
var ipv6 = (value) => {
  if (!value.includes(":") || /[^\da-fA-F:.]/.test(value)) return null;
  if (value.includes(".")) {
    const at = value.lastIndexOf(":"), tail = value.slice(at + 1);
    if (!ipv4(tail)) return null;
    const n = tail.split(".").map(Number);
    value = value.slice(0, at + 1) + ((n[0] << 8) + n[1]).toString(16) + ":" + ((n[2] << 8) + n[3]).toString(16);
  }
  const pieces = value.split("::");
  if (pieces.length > 2) return null;
  const left = pieces[0] ? pieces[0].split(":") : [], right = pieces[1] ? pieces[1].split(":") : [];
  if ([...left, ...right].some((n) => !/^[\da-fA-F]{1,4}$/.test(n)) || pieces.length === 1 && left.length !== 8 || pieces.length === 2 && left.length + right.length >= 8) return null;
  return [...left.map((n) => parseInt(n, 16)), ...Array(pieces.length === 2 ? 8 - left.length - right.length : 0).fill(0), ...right.map((n) => parseInt(n, 16))];
};
var domain = (value, host) => {
  if (!value || bytes(value).length > 253) return false;
  const labels = value.replace(/\.$/, "").split(".");
  return labels.every((part) => part.length > 0 && bytes(part).length <= 63 && (!host || /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(part)));
};
var validEmail = (value, flags) => {
  if (bytes(value).length > 254 || /[\x00-\x20\x7f]/.test(value) || !(flags & 1048576) && /[^\x00-\x7f]/.test(value)) return false;
  const at = value.lastIndexOf("@");
  if (at < 1 || bytes(value.slice(0, at)).length > 64) return false;
  const local = value.slice(0, at), host = value.slice(at + 1);
  if (!(local.startsWith('"') && local.endsWith('"') ? /^"(?:[^"\\\x00-\x20\x7f]|\\[\x21-\x7e])*"$/.test(local) : /^[a-z0-9!#$%&'*+/=?^_`{|}~\x80-\uffff-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~\x80-\uffff-]+)*$/i.test(local))) return false;
  if (host[0] === "[" && host.at(-1) === "]") {
    const address = host.slice(1, -1);
    return ipv4(address) || !!ipv6(address.replace(/^IPv6:/i, ""));
  }
  return domain(host, true) && host.includes(".") && !/^\d+$/.test(host.split(".").at(-1)) && !host.endsWith(".");
};
var validUrl = (value, flags) => {
  if (/[^\x00-\x7f]/.test(value)) return false;
  if (/^mailto:[^@]+@[^@]+$/i.test(value)) return !(flags & 262144) && !(flags & 524288);
  if (/^news:[^\s]+$/i.test(value)) return !(flags & 262144) && !(flags & 524288);
  const match = value.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i);
  if (!match || /[\x00-\x20\x7f]/.test(value)) return false;
  let authority = match[2];
  const at = authority.lastIndexOf("@");
  if (at >= 0) {
    if (!/^[a-z0-9._~!$&'()*+,;=:%-]+$/i.test(authority.slice(0, at))) return false;
    authority = authority.slice(at + 1);
  }
  let host, port;
  if (authority[0] === "[") {
    const close = authority.indexOf("]");
    if (close < 0 || !ipv6(authority.slice(1, close))) return false;
    host = authority.slice(0, close + 1);
    if (authority.length > close + 1) {
      if (authority[close + 1] !== ":") return false;
      port = authority.slice(close + 2);
    }
  } else {
    const parts = authority.split(":");
    if (parts.length > 2) return false;
    [host, port] = parts;
    if (host && !domain(host, true)) return false;
  }
  if (!host && match[1].toLowerCase() !== "file" || port !== void 0 && (!/^\d+$/.test(port) || Number(port) > 65535)) return false;
  return (!(flags & 262144) || !!match[3]) && (!(flags & 524288) || match[4] !== void 0);
};
var runFilter = (items, context, invoke, builtin) => {
  const [input, filter, configuration] = items.map((item) => item.value);
  if (!Object.hasOwn(specific, filter)) throw unsupported("unsupported or deprecated filter");
  const flags = isPhpArray(configuration) ? configuration.flags ?? 0 : configuration;
  if (!Number.isInteger(flags) || flags & ~(scalar | required | force | nullable | specific[filter])) throw unsupported("unsupported flags");
  const options = isPhpArray(configuration) ? configuration.options ?? makeArray() : makeArray();
  if (filter !== 1024 && !isPhpArray(options)) throw unsupported("options must be an array");
  for (const key of ["min_range", "max_range"]) if (filter !== 1024 && options[key] != null && (typeof options[key] !== "number" || Math.abs(options[key]) > Number.MAX_SAFE_INTEGER)) throw limit("Frontend filter_var(): range options exceed exact numeric precision");
  if (filter === 259 && options.decimal != null && (typeof options.decimal !== "string" || bytes(options.decimal).length !== 1)) throw unsupported("decimal must be one byte");
  if (filter === 259 && options.thousand != null) throw unsupported("custom thousand separators are not supported");
  const fallback = () => filter !== 1024 && Object.hasOwn(options, "default") ? clonePhp(options.default) : flags & nullable ? null : false;
  let returnedKind = null;
  const single = (value2, kind2) => {
    if (typeof value2 === "function" || isPhpObject(value2) && !magicMember(objectData(value2).definition.name, "__tostring", context)) return failed;
    const text3 = phpString(value2, kind2, context);
    if (bytes(text3).length > 1048576) throw limit("Frontend filter_var(): input exceeds 1 MiB");
    work(context, text3.length);
    const raw = trim(text3);
    if (filter === 1024) {
      const result = invoke(options, [{ value: text3, kind: "string" }], true);
      returnedKind = result.kind;
      return result.value;
    }
    if (filter === 272) {
      if (typeof options.regexp !== "string") throw failure("ValueError", 'filter_var(): "regexp" option is missing');
      const memory = context.builtinMemory ||= {}, previous = memory.pregError;
      try {
        const match = builtin("preg_match", [{ value: options.regexp, kind: "string" }, { value: text3, kind: "string" }]);
        return match.value === 1 ? text3 : failed;
      } finally {
        memory.pregError = previous;
      }
    }
    if (filter === 257) {
      let value3;
      if (flags & 2 && /^0x[\da-f]+$/i.test(raw)) value3 = BigInt(raw);
      else if (flags & 1 && /^0(?:o)?[0-7]*$/i.test(raw)) {
        const digits = raw.replace(/^0o?/i, "");
        value3 = BigInt("0o" + (digits || "0"));
      } else if (/^[+-]?(?:0|[1-9]\d*)$/.test(raw)) value3 = BigInt(raw);
      else return failed;
      if (value3 < -9223372036854775808n || value3 > 18446744073709551615n || !(flags & 3) && value3 > 9223372036854775807n) return failed;
      if (value3 > 9223372036854775807n) value3 -= 18446744073709551616n;
      if (options.min_range != null && value3 < BigInt(Math.trunc(options.min_range)) || options.max_range != null && value3 > BigInt(Math.trunc(options.max_range))) return failed;
      if (value3 < -9007199254740991n || value3 > 9007199254740991n) throw limit("Frontend filter_var(): integer exceeds exact numeric precision");
      return Number(value3);
    }
    if (filter === 258) {
      const value3 = raw.toLowerCase();
      return ["1", "true", "on", "yes"].includes(value3) ? true : ["", "0", "false", "off", "no"].includes(value3) ? false : failed;
    }
    if (filter === 259) {
      let number = raw;
      const decimal = options.decimal ?? ".";
      if (decimal !== ".") {
        if (number.includes(".")) return failed;
        number = number.replace(decimal, ".");
      }
      if (flags & 8192 && /[,' ]/.test(number)) {
        if (!/^[+-]?\d{1,3}(?:([,'])\d{3})(?:\1\d{3})*(?:\.\d*)?(?:e[+-]?\d+)?$/i.test(number)) return failed;
        number = number.replace(/[,' ]/g, "");
      }
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(number)) return failed;
      const value3 = Number(number);
      if (!Number.isFinite(value3) || /e-/i.test(number) && value3 === 0 || options.min_range != null && value3 < options.min_range || options.max_range != null && value3 > options.max_range) return failed;
      returnedKind = "double";
      return value3;
    }
    if (filter === 274) return validEmail(text3, flags) ? text3 : failed;
    if (filter === 273) return validUrl(text3, flags) ? text3 : failed;
    if (filter === 277) return domain(text3, flags & 1048576) ? text3 : failed;
    if (filter === 276) return /^(?:[\da-f]{2}([:-]))(?:[\da-f]{2}\1){4}[\da-f]{2}$/i.test(text3) || /^(?:[\da-f]{4}\.){2}[\da-f]{4}$/i.test(text3) ? text3 : failed;
    if (filter === 275) {
      const v4 = ipv4(text3), v6 = ipv6(text3);
      if (!v4 && !v6 || flags & 1048576 && !v4 || flags & 2097152 && !v6) return failed;
      if (v4) {
        const [a, b] = text3.split(".").map(Number);
        if (flags & 8388608 && (a === 10 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168) || flags & 4194304 && (a === 0 || a === 127 || a === 169 && b === 254 || a >= 240)) return failed;
      } else if (flags & 8388608 && (v6[0] & 65024) === 64512 || flags & 4194304 && (text3.includes(".") || v6.slice(0, 5).every((n) => n === 0) && v6[5] === 65535 || v6.slice(0, 7).every((n) => n === 0) && v6[7] <= 1 || (v6[0] & 65472) === 65152)) return failed;
      return text3;
    }
    let rawBytes = byteString(text3);
    if (flags & 4) rawBytes = rawBytes.replace(/[\x00-\x1f]/g, "");
    if (flags & 8) rawBytes = rawBytes.replace(/[\x7f-\xff]/g, "");
    if (filter === 517) return text3.replace(/[^a-z0-9!#$%&'*+\-/=?^_`{|}~@.\[\]]/gi, "");
    if (filter === 518) return text3.replace(/[^a-z0-9$\-_.+!*'(),{}|\\^~\[\]`<>#%";/?:@&=]/gi, "");
    if (filter === 519) return text3.replace(/[^0-9+-]/g, "");
    if (filter === 520) return [...text3].filter((c) => /[0-9+-]/.test(c) || c === "." && flags & 4096 || c === "," && flags & 8192 || /[eE]/.test(c) && flags & 16384).join("");
    if (filter === 523) return builtin("addslashes", [{ value: text3, kind: "string" }]).value;
    if (filter === 522) return builtin("htmlentities", [{ value: text3, kind: "string" }, { value: flags & 128 ? 0 : 3, kind: "integer" }, { value: "UTF-8", kind: "string" }, { value: false, kind: "boolean" }]).value;
    if (filter === 514) return [...rawBytes].map((c) => /[a-z0-9_.-]/i.test(c) ? c : "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")).join("");
    rawBytes = [...rawBytes].map((c) => {
      const n = c.charCodeAt(0);
      return filter === 515 && (`<>&"'`.includes(c) || n < 32) || flags & 16 && n < 32 || flags & 32 && n >= 127 || flags & 64 && c === "&" ? `&#${n};` : c;
    }).join("");
    const output = fromByteString(rawBytes);
    return filter === 516 && flags & 256 && output === "" ? null : output;
  };
  const failureResult = () => {
    const value2 = fallback();
    return { value: value2, kind: filter !== 1024 && Object.hasOwn(options, "default") ? arrayKind(options, "default") : phpType(value2) };
  };
  const walk = (value2, kind2, depth = 0) => {
    if (depth > 64) throw limit("Frontend filter_var(): arrays exceed 64 levels");
    if (isPhpArray(value2)) {
      const entries = arrayEntries(value2);
      if (entries.length > 1e4) throw limit("Frontend filter_var(): arrays exceed 10000 entries");
      const types = /* @__PURE__ */ new Map();
      return { value: makeArray(entries.map(([key, item]) => {
        const next2 = walk(item, arrayKind(value2, key), depth + 1);
        types.set(key, next2.kind);
        return [key, next2.value];
      }), types), kind: "array" };
    }
    returnedKind = null;
    const out = single(value2, kind2);
    return out === failed ? failureResult() : { value: out, kind: returnedKind || phpType(out) };
  };
  if (isPhpArray(input) && (!(flags & (required | force)) || flags & scalar) || !isPhpArray(input) && flags & required) return failureResult();
  const { value, kind } = walk(input, items[0].kind);
  if (!isPhpArray(input) && flags & force) return { value: makeArray([[0, value]], /* @__PURE__ */ new Map([[0, kind]])), kind: "array" };
  return { value, kind };
};
var runFilterArray = (items, context, invoke, builtin) => {
  const [input, options, addEmpty] = items.map((item) => item.value), result = [], kinds = /* @__PURE__ */ new Map();
  const fields = isPhpArray(options) ? arrayEntries(options) : arrayEntries(input).map(([key]) => [key, options]);
  for (const [key, option] of fields) {
    work(context);
    if (isPhpArray(options) && typeof key !== "string") throw new TypeError("filter_var_array(): options must contain only string keys");
    if (isPhpArray(options) && key === "") throw failure("ValueError", "filter_var_array(): options cannot contain empty keys");
    if (!Object.hasOwn(input, key)) {
      if (addEmpty) {
        result.push([key, null]);
        kinds.set(key, "NULL");
      }
      continue;
    }
    const filter = isPhpArray(option) ? Object.hasOwn(option, "filter") ? phpInt(option.filter) : 516 : option == null ? 516 : phpInt(option);
    const next2 = runFilter([{ value: input[key], kind: arrayKind(input, key) }, { value: filter, kind: "integer" }, { value: isPhpArray(option) ? option : 0, kind: isPhpArray(option) ? "array" : "integer" }], context, invoke, builtin);
    result.push([key, next2.value]);
    kinds.set(key, next2.kind);
  }
  return { value: makeArray(result, kinds), kind: "array" };
};

// src-js/core/php-builtin-utility.js
var utilityNames = ["is_callable", "function_exists", "call_user_func", "call_user_func_array", "filter_var", "filter_var_array"];
var normalized = (name) => name.replace(/^\\/, "").toLowerCase();
var functionExists = (name, context) => builtinNames.includes(normalized(name)) || Object.values(context.functions || {}).some((fn) => normalized(fn.name) === normalized(name) && !name.includes("::") && !name.includes("{") && (fn.declared || context.functionDeclarations?.has(normalized(name))));
var callableName = (value, context) => {
  if (typeof value === "function") return "Closure::__invoke";
  if (isPhpObject(value)) return objectData(value).definition.name + "::__invoke";
  if (value instanceof Error) return value.name + "::__invoke";
  if (isPhpArray(value)) return arrayEntries(value).length === 2 && Object.hasOwn(value, 0) && (typeof value[0] === "string" || isPhpObject(value[0])) && typeof value[1] === "string" ? (isPhpObject(value[0]) ? objectData(value[0]).definition.name : value[0]) + "::" + value[1] : "Array";
  return phpString(value, phpType(value), context);
};
var invokeUtilityCallback = (callback, args, state, context) => {
  if (!isFrontendCallable(callback, context)) throw new TypeError("Expected an accessible compiled frontend callable");
  const definition = typeof callback === "string" && builtinNames.includes(normalized(callback)) ? { builtin: normalized(callback) } : callableDefinition(methodCallable(callback, context) || callback, context);
  const parameters = definition.builtin ? builtin_signatures_default[definition.builtin] : definition.parameters || [];
  const items = args.map((argument, index) => {
    const parameter = (argument.name === void 0 ? parameters[index] : parameters.find((p) => p.name === argument.name)) || parameters.find((p) => p.variadic);
    if (parameter?.reference && !argument.ref) {
      warn(context, "Callback argument must be passed by reference, value given");
      return { ...argument, ref: createReference({ value: argument.value, kind: argument.kind }) };
    }
    return argument;
  });
  return invokeFunction(callback, items, state, context);
};
var runUtility = (name, items, state, context) => {
  if (!utilityNames.includes(name)) return null;
  const [a, b] = items.map((item2) => item2.value), result = (value, kind = phpType(value)) => ({ value, kind });
  if (name === "function_exists") return result(functionExists(a, context));
  if (name === "is_callable") {
    const label = callableName(a, context);
    items[2]?.ref?.set(label, "string");
    return result(b ? typeof a === "string" || isPhpArray(a) && label !== "Array" || phpType(a) === "object" && isFrontendCallable(a, context) : isFrontendCallable(a, context));
  }
  if (name === "filter_var" || name === "filter_var_array") return (name === "filter_var" ? runFilter : runFilterArray)(items, context, (callback, args2, weak = false) => invokeUtilityCallback(callback, args2, state, weak ? { ...context, source: { ...context.source, strictTypes: false } } : context), (name2, args2) => invokeBuiltin(name2, args2, state, context));
  const args = name === "call_user_func" ? items.slice(1).map(({ ref, ...item2 }) => item2) : arrayEntries(b).map(([key, value]) => ({ value, kind: arrayKind(b, key), ...typeof key === "string" ? { name: key } : {}, ref: arrayElementReference(b, key) }));
  const item = invokeUtilityCallback(a, args, state, { ...context, source: { ...context.source, strictTypes: context.source?.callbackStrictTypes ?? false, callbackStrictTypes: false, callbackDirect: false } });
  return context.source?.callbackDirect ? item : { value: item.value, kind: item.kind };
};

// src-js/core/php-builtin-math.js
var unary = Object.fromEntries(["acos", "acosh", "asin", "asinh", "atan", "atanh", "cos", "cosh", "exp", "expm1", "log10", "log1p", "sin", "sinh", "sqrt", "tan", "tanh"].map((name) => [name, Math[name]]));
var baseNumber = (input, base, context) => {
  input = input.trim().toLowerCase();
  if (base === 16 && input.startsWith("0x") || base === 2 && input.startsWith("0b") || base === 8 && input.startsWith("0o")) input = input.slice(2);
  let value = 0n, invalid = false;
  for (const char of input) {
    const digit = "0123456789abcdefghijklmnopqrstuvwxyz".indexOf(char);
    if (digit < 0 || digit >= base) {
      invalid = true;
      continue;
    }
    value = value * BigInt(base) + BigInt(digit);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw limit("Base conversion exceeds the frontend safe integer range");
  }
  if (invalid) warn(context, "Invalid characters passed for attempted conversion, these have been ignored", "PHP_DEPRECATED");
  return Number(value);
};
var runMath = (name, items, context) => {
  const [a, b, c] = items.map((item) => item.value);
  const floating = (value) => ({ value, kind: "double" });
  if (Object.hasOwn(unary, name)) return floating(unary[name](a));
  if (name === "atan2") return floating(Math.atan2(a, b));
  if (name === "hypot") return floating(Math.hypot(a, b));
  if (name === "deg2rad") return floating(a * (Math.PI / 180));
  if (name === "rad2deg") return floating(a * (180 / Math.PI));
  if (name === "pi") return floating(Math.PI);
  if (name === "log") {
    if (b <= 0) throw failure("ValueError", "log(): base must be greater than 0");
    return floating(b === Math.E ? Math.log(a) : Math.log(a) / Math.log(b));
  }
  if (name === "fdiv") return floating(a / b);
  if (name === "fmod") return floating(a % b);
  if (name === "pow" || name === "fpow") {
    const base = phpNumber(a, context), exponent = phpNumber(b, context);
    const floating2 = name === "fpow" || items.some((item) => item.kind === "double" || hasFloatNumericPrefix(item.value)) || exponent < 0;
    const value = base === 1 || base === -1 && !Number.isFinite(exponent) && !Number.isNaN(exponent) ? 1 : base ** exponent;
    if (!floating2 && exponent >= 0 && exponent <= 63 && Number.isFinite(value) && !Number.isSafeInteger(value)) {
      const exact = BigInt(base) ** BigInt(exponent);
      if (exact >= -9223372036854775808n && exact <= 9223372036854775807n) throw limit("pow(): integer result exceeds frontend safe precision");
    }
    return { value, kind: !floating2 && Number.isSafeInteger(value) ? "integer" : "double" };
  }
  if (name === "is_finite") return { value: Number.isFinite(a), kind: "boolean" };
  if (name === "is_infinite") return { value: a === Infinity || a === -Infinity, kind: "boolean" };
  if (name === "is_nan") return { value: Number.isNaN(a), kind: "boolean" };
  if (["min", "max"].includes(name)) {
    const list = items.length === 1 ? isPhpArray(a) ? arrayEntries(a).map(([key, value]) => ({ value, kind: arrayKind(a, key) })) : null : items;
    if (!list) throw new TypeError(`${name}(): a single argument must be an array`);
    if (!list.length) throw failure("ValueError", `${name}(): array must not be empty`);
    return list.reduce((best, item) => phpCompare(item.value, best.value, item.kind, best.kind) * (name === "max" ? 1 : -1) > 0 ? item : best);
  }
  if (["decbin", "dechex", "decoct"].includes(name)) return { value: BigInt.asUintN(64, BigInt(a)).toString({ decbin: 2, dechex: 16, decoct: 8 }[name]), kind: "string" };
  if (["bindec", "hexdec", "octdec"].includes(name)) return { value: baseNumber(a, { bindec: 2, hexdec: 16, octdec: 8 }[name], context), kind: "integer" };
  if (name === "base_convert") {
    if (b < 2 || b > 36 || c < 2 || c > 36) throw failure("ValueError", "base_convert(): bases must be between 2 and 36");
    return { value: baseNumber(a, b, context).toString(c), kind: "string" };
  }
  return null;
};

// phpaml-proxy:php-builtin-grapheme.js
var runGrapheme = (...args) => moduleExport("unicode", "runGrapheme", true)?.(...args) ?? null;

// phpaml-proxy:php-date-advanced.js
var advancedDateEntries = (...args) => moduleExport("date", "advancedDateEntries", true)?.(...args) ?? null;
var advancedDateProperty = (...args) => moduleExport("date", "advancedDateProperty", true)?.(...args) ?? null;

// src-js/core/php-builtin-objects.js
var introspectionNames = ["is_object", "get_class", "get_parent_class", "get_called_class", "class_exists", "enum_exists", "interface_exists", "method_exists", "property_exists", "is_a", "is_subclass_of", "get_object_vars", "get_class_methods"];
var normalized2 = (name) => name.replace(/^\\/, "").toLowerCase();
var definitionOf = (name, context) => typeof name === "string" && Object.hasOwn(context.classes || {}, normalized2(name)) ? context.classes[normalized2(name)] : typeof name === "string" && normalized2(name) === "generator" ? generatorDefinition(context.source?.phpVersion) : typeof name === "string" && normalized2(name) === "stdclass" ? stdClassDefinition() : dateDefinition(name);
var lineage = (definition, context) => {
  const result = [];
  while (definition) {
    result.push(definition);
    definition = definitionOf(definition.parent, context);
  }
  return result;
};
var nameOf = (value) => isPhpObject(value) ? objectData(value).definition.name : value instanceof Error ? exceptionClass(value) : typeof value === "function" ? "Closure" : isRoundingMode(value) ? "RoundingMode" : value;
var runObjects = (name, items, context) => {
  if (!introspectionNames.includes(name)) return null;
  if (context.readOnly && name !== "is_object") throw new Error("Use object introspection in an event, then display its result through State");
  const [a, b, c] = items.map((item) => item.value), result = (value, kind = phpType(value)) => ({ value, kind });
  if (["method_exists", "property_exists"].includes(name) && phpType(a) !== "object" && typeof a !== "string") throw new TypeError(`${name}(): expected object|string`);
  if (name === "is_object") return result(phpType(a) === "object");
  if (name === "get_class" && items[0].provided) return result(nameOf(a));
  if (name === "get_called_class") {
    if (!context.calledClass) throw new Error("get_called_class() must be called from within a class");
    return result(context.calledClass);
  }
  if ((name === "get_class" || name === "get_parent_class") && !items[0].provided) {
    if (name === "get_class" && !context.objectScope) throw new Error("get_class() without arguments must be called from within a class");
    if ((context.source?.phpVersion ?? 80400) >= 80300) warn(context, `Calling ${name}() without arguments is deprecated`, "PHP_DEPRECATED");
    if (name === "get_class") {
      if (!context.objectScope) throw new Error("get_class() without arguments must be called from within a class");
      return result(context.objectScope);
    }
    return result(definitionOf(context.objectScope, context)?.parent || false);
  }
  const definition = definitionOf(nameOf(a), context);
  if (name === "enum_exists") return result(!!definition?.enum);
  if (name === "class_exists") return result(!!definition && !definition.interface);
  if (name === "interface_exists") return result(!!definition?.interface);
  if (name === "is_a" || name === "is_subclass_of") {
    if (typeof a === "string" && !c) return result(false);
    if (a instanceof Error) return result(exceptionIs(a, b) && (name === "is_a" || normalized2(exceptionClass(a)) !== normalized2(b)));
    if (typeof a === "function") return result(name === "is_a" && normalized2(b) === "closure");
    if (isRoundingMode(a)) return result(normalized2(b) === "unitenum" || name === "is_a" && normalized2(b) === "roundingmode");
    return result(!!definition && (name === "is_a" ? [definition.name, ...definition.ancestors] : definition.ancestors).some((part) => normalized2(part) === normalized2(definitionOf(b, context)?.name || b)));
  }
  if (!definition) {
    if (phpType(a) === "object") throw new TypeError(`${name}(): member introspection requires a compiled service object`);
    if (name === "method_exists" || name === "property_exists") return result(false);
    throw new TypeError(`${name}(): expected an object or a compiled class name`);
  }
  if (name === "get_parent_class") return result(definition.parent || false);
  if (name === "property_exists" && definition.name === "DateInterval" && b === "from_string") return result(!!dateStorage.get(a)?.inspected);
  if (definition.name === "stdClass" && name === "property_exists") return result(isPhpObject(a) && objectData(a).fields.has(b));
  if (name === "get_object_vars" && advancedDateEntries(a, context)) {
    const fields2 = advancedDateEntries(a, context);
    return result(makeArray(fields2.map(([key, item]) => [key, clonePhp(item.value)]), new Map(fields2.map(([key, item]) => [key, item.kind]))), "array");
  }
  if (definition.name === "stdClass" && name === "get_object_vars") return result(makeArray([...objectData(a).fields].map(([key, item]) => [key, clonePhp(item.value)]), new Map([...objectData(a).fields].map(([key, item]) => [key, item.kind]))), "array");
  const chain = lineage(definition, context);
  if (name === "method_exists" || name === "property_exists") {
    const tables = name === "method_exists" ? ["methods"] : ["properties", "staticProperties"], key = name === "method_exists" ? b.toLowerCase() : b;
    for (const [index, entry] of chain.entries()) for (const table of tables) if (Object.hasOwn(entry[table] || {}, key)) {
      return result(index === 0 || entry[table][key].visibility !== "private" || name === "method_exists" && isPhpObject(a));
    }
    return result(false);
  }
  if (name === "get_class_methods") {
    const methods = /* @__PURE__ */ new Map();
    for (const entry of chain) for (const [key, member] of Object.entries(entry.methods)) if (!methods.has(key)) methods.set(key, member);
    const order = new Set(chain.flatMap((entry) => entry.methodOrder || Object.keys(entry.methods)));
    return result([...order].map((key) => methods.get(key)).filter((member) => member && objectMemberAccessible(member, context)).map((member) => member.name), "array");
  }
  const properties = /* @__PURE__ */ new Map(), fields = objectData(a).fields, entries = [];
  for (const entry of chain.toReversed()) for (const property of Object.values(entry.properties)) properties.set(property.visibility === "private" ? property.owner + "::$" + property.name : property.name, property);
  for (const [key, property] of properties) {
    const scoped = definitionOf(context.objectScope, context)?.properties?.[property.name];
    if (scoped?.visibility === "private" && chain.some((entry) => normalized2(entry.name) === normalized2(scoped.owner)) && key !== scoped.owner + "::$" + scoped.name) continue;
    if (objectMemberAccessible(property, context) && fields.has(key)) {
      const item = fields.get(key);
      entries.push([property.name, clonePhp(item.value), item.kind]);
    }
  }
  return result(makeArray(entries), "array");
};

// src-js/core/php-builtin-web.js
var webNames = ["parse_url", "http_build_query", "urlencode", "urldecode", "rawurlencode", "rawurldecode", "base64_encode", "base64_decode"];
var encode = (value, raw) => [...bytes(value)].map((n) => n >= 65 && n <= 90 || n >= 97 && n <= 122 || n >= 48 && n <= 57 || [45, 46, 95].includes(n) || raw && n === 126 ? String.fromCharCode(n) : !raw && n === 32 ? "+" : "%" + n.toString(16).toUpperCase().padStart(2, "0")).join("");
var decode = (value, raw) => {
  const input = bytes(value), output = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === 37 && i + 2 < input.length && /^[\da-f]{2}$/i.test(String.fromCharCode(input[i + 1], input[i + 2]))) {
      output.push(parseInt(String.fromCharCode(input[i + 1], input[i + 2]), 16));
      i += 2;
    } else output.push(!raw && input[i] === 43 ? 32 : input[i]);
  }
  return text(Uint8Array.from(output));
};
var base64 = (value, strict) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  if (strict) {
    const stripped = value.replace(/[\t\n\r ]/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(stripped)) return false;
    const first = stripped.indexOf("="), size = first < 0 ? stripped.length : first;
    if (size % 4 === 1 || first >= 0 && (stripped.length % 4 !== 0 || size % 4 === 0)) return false;
  }
  let buffer = 0, bits = 0;
  const output = [];
  for (const char of value) {
    const n = alphabet.indexOf(char);
    if (n < 0) continue;
    buffer = buffer << 6 | n;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push(buffer >> bits & 255);
    }
  }
  return text(Uint8Array.from(output));
};
var parseUrl = (input) => {
  const out = {}, clean2 = (value) => value.replace(/[\x00-\x1f\x7f]/g, "_");
  let rest = input, authority = false;
  const colon = rest.indexOf(":"), scheme = colon > 0 && /^[a-z0-9+.-]+$/i.test(rest.slice(0, colon));
  const portLike = colon >= 0 && /^\d{1,5}(?:\/|$)/.test(rest.slice(colon + 1));
  if (scheme && !portLike) {
    out.scheme = clean2(rest.slice(0, colon));
    rest = rest.slice(colon + 1);
    if (rest.startsWith("//")) {
      authority = true;
      rest = rest.slice(2);
    }
  } else if (portLike) authority = true;
  else if (rest.startsWith("//")) {
    authority = true;
    rest = rest.slice(2);
  }
  if (authority) {
    const end = rest.search(/[/?#]/), hostPart = end < 0 ? rest : rest.slice(0, end);
    rest = end < 0 ? "" : rest.slice(end);
    let host = hostPart;
    const at = host.lastIndexOf("@");
    if (at >= 0) {
      const credentials = host.slice(0, at), separator = credentials.indexOf(":");
      out.user = clean2(separator < 0 ? credentials : credentials.slice(0, separator));
      if (separator >= 0) out.pass = clean2(credentials.slice(separator + 1));
      host = host.slice(at + 1);
    }
    const close = host.indexOf("]"), portAt = host[0] === "[" && close >= 0 ? host[close + 1] === ":" ? close + 1 : -1 : host.lastIndexOf(":");
    if (portAt >= 0) {
      const raw = host.slice(portAt + 1);
      if (raw !== "" && (!/^\d{1,5}$/.test(raw) || Number(raw) > 65535)) return false;
      if (raw !== "") out.port = Number(raw);
      host = host.slice(0, portAt);
    }
    if (host === "" && (out.scheme || "").toLowerCase() !== "file") return false;
    if (host !== "") out.host = clean2(host);
    if ((out.scheme || "").toLowerCase() === "file" && /^\/[a-z]:/i.test(rest)) rest = rest.slice(1);
  }
  const fragment = rest.indexOf("#");
  if (fragment >= 0) {
    out.fragment = clean2(rest.slice(fragment + 1));
    rest = rest.slice(0, fragment);
  }
  const query = rest.indexOf("?");
  if (query >= 0) {
    out.query = clean2(rest.slice(query + 1));
    rest = rest.slice(0, query);
  }
  if (rest !== "" || !authority && !Object.hasOwn(out, "scheme") && !Object.hasOwn(out, "query") && !Object.hasOwn(out, "fragment")) out.path = clean2(rest);
  return makeArray(["scheme", "host", "port", "user", "pass", "path", "query", "fragment"].filter((key) => Object.hasOwn(out, key)).map((key) => [key, out[key]]));
};
var runWeb = (name, items, context) => {
  if (!webNames.includes(name)) return null;
  const [a, b, c, d] = items.map((item) => item.value);
  let value;
  if (typeof a === "string") work(context, bytes(a).length);
  if (name === "urlencode" || name === "rawurlencode") value = encode(a, name === "rawurlencode");
  else if (name === "urldecode" || name === "rawurldecode") value = decode(a, name === "rawurldecode");
  else if (name === "base64_encode") value = btoa(byteString(a));
  else if (name === "base64_decode") value = base64(a, b);
  else if (name === "parse_url") {
    if (b < -1 || b > 7) throw failure("ValueError", "parse_url(): Argument #2 ($component) must be a valid URL component identifier");
    value = parseUrl(a);
    if (b !== -1 && value !== false) value = value[["scheme", "host", "port", "user", "pass", "path", "query", "fragment"][b]] ?? null;
  } else {
    const parts = [], seen = /* @__PURE__ */ new Set(), raw = d === 2, separator = c ?? context.source?.argSeparatorOutput ?? "&";
    let size = 0;
    const walk = (input, prefix = null, depth = 0) => {
      if (depth > 64) throw limit("http_build_query(): frontend nesting exceeds 64 levels");
      if (seen.has(input)) return;
      seen.add(input);
      try {
        const values2 = isPhpObject(input) ? runObjects("get_object_vars", [{ value: input, kind: "object" }], { ...context, readOnly: false, objectScope: null }).value : input;
        for (const [key, part] of arrayEntries(values2)) {
          work(context);
          const field = prefix === null ? typeof key === "number" ? b + key : key : prefix + "[" + key + "]";
          if (isPhpArray(part) || isPhpObject(part)) {
            walk(part, field, depth + 1);
            continue;
          }
          if (part === null || typeof part === "function" || part instanceof Error) continue;
          const text3 = typeof part === "boolean" ? part ? "1" : "0" : phpString(part, arrayKind(values2, key), context);
          const pair = encode(field, raw) + "=" + encode(text3, raw);
          size += bytes(pair).length + (parts.length ? bytes(separator).length : 0);
          if (size > 1048576) throw limit("http_build_query(): result exceeds 1 MiB");
          parts.push(pair);
        }
      } finally {
        seen.delete(input);
      }
    };
    walk(a);
    value = parts.join(separator);
  }
  if (typeof value === "string") bounded(value);
  return { value, kind: phpType(value) };
};

// src-js/core/php-builtin-json.js
var messages = ["No error", "Maximum stack depth exceeded", "State mismatch (invalid or malformed JSON)", "Control character error, possibly incorrectly encoded", "Syntax error", "Malformed UTF-8 characters, possibly incorrectly encoded", "Recursion detected", "Inf and NaN cannot be JSON encoded", "Type is not supported", "The decoded property name is invalid", "Single unpaired UTF-16 surrogate in unicode escape", "Non-backed enums have no default serialization"];
var jsonError = (code) => Object.assign(failure("JsonException", messages[code]), { phpCode: code, jsonCodecError: true });
var validDepth = (depth) => {
  if (depth < 1 || depth > 2147483647) throw failure("ValueError", "JSON depth must be greater than 0 and at most 2147483647");
};
var quote = (value, flags) => {
  let result = JSON.stringify(value).replace(/\//g, flags & 64 ? "/" : "\\/");
  if (flags & 1) result = result.replace(/</g, "\\u003C").replace(/>/g, "\\u003E");
  if (flags & 2) result = result.replace(/&/g, "\\u0026");
  if (flags & 4) result = result.replace(/'/g, "\\u0027");
  if (flags & 8) result = '"' + result.slice(1, -1).replace(/\\"/g, "\\u0022") + '"';
  if (!(flags & 256)) result = result.replace(/[\u0080-\uffff]/g, (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
  else if (!(flags & 2048)) result = result.replace(/[\u2028\u2029]/g, (char) => "\\u" + char.charCodeAt(0).toString(16));
  return result;
};
var numberText = (value, kind, flags) => {
  if (Object.is(value, -0)) return flags & 1024 ? "-0.0" : "-0";
  let result = String(value);
  if (kind === "double" && value !== 0 && (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e17)) result = value.toExponential();
  result = result.replace(/e([+-]?)(\d+)$/, (_, sign, exponent) => "e" + (sign || "+") + exponent);
  if (kind === "double" && result.includes("e") && !result.split("e")[0].includes(".")) result = result.replace("e", ".0e");
  if (kind === "double" && flags & 1024 && !/[.e]/.test(result)) result += ".0";
  return result;
};
var decode2 = (source, associative, depth, flags, context, validating = false) => {
  let position = 0, nodes = 0;
  const whitespace = () => {
    while (/[\x20\t\r\n]/.test(source[position] || "") && position < source.length) position++;
  };
  const string = () => {
    const start = position++;
    while (position < source.length) {
      const char = source[position++];
      if (char === '"') {
        let value2;
        try {
          value2 = JSON.parse(source.slice(start, position));
        } catch {
          throw jsonError(4);
        }
        for (let i = 0; i < value2.length; i++) {
          const c = value2.charCodeAt(i);
          if (c >= 55296 && c <= 56319) {
            const next2 = value2.charCodeAt(++i);
            if (!(next2 >= 56320 && next2 <= 57343)) throw jsonError(10);
          } else if (c >= 56320 && c <= 57343) throw jsonError(10);
        }
        return value2;
      }
      if (char.charCodeAt(0) < 32) throw jsonError(3);
      if (char === "\\") position++;
    }
    throw jsonError(4);
  };
  const value = (level = 0) => {
    if (++nodes > 1e4) throw limit("Frontend JSON is limited to 10000 values");
    work(context);
    whitespace();
    const char = source[position];
    if (char === '"') return { value: string(), kind: "string" };
    if (char === "[" || char === "{") {
      if (level + 1 >= depth) throw jsonError(1);
      if (level >= 64) throw limit("Frontend JSON is limited to 64 nested levels");
      const object = char === "{", close = object ? "}" : "]";
      position++;
      whitespace();
      const entries = [], types = /* @__PURE__ */ new Map();
      if (source[position] !== close) while (true) {
        let key = entries.length;
        if (object) {
          if (source[position] !== '"') throw jsonError(4);
          key = string();
          whitespace();
          if (source[position++] !== ":") throw jsonError(4);
        }
        const item = value(level + 1);
        if (object && !associative && key.startsWith("\0")) throw jsonError(9);
        if ((!object || associative) && !validating) key = arrayKey(key, context);
        const old = entries.findIndex(([candidate]) => candidate === key);
        if (old >= 0) entries[old] = [key, item.value];
        else entries.push([key, item.value]);
        types.set(key, item.kind);
        whitespace();
        if (source[position] === close) break;
        if ((source[position] === "}" || source[position] === "]") && source[position] !== close) throw jsonError(2);
        if (source[position++] !== ",") throw jsonError(4);
        whitespace();
      }
      position++;
      return object && !associative ? { value: makeStdClass(entries.map(([key, part]) => [key, { value: part, kind: types.get(key) }])), kind: "object" } : { value: makeArray(entries, types), kind: "array" };
    }
    for (const [literal, result3, kind] of [["true", true, "boolean"], ["false", false, "boolean"], ["null", null, "NULL"]]) if (source.startsWith(literal, position)) {
      position += literal.length;
      return { value: result3, kind };
    }
    const match = source.slice(position).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) throw jsonError(4);
    const raw = match[0];
    position += raw.length;
    const integer = !/[.eE]/.test(raw), result2 = Number(raw);
    if (integer && !Number.isSafeInteger(result2)) {
      const big = BigInt(raw), fitsPhp = big >= -9223372036854775808n && big <= 9223372036854775807n;
      if (!fitsPhp && flags & 2) return { value: raw, kind: "string" };
      if (fitsPhp && !validating) throw limit("JSON integer exceeds frontend safe precision; quote the value in JSON");
    }
    return { value: integer && result2 === 0 ? 0 : result2, kind: integer && Number.isSafeInteger(result2) ? "integer" : "double" };
  };
  const result = value();
  whitespace();
  if (position !== source.length) throw jsonError(4);
  return result;
};
var runJson = (name, items, context) => {
  if (!name.startsWith("json_")) return null;
  const memory = context.builtinMemory ||= {};
  if (name === "json_last_error") return { value: memory.jsonError || 0, kind: "integer" };
  if (name === "json_last_error_msg") return { value: messages[memory.jsonError || 0], kind: "string" };
  const encoding = name === "json_encode", validating = name === "json_validate";
  const flags = items[encoding ? 1 : validating ? 2 : 3].value, depth = items[encoding ? 2 : 2 - Number(validating)].value;
  if (!encoding) validDepth(depth);
  if (validating && flags !== 0 && flags !== 1048576) throw failure("ValueError", "json_validate(): flags must be JSON_INVALID_UTF8_IGNORE or 0");
  let partialCode = 0;
  try {
    let result;
    if (!encoding) {
      bounded(items[0].value);
      result = decode2(items[0].value, validating || (items[1].value ?? !!(flags & 1)), depth, flags, context, validating);
      if (validating) result = { value: true, kind: "boolean" };
    } else {
      const seen = memory.jsonEncodingActive ||= /* @__PURE__ */ new Set(), serializing = memory.jsonSerializing ||= /* @__PURE__ */ new Set();
      let nodes = 0, outputSize = 0;
      const chunk = (text3) => {
        outputSize += bytes(text3).length;
        if (outputSize > 1048576) throw limit("Frontend JSON result exceeds 1 MiB");
        return text3;
      };
      const problem = (code, substitute = "null") => {
        if (!(flags & 512)) throw jsonError(code);
        partialCode = code;
        return substitute;
      };
      const render = (value, kind, level = 0, skipSerializer = false) => {
        if (++nodes > 1e4 || level > 64) throw limit("Frontend JSON exceeds its value or nesting limit");
        work(context);
        if (value == null) return chunk("null");
        if (typeof value === "boolean") return chunk(value ? "true" : "false");
        if (typeof value === "number") return chunk(Number.isFinite(value) ? numberText(value, kind, flags) : problem(7, "0"));
        if (typeof value === "string") {
          if (flags & 32 && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value) && Number.isFinite(Number(value))) {
            if (/^[\t\n\r\f\v ]*[+-]?\d+[\t\n\r\f\v ]*$/.test(value) && !Number.isSafeInteger(Number(value))) throw limit("JSON_NUMERIC_CHECK integer exceeds frontend safe precision");
            return chunk(numberText(Number(value), /[.eE]/.test(value) ? "double" : "integer", flags));
          }
          return chunk(quote(value, flags));
        }
        const data = objectData(value);
        if (!isPhpArray(value) && !data) return typeof value === "function" || value instanceof Error ? "{}" : problem(8);
        if (!skipSerializer && data?.definition.ancestors?.some((parent) => parent.toLowerCase() === "jsonserializable")) {
          if (serializing.has(value) || seen.has(value)) return problem(6);
          if (serializing.size >= 128) throw limit("Frontend JSON serializer chain exceeds 128 objects");
          serializing.add(value);
          try {
            let serialized;
            try {
              serialized = invokeCollectionMethod(value, "jsonserialize", [], context);
            } catch (error) {
              if (error.jsonCodecError) delete error.jsonCodecError;
              throw error;
            }
            return render(serialized.value, serialized.kind, level, serialized.value === value);
          } finally {
            serializing.delete(value);
          }
        }
        if (!skipSerializer && data?.definition.enumCases) {
          const backed = data.fields.get("value");
          return backed ? render(backed.value, backed.kind, level) : problem(11, "0");
        }
        if (seen.has(value)) return problem(6);
        if (level + 1 > depth) return problem(1);
        seen.add(value);
        try {
          let entries;
          const date = dateData(value);
          if (date) {
            entries = date.timestamp === void 0 ? [["timezone_type", date.zone.type, "integer"], ["timezone", date.zone.name, "string"]] : [["date", formatDate("Y-m-d H:i:s.u", date, context), "string"], ["timezone_type", date.zone.type, "integer"], ["timezone", date.zone.name, "string"]];
          } else if (data) {
            const properties = {};
            let definition = data.definition;
            while (definition) {
              for (const [key, property] of Object.entries(definition.properties || {})) if (!Object.hasOwn(properties, key)) properties[key] = property;
              definition = definition.parent ? context.classes?.[definition.parent.toLowerCase()] : null;
            }
            entries = [...data.fields].filter(([key]) => !key.includes("::$") && (data.definition.name === "stdClass" || properties[key]?.visibility === "public")).map(([key, item]) => [key, item.value, item.kind]);
          } else entries = arrayEntries(value).map(([key, part]) => [key, part, arrayKind(value, key)]);
          const list = !data && !(flags & 16) && entries.every(([key], index) => key === index), open = list ? "[" : "{", close = list ? "]" : "}";
          const pretty = !!(flags & 128), indent = "    ".repeat(level + 1);
          chunk(open + close + (entries.length ? ",".repeat(entries.length - 1) + (pretty ? "\n".repeat(entries.length + 1) + "    ".repeat(level) : "") : ""));
          const parts = entries.map(([key, part, type]) => chunk((pretty ? indent : "") + (list ? "" : quote(String(key), flags) + (pretty ? ": " : ":"))) + render(part, type, level + 1));
          return open + (parts.length && pretty ? "\n" : "") + parts.join(pretty ? ",\n" : ",") + (parts.length && pretty ? "\n" + "    ".repeat(level) : "") + close;
        } finally {
          seen.delete(value);
        }
      };
      if ((context.source?.serializePrecision ?? -1) !== -1) throw limit("Frontend JSON currently requires serialize_precision=-1");
      result = { value: bounded(render(items[0].value, items[0].kind)), kind: "string" };
    }
    if (!(flags & 4194304) || flags & 512 || partialCode || validating) memory.jsonError = partialCode;
    return result;
  } catch (error) {
    if (!error.jsonCodecError) {
      if (encoding && (!(flags & 4194304) || flags & 512)) memory.jsonError = partialCode;
      throw error;
    }
    if (flags & 4194304 && !validating) throw error;
    memory.jsonError = error.phpCode;
    return { value: encoding || validating ? false : null, kind: encoding || validating ? "boolean" : "NULL" };
  }
};

// phpaml-proxy:php-builtin-regex.js
var runRegex = (...args) => moduleExport("regex", "runRegex", true)?.(...args) ?? null;

// src-js/core/php-builtin-format.js
var formatString = (format, args, context) => {
  let position = 0, output = "";
  const argument = (index) => {
    const item = args[index === void 0 ? position++ : index];
    if (!item) throw failure("ArgumentCountError", "sprintf(): too few arguments");
    return item;
  };
  for (let i = 0; i < format.length; ) {
    if (format[i] !== "%") {
      output += format[i++];
      continue;
    }
    if (format[i + 1] === "%") {
      output += "%";
      i += 2;
      continue;
    }
    const match = format.slice(i).match(/^%(?:(\d+)\$)?((?:[-+ 0]|'[^])*)(\d+|\*(?:\d+\$)?)?(?:\.(\d*|\*(?:\d+\$)?))?([a-zA-Z])/);
    if (!match) throw failure("ValueError", "sprintf(): invalid format");
    const [, ordinal, flags, widthText, precisionText, specifier] = match;
    const size = (input, fallback) => {
      if (input === void 0) return fallback;
      if (!input.startsWith("*")) return Number(input);
      const item2 = argument(input.length > 1 ? Number(input.slice(1, -1)) - 1 : void 0);
      if (item2.kind !== "integer") throw new TypeError("sprintf(): width and precision must be integers");
      return item2.value;
    };
    const width = size(widthText, 0), precision = size(precisionText, void 0);
    if (width < 0 || precision < -1) throw failure("ValueError", "sprintf(): width and precision must be non-negative");
    if (width > 1048576 || precision > 1e3) throw limit("sprintf(): width or precision exceeds frontend bounds");
    const item = argument(ordinal ? Number(ordinal) - 1 : void 0), v = item.value;
    let value, numeric3 = false;
    if (specifier === "s") {
      value = byteString(phpString(v, item.kind, context));
      if (precision !== void 0 && precision >= 0) value = value.slice(0, precision);
    } else if (specifier === "c") value = String.fromCharCode(phpInt(v, context) & 255);
    else if ("bdo uxX".replaceAll(" ", "").includes(specifier)) {
      const integer = BigInt(phpInt(v, context));
      numeric3 = true;
      value = specifier === "d" ? integer.toString() : BigInt.asUintN(64, integer).toString({ b: 2, o: 8, u: 10, x: 16, X: 16 }[specifier]);
      if (specifier === "X") value = value.toUpperCase();
    } else if ("eEfFgGhH".includes(specifier)) {
      const number = phpFloat(v, context), p = precision === void 0 || precision === -1 ? 6 : precision;
      numeric3 = true;
      if (!Number.isFinite(number)) {
        value = Number.isNaN(number) ? "NaN" : number < 0 ? "-INF" : "INF";
        numeric3 = false;
      } else {
        if (p > 100) throw limit("sprintf(): floating precision is limited to 100 digits");
        if ("fF".includes(specifier)) value = fixedDecimal(Math.abs(number), p);
        else if ("eE".includes(specifier)) value = Math.abs(number).toExponential(p);
        else {
          const precision2 = Math.max(1, p), magnitude = Math.abs(number), exponent = magnitude ? Math.floor(Math.log10(magnitude)) : 0;
          value = exponent < -4 || exponent >= precision2 ? magnitude.toExponential(precision2 - 1) : magnitude.toFixed(Math.max(0, precision2 - exponent - 1));
          value = value.replace(/(\.\d*?[1-9])0+(?=e|$)|\.0+(?=e|$)/, "$1");
          value = value.replace(/^(\d+)e/, "$1.0e");
        }
        if ("EGH".includes(specifier)) value = value.toUpperCase();
        if (number < 0 || Object.is(number, -0)) value = "-" + value;
      }
    } else throw failure("ValueError", `sprintf(): unknown format specifier ${specifier}`);
    if (numeric3 && !value.startsWith("-") && flags.includes("+")) value = "+" + value;
    const padding = flags.match(/'([^])/), fill = padding ? byteString(padding[1]).slice(0, 1) : flags.includes("0") && !flags.includes("-") ? "0" : " ";
    const count = Math.max(0, width - value.length);
    if (flags.includes("-")) value += fill.repeat(count);
    else if (numeric3 && fill === "0" && /^[+-]/.test(value)) value = value[0] + fill.repeat(count) + value.slice(1);
    else value = fill.repeat(count) + value;
    output += fromByteString(value);
    i += match[0].length;
    bounded(output);
  }
  return bounded(output);
};
var scanString = (input, format, references) => {
  input = byteString(input);
  format = byteString(format);
  let index = 0, cursor = 0, failed2 = false, assignments = 0;
  const values2 = [];
  for (; index < format.length; ) {
    if (/\s/.test(format[index])) {
      while (/\s/.test(format[index] || "") && index < format.length) index++;
      while (/\s/.test(input[cursor] || "") && cursor < input.length) cursor++;
      continue;
    }
    if (format[index] !== "%" || format[index + 1] === "%") {
      const literal = format[index] === "%" ? "%" : format[index];
      index += literal === "%" ? 2 : 1;
      if (input[cursor] !== literal) failed2 = true;
      else cursor++;
      continue;
    }
    const match = format.slice(index).match(/^%(\*)?(\d+)?([cdeEfFgGiosuxXn]|\[(?:\^)?\]?(?:[^\]])*\])/);
    if (!match) throw failure("ValueError", "sscanf(): invalid format");
    const [, suppress, widthText, type] = match, width = widthText ? Number(widthText) : type === "c" ? 1 : input.length;
    if (!["c", "n"].includes(type) && type[0] !== "[") while (/\s/.test(input[cursor] || "") && cursor < input.length) cursor++;
    let value = null, kind = "NULL", consumed = 0;
    if (!failed2) {
      const remaining = input.slice(cursor, cursor + width);
      let token2;
      if (type === "n") {
        value = cursor;
        kind = "integer";
      } else if (type === "c") {
        token2 = remaining || null;
        value = token2 === null ? null : fromByteString(token2);
        kind = "string";
      } else if (type === "s") {
        token2 = remaining.match(/^\S+/)?.[0];
        value = token2 === void 0 ? null : fromByteString(token2);
        kind = "string";
      } else if (type[0] === "[") {
        const expression = type.slice(1, -1).replaceAll("\\", "\\\\");
        token2 = remaining.match(new RegExp(`^[${expression}]+`))?.[0];
        value = token2 === void 0 ? null : fromByteString(token2);
        kind = "string";
      } else if ("eEfFgG".includes(type)) {
        token2 = remaining.match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i)?.[0];
        value = token2 ? Number(token2) : null;
        kind = "double";
      } else {
        const regex = type === "i" ? /^[+-]?(?:0[xX][0-9a-fA-F]+|0[0-7]*|[1-9]\d*)/ : "xX".includes(type) ? /^[+-]?(?:0[xX])?[0-9a-fA-F]+/ : type === "o" ? /^[+-]?[0-7]+/ : /^[+-]?\d+/;
        token2 = remaining.match(regex)?.[0];
        if (token2) {
          const radix = type === "o" ? 8 : "xX".includes(type) ? 16 : type === "i" ? /^[-+]?0x/i.test(token2) ? 16 : /^[-+]?0/.test(token2) ? 8 : 10 : 10;
          value = parseInt(token2, radix);
          kind = "integer";
          if (!Number.isSafeInteger(value)) throw limit("sscanf(): integer exceeds safe frontend precision");
        }
      }
      consumed = token2?.length || 0;
      if (value === null) failed2 = true;
      cursor += consumed;
    }
    if (!suppress) {
      values2.push({ value, kind: value === null ? "NULL" : kind });
      if (value !== null) assignments++;
    }
    index += match[0].length;
  }
  if (references.length) {
    if (references.length !== values2.length) throw failure("ValueError", "sscanf(): number of variables must match format");
    values2.forEach((item, i) => {
      if (item.value !== null) references[i].ref.set(item.value, item.kind);
    });
    return { value: input === "" ? -1 : assignments, kind: "integer" };
  }
  return { value: input === "" ? null : makeArray(values2.map((item, key) => [key, item.value]), new Map(values2.map((item, key) => [key, item.kind]))), kind: input === "" ? "NULL" : "array" };
};

// src-js/core/html-entities.json
var html_entities_default = { "0": { '"': "&quot;", "&": "&amp;", "'": "&#039;", "<": "&lt;", ">": "&gt;", "\xA0": "&nbsp;", "\xA1": "&iexcl;", "\xA2": "&cent;", "\xA3": "&pound;", "\xA4": "&curren;", "\xA5": "&yen;", "\xA6": "&brvbar;", "\xA7": "&sect;", "\xA8": "&uml;", "\xA9": "&copy;", \u00AA: "&ordf;", "\xAB": "&laquo;", "\xAC": "&not;", "\xAD": "&shy;", "\xAE": "&reg;", "\xAF": "&macr;", "\xB0": "&deg;", "\xB1": "&plusmn;", "\xB2": "&sup2;", "\xB3": "&sup3;", "\xB4": "&acute;", \u00B5: "&micro;", "\xB6": "&para;", "\xB7": "&middot;", "\xB8": "&cedil;", "\xB9": "&sup1;", \u00BA: "&ordm;", "\xBB": "&raquo;", "\xBC": "&frac14;", "\xBD": "&frac12;", "\xBE": "&frac34;", "\xBF": "&iquest;", \u00C0: "&Agrave;", \u00C1: "&Aacute;", \u00C2: "&Acirc;", \u00C3: "&Atilde;", \u00C4: "&Auml;", \u00C5: "&Aring;", \u00C6: "&AElig;", \u00C7: "&Ccedil;", \u00C8: "&Egrave;", \u00C9: "&Eacute;", \u00CA: "&Ecirc;", \u00CB: "&Euml;", \u00CC: "&Igrave;", \u00CD: "&Iacute;", \u00CE: "&Icirc;", \u00CF: "&Iuml;", \u00D0: "&ETH;", \u00D1: "&Ntilde;", \u00D2: "&Ograve;", \u00D3: "&Oacute;", \u00D4: "&Ocirc;", \u00D5: "&Otilde;", \u00D6: "&Ouml;", "\xD7": "&times;", \u00D8: "&Oslash;", \u00D9: "&Ugrave;", \u00DA: "&Uacute;", \u00DB: "&Ucirc;", \u00DC: "&Uuml;", \u00DD: "&Yacute;", \u00DE: "&THORN;", \u00DF: "&szlig;", \u00E0: "&agrave;", \u00E1: "&aacute;", \u00E2: "&acirc;", \u00E3: "&atilde;", \u00E4: "&auml;", \u00E5: "&aring;", \u00E6: "&aelig;", \u00E7: "&ccedil;", \u00E8: "&egrave;", \u00E9: "&eacute;", \u00EA: "&ecirc;", \u00EB: "&euml;", \u00EC: "&igrave;", \u00ED: "&iacute;", \u00EE: "&icirc;", \u00EF: "&iuml;", \u00F0: "&eth;", \u00F1: "&ntilde;", \u00F2: "&ograve;", \u00F3: "&oacute;", \u00F4: "&ocirc;", \u00F5: "&otilde;", \u00F6: "&ouml;", "\xF7": "&divide;", \u00F8: "&oslash;", \u00F9: "&ugrave;", \u00FA: "&uacute;", \u00FB: "&ucirc;", \u00FC: "&uuml;", \u00FD: "&yacute;", \u00FE: "&thorn;", \u00FF: "&yuml;", \u0152: "&OElig;", \u0153: "&oelig;", \u0160: "&Scaron;", \u0161: "&scaron;", \u0178: "&Yuml;", \u0192: "&fnof;", "\u02C6": "&circ;", "\u02DC": "&tilde;", \u0391: "&Alpha;", \u0392: "&Beta;", \u0393: "&Gamma;", \u0394: "&Delta;", \u0395: "&Epsilon;", \u0396: "&Zeta;", \u0397: "&Eta;", \u0398: "&Theta;", \u0399: "&Iota;", \u039A: "&Kappa;", \u039B: "&Lambda;", \u039C: "&Mu;", \u039D: "&Nu;", \u039E: "&Xi;", \u039F: "&Omicron;", \u03A0: "&Pi;", \u03A1: "&Rho;", \u03A3: "&Sigma;", \u03A4: "&Tau;", \u03A5: "&Upsilon;", \u03A6: "&Phi;", \u03A7: "&Chi;", \u03A8: "&Psi;", \u03A9: "&Omega;", \u03B1: "&alpha;", \u03B2: "&beta;", \u03B3: "&gamma;", \u03B4: "&delta;", \u03B5: "&epsilon;", \u03B6: "&zeta;", \u03B7: "&eta;", \u03B8: "&theta;", \u03B9: "&iota;", \u03BA: "&kappa;", \u03BB: "&lambda;", \u03BC: "&mu;", \u03BD: "&nu;", \u03BE: "&xi;", \u03BF: "&omicron;", \u03C0: "&pi;", \u03C1: "&rho;", \u03C2: "&sigmaf;", \u03C3: "&sigma;", \u03C4: "&tau;", \u03C5: "&upsilon;", \u03C6: "&phi;", \u03C7: "&chi;", \u03C8: "&psi;", \u03C9: "&omega;", \u03D1: "&thetasym;", \u03D2: "&upsih;", \u03D6: "&piv;", "\u2002": "&ensp;", "\u2003": "&emsp;", "\u2009": "&thinsp;", "\u200C": "&zwnj;", "\u200D": "&zwj;", "\u200E": "&lrm;", "\u200F": "&rlm;", "\u2013": "&ndash;", "\u2014": "&mdash;", "\u2018": "&lsquo;", "\u2019": "&rsquo;", "\u201A": "&sbquo;", "\u201C": "&ldquo;", "\u201D": "&rdquo;", "\u201E": "&bdquo;", "\u2020": "&dagger;", "\u2021": "&Dagger;", "\u2022": "&bull;", "\u2026": "&hellip;", "\u2030": "&permil;", "\u2032": "&prime;", "\u2033": "&Prime;", "\u2039": "&lsaquo;", "\u203A": "&rsaquo;", "\u203E": "&oline;", "\u2044": "&frasl;", "\u20AC": "&euro;", \u2111: "&image;", "\u2118": "&weierp;", \u211C: "&real;", "\u2122": "&trade;", \u2135: "&alefsym;", "\u2190": "&larr;", "\u2191": "&uarr;", "\u2192": "&rarr;", "\u2193": "&darr;", "\u2194": "&harr;", "\u21B5": "&crarr;", "\u21D0": "&lArr;", "\u21D1": "&uArr;", "\u21D2": "&rArr;", "\u21D3": "&dArr;", "\u21D4": "&hArr;", "\u2200": "&forall;", "\u2202": "&part;", "\u2203": "&exist;", "\u2205": "&empty;", "\u2207": "&nabla;", "\u2208": "&isin;", "\u2209": "&notin;", "\u220B": "&ni;", "\u220F": "&prod;", "\u2211": "&sum;", "\u2212": "&minus;", "\u2217": "&lowast;", "\u221A": "&radic;", "\u221D": "&prop;", "\u221E": "&infin;", "\u2220": "&ang;", "\u2227": "&and;", "\u2228": "&or;", "\u2229": "&cap;", "\u222A": "&cup;", "\u222B": "&int;", "\u2234": "&there4;", "\u223C": "&sim;", "\u2245": "&cong;", "\u2248": "&asymp;", "\u2260": "&ne;", "\u2261": "&equiv;", "\u2264": "&le;", "\u2265": "&ge;", "\u2282": "&sub;", "\u2283": "&sup;", "\u2284": "&nsub;", "\u2286": "&sube;", "\u2287": "&supe;", "\u2295": "&oplus;", "\u2297": "&otimes;", "\u22A5": "&perp;", "\u22C5": "&sdot;", "\u2308": "&lceil;", "\u2309": "&rceil;", "\u230A": "&lfloor;", "\u230B": "&rfloor;", "\u2329": "&lang;", "\u232A": "&rang;", "\u25CA": "&loz;", "\u2660": "&spades;", "\u2663": "&clubs;", "\u2665": "&hearts;", "\u2666": "&diams;" }, "16": { '"': "&quot;", "&": "&amp;", "'": "&apos;", "<": "&lt;", ">": "&gt;" }, "32": { '"': "&quot;", "&": "&amp;", "'": "&#039;", "<": "&lt;", ">": "&gt;", "\xA0": "&nbsp;", "\xA1": "&iexcl;", "\xA2": "&cent;", "\xA3": "&pound;", "\xA4": "&curren;", "\xA5": "&yen;", "\xA6": "&brvbar;", "\xA7": "&sect;", "\xA8": "&uml;", "\xA9": "&copy;", \u00AA: "&ordf;", "\xAB": "&laquo;", "\xAC": "&not;", "\xAD": "&shy;", "\xAE": "&reg;", "\xAF": "&macr;", "\xB0": "&deg;", "\xB1": "&plusmn;", "\xB2": "&sup2;", "\xB3": "&sup3;", "\xB4": "&acute;", \u00B5: "&micro;", "\xB6": "&para;", "\xB7": "&middot;", "\xB8": "&cedil;", "\xB9": "&sup1;", \u00BA: "&ordm;", "\xBB": "&raquo;", "\xBC": "&frac14;", "\xBD": "&frac12;", "\xBE": "&frac34;", "\xBF": "&iquest;", \u00C0: "&Agrave;", \u00C1: "&Aacute;", \u00C2: "&Acirc;", \u00C3: "&Atilde;", \u00C4: "&Auml;", \u00C5: "&Aring;", \u00C6: "&AElig;", \u00C7: "&Ccedil;", \u00C8: "&Egrave;", \u00C9: "&Eacute;", \u00CA: "&Ecirc;", \u00CB: "&Euml;", \u00CC: "&Igrave;", \u00CD: "&Iacute;", \u00CE: "&Icirc;", \u00CF: "&Iuml;", \u00D0: "&ETH;", \u00D1: "&Ntilde;", \u00D2: "&Ograve;", \u00D3: "&Oacute;", \u00D4: "&Ocirc;", \u00D5: "&Otilde;", \u00D6: "&Ouml;", "\xD7": "&times;", \u00D8: "&Oslash;", \u00D9: "&Ugrave;", \u00DA: "&Uacute;", \u00DB: "&Ucirc;", \u00DC: "&Uuml;", \u00DD: "&Yacute;", \u00DE: "&THORN;", \u00DF: "&szlig;", \u00E0: "&agrave;", \u00E1: "&aacute;", \u00E2: "&acirc;", \u00E3: "&atilde;", \u00E4: "&auml;", \u00E5: "&aring;", \u00E6: "&aelig;", \u00E7: "&ccedil;", \u00E8: "&egrave;", \u00E9: "&eacute;", \u00EA: "&ecirc;", \u00EB: "&euml;", \u00EC: "&igrave;", \u00ED: "&iacute;", \u00EE: "&icirc;", \u00EF: "&iuml;", \u00F0: "&eth;", \u00F1: "&ntilde;", \u00F2: "&ograve;", \u00F3: "&oacute;", \u00F4: "&ocirc;", \u00F5: "&otilde;", \u00F6: "&ouml;", "\xF7": "&divide;", \u00F8: "&oslash;", \u00F9: "&ugrave;", \u00FA: "&uacute;", \u00FB: "&ucirc;", \u00FC: "&uuml;", \u00FD: "&yacute;", \u00FE: "&thorn;", \u00FF: "&yuml;", \u0152: "&OElig;", \u0153: "&oelig;", \u0160: "&Scaron;", \u0161: "&scaron;", \u0178: "&Yuml;", \u0192: "&fnof;", "\u02C6": "&circ;", "\u02DC": "&tilde;", \u0391: "&Alpha;", \u0392: "&Beta;", \u0393: "&Gamma;", \u0394: "&Delta;", \u0395: "&Epsilon;", \u0396: "&Zeta;", \u0397: "&Eta;", \u0398: "&Theta;", \u0399: "&Iota;", \u039A: "&Kappa;", \u039B: "&Lambda;", \u039C: "&Mu;", \u039D: "&Nu;", \u039E: "&Xi;", \u039F: "&Omicron;", \u03A0: "&Pi;", \u03A1: "&Rho;", \u03A3: "&Sigma;", \u03A4: "&Tau;", \u03A5: "&Upsilon;", \u03A6: "&Phi;", \u03A7: "&Chi;", \u03A8: "&Psi;", \u03A9: "&Omega;", \u03B1: "&alpha;", \u03B2: "&beta;", \u03B3: "&gamma;", \u03B4: "&delta;", \u03B5: "&epsilon;", \u03B6: "&zeta;", \u03B7: "&eta;", \u03B8: "&theta;", \u03B9: "&iota;", \u03BA: "&kappa;", \u03BB: "&lambda;", \u03BC: "&mu;", \u03BD: "&nu;", \u03BE: "&xi;", \u03BF: "&omicron;", \u03C0: "&pi;", \u03C1: "&rho;", \u03C2: "&sigmaf;", \u03C3: "&sigma;", \u03C4: "&tau;", \u03C5: "&upsilon;", \u03C6: "&phi;", \u03C7: "&chi;", \u03C8: "&psi;", \u03C9: "&omega;", \u03D1: "&thetasym;", \u03D2: "&upsih;", \u03D6: "&piv;", "\u2002": "&ensp;", "\u2003": "&emsp;", "\u2009": "&thinsp;", "\u200C": "&zwnj;", "\u200D": "&zwj;", "\u200E": "&lrm;", "\u200F": "&rlm;", "\u2013": "&ndash;", "\u2014": "&mdash;", "\u2018": "&lsquo;", "\u2019": "&rsquo;", "\u201A": "&sbquo;", "\u201C": "&ldquo;", "\u201D": "&rdquo;", "\u201E": "&bdquo;", "\u2020": "&dagger;", "\u2021": "&Dagger;", "\u2022": "&bull;", "\u2026": "&hellip;", "\u2030": "&permil;", "\u2032": "&prime;", "\u2033": "&Prime;", "\u2039": "&lsaquo;", "\u203A": "&rsaquo;", "\u203E": "&oline;", "\u2044": "&frasl;", "\u20AC": "&euro;", \u2111: "&image;", "\u2118": "&weierp;", \u211C: "&real;", "\u2122": "&trade;", \u2135: "&alefsym;", "\u2190": "&larr;", "\u2191": "&uarr;", "\u2192": "&rarr;", "\u2193": "&darr;", "\u2194": "&harr;", "\u21B5": "&crarr;", "\u21D0": "&lArr;", "\u21D1": "&uArr;", "\u21D2": "&rArr;", "\u21D3": "&dArr;", "\u21D4": "&hArr;", "\u2200": "&forall;", "\u2202": "&part;", "\u2203": "&exist;", "\u2205": "&empty;", "\u2207": "&nabla;", "\u2208": "&isin;", "\u2209": "&notin;", "\u220B": "&ni;", "\u220F": "&prod;", "\u2211": "&sum;", "\u2212": "&minus;", "\u2217": "&lowast;", "\u221A": "&radic;", "\u221D": "&prop;", "\u221E": "&infin;", "\u2220": "&ang;", "\u2227": "&and;", "\u2228": "&or;", "\u2229": "&cap;", "\u222A": "&cup;", "\u222B": "&int;", "\u2234": "&there4;", "\u223C": "&sim;", "\u2245": "&cong;", "\u2248": "&asymp;", "\u2260": "&ne;", "\u2261": "&equiv;", "\u2264": "&le;", "\u2265": "&ge;", "\u2282": "&sub;", "\u2283": "&sup;", "\u2284": "&nsub;", "\u2286": "&sube;", "\u2287": "&supe;", "\u2295": "&oplus;", "\u2297": "&otimes;", "\u22A5": "&perp;", "\u22C5": "&sdot;", "\u2308": "&lceil;", "\u2309": "&rceil;", "\u230A": "&lfloor;", "\u230B": "&rfloor;", "\u2329": "&lang;", "\u232A": "&rang;", "\u25CA": "&loz;", "\u2660": "&spades;", "\u2663": "&clubs;", "\u2665": "&hearts;", "\u2666": "&diams;" }, "48": { "	": "&Tab;", "\n": "&NewLine;", "!": "&excl;", '"': "&quot;", "#": "&num;", $: "&dollar;", "%": "&percnt;", "&": "&amp;", "'": "&apos;", "(": "&lpar;", ")": "&rpar;", "*": "&ast;", "+": "&plus;", ",": "&comma;", ".": "&period;", "/": "&sol;", ":": "&colon;", ";": "&semi;", "<": "&lt;", "<\u20D2": "&nvlt;", "=": "&equals;", "=\u20E5": "&bne;", ">": "&gt;", ">\u20D2": "&nvgt;", "?": "&quest;", "@": "&commat;", "[": "&lbrack;", "\\": "&bsol;", "]": "&rsqb;", "^": "&Hat;", _: "&lowbar;", "`": "&grave;", fj: "&fjlig;", "{": "&lbrace;", "|": "&vert;", "}": "&rcub;", "\xA0": "&nbsp;", "\xA1": "&iexcl;", "\xA2": "&cent;", "\xA3": "&pound;", "\xA4": "&curren;", "\xA5": "&yen;", "\xA6": "&brvbar;", "\xA7": "&sect;", "\xA8": "&DoubleDot;", "\xA9": "&copy;", \u00AA: "&ordf;", "\xAB": "&laquo;", "\xAC": "&not;", "\xAD": "&shy;", "\xAE": "&reg;", "\xAF": "&macr;", "\xB0": "&deg;", "\xB1": "&plusmn;", "\xB2": "&sup2;", "\xB3": "&sup3;", "\xB4": "&DiacriticalAcute;", \u00B5: "&micro;", "\xB6": "&para;", "\xB7": "&CenterDot;", "\xB8": "&Cedilla;", "\xB9": "&sup1;", \u00BA: "&ordm;", "\xBB": "&raquo;", "\xBC": "&frac14;", "\xBD": "&half;", "\xBE": "&frac34;", "\xBF": "&iquest;", \u00C0: "&Agrave;", \u00C1: "&Aacute;", \u00C2: "&Acirc;", \u00C3: "&Atilde;", \u00C4: "&Auml;", \u00C5: "&Aring;", \u00C6: "&AElig;", \u00C7: "&Ccedil;", \u00C8: "&Egrave;", \u00C9: "&Eacute;", \u00CA: "&Ecirc;", \u00CB: "&Euml;", \u00CC: "&Igrave;", \u00CD: "&Iacute;", \u00CE: "&Icirc;", \u00CF: "&Iuml;", \u00D0: "&ETH;", \u00D1: "&Ntilde;", \u00D2: "&Ograve;", \u00D3: "&Oacute;", \u00D4: "&Ocirc;", \u00D5: "&Otilde;", \u00D6: "&Ouml;", "\xD7": "&times;", \u00D8: "&Oslash;", \u00D9: "&Ugrave;", \u00DA: "&Uacute;", \u00DB: "&Ucirc;", \u00DC: "&Uuml;", \u00DD: "&Yacute;", \u00DE: "&THORN;", \u00DF: "&szlig;", \u00E0: "&agrave;", \u00E1: "&aacute;", \u00E2: "&acirc;", \u00E3: "&atilde;", \u00E4: "&auml;", \u00E5: "&aring;", \u00E6: "&aelig;", \u00E7: "&ccedil;", \u00E8: "&egrave;", \u00E9: "&eacute;", \u00EA: "&ecirc;", \u00EB: "&euml;", \u00EC: "&igrave;", \u00ED: "&iacute;", \u00EE: "&icirc;", \u00EF: "&iuml;", \u00F0: "&eth;", \u00F1: "&ntilde;", \u00F2: "&ograve;", \u00F3: "&oacute;", \u00F4: "&ocirc;", \u00F5: "&otilde;", \u00F6: "&ouml;", "\xF7": "&divide;", \u00F8: "&oslash;", \u00F9: "&ugrave;", \u00FA: "&uacute;", \u00FB: "&ucirc;", \u00FC: "&uuml;", \u00FD: "&yacute;", \u00FE: "&thorn;", \u00FF: "&yuml;", \u0100: "&Amacr;", \u0101: "&amacr;", \u0102: "&Abreve;", \u0103: "&abreve;", \u0104: "&Aogon;", \u0105: "&aogon;", \u0106: "&Cacute;", \u0107: "&cacute;", \u0108: "&Ccirc;", \u0109: "&ccirc;", \u010A: "&Cdot;", \u010B: "&cdot;", \u010C: "&Ccaron;", \u010D: "&ccaron;", \u010E: "&Dcaron;", \u010F: "&dcaron;", \u0110: "&Dstrok;", \u0111: "&dstrok;", \u0112: "&Emacr;", \u0113: "&emacr;", \u0116: "&Edot;", \u0117: "&edot;", \u0118: "&Eogon;", \u0119: "&eogon;", \u011A: "&Ecaron;", \u011B: "&ecaron;", \u011C: "&Gcirc;", \u011D: "&gcirc;", \u011E: "&Gbreve;", \u011F: "&gbreve;", \u0120: "&Gdot;", \u0121: "&gdot;", \u0122: "&Gcedil;", \u0124: "&Hcirc;", \u0125: "&hcirc;", \u0126: "&Hstrok;", \u0127: "&hstrok;", \u0128: "&Itilde;", \u0129: "&itilde;", \u012A: "&Imacr;", \u012B: "&imacr;", \u012E: "&Iogon;", \u012F: "&iogon;", \u0130: "&Idot;", \u0131: "&inodot;", \u0132: "&IJlig;", \u0133: "&ijlig;", \u0134: "&Jcirc;", \u0135: "&jcirc;", \u0136: "&Kcedil;", \u0137: "&kcedil;", \u0138: "&kgreen;", \u0139: "&Lacute;", \u013A: "&lacute;", \u013B: "&Lcedil;", \u013C: "&lcedil;", \u013D: "&Lcaron;", \u013E: "&lcaron;", \u013F: "&Lmidot;", \u0140: "&lmidot;", \u0141: "&Lstrok;", \u0142: "&lstrok;", \u0143: "&Nacute;", \u0144: "&nacute;", \u0145: "&Ncedil;", \u0146: "&ncedil;", \u0147: "&Ncaron;", \u0148: "&ncaron;", \u0149: "&napos;", \u014A: "&ENG;", \u014B: "&eng;", \u014C: "&Omacr;", \u014D: "&omacr;", \u0150: "&Odblac;", \u0151: "&odblac;", \u0152: "&OElig;", \u0153: "&oelig;", \u0154: "&Racute;", \u0155: "&racute;", \u0156: "&Rcedil;", \u0157: "&rcedil;", \u0158: "&Rcaron;", \u0159: "&rcaron;", \u015A: "&Sacute;", \u015B: "&sacute;", \u015C: "&Scirc;", \u015D: "&scirc;", \u015E: "&Scedil;", \u015F: "&scedil;", \u0160: "&Scaron;", \u0161: "&scaron;", \u0162: "&Tcedil;", \u0163: "&tcedil;", \u0164: "&Tcaron;", \u0165: "&tcaron;", \u0166: "&Tstrok;", \u0167: "&tstrok;", \u0168: "&Utilde;", \u0169: "&utilde;", \u016A: "&Umacr;", \u016B: "&umacr;", \u016C: "&Ubreve;", \u016D: "&ubreve;", \u016E: "&Uring;", \u016F: "&uring;", \u0170: "&Udblac;", \u0171: "&udblac;", \u0172: "&Uogon;", \u0173: "&uogon;", \u0174: "&Wcirc;", \u0175: "&wcirc;", \u0176: "&Ycirc;", \u0177: "&ycirc;", \u0178: "&Yuml;", \u0179: "&Zacute;", \u017A: "&zacute;", \u017B: "&Zdot;", \u017C: "&zdot;", \u017D: "&Zcaron;", \u017E: "&zcaron;", \u0192: "&fnof;", \u01B5: "&imped;", \u01F5: "&gacute;", "\u0237": "&jmath;", "\u02C6": "&circ;", "\u02C7": "&Hacek;", "\u02D8": "&Breve;", "\u02D9": "&dot;", "\u02DA": "&ring;", "\u02DB": "&ogon;", "\u02DC": "&DiacriticalTilde;", "\u02DD": "&DiacriticalDoubleAcute;", "\u0311": "&DownBreve;", \u0391: "&Alpha;", \u0392: "&Beta;", \u0393: "&Gamma;", \u0394: "&Delta;", \u0395: "&Epsilon;", \u0396: "&Zeta;", \u0397: "&Eta;", \u0398: "&Theta;", \u0399: "&Iota;", \u039A: "&Kappa;", \u039B: "&Lambda;", \u039C: "&Mu;", \u039D: "&Nu;", \u039E: "&Xi;", \u039F: "&Omicron;", \u03A0: "&Pi;", \u03A1: "&Rho;", \u03A3: "&Sigma;", \u03A4: "&Tau;", \u03A5: "&Upsilon;", \u03A6: "&Phi;", \u03A7: "&Chi;", \u03A8: "&Psi;", \u03A9: "&Omega;", \u03B1: "&alpha;", \u03B2: "&beta;", \u03B3: "&gamma;", \u03B4: "&delta;", \u03B5: "&epsi;", \u03B6: "&zeta;", \u03B7: "&eta;", \u03B8: "&theta;", \u03B9: "&iota;", \u03BA: "&kappa;", \u03BB: "&lambda;", \u03BC: "&mu;", \u03BD: "&nu;", \u03BE: "&xi;", \u03BF: "&omicron;", \u03C0: "&pi;", \u03C1: "&rho;", \u03C2: "&sigmav;", \u03C3: "&sigma;", \u03C4: "&tau;", \u03C5: "&upsi;", \u03C6: "&phi;", \u03C7: "&chi;", \u03C8: "&psi;", \u03C9: "&omega;", \u03D1: "&thetasym;", \u03D2: "&upsih;", \u03D5: "&straightphi;", \u03D6: "&piv;", \u03DC: "&Gammad;", \u03DD: "&gammad;", \u03F0: "&varkappa;", \u03F1: "&rhov;", "\u03F5": "&straightepsilon;", "\u03F6": "&backepsilon;", \u0401: "&IOcy;", \u0402: "&DJcy;", \u0403: "&GJcy;", \u0404: "&Jukcy;", \u0405: "&DScy;", \u0406: "&Iukcy;", \u0407: "&YIcy;", \u0408: "&Jsercy;", \u0409: "&LJcy;", \u040A: "&NJcy;", \u040B: "&TSHcy;", \u040C: "&KJcy;", \u040E: "&Ubrcy;", \u040F: "&DZcy;", \u0410: "&Acy;", \u0411: "&Bcy;", \u0412: "&Vcy;", \u0413: "&Gcy;", \u0414: "&Dcy;", \u0415: "&IEcy;", \u0416: "&ZHcy;", \u0417: "&Zcy;", \u0418: "&Icy;", \u0419: "&Jcy;", \u041A: "&Kcy;", \u041B: "&Lcy;", \u041C: "&Mcy;", \u041D: "&Ncy;", \u041E: "&Ocy;", \u041F: "&Pcy;", \u0420: "&Rcy;", \u0421: "&Scy;", \u0422: "&Tcy;", \u0423: "&Ucy;", \u0424: "&Fcy;", \u0425: "&KHcy;", \u0426: "&TScy;", \u0427: "&CHcy;", \u0428: "&SHcy;", \u0429: "&SHCHcy;", \u042A: "&HARDcy;", \u042B: "&Ycy;", \u042C: "&SOFTcy;", \u042D: "&Ecy;", \u042E: "&YUcy;", \u042F: "&YAcy;", \u0430: "&acy;", \u0431: "&bcy;", \u0432: "&vcy;", \u0433: "&gcy;", \u0434: "&dcy;", \u0435: "&iecy;", \u0436: "&zhcy;", \u0437: "&zcy;", \u0438: "&icy;", \u0439: "&jcy;", \u043A: "&kcy;", \u043B: "&lcy;", \u043C: "&mcy;", \u043D: "&ncy;", \u043E: "&ocy;", \u043F: "&pcy;", \u0440: "&rcy;", \u0441: "&scy;", \u0442: "&tcy;", \u0443: "&ucy;", \u0444: "&fcy;", \u0445: "&khcy;", \u0446: "&tscy;", \u0447: "&chcy;", \u0448: "&shcy;", \u0449: "&shchcy;", \u044A: "&hardcy;", \u044B: "&ycy;", \u044C: "&softcy;", \u044D: "&ecy;", \u044E: "&yucy;", \u044F: "&yacy;", \u0451: "&iocy;", \u0452: "&djcy;", \u0453: "&gjcy;", \u0454: "&jukcy;", \u0455: "&dscy;", \u0456: "&iukcy;", \u0457: "&yicy;", \u0458: "&jsercy;", \u0459: "&ljcy;", \u045A: "&njcy;", \u045B: "&tshcy;", \u045C: "&kjcy;", \u045E: "&ubrcy;", \u045F: "&dzcy;", "\u2002": "&ensp;", "\u2003": "&emsp;", "\u2004": "&emsp13;", "\u2005": "&emsp14;", "\u2007": "&numsp;", "\u2008": "&puncsp;", "\u2009": "&ThinSpace;", "\u200A": "&hairsp;", "\u200B": "&ZeroWidthSpace;", "\u200C": "&zwnj;", "\u200D": "&zwj;", "\u200E": "&lrm;", "\u200F": "&rlm;", "\u2010": "&hyphen;", "\u2013": "&ndash;", "\u2014": "&mdash;", "\u2015": "&horbar;", "\u2016": "&Verbar;", "\u2018": "&OpenCurlyQuote;", "\u2019": "&rsquo;", "\u201A": "&sbquo;", "\u201C": "&OpenCurlyDoubleQuote;", "\u201D": "&rdquo;", "\u201E": "&bdquo;", "\u2020": "&dagger;", "\u2021": "&Dagger;", "\u2022": "&bull;", "\u2025": "&nldr;", "\u2026": "&hellip;", "\u2030": "&permil;", "\u2031": "&pertenk;", "\u2032": "&prime;", "\u2033": "&Prime;", "\u2034": "&tprime;", "\u2035": "&backprime;", "\u2039": "&lsaquo;", "\u203A": "&rsaquo;", "\u203E": "&oline;", "\u2041": "&caret;", "\u2043": "&hybull;", "\u2044": "&frasl;", "\u204F": "&bsemi;", "\u2057": "&qprime;", "\u205F": "&MediumSpace;", "\u205F\u200A": "&ThickSpace;", "\u2060": "&NoBreak;", "\u2061": "&af;", "\u2062": "&InvisibleTimes;", "\u2063": "&ic;", "\u20AC": "&euro;", "\u20DB": "&TripleDot;", "\u20DC": "&DotDot;", \u2102: "&complexes;", "\u2105": "&incare;", \u210A: "&gscr;", \u210B: "&HilbertSpace;", \u210C: "&Hfr;", \u210D: "&Hopf;", \u210E: "&planckh;", \u210F: "&planck;", \u2110: "&imagline;", \u2111: "&Ifr;", \u2112: "&lagran;", \u2113: "&ell;", \u2115: "&naturals;", "\u2116": "&numero;", "\u2117": "&copysr;", "\u2118": "&wp;", \u2119: "&primes;", \u211A: "&rationals;", \u211B: "&realine;", \u211C: "&Rfr;", \u211D: "&Ropf;", "\u211E": "&rx;", "\u2122": "&trade;", \u2124: "&Zopf;", "\u2127": "&mho;", \u2128: "&Zfr;", "\u2129": "&iiota;", \u212C: "&Bscr;", \u212D: "&Cfr;", \u212F: "&escr;", \u2130: "&expectation;", \u2131: "&Fouriertrf;", \u2133: "&Mellintrf;", \u2134: "&orderof;", \u2135: "&aleph;", \u2136: "&beth;", \u2137: "&gimel;", \u2138: "&daleth;", "\u2145": "&CapitalDifferentialD;", "\u2146": "&DifferentialD;", "\u2147": "&exponentiale;", "\u2148": "&ImaginaryI;", "\u2153": "&frac13;", "\u2154": "&frac23;", "\u2155": "&frac15;", "\u2156": "&frac25;", "\u2157": "&frac35;", "\u2158": "&frac45;", "\u2159": "&frac16;", "\u215A": "&frac56;", "\u215B": "&frac18;", "\u215C": "&frac38;", "\u215D": "&frac58;", "\u215E": "&frac78;", "\u2190": "&larr;", "\u2191": "&uarr;", "\u2192": "&srarr;", "\u2193": "&darr;", "\u2194": "&harr;", "\u2195": "&UpDownArrow;", "\u2196": "&nwarrow;", "\u2197": "&UpperRightArrow;", "\u2198": "&LowerRightArrow;", "\u2199": "&swarr;", "\u219A": "&nleftarrow;", "\u219B": "&nrarr;", "\u219D": "&rarrw;", "\u219D\u0338": "&nrarrw;", "\u219E": "&Larr;", "\u219F": "&Uarr;", "\u21A0": "&twoheadrightarrow;", "\u21A1": "&Darr;", "\u21A2": "&larrtl;", "\u21A3": "&rarrtl;", "\u21A4": "&LeftTeeArrow;", "\u21A5": "&UpTeeArrow;", "\u21A6": "&map;", "\u21A7": "&DownTeeArrow;", "\u21A9": "&larrhk;", "\u21AA": "&rarrhk;", "\u21AB": "&larrlp;", "\u21AC": "&looparrowright;", "\u21AD": "&harrw;", "\u21AE": "&nleftrightarrow;", "\u21B0": "&Lsh;", "\u21B1": "&rsh;", "\u21B2": "&ldsh;", "\u21B3": "&rdsh;", "\u21B5": "&crarr;", "\u21B6": "&curvearrowleft;", "\u21B7": "&curarr;", "\u21BA": "&olarr;", "\u21BB": "&orarr;", "\u21BC": "&leftharpoonup;", "\u21BD": "&leftharpoondown;", "\u21BE": "&RightUpVector;", "\u21BF": "&uharl;", "\u21C0": "&rharu;", "\u21C1": "&rhard;", "\u21C2": "&RightDownVector;", "\u21C3": "&dharl;", "\u21C4": "&rightleftarrows;", "\u21C5": "&udarr;", "\u21C6": "&lrarr;", "\u21C7": "&llarr;", "\u21C8": "&upuparrows;", "\u21C9": "&rrarr;", "\u21CA": "&downdownarrows;", "\u21CB": "&leftrightharpoons;", "\u21CC": "&rightleftharpoons;", "\u21CD": "&nLeftarrow;", "\u21CE": "&nhArr;", "\u21CF": "&nrArr;", "\u21D0": "&DoubleLeftArrow;", "\u21D1": "&DoubleUpArrow;", "\u21D2": "&Implies;", "\u21D3": "&Downarrow;", "\u21D4": "&hArr;", "\u21D5": "&Updownarrow;", "\u21D6": "&nwArr;", "\u21D7": "&neArr;", "\u21D8": "&seArr;", "\u21D9": "&swArr;", "\u21DA": "&lAarr;", "\u21DB": "&rAarr;", "\u21DD": "&zigrarr;", "\u21E4": "&LeftArrowBar;", "\u21E5": "&RightArrowBar;", "\u21F5": "&DownArrowUpArrow;", "\u21FD": "&loarr;", "\u21FE": "&roarr;", "\u21FF": "&hoarr;", "\u2200": "&forall;", "\u2201": "&comp;", "\u2202": "&part;", "\u2202\u0338": "&npart;", "\u2203": "&Exists;", "\u2204": "&nexist;", "\u2205": "&empty;", "\u2207": "&nabla;", "\u2208": "&isinv;", "\u2209": "&notin;", "\u220B": "&ReverseElement;", "\u220C": "&notniva;", "\u220F": "&prod;", "\u2210": "&Coproduct;", "\u2211": "&sum;", "\u2212": "&minus;", "\u2213": "&MinusPlus;", "\u2214": "&plusdo;", "\u2216": "&ssetmn;", "\u2217": "&lowast;", "\u2218": "&compfn;", "\u221A": "&Sqrt;", "\u221D": "&prop;", "\u221E": "&infin;", "\u221F": "&angrt;", "\u2220": "&angle;", "\u2220\u20D2": "&nang;", "\u2221": "&angmsd;", "\u2222": "&angsph;", "\u2223": "&mid;", "\u2224": "&nshortmid;", "\u2225": "&shortparallel;", "\u2226": "&nparallel;", "\u2227": "&and;", "\u2228": "&or;", "\u2229": "&cap;", "\u2229\uFE00": "&caps;", "\u222A": "&cup;", "\u222A\uFE00": "&cups;", "\u222B": "&Integral;", "\u222C": "&Int;", "\u222D": "&tint;", "\u222E": "&ContourIntegral;", "\u222F": "&DoubleContourIntegral;", "\u2230": "&Cconint;", "\u2231": "&cwint;", "\u2232": "&cwconint;", "\u2233": "&awconint;", "\u2234": "&there4;", "\u2235": "&Because;", "\u2236": "&ratio;", "\u2237": "&Colon;", "\u2238": "&minusd;", "\u223A": "&mDDot;", "\u223B": "&homtht;", "\u223C": "&sim;", "\u223C\u20D2": "&nvsim;", "\u223D": "&bsim;", "\u223D\u0331": "&race;", "\u223E": "&ac;", "\u223E\u0333": "&acE;", "\u223F": "&acd;", "\u2240": "&wr;", "\u2241": "&NotTilde;", "\u2242": "&esim;", "\u2242\u0338": "&nesim;", "\u2243": "&simeq;", "\u2244": "&nsime;", "\u2245": "&TildeFullEqual;", "\u2246": "&simne;", "\u2247": "&ncong;", "\u2248": "&approx;", "\u2249": "&napprox;", "\u224A": "&ape;", "\u224B": "&apid;", "\u224B\u0338": "&napid;", "\u224C": "&bcong;", "\u224D": "&CupCap;", "\u224D\u20D2": "&nvap;", "\u224E": "&bump;", "\u224E\u0338": "&nbump;", "\u224F": "&HumpEqual;", "\u224F\u0338": "&nbumpe;", "\u2250": "&esdot;", "\u2250\u0338": "&nedot;", "\u2251": "&doteqdot;", "\u2252": "&fallingdotseq;", "\u2253": "&risingdotseq;", "\u2254": "&coloneq;", "\u2255": "&eqcolon;", "\u2256": "&ecir;", "\u2257": "&circeq;", "\u2259": "&wedgeq;", "\u225A": "&veeeq;", "\u225C": "&triangleq;", "\u225F": "&equest;", "\u2260": "&NotEqual;", "\u2261": "&Congruent;", "\u2261\u20E5": "&bnequiv;", "\u2262": "&NotCongruent;", "\u2264": "&leq;", "\u2264\u20D2": "&nvle;", "\u2265": "&ge;", "\u2265\u20D2": "&nvge;", "\u2266": "&lE;", "\u2266\u0338": "&nlE;", "\u2267": "&geqq;", "\u2267\u0338": "&NotGreaterFullEqual;", "\u2268": "&lneqq;", "\u2268\uFE00": "&lvertneqq;", "\u2269": "&gneqq;", "\u2269\uFE00": "&gvertneqq;", "\u226A": "&ll;", "\u226A\u0338": "&nLtv;", "\u226A\u20D2": "&nLt;", "\u226B": "&gg;", "\u226B\u0338": "&NotGreaterGreater;", "\u226B\u20D2": "&nGt;", "\u226C": "&between;", "\u226D": "&NotCupCap;", "\u226E": "&NotLess;", "\u226F": "&ngtr;", "\u2270": "&NotLessEqual;", "\u2271": "&ngeq;", "\u2272": "&LessTilde;", "\u2273": "&GreaterTilde;", "\u2274": "&nlsim;", "\u2275": "&ngsim;", "\u2276": "&lessgtr;", "\u2277": "&gl;", "\u2278": "&ntlg;", "\u2279": "&NotGreaterLess;", "\u227A": "&prec;", "\u227B": "&succ;", "\u227C": "&PrecedesSlantEqual;", "\u227D": "&succcurlyeq;", "\u227E": "&precsim;", "\u227F": "&SucceedsTilde;", "\u227F\u0338": "&NotSucceedsTilde;", "\u2280": "&npr;", "\u2281": "&NotSucceeds;", "\u2282": "&sub;", "\u2282\u20D2": "&vnsub;", "\u2283": "&sup;", "\u2283\u20D2": "&nsupset;", "\u2284": "&nsub;", "\u2285": "&nsup;", "\u2286": "&SubsetEqual;", "\u2287": "&supe;", "\u2288": "&NotSubsetEqual;", "\u2289": "&NotSupersetEqual;", "\u228A": "&subsetneq;", "\u228A\uFE00": "&vsubne;", "\u228B": "&supsetneq;", "\u228B\uFE00": "&vsupne;", "\u228D": "&cupdot;", "\u228E": "&UnionPlus;", "\u228F": "&sqsub;", "\u228F\u0338": "&NotSquareSubset;", "\u2290": "&sqsupset;", "\u2290\u0338": "&NotSquareSuperset;", "\u2291": "&SquareSubsetEqual;", "\u2292": "&SquareSupersetEqual;", "\u2293": "&sqcap;", "\u2293\uFE00": "&sqcaps;", "\u2294": "&sqcup;", "\u2294\uFE00": "&sqcups;", "\u2295": "&CirclePlus;", "\u2296": "&ominus;", "\u2297": "&CircleTimes;", "\u2298": "&osol;", "\u2299": "&CircleDot;", "\u229A": "&ocir;", "\u229B": "&oast;", "\u229D": "&odash;", "\u229E": "&boxplus;", "\u229F": "&boxminus;", "\u22A0": "&timesb;", "\u22A1": "&sdotb;", "\u22A2": "&vdash;", "\u22A3": "&dashv;", "\u22A4": "&DownTee;", "\u22A5": "&perp;", "\u22A7": "&models;", "\u22A8": "&DoubleRightTee;", "\u22A9": "&Vdash;", "\u22AA": "&Vvdash;", "\u22AB": "&VDash;", "\u22AC": "&nvdash;", "\u22AD": "&nvDash;", "\u22AE": "&nVdash;", "\u22AF": "&nVDash;", "\u22B0": "&prurel;", "\u22B2": "&vartriangleleft;", "\u22B3": "&vrtri;", "\u22B4": "&LeftTriangleEqual;", "\u22B4\u20D2": "&nvltrie;", "\u22B5": "&RightTriangleEqual;", "\u22B5\u20D2": "&nvrtrie;", "\u22B6": "&origof;", "\u22B7": "&imof;", "\u22B8": "&mumap;", "\u22B9": "&hercon;", "\u22BA": "&intcal;", "\u22BB": "&veebar;", "\u22BD": "&barvee;", "\u22BE": "&angrtvb;", "\u22BF": "&lrtri;", "\u22C0": "&xwedge;", "\u22C1": "&xvee;", "\u22C2": "&bigcap;", "\u22C3": "&bigcup;", "\u22C4": "&diamond;", "\u22C5": "&sdot;", "\u22C6": "&Star;", "\u22C7": "&divonx;", "\u22C8": "&bowtie;", "\u22C9": "&ltimes;", "\u22CA": "&rtimes;", "\u22CB": "&lthree;", "\u22CC": "&rthree;", "\u22CD": "&backsimeq;", "\u22CE": "&curlyvee;", "\u22CF": "&curlywedge;", "\u22D0": "&Sub;", "\u22D1": "&Supset;", "\u22D2": "&Cap;", "\u22D3": "&Cup;", "\u22D4": "&pitchfork;", "\u22D5": "&epar;", "\u22D6": "&lessdot;", "\u22D7": "&gtrdot;", "\u22D8": "&Ll;", "\u22D8\u0338": "&nLl;", "\u22D9": "&Gg;", "\u22D9\u0338": "&nGg;", "\u22DA": "&lesseqgtr;", "\u22DA\uFE00": "&lesg;", "\u22DB": "&gtreqless;", "\u22DB\uFE00": "&gesl;", "\u22DE": "&curlyeqprec;", "\u22DF": "&cuesc;", "\u22E0": "&NotPrecedesSlantEqual;", "\u22E1": "&NotSucceedsSlantEqual;", "\u22E2": "&NotSquareSubsetEqual;", "\u22E3": "&NotSquareSupersetEqual;", "\u22E6": "&lnsim;", "\u22E7": "&gnsim;", "\u22E8": "&precnsim;", "\u22E9": "&scnsim;", "\u22EA": "&nltri;", "\u22EB": "&ntriangleright;", "\u22EC": "&nltrie;", "\u22ED": "&NotRightTriangleEqual;", "\u22EE": "&vellip;", "\u22EF": "&ctdot;", "\u22F0": "&utdot;", "\u22F1": "&dtdot;", "\u22F2": "&disin;", "\u22F3": "&isinsv;", "\u22F4": "&isins;", "\u22F5": "&isindot;", "\u22F5\u0338": "&notindot;", "\u22F6": "&notinvc;", "\u22F7": "&notinvb;", "\u22F9": "&isinE;", "\u22F9\u0338": "&notinE;", "\u22FA": "&nisd;", "\u22FB": "&xnis;", "\u22FC": "&nis;", "\u22FD": "&notnivc;", "\u22FE": "&notnivb;", "\u2305": "&barwed;", "\u2306": "&doublebarwedge;", "\u2308": "&lceil;", "\u2309": "&RightCeiling;", "\u230A": "&LeftFloor;", "\u230B": "&RightFloor;", "\u230C": "&drcrop;", "\u230D": "&dlcrop;", "\u230E": "&urcrop;", "\u230F": "&ulcrop;", "\u2310": "&bnot;", "\u2312": "&profline;", "\u2313": "&profsurf;", "\u2315": "&telrec;", "\u2316": "&target;", "\u231C": "&ulcorner;", "\u231D": "&urcorner;", "\u231E": "&llcorner;", "\u231F": "&drcorn;", "\u2322": "&frown;", "\u2323": "&smile;", "\u232D": "&cylcty;", "\u232E": "&profalar;", "\u2336": "&topbot;", "\u233D": "&ovbar;", "\u233F": "&solbar;", "\u237C": "&angzarr;", "\u23B0": "&lmoust;", "\u23B1": "&rmoust;", "\u23B4": "&OverBracket;", "\u23B5": "&bbrk;", "\u23B6": "&bbrktbrk;", "\u23DC": "&OverParenthesis;", "\u23DD": "&UnderParenthesis;", "\u23DE": "&OverBrace;", "\u23DF": "&UnderBrace;", "\u23E2": "&trpezium;", "\u23E7": "&elinters;", "\u2423": "&blank;", "\u24C8": "&oS;", "\u2500": "&HorizontalLine;", "\u2502": "&boxv;", "\u250C": "&boxdr;", "\u2510": "&boxdl;", "\u2514": "&boxur;", "\u2518": "&boxul;", "\u251C": "&boxvr;", "\u2524": "&boxvl;", "\u252C": "&boxhd;", "\u2534": "&boxhu;", "\u253C": "&boxvh;", "\u2550": "&boxH;", "\u2551": "&boxV;", "\u2552": "&boxdR;", "\u2553": "&boxDr;", "\u2554": "&boxDR;", "\u2555": "&boxdL;", "\u2556": "&boxDl;", "\u2557": "&boxDL;", "\u2558": "&boxuR;", "\u2559": "&boxUr;", "\u255A": "&boxUR;", "\u255B": "&boxuL;", "\u255C": "&boxUl;", "\u255D": "&boxUL;", "\u255E": "&boxvR;", "\u255F": "&boxVr;", "\u2560": "&boxVR;", "\u2561": "&boxvL;", "\u2562": "&boxVl;", "\u2563": "&boxVL;", "\u2564": "&boxHd;", "\u2565": "&boxhD;", "\u2566": "&boxHD;", "\u2567": "&boxHu;", "\u2568": "&boxhU;", "\u2569": "&boxHU;", "\u256A": "&boxvH;", "\u256B": "&boxVh;", "\u256C": "&boxVH;", "\u2580": "&uhblk;", "\u2584": "&lhblk;", "\u2588": "&block;", "\u2591": "&blk14;", "\u2592": "&blk12;", "\u2593": "&blk34;", "\u25A1": "&Square;", "\u25AA": "&squarf;", "\u25AB": "&EmptyVerySmallSquare;", "\u25AD": "&rect;", "\u25AE": "&marker;", "\u25B1": "&fltns;", "\u25B3": "&bigtriangleup;", "\u25B4": "&blacktriangle;", "\u25B5": "&triangle;", "\u25B8": "&blacktriangleright;", "\u25B9": "&rtri;", "\u25BD": "&bigtriangledown;", "\u25BE": "&blacktriangledown;", "\u25BF": "&triangledown;", "\u25C2": "&blacktriangleleft;", "\u25C3": "&ltri;", "\u25CA": "&lozenge;", "\u25CB": "&cir;", "\u25EC": "&tridot;", "\u25EF": "&bigcirc;", "\u25F8": "&ultri;", "\u25F9": "&urtri;", "\u25FA": "&lltri;", "\u25FB": "&EmptySmallSquare;", "\u25FC": "&FilledSmallSquare;", "\u2605": "&starf;", "\u2606": "&star;", "\u260E": "&phone;", "\u2640": "&female;", "\u2642": "&male;", "\u2660": "&spadesuit;", "\u2663": "&clubs;", "\u2665": "&hearts;", "\u2666": "&diamondsuit;", "\u266A": "&sung;", "\u266D": "&flat;", "\u266E": "&natur;", "\u266F": "&sharp;", "\u2713": "&check;", "\u2717": "&cross;", "\u2720": "&maltese;", "\u2736": "&sext;", "\u2758": "&VerticalSeparator;", "\u2772": "&lbbrk;", "\u2773": "&rbbrk;", "\u27C8": "&bsolhsub;", "\u27C9": "&suphsol;", "\u27E6": "&LeftDoubleBracket;", "\u27E7": "&RightDoubleBracket;", "\u27E8": "&langle;", "\u27E9": "&RightAngleBracket;", "\u27EA": "&Lang;", "\u27EB": "&Rang;", "\u27EC": "&loang;", "\u27ED": "&roang;", "\u27F5": "&longleftarrow;", "\u27F6": "&LongRightArrow;", "\u27F7": "&LongLeftRightArrow;", "\u27F8": "&xlArr;", "\u27F9": "&DoubleLongRightArrow;", "\u27FA": "&xhArr;", "\u27FC": "&xmap;", "\u27FF": "&dzigrarr;", "\u2902": "&nvlArr;", "\u2903": "&nvrArr;", "\u2904": "&nvHarr;", "\u2905": "&Map;", "\u290C": "&lbarr;", "\u290D": "&bkarow;", "\u290E": "&lBarr;", "\u290F": "&dbkarow;", "\u2910": "&drbkarow;", "\u2911": "&DDotrahd;", "\u2912": "&UpArrowBar;", "\u2913": "&DownArrowBar;", "\u2916": "&Rarrtl;", "\u2919": "&latail;", "\u291A": "&ratail;", "\u291B": "&lAtail;", "\u291C": "&rAtail;", "\u291D": "&larrfs;", "\u291E": "&rarrfs;", "\u291F": "&larrbfs;", "\u2920": "&rarrbfs;", "\u2923": "&nwarhk;", "\u2924": "&nearhk;", "\u2925": "&searhk;", "\u2926": "&swarhk;", "\u2927": "&nwnear;", "\u2928": "&toea;", "\u2929": "&seswar;", "\u292A": "&swnwar;", "\u2933": "&rarrc;", "\u2933\u0338": "&nrarrc;", "\u2935": "&cudarrr;", "\u2936": "&ldca;", "\u2937": "&rdca;", "\u2938": "&cudarrl;", "\u2939": "&larrpl;", "\u293C": "&curarrm;", "\u293D": "&cularrp;", "\u2945": "&rarrpl;", "\u2948": "&harrcir;", "\u2949": "&Uarrocir;", "\u294A": "&lurdshar;", "\u294B": "&ldrushar;", "\u294E": "&LeftRightVector;", "\u294F": "&RightUpDownVector;", "\u2950": "&DownLeftRightVector;", "\u2951": "&LeftUpDownVector;", "\u2952": "&LeftVectorBar;", "\u2953": "&RightVectorBar;", "\u2954": "&RightUpVectorBar;", "\u2955": "&RightDownVectorBar;", "\u2956": "&DownLeftVectorBar;", "\u2957": "&DownRightVectorBar;", "\u2958": "&LeftUpVectorBar;", "\u2959": "&LeftDownVectorBar;", "\u295A": "&LeftTeeVector;", "\u295B": "&RightTeeVector;", "\u295C": "&RightUpTeeVector;", "\u295D": "&RightDownTeeVector;", "\u295E": "&DownLeftTeeVector;", "\u295F": "&DownRightTeeVector;", "\u2960": "&LeftUpTeeVector;", "\u2961": "&LeftDownTeeVector;", "\u2962": "&lHar;", "\u2963": "&uHar;", "\u2964": "&rHar;", "\u2965": "&dHar;", "\u2966": "&luruhar;", "\u2967": "&ldrdhar;", "\u2968": "&ruluhar;", "\u2969": "&rdldhar;", "\u296A": "&lharul;", "\u296B": "&llhard;", "\u296C": "&rharul;", "\u296D": "&lrhard;", "\u296E": "&udhar;", "\u296F": "&ReverseUpEquilibrium;", "\u2970": "&RoundImplies;", "\u2971": "&erarr;", "\u2972": "&simrarr;", "\u2973": "&larrsim;", "\u2974": "&rarrsim;", "\u2975": "&rarrap;", "\u2976": "&ltlarr;", "\u2978": "&gtrarr;", "\u2979": "&subrarr;", "\u297B": "&suplarr;", "\u297C": "&lfisht;", "\u297D": "&rfisht;", "\u297E": "&ufisht;", "\u297F": "&dfisht;", "\u2985": "&lopar;", "\u2986": "&ropar;", "\u298B": "&lbrke;", "\u298C": "&rbrke;", "\u298D": "&lbrkslu;", "\u298E": "&rbrksld;", "\u298F": "&lbrksld;", "\u2990": "&rbrkslu;", "\u2991": "&langd;", "\u2992": "&rangd;", "\u2993": "&lparlt;", "\u2994": "&rpargt;", "\u2995": "&gtlPar;", "\u2996": "&ltrPar;", "\u299A": "&vzigzag;", "\u299C": "&vangrt;", "\u299D": "&angrtvbd;", "\u29A4": "&ange;", "\u29A5": "&range;", "\u29A6": "&dwangle;", "\u29A7": "&uwangle;", "\u29A8": "&angmsdaa;", "\u29A9": "&angmsdab;", "\u29AA": "&angmsdac;", "\u29AB": "&angmsdad;", "\u29AC": "&angmsdae;", "\u29AD": "&angmsdaf;", "\u29AE": "&angmsdag;", "\u29AF": "&angmsdah;", "\u29B0": "&bemptyv;", "\u29B1": "&demptyv;", "\u29B2": "&cemptyv;", "\u29B3": "&raemptyv;", "\u29B4": "&laemptyv;", "\u29B5": "&ohbar;", "\u29B6": "&omid;", "\u29B7": "&opar;", "\u29B9": "&operp;", "\u29BB": "&olcross;", "\u29BC": "&odsold;", "\u29BE": "&olcir;", "\u29BF": "&ofcir;", "\u29C0": "&olt;", "\u29C1": "&ogt;", "\u29C2": "&cirscir;", "\u29C3": "&cirE;", "\u29C4": "&solb;", "\u29C5": "&bsolb;", "\u29C9": "&boxbox;", "\u29CD": "&trisb;", "\u29CE": "&rtriltri;", "\u29CF": "&LeftTriangleBar;", "\u29CF\u0338": "&NotLeftTriangleBar;", "\u29D0": "&RightTriangleBar;", "\u29D0\u0338": "&NotRightTriangleBar;", "\u29DC": "&iinfin;", "\u29DD": "&infintie;", "\u29DE": "&nvinfin;", "\u29E3": "&eparsl;", "\u29E4": "&smeparsl;", "\u29E5": "&eqvparsl;", "\u29EB": "&lozf;", "\u29F4": "&RuleDelayed;", "\u29F6": "&dsol;", "\u2A00": "&xodot;", "\u2A01": "&bigoplus;", "\u2A02": "&bigotimes;", "\u2A04": "&biguplus;", "\u2A06": "&bigsqcup;", "\u2A0C": "&iiiint;", "\u2A0D": "&fpartint;", "\u2A10": "&cirfnint;", "\u2A11": "&awint;", "\u2A12": "&rppolint;", "\u2A13": "&scpolint;", "\u2A14": "&npolint;", "\u2A15": "&pointint;", "\u2A16": "&quatint;", "\u2A17": "&intlarhk;", "\u2A22": "&pluscir;", "\u2A23": "&plusacir;", "\u2A24": "&simplus;", "\u2A25": "&plusdu;", "\u2A26": "&plussim;", "\u2A27": "&plustwo;", "\u2A29": "&mcomma;", "\u2A2A": "&minusdu;", "\u2A2D": "&loplus;", "\u2A2E": "&roplus;", "\u2A2F": "&Cross;", "\u2A30": "&timesd;", "\u2A31": "&timesbar;", "\u2A33": "&smashp;", "\u2A34": "&lotimes;", "\u2A35": "&rotimes;", "\u2A36": "&otimesas;", "\u2A37": "&Otimes;", "\u2A38": "&odiv;", "\u2A39": "&triplus;", "\u2A3A": "&triminus;", "\u2A3B": "&tritime;", "\u2A3C": "&iprod;", "\u2A3F": "&amalg;", "\u2A40": "&capdot;", "\u2A42": "&ncup;", "\u2A43": "&ncap;", "\u2A44": "&capand;", "\u2A45": "&cupor;", "\u2A46": "&cupcap;", "\u2A47": "&capcup;", "\u2A48": "&cupbrcap;", "\u2A49": "&capbrcup;", "\u2A4A": "&cupcup;", "\u2A4B": "&capcap;", "\u2A4C": "&ccups;", "\u2A4D": "&ccaps;", "\u2A50": "&ccupssm;", "\u2A53": "&And;", "\u2A54": "&Or;", "\u2A55": "&andand;", "\u2A56": "&oror;", "\u2A57": "&orslope;", "\u2A58": "&andslope;", "\u2A5A": "&andv;", "\u2A5B": "&orv;", "\u2A5C": "&andd;", "\u2A5D": "&ord;", "\u2A5F": "&wedbar;", "\u2A66": "&sdote;", "\u2A6A": "&simdot;", "\u2A6D": "&congdot;", "\u2A6D\u0338": "&ncongdot;", "\u2A6E": "&easter;", "\u2A6F": "&apacir;", "\u2A70": "&apE;", "\u2A70\u0338": "&napE;", "\u2A71": "&eplus;", "\u2A72": "&pluse;", "\u2A73": "&Esim;", "\u2A74": "&Colone;", "\u2A75": "&Equal;", "\u2A77": "&ddotseq;", "\u2A78": "&equivDD;", "\u2A79": "&ltcir;", "\u2A7A": "&gtcir;", "\u2A7B": "&ltquest;", "\u2A7C": "&gtquest;", "\u2A7D": "&les;", "\u2A7D\u0338": "&nles;", "\u2A7E": "&ges;", "\u2A7E\u0338": "&nges;", "\u2A7F": "&lesdot;", "\u2A80": "&gesdot;", "\u2A81": "&lesdoto;", "\u2A82": "&gesdoto;", "\u2A83": "&lesdotor;", "\u2A84": "&gesdotol;", "\u2A85": "&lap;", "\u2A86": "&gap;", "\u2A87": "&lne;", "\u2A88": "&gne;", "\u2A89": "&lnap;", "\u2A8A": "&gnap;", "\u2A8B": "&lesseqqgtr;", "\u2A8C": "&gEl;", "\u2A8D": "&lsime;", "\u2A8E": "&gsime;", "\u2A8F": "&lsimg;", "\u2A90": "&gsiml;", "\u2A91": "&lgE;", "\u2A92": "&glE;", "\u2A93": "&lesges;", "\u2A94": "&gesles;", "\u2A95": "&els;", "\u2A96": "&egs;", "\u2A97": "&elsdot;", "\u2A98": "&egsdot;", "\u2A99": "&el;", "\u2A9A": "&eg;", "\u2A9D": "&siml;", "\u2A9E": "&simg;", "\u2A9F": "&simlE;", "\u2AA0": "&simgE;", "\u2AA1": "&LessLess;", "\u2AA1\u0338": "&NotNestedLessLess;", "\u2AA2": "&GreaterGreater;", "\u2AA2\u0338": "&NotNestedGreaterGreater;", "\u2AA4": "&glj;", "\u2AA5": "&gla;", "\u2AA6": "&ltcc;", "\u2AA7": "&gtcc;", "\u2AA8": "&lescc;", "\u2AA9": "&gescc;", "\u2AAA": "&smt;", "\u2AAB": "&lat;", "\u2AAC": "&smte;", "\u2AAC\uFE00": "&smtes;", "\u2AAD": "&late;", "\u2AAD\uFE00": "&lates;", "\u2AAE": "&bumpE;", "\u2AAF": "&preceq;", "\u2AAF\u0338": "&NotPrecedesEqual;", "\u2AB0": "&SucceedsEqual;", "\u2AB0\u0338": "&NotSucceedsEqual;", "\u2AB3": "&prE;", "\u2AB4": "&scE;", "\u2AB5": "&precneqq;", "\u2AB6": "&scnE;", "\u2AB7": "&precapprox;", "\u2AB8": "&succapprox;", "\u2AB9": "&precnapprox;", "\u2ABA": "&succnapprox;", "\u2ABB": "&Pr;", "\u2ABC": "&Sc;", "\u2ABD": "&subdot;", "\u2ABE": "&supdot;", "\u2ABF": "&subplus;", "\u2AC0": "&supplus;", "\u2AC1": "&submult;", "\u2AC2": "&supmult;", "\u2AC3": "&subedot;", "\u2AC4": "&supedot;", "\u2AC5": "&subE;", "\u2AC5\u0338": "&nsubE;", "\u2AC6": "&supseteqq;", "\u2AC6\u0338": "&nsupseteqq;", "\u2AC7": "&subsim;", "\u2AC8": "&supsim;", "\u2ACB": "&subsetneqq;", "\u2ACB\uFE00": "&vsubnE;", "\u2ACC": "&supnE;", "\u2ACC\uFE00": "&varsupsetneqq;", "\u2ACF": "&csub;", "\u2AD0": "&csup;", "\u2AD1": "&csube;", "\u2AD2": "&csupe;", "\u2AD3": "&subsup;", "\u2AD4": "&supsub;", "\u2AD5": "&subsub;", "\u2AD6": "&supsup;", "\u2AD7": "&suphsub;", "\u2AD8": "&supdsub;", "\u2AD9": "&forkv;", "\u2ADA": "&topfork;", "\u2ADB": "&mlcp;", "\u2AE4": "&Dashv;", "\u2AE6": "&Vdashl;", "\u2AE7": "&Barv;", "\u2AE8": "&vBar;", "\u2AE9": "&vBarv;", "\u2AEB": "&Vbar;", "\u2AEC": "&Not;", "\u2AED": "&bNot;", "\u2AEE": "&rnmid;", "\u2AEF": "&cirmid;", "\u2AF0": "&midcir;", "\u2AF1": "&topcir;", "\u2AF2": "&nhpar;", "\u2AF3": "&parsim;", "\u2AFD": "&parsl;", "\u2AFD\u20E5": "&nparsl;", \uFB00: "&fflig;", \uFB01: "&filig;", \uFB02: "&fllig;", \uFB03: "&ffilig;", \uFB04: "&ffllig;", "\u{1D49C}": "&Ascr;", "\u{1D49E}": "&Cscr;", "\u{1D49F}": "&Dscr;", "\u{1D4A2}": "&Gscr;", "\u{1D4A5}": "&Jscr;", "\u{1D4A6}": "&Kscr;", "\u{1D4A9}": "&Nscr;", "\u{1D4AA}": "&Oscr;", "\u{1D4AB}": "&Pscr;", "\u{1D4AC}": "&Qscr;", "\u{1D4AE}": "&Sscr;", "\u{1D4AF}": "&Tscr;", "\u{1D4B0}": "&Uscr;", "\u{1D4B1}": "&Vscr;", "\u{1D4B2}": "&Wscr;", "\u{1D4B3}": "&Xscr;", "\u{1D4B4}": "&Yscr;", "\u{1D4B5}": "&Zscr;", "\u{1D4B6}": "&ascr;", "\u{1D4B7}": "&bscr;", "\u{1D4B8}": "&cscr;", "\u{1D4B9}": "&dscr;", "\u{1D4BB}": "&fscr;", "\u{1D4BD}": "&hscr;", "\u{1D4BE}": "&iscr;", "\u{1D4BF}": "&jscr;", "\u{1D4C0}": "&kscr;", "\u{1D4C1}": "&lscr;", "\u{1D4C2}": "&mscr;", "\u{1D4C3}": "&nscr;", "\u{1D4C5}": "&pscr;", "\u{1D4C6}": "&qscr;", "\u{1D4C7}": "&rscr;", "\u{1D4C8}": "&sscr;", "\u{1D4C9}": "&tscr;", "\u{1D4CA}": "&uscr;", "\u{1D4CB}": "&vscr;", "\u{1D4CC}": "&wscr;", "\u{1D4CD}": "&xscr;", "\u{1D4CE}": "&yscr;", "\u{1D4CF}": "&zscr;", "\u{1D504}": "&Afr;", "\u{1D505}": "&Bfr;", "\u{1D507}": "&Dfr;", "\u{1D508}": "&Efr;", "\u{1D509}": "&Ffr;", "\u{1D50A}": "&Gfr;", "\u{1D50D}": "&Jfr;", "\u{1D50E}": "&Kfr;", "\u{1D50F}": "&Lfr;", "\u{1D510}": "&Mfr;", "\u{1D511}": "&Nfr;", "\u{1D512}": "&Ofr;", "\u{1D513}": "&Pfr;", "\u{1D514}": "&Qfr;", "\u{1D516}": "&Sfr;", "\u{1D517}": "&Tfr;", "\u{1D518}": "&Ufr;", "\u{1D519}": "&Vfr;", "\u{1D51A}": "&Wfr;", "\u{1D51B}": "&Xfr;", "\u{1D51C}": "&Yfr;", "\u{1D51E}": "&afr;", "\u{1D51F}": "&bfr;", "\u{1D520}": "&cfr;", "\u{1D521}": "&dfr;", "\u{1D522}": "&efr;", "\u{1D523}": "&ffr;", "\u{1D524}": "&gfr;", "\u{1D525}": "&hfr;", "\u{1D526}": "&ifr;", "\u{1D527}": "&jfr;", "\u{1D528}": "&kfr;", "\u{1D529}": "&lfr;", "\u{1D52A}": "&mfr;", "\u{1D52B}": "&nfr;", "\u{1D52C}": "&ofr;", "\u{1D52D}": "&pfr;", "\u{1D52E}": "&qfr;", "\u{1D52F}": "&rfr;", "\u{1D530}": "&sfr;", "\u{1D531}": "&tfr;", "\u{1D532}": "&ufr;", "\u{1D533}": "&vfr;", "\u{1D534}": "&wfr;", "\u{1D535}": "&xfr;", "\u{1D536}": "&yfr;", "\u{1D537}": "&zfr;", "\u{1D538}": "&Aopf;", "\u{1D539}": "&Bopf;", "\u{1D53B}": "&Dopf;", "\u{1D53C}": "&Eopf;", "\u{1D53D}": "&Fopf;", "\u{1D53E}": "&Gopf;", "\u{1D540}": "&Iopf;", "\u{1D541}": "&Jopf;", "\u{1D542}": "&Kopf;", "\u{1D543}": "&Lopf;", "\u{1D544}": "&Mopf;", "\u{1D546}": "&Oopf;", "\u{1D54A}": "&Sopf;", "\u{1D54B}": "&Topf;", "\u{1D54C}": "&Uopf;", "\u{1D54D}": "&Vopf;", "\u{1D54E}": "&Wopf;", "\u{1D54F}": "&Xopf;", "\u{1D550}": "&Yopf;", "\u{1D552}": "&aopf;", "\u{1D553}": "&bopf;", "\u{1D554}": "&copf;", "\u{1D555}": "&dopf;", "\u{1D556}": "&eopf;", "\u{1D557}": "&fopf;", "\u{1D558}": "&gopf;", "\u{1D559}": "&hopf;", "\u{1D55A}": "&iopf;", "\u{1D55B}": "&jopf;", "\u{1D55C}": "&kopf;", "\u{1D55D}": "&lopf;", "\u{1D55E}": "&mopf;", "\u{1D55F}": "&nopf;", "\u{1D560}": "&oopf;", "\u{1D561}": "&popf;", "\u{1D562}": "&qopf;", "\u{1D563}": "&ropf;", "\u{1D564}": "&sopf;", "\u{1D565}": "&topf;", "\u{1D566}": "&uopf;", "\u{1D567}": "&vopf;", "\u{1D568}": "&wopf;", "\u{1D569}": "&xopf;", "\u{1D56A}": "&yopf;", "\u{1D56B}": "&zopf;" }, aliases: { "&acute;": "\xB4", "&alefsym;": "\u2135", "&AMP;": "&", "&ang;": "\u2220", "&angst;": "\xC5", "&ap;": "\u2248", "&ApplyFunction;": "\u2061", "&approxeq;": "\u224A", "&Assign;": "\u2254", "&asymp;": "\u2248", "&asympeq;": "\u224D", "&backcong;": "\u224C", "&backsim;": "\u223D", "&Backslash;": "\u2216", "&Barwed;": "\u2306", "&barwedge;": "\u2305", "&becaus;": "\u2235", "&because;": "\u2235", "&bepsi;": "\u03F6", "&bernou;": "\u212C", "&Bernoullis;": "\u212C", "&bigodot;": "\u2A00", "&bigstar;": "\u2605", "&bigvee;": "\u22C1", "&bigwedge;": "\u22C0", "&blacklozenge;": "\u29EB", "&blacksquare;": "\u25AA", "&bot;": "\u22A5", "&bottom;": "\u22A5", "&boxh;": "\u2500", "&boxtimes;": "\u22A0", "&bprime;": "\u2035", "&breve;": "\u02D8", "&bsime;": "\u22CD", "&bullet;": "\u2022", "&bumpe;": "\u224F", "&Bumpeq;": "\u224E", "&bumpeq;": "\u224F", "&caron;": "\u02C7", "&Cayleys;": "\u212D", "&cedil;": "\xB8", "&centerdot;": "\xB7", "&checkmark;": "\u2713", "&circlearrowleft;": "\u21BA", "&circlearrowright;": "\u21BB", "&circledast;": "\u229B", "&circledcirc;": "\u229A", "&circleddash;": "\u229D", "&circledR;": "\xAE", "&circledS;": "\u24C8", "&CircleMinus;": "\u2296", "&cire;": "\u2257", "&ClockwiseContourIntegral;": "\u2232", "&CloseCurlyDoubleQuote;": "\u201D", "&CloseCurlyQuote;": "\u2019", "&clubsuit;": "\u2663", "&colone;": "\u2254", "&complement;": "\u2201", "&cong;": "\u2245", "&Conint;": "\u222F", "&conint;": "\u222E", "&Copf;": "\u2102", "&coprod;": "\u2210", "&COPY;": "\xA9", "&CounterClockwiseContourIntegral;": "\u2233", "&cuepr;": "\u22DE", "&cularr;": "\u21B6", "&curlyeqsucc;": "\u22DF", "&curvearrowright;": "\u21B7", "&cuvee;": "\u22CE", "&cuwed;": "\u22CF", "&dArr;": "\u21D3", "&dash;": "\u2010", "&dblac;": "\u02DD", "&DD;": "\u2145", "&dd;": "\u2146", "&ddagger;": "\u2021", "&ddarr;": "\u21CA", "&Del;": "\u2207", "&dharr;": "\u21C2", "&DiacriticalDot;": "\u02D9", "&DiacriticalGrave;": "`", "&diam;": "\u22C4", "&Diamond;": "\u22C4", "&diams;": "\u2666", "&die;": "\xA8", "&digamma;": "\u03DD", "&div;": "\xF7", "&divideontimes;": "\u22C7", "&dlcorn;": "\u231E", "&Dot;": "\xA8", "&doteq;": "\u2250", "&DotEqual;": "\u2250", "&dotminus;": "\u2238", "&dotplus;": "\u2214", "&dotsquare;": "\u22A1", "&DoubleDownArrow;": "\u21D3", "&DoubleLeftRightArrow;": "\u21D4", "&DoubleLeftTee;": "\u2AE4", "&DoubleLongLeftArrow;": "\u27F8", "&DoubleLongLeftRightArrow;": "\u27FA", "&DoubleRightArrow;": "\u21D2", "&DoubleUpDownArrow;": "\u21D5", "&DoubleVerticalBar;": "\u2225", "&DownArrow;": "\u2193", "&downarrow;": "\u2193", "&downharpoonleft;": "\u21C3", "&downharpoonright;": "\u21C2", "&DownLeftVector;": "\u21BD", "&DownRightVector;": "\u21C1", "&dtri;": "\u25BF", "&dtrif;": "\u25BE", "&duarr;": "\u21F5", "&duhar;": "\u296F", "&ecolon;": "\u2255", "&eDDot;": "\u2A77", "&eDot;": "\u2251", "&ee;": "\u2147", "&efDot;": "\u2252", "&Element;": "\u2208", "&emptyset;": "\u2205", "&emptyv;": "\u2205", "&epsilon;": "\u03B5", "&epsiv;": "\u03F5", "&eqcirc;": "\u2256", "&eqsim;": "\u2242", "&eqslantgtr;": "\u2A96", "&eqslantless;": "\u2A95", "&EqualTilde;": "\u2242", "&Equilibrium;": "\u21CC", "&equiv;": "\u2261", "&erDot;": "\u2253", "&Escr;": "\u2130", "&exist;": "\u2203", "&ExponentialE;": "\u2147", "&FilledVerySmallSquare;": "\u25AA", "&ForAll;": "\u2200", "&fork;": "\u22D4", "&frac12;": "\xBD", "&Fscr;": "\u2131", "&gE;": "\u2267", "&gel;": "\u22DB", "&geq;": "\u2265", "&geqslant;": "\u2A7E", "&ggg;": "\u22D9", "&gnapprox;": "\u2A8A", "&gnE;": "\u2269", "&gneq;": "\u2A88", "&GreaterEqual;": "\u2265", "&GreaterEqualLess;": "\u22DB", "&GreaterFullEqual;": "\u2267", "&GreaterLess;": "\u2277", "&GreaterSlantEqual;": "\u2A7E", "&gsim;": "\u2273", "&GT;": ">", "&Gt;": "\u226B", "&gtdot;": "\u22D7", "&gtrapprox;": "\u2A86", "&gtreqqless;": "\u2A8C", "&gtrless;": "\u2277", "&gtrsim;": "\u2273", "&gvnE;": "\u2269\uFE00", "&hamilt;": "\u210B", "&hbar;": "\u210F", "&heartsuit;": "\u2665", "&hksearow;": "\u2925", "&hkswarow;": "\u2926", "&hookleftarrow;": "\u21A9", "&hookrightarrow;": "\u21AA", "&Hscr;": "\u210B", "&hslash;": "\u210F", "&HumpDownHump;": "\u224E", "&iff;": "\u21D4", "&ii;": "\u2148", "&iiint;": "\u222D", "&Im;": "\u2111", "&image;": "\u2111", "&imagpart;": "\u2111", "&imath;": "\u0131", "&in;": "\u2208", "&int;": "\u222B", "&integers;": "\u2124", "&intercal;": "\u22BA", "&Intersection;": "\u22C2", "&intprod;": "\u2A3C", "&InvisibleComma;": "\u2063", "&Iscr;": "\u2110", "&isin;": "\u2208", "&it;": "\u2062", "&kappav;": "\u03F0", "&lang;": "\u27E8", "&Laplacetrf;": "\u2112", "&lArr;": "\u21D0", "&larrb;": "\u21E4", "&lcub;": "{", "&ldquo;": "\u201C", "&ldquor;": "\u201E", "&le;": "\u2264", "&LeftAngleBracket;": "\u27E8", "&LeftArrow;": "\u2190", "&Leftarrow;": "\u21D0", "&leftarrow;": "\u2190", "&LeftArrowRightArrow;": "\u21C6", "&leftarrowtail;": "\u21A2", "&LeftCeiling;": "\u2308", "&LeftDownVector;": "\u21C3", "&leftleftarrows;": "\u21C7", "&LeftRightArrow;": "\u2194", "&Leftrightarrow;": "\u21D4", "&leftrightarrow;": "\u2194", "&leftrightarrows;": "\u21C6", "&leftrightsquigarrow;": "\u21AD", "&LeftTee;": "\u22A3", "&leftthreetimes;": "\u22CB", "&LeftTriangle;": "\u22B2", "&LeftUpVector;": "\u21BF", "&LeftVector;": "\u21BC", "&lEg;": "\u2A8B", "&leg;": "\u22DA", "&leqq;": "\u2266", "&leqslant;": "\u2A7D", "&lessapprox;": "\u2A85", "&LessEqualGreater;": "\u22DA", "&LessFullEqual;": "\u2266", "&LessGreater;": "\u2276", "&lesssim;": "\u2272", "&LessSlantEqual;": "\u2A7D", "&lfloor;": "\u230A", "&lg;": "\u2276", "&lhard;": "\u21BD", "&lharu;": "\u21BC", "&Lleftarrow;": "\u21DA", "&lmoustache;": "\u23B0", "&lnapprox;": "\u2A89", "&lnE;": "\u2268", "&lneq;": "\u2A87", "&lobrk;": "\u27E6", "&LongLeftArrow;": "\u27F5", "&Longleftarrow;": "\u27F8", "&Longleftrightarrow;": "\u27FA", "&longleftrightarrow;": "\u27F7", "&longmapsto;": "\u27FC", "&Longrightarrow;": "\u27F9", "&longrightarrow;": "\u27F6", "&looparrowleft;": "\u21AB", "&LowerLeftArrow;": "\u2199", "&loz;": "\u25CA", "&lrcorner;": "\u231F", "&lrhar;": "\u21CB", "&Lscr;": "\u2112", "&lsh;": "\u21B0", "&lsim;": "\u2272", "&lsqb;": "[", "&lsquo;": "\u2018", "&lsquor;": "\u201A", "&LT;": "<", "&Lt;": "\u226A", "&ltdot;": "\u22D6", "&ltrie;": "\u22B4", "&ltrif;": "\u25C2", "&lvnE;": "\u2268\uFE00", "&malt;": "\u2720", "&mapsto;": "\u21A6", "&mapstodown;": "\u21A7", "&mapstoleft;": "\u21A4", "&mapstoup;": "\u21A5", "&measuredangle;": "\u2221", "&midast;": "*", "&middot;": "\xB7", "&minusb;": "\u229F", "&mldr;": "\u2026", "&mnplus;": "\u2213", "&mp;": "\u2213", "&Mscr;": "\u2133", "&mstpos;": "\u223E", "&multimap;": "\u22B8", "&nap;": "\u2249", "&natural;": "\u266E", "&ne;": "\u2260", "&nearr;": "\u2197", "&nearrow;": "\u2197", "&NegativeMediumSpace;": "\u200B", "&NegativeThickSpace;": "\u200B", "&NegativeThinSpace;": "\u200B", "&NegativeVeryThinSpace;": "\u200B", "&nequiv;": "\u2262", "&nesear;": "\u2928", "&NestedGreaterGreater;": "\u226B", "&NestedLessLess;": "\u226A", "&nexists;": "\u2204", "&ngE;": "\u2267\u0338", "&nge;": "\u2271", "&ngeqq;": "\u2267\u0338", "&ngeqslant;": "\u2A7E\u0338", "&ngt;": "\u226F", "&nGtv;": "\u226B\u0338", "&nharr;": "\u21AE", "&ni;": "\u220B", "&niv;": "\u220B", "&nlArr;": "\u21CD", "&nlarr;": "\u219A", "&nle;": "\u2270", "&nLeftrightarrow;": "\u21CE", "&nleq;": "\u2270", "&nleqq;": "\u2266\u0338", "&nleqslant;": "\u2A7D\u0338", "&nless;": "\u226E", "&nlt;": "\u226E", "&nmid;": "\u2224", "&NonBreakingSpace;": "\xA0", "&Nopf;": "\u2115", "&NotDoubleVerticalBar;": "\u2226", "&NotElement;": "\u2209", "&NotEqualTilde;": "\u2242\u0338", "&NotExists;": "\u2204", "&NotGreater;": "\u226F", "&NotGreaterEqual;": "\u2271", "&NotGreaterSlantEqual;": "\u2A7E\u0338", "&NotGreaterTilde;": "\u2275", "&NotHumpDownHump;": "\u224E\u0338", "&NotHumpEqual;": "\u224F\u0338", "&notinva;": "\u2209", "&NotLeftTriangle;": "\u22EA", "&NotLeftTriangleEqual;": "\u22EC", "&NotLessGreater;": "\u2278", "&NotLessLess;": "\u226A\u0338", "&NotLessSlantEqual;": "\u2A7D\u0338", "&NotLessTilde;": "\u2274", "&notni;": "\u220C", "&NotPrecedes;": "\u2280", "&NotReverseElement;": "\u220C", "&NotRightTriangle;": "\u22EB", "&NotSubset;": "\u2282\u20D2", "&NotSuperset;": "\u2283\u20D2", "&NotTildeEqual;": "\u2244", "&NotTildeFullEqual;": "\u2247", "&NotTildeTilde;": "\u2249", "&NotVerticalBar;": "\u2224", "&npar;": "\u2226", "&nprcue;": "\u22E0", "&npre;": "\u2AAF\u0338", "&nprec;": "\u2280", "&npreceq;": "\u2AAF\u0338", "&nRightarrow;": "\u21CF", "&nrightarrow;": "\u219B", "&nrtri;": "\u22EB", "&nrtrie;": "\u22ED", "&nsc;": "\u2281", "&nsccue;": "\u22E1", "&nsce;": "\u2AB0\u0338", "&nshortparallel;": "\u2226", "&nsim;": "\u2241", "&nsimeq;": "\u2244", "&nsmid;": "\u2224", "&nspar;": "\u2226", "&nsqsube;": "\u22E2", "&nsqsupe;": "\u22E3", "&nsube;": "\u2288", "&nsubset;": "\u2282\u20D2", "&nsubseteq;": "\u2288", "&nsubseteqq;": "\u2AC5\u0338", "&nsucc;": "\u2281", "&nsucceq;": "\u2AB0\u0338", "&nsupE;": "\u2AC6\u0338", "&nsupe;": "\u2289", "&nsupseteq;": "\u2289", "&ntgl;": "\u2279", "&ntriangleleft;": "\u22EA", "&ntrianglelefteq;": "\u22EC", "&ntrianglerighteq;": "\u22ED", "&nwarr;": "\u2196", "&odot;": "\u2299", "&ohm;": "\u03A9", "&oint;": "\u222E", "&oplus;": "\u2295", "&order;": "\u2134", "&oscr;": "\u2134", "&otimes;": "\u2297", "&OverBar;": "\u203E", "&par;": "\u2225", "&parallel;": "\u2225", "&PartialD;": "\u2202", "&phiv;": "\u03D5", "&phmmat;": "\u2133", "&plankv;": "\u210F", "&plusb;": "\u229E", "&PlusMinus;": "\xB1", "&pm;": "\xB1", "&Poincareplane;": "\u210C", "&Popf;": "\u2119", "&pr;": "\u227A", "&prap;": "\u2AB7", "&prcue;": "\u227C", "&pre;": "\u2AAF", "&preccurlyeq;": "\u227C", "&Precedes;": "\u227A", "&PrecedesEqual;": "\u2AAF", "&PrecedesTilde;": "\u227E", "&prnap;": "\u2AB9", "&prnE;": "\u2AB5", "&prnsim;": "\u22E8", "&Product;": "\u220F", "&Proportion;": "\u2237", "&Proportional;": "\u221D", "&propto;": "\u221D", "&prsim;": "\u227E", "&qint;": "\u2A0C", "&Qopf;": "\u211A", "&quaternions;": "\u210D", "&questeq;": "\u225F", "&QUOT;": '"', "&radic;": "\u221A", "&rang;": "\u27E9", "&rangle;": "\u27E9", "&Rarr;": "\u21A0", "&rArr;": "\u21D2", "&rarr;": "\u2192", "&rarrb;": "\u21E5", "&rarrlp;": "\u21AC", "&RBarr;": "\u2910", "&rBarr;": "\u290F", "&rbarr;": "\u290D", "&rbrace;": "}", "&rbrack;": "]", "&rceil;": "\u2309", "&rdquor;": "\u201D", "&Re;": "\u211C", "&real;": "\u211C", "&realpart;": "\u211C", "&reals;": "\u211D", "&REG;": "\xAE", "&ReverseEquilibrium;": "\u21CB", "&rfloor;": "\u230B", "&RightArrow;": "\u2192", "&Rightarrow;": "\u21D2", "&rightarrow;": "\u2192", "&RightArrowLeftArrow;": "\u21C4", "&rightarrowtail;": "\u21A3", "&rightharpoondown;": "\u21C1", "&rightharpoonup;": "\u21C0", "&rightrightarrows;": "\u21C9", "&rightsquigarrow;": "\u219D", "&RightTee;": "\u22A2", "&RightTeeArrow;": "\u21A6", "&rightthreetimes;": "\u22CC", "&RightTriangle;": "\u22B3", "&RightVector;": "\u21C0", "&rlarr;": "\u21C4", "&rlhar;": "\u21CC", "&rmoustache;": "\u23B1", "&robrk;": "\u27E7", "&Rrightarrow;": "\u21DB", "&Rscr;": "\u211B", "&Rsh;": "\u21B1", "&rsquor;": "\u2019", "&rtrie;": "\u22B5", "&rtrif;": "\u25B8", "&sc;": "\u227B", "&scap;": "\u2AB8", "&sccue;": "\u227D", "&sce;": "\u2AB0", "&scnap;": "\u2ABA", "&scsim;": "\u227F", "&searr;": "\u2198", "&searrow;": "\u2198", "&setminus;": "\u2216", "&setmn;": "\u2216", "&sfrown;": "\u2322", "&ShortDownArrow;": "\u2193", "&ShortLeftArrow;": "\u2190", "&shortmid;": "\u2223", "&ShortRightArrow;": "\u2192", "&ShortUpArrow;": "\u2191", "&sigmaf;": "\u03C2", "&sime;": "\u2243", "&slarr;": "\u2190", "&SmallCircle;": "\u2218", "&smallsetminus;": "\u2216", "&smid;": "\u2223", "&spades;": "\u2660", "&spar;": "\u2225", "&sqsube;": "\u2291", "&sqsubset;": "\u228F", "&sqsubseteq;": "\u2291", "&sqsup;": "\u2290", "&sqsupe;": "\u2292", "&sqsupseteq;": "\u2292", "&squ;": "\u25A1", "&square;": "\u25A1", "&SquareIntersection;": "\u2293", "&SquareSubset;": "\u228F", "&SquareSuperset;": "\u2290", "&SquareUnion;": "\u2294", "&squf;": "\u25AA", "&ssmile;": "\u2323", "&sstarf;": "\u22C6", "&strns;": "\xAF", "&sube;": "\u2286", "&subnE;": "\u2ACB", "&subne;": "\u228A", "&Subset;": "\u22D0", "&subset;": "\u2282", "&subseteq;": "\u2286", "&subseteqq;": "\u2AC5", "&Succeeds;": "\u227B", "&SucceedsSlantEqual;": "\u227D", "&succeq;": "\u2AB0", "&succneqq;": "\u2AB6", "&succnsim;": "\u22E9", "&succsim;": "\u227F", "&SuchThat;": "\u220B", "&Sum;": "\u2211", "&Sup;": "\u22D1", "&supE;": "\u2AC6", "&Superset;": "\u2283", "&SupersetEqual;": "\u2287", "&supne;": "\u228B", "&supset;": "\u2283", "&supseteq;": "\u2287", "&supsetneqq;": "\u2ACC", "&swarrow;": "\u2199", "&tbrk;": "\u23B4", "&tdot;": "\u20DB", "&Therefore;": "\u2234", "&therefore;": "\u2234", "&thetav;": "\u03D1", "&thickapprox;": "\u2248", "&thicksim;": "\u223C", "&thinsp;": "\u2009", "&thkap;": "\u2248", "&thksim;": "\u223C", "&Tilde;": "\u223C", "&tilde;": "\u02DC", "&TildeEqual;": "\u2243", "&TildeTilde;": "\u2248", "&top;": "\u22A4", "&tosa;": "\u2929", "&TRADE;": "\u2122", "&triangleleft;": "\u25C3", "&trianglelefteq;": "\u22B4", "&triangleright;": "\u25B9", "&trianglerighteq;": "\u22B5", "&trie;": "\u225C", "&twixt;": "\u226C", "&twoheadleftarrow;": "\u219E", "&uArr;": "\u21D1", "&uharr;": "\u21BE", "&ulcorn;": "\u231C", "&uml;": "\xA8", "&UnderBar;": "_", "&UnderBracket;": "\u23B5", "&Union;": "\u22C3", "&UpArrow;": "\u2191", "&Uparrow;": "\u21D1", "&uparrow;": "\u2191", "&UpArrowDownArrow;": "\u21C5", "&updownarrow;": "\u2195", "&UpEquilibrium;": "\u296E", "&upharpoonleft;": "\u21BF", "&upharpoonright;": "\u21BE", "&uplus;": "\u228E", "&UpperLeftArrow;": "\u2196", "&Upsi;": "\u03D2", "&upsilon;": "\u03C5", "&UpTee;": "\u22A5", "&urcorn;": "\u231D", "&utri;": "\u25B5", "&utrif;": "\u25B4", "&uuarr;": "\u21C8", "&varepsilon;": "\u03F5", "&varnothing;": "\u2205", "&varphi;": "\u03D5", "&varpi;": "\u03D6", "&varpropto;": "\u221D", "&vArr;": "\u21D5", "&varr;": "\u2195", "&varrho;": "\u03F1", "&varsigma;": "\u03C2", "&varsubsetneq;": "\u228A\uFE00", "&varsubsetneqq;": "\u2ACB\uFE00", "&varsupsetneq;": "\u228B\uFE00", "&vartheta;": "\u03D1", "&vartriangleright;": "\u22B3", "&vDash;": "\u22A8", "&Vee;": "\u22C1", "&vee;": "\u2228", "&verbar;": "|", "&Vert;": "\u2016", "&VerticalBar;": "\u2223", "&VerticalLine;": "|", "&VerticalTilde;": "\u2240", "&VeryThinSpace;": "\u200A", "&vltri;": "\u22B2", "&vnsup;": "\u2283\u20D2", "&vprop;": "\u221D", "&vsupnE;": "\u2ACC\uFE00", "&Wedge;": "\u22C0", "&wedge;": "\u2227", "&weierp;": "\u2118", "&wreath;": "\u2240", "&xcap;": "\u22C2", "&xcirc;": "\u25EF", "&xcup;": "\u22C3", "&xdtri;": "\u25BD", "&xharr;": "\u27F7", "&xlarr;": "\u27F5", "&xoplus;": "\u2A01", "&xotime;": "\u2A02", "&xrArr;": "\u27F9", "&xrarr;": "\u27F6", "&xsqcup;": "\u2A06", "&xuplus;": "\u2A04", "&xutri;": "\u25B3", "&zeetrf;": "\u2128" } };

// src-js/core/php-builtin-codecs.js
var entityTable = (table, flags, encoding) => {
  if (encoding !== null && encoding !== void 0 && !/^utf-?8$/i.test(encoding)) throw new RangeError("Frontend HTML entities support UTF-8 encoding only");
  const base = html_entities_default[flags & 48], quotes = flags & 3;
  if (!base || ![0, 1].includes(table)) throw failure("ValueError", "Invalid HTML translation table");
  return Object.fromEntries(Object.entries(base).filter(([char]) => (table === 1 || ["&", "<", ">", '"', "'"].includes(char)) && (char !== '"' || quotes & 2) && (char !== "'" || quotes === 3)));
};
var decodeEntities = (input, flags, encoding, special = false) => {
  const table = entityTable(special ? 0 : 1, flags, encoding), reverse = Object.fromEntries(Object.entries(table).map(([key, value]) => [value, key]));
  return input.replace(/&(?:#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (entity) => {
    if (reverse[entity] !== void 0) return reverse[entity];
    if (!special && (flags & 48) === 48 && Object.hasOwn(html_entities_default.aliases, entity)) {
      const value = html_entities_default.aliases[entity];
      return value === '"' && !(flags & 2) || value === "'" && (flags & 3) !== 3 ? entity : value;
    }
    if (!entity.startsWith("&#")) return entity;
    const code = entity[2].toLowerCase() === "x" ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1));
    if (code < 1 || code > 1114111 || code >= 55296 && code <= 57343 || code === 34 && !(flags & 2) || code === 39 && (flags & 3) !== 3) return entity;
    const doctype = flags & 48;
    if (code < 32 && ![9, 10, 13].includes(code) || (doctype === 0 || doctype === 48) && code >= 127 && code <= 159 || doctype === 48 && code === 13 || doctype !== 0 && (code & 65535) >= 65534 || doctype === 48 && code >= 64976 && code <= 65007) return entity;
    if (special && ![34, 39, 38, 60, 62].includes(code)) return entity;
    return String.fromCodePoint(code);
  });
};
var runStringCodecs = (name, items, context) => {
  const [a, b, c, d] = items.map((item) => item.value), result = (value, kind = phpType(value)) => ({ value, kind });
  if (name === "md5" || name === "sha1") {
    const digest = hashAlgorithms[name](bytes(a));
    return result(b ? text(digest) : Array.from(digest, (part) => part.toString(16).padStart(2, "0")).join(""));
  }
  if (name === "crc32") {
    let crc = -1;
    for (const byte of bytes(a)) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = crc & 1 ? crc >>> 1 ^ 3988292384 : crc >>> 1;
    }
    return result((crc ^ -1) >>> 0);
  }
  if (name === "get_html_translation_table") return result(makeArray(Object.entries(entityTable(a, b, c))));
  if (name === "html_entity_decode") return result(decodeEntities(a, b, c));
  if (name === "htmlspecialchars_decode") return result(decodeEntities(a, b, "UTF-8", true));
  if (name === "htmlspecialchars" || name === "htmlentities") {
    const table = entityTable(name === "htmlspecialchars" ? 0 : 1, b, c);
    const parts = a.split(/(&(?:#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);)/g);
    const replace = (value) => {
      let output = "";
      const chars = [...value];
      for (let i = 0; i < chars.length; i++) {
        const double = chars[i] + (chars[i + 1] || "");
        if (table[double]) {
          output += table[double];
          i++;
        } else output += table[chars[i]] ?? chars[i];
      }
      return output;
    };
    return result(parts.map((part) => !d && /^&/.test(part) && decodeEntities(part, b | 3, c) !== part ? part : replace(part)).join(""));
  }
  if (name === "convert_uuencode") {
    const input = bytes(a), encode2 = (n) => String.fromCharCode(n ? n + 32 : 96), lines = [];
    for (let offset = 0; offset < input.length; offset += 45) {
      const line = input.subarray(offset, offset + 45);
      let output = encode2(line.length);
      for (let i = 0; i < line.length; i += 3) {
        const x = line[i], y = line[i + 1] || 0, z = line[i + 2] || 0;
        output += encode2(x >> 2) + encode2((x << 4 | y >> 4) & 63) + encode2((y << 2 | z >> 6) & 63) + encode2(z & 63);
      }
      lines.push(output);
    }
    return result(lines.join("\n") + (lines.length ? "\n" : "") + "`\n");
  }
  if (name === "convert_uudecode") {
    const output = [];
    let valid2 = false;
    for (const line of a.split(/\r?\n/)) {
      if (!line.length) continue;
      const length = line.charCodeAt(0) - 32 & 63;
      if (length === 0) {
        valid2 = true;
        break;
      }
      if (length > 45 || line.length < 1 + Math.ceil(length / 3) * 4) {
        warn(context, "convert_uudecode(): parameter is not a valid uuencoded string");
        return result(false);
      }
      const current = [];
      for (let i = 1; i < line.length; i += 4) {
        const x = line.charCodeAt(i) - 32 & 63, y = line.charCodeAt(i + 1) - 32 & 63, z = line.charCodeAt(i + 2) - 32 & 63, w = line.charCodeAt(i + 3) - 32 & 63;
        current.push((x << 2 | y >> 4) & 255, (y << 4 | z >> 2) & 255, (z << 6 | w) & 255);
      }
      output.push(...current.slice(0, length));
      valid2 = true;
    }
    if (!valid2) {
      warn(context, "convert_uudecode(): parameter is not a valid uuencoded string");
      return result(false);
    }
    return result(text(Uint8Array.from(output)));
  }
  if (name === "quoted_printable_decode") return result(fromByteString(byteString(a).replace(/=[\t ]*(?:\r\n|\r|\n)|=([0-9a-f]{2})/gi, (_, hex) => hex ? String.fromCharCode(parseInt(hex, 16)) : "")));
  if (name === "quoted_printable_encode") {
    const input = bytes(a), lines = [];
    let line = "";
    for (let i = 0; i < input.length; i++) {
      const byte = input[i];
      if (byte === 13 && input[i + 1] === 10) {
        lines.push(line);
        line = "";
        i++;
        continue;
      }
      const next2 = input[i + 1], encoded = byte === 61 || byte < 32 && byte !== 9 || byte > 126 || byte === 32 && (next2 === 13 || next2 === void 0) ? "=" + byte.toString(16).padStart(2, "0").toUpperCase() : String.fromCharCode(byte);
      if (line.length + encoded.length > 75) {
        lines.push(line + "=");
        line = "";
      }
      line += encoded;
    }
    lines.push(line);
    return result(lines.join("\r\n"));
  }
  if (name === "soundex") {
    const letters = asciiUpper(a).replace(/[^A-Z]/g, "");
    if (!letters) return result("0000");
    const codes = "01230120022455012623010202";
    let output = letters[0], previous = codes[letters.charCodeAt(0) - 65];
    for (const letter of letters.slice(1)) {
      const code = codes[letter.charCodeAt(0) - 65];
      if (code !== previous && code !== "0") output += code;
      previous = code;
      if (output.length === 4) break;
    }
    return result(output.padEnd(4, "0"));
  }
  if (name === "similar_text") {
    const x = byteString(a), y = byteString(b);
    const compare2 = (left, right, depth = 0) => {
      if (depth > 128) throw limit("similar_text(): recursion limit exceeded");
      let size = 0, p = 0, q = 0;
      for (let i = 0; i < left.length; i++) for (let j = 0; j < right.length; j++) {
        work(context);
        let k = 0;
        while (i + k < left.length && j + k < right.length && left[i + k] === right[j + k]) {
          work(context);
          k++;
        }
        if (k > size) {
          size = k;
          p = i;
          q = j;
        }
      }
      return size ? size + (p && q ? compare2(left.slice(0, p), right.slice(0, q), depth + 1) : 0) + (p + size < left.length && q + size < right.length ? compare2(left.slice(p + size), right.slice(q + size), depth + 1) : 0) : 0;
    };
    const count = compare2(x, y);
    items[2].ref?.set(x.length + y.length ? 200 * count / (x.length + y.length) : 0, "double");
    return result(count);
  }
  if (name === "strtok") {
    const storage = context.builtinMemory ||= {};
    if (b !== null) storage.tokenizer = { input: byteString(a), offset: 0 };
    const current = storage.tokenizer;
    if (!current) return result(false);
    const chars = new Set(byteString(b === null ? a : b));
    while (current.offset < current.input.length && chars.has(current.input[current.offset])) current.offset++;
    const start = current.offset;
    while (current.offset < current.input.length && !chars.has(current.input[current.offset])) current.offset++;
    return result(start >= current.input.length ? false : fromByteString(current.input.slice(start, current.offset++)));
  }
  if (name === "wordwrap") {
    if (!c.length || b < 0 || b === 0 && d) throw failure("ValueError", "wordwrap(): invalid width or empty break");
    const lines = byteString(a).split(byteString(c)), output = [];
    for (let line of lines) {
      while (line.length > b) {
        let cut = line.lastIndexOf(" ", b);
        if (cut <= 0) cut = d ? b : line.indexOf(" ", b);
        if (cut < 0 || cut === 0) break;
        output.push(line.slice(0, cut));
        line = line.slice(cut + (line[cut] === " " ? 1 : 0));
      }
      output.push(line);
    }
    return result(fromByteString(output.join(byteString(c))));
  }
  if (name === "strip_tags") {
    const allowed = new Set((isPhpArray(b) ? arrayEntries(b).map(([, value]) => phpString(value)) : typeof b === "string" ? [...b.matchAll(/<([a-z0-9]+)>/gi)].map((match) => match[1]) : []).map((tag) => tag.toLowerCase()));
    let output = "", i = 0;
    while (i < a.length) {
      if (a[i] === "\0") {
        i++;
        continue;
      }
      if (a[i] !== "<" || /\s/.test(a[i + 1] || "")) {
        output += a[i++];
        continue;
      }
      const start = i;
      let quote2 = "", depth = 0;
      if (a.startsWith("<!--", i)) {
        const end = a.indexOf("-->", i + 4);
        i = end < 0 ? a.length : end + 3;
        continue;
      }
      while (i < a.length) {
        const char = a[i++];
        if (quote2) {
          if (char === quote2) quote2 = "";
        } else if (char === '"' || char === "'") quote2 = char;
        else if (char === "<") depth++;
        else if (char === ">" && --depth <= 0) break;
      }
      const tag = a.slice(start, i), name2 = tag.match(/^<\/?([a-z0-9]+)/i)?.[1]?.toLowerCase();
      if (name2 && allowed.has(name2)) output += tag;
    }
    return result(output);
  }
  if (name === "str_word_count") {
    if (![0, 1, 2].includes(b)) throw failure("ValueError", "str_word_count(): format must be 0, 1 or 2");
    const input = byteString(a), mask = byteString(c ?? ""), extra = /* @__PURE__ */ new Set(), words = [];
    let start = -1;
    for (let i = 0; i < mask.length; i++) {
      if (mask.slice(i + 1, i + 3) === ".." && mask[i + 3] && mask[i] <= mask[i + 3]) {
        for (let code = mask.charCodeAt(i); code <= mask.charCodeAt(i + 3); code++) extra.add(String.fromCharCode(code));
        i += 3;
      } else extra.add(mask[i]);
    }
    for (let i = 0; i <= input.length; i++) {
      const char = input[i], valid2 = char !== void 0 && (/[a-zA-Z]/.test(char) || extra.has(char) || (char === "'" || char === "-") && i > 0 && i < input.length - 1);
      if (valid2 && start < 0) start = i;
      if (!valid2 && start >= 0) {
        words.push([start, fromByteString(input.slice(start, i))]);
        start = -1;
      }
    }
    return result(b === 0 ? words.length : b === 1 ? words.map(([, word]) => word) : makeArray(words));
  }
  if (name === "str_getcsv") {
    if (!items[3].provided && (context.source?.phpVersion ?? 80400) >= 80400) warn(context, "str_getcsv(): the escape parameter must be provided explicitly", "PHP_DEPRECATED");
    if (bytes(b).length !== 1 || bytes(c).length !== 1 || d !== "" && bytes(d).length !== 1) throw failure("ValueError", "str_getcsv(): delimiter, enclosure and escape must be single bytes");
    if (a === "") return result([null]);
    const values2 = [];
    let field = "", quoted = false, start = true;
    for (let i = 0; i < a.length; i++) {
      const char = a[i];
      if (quoted) {
        if (d && char === d && a[i + 1] === c) {
          field += char + a[++i];
        } else if (char === c) {
          if (a[i + 1] === c) {
            field += c;
            i++;
          } else quoted = false;
        } else field += char;
      } else if (start && char === c) {
        field = "";
        quoted = true;
        start = false;
      } else if (char === b) {
        values2.push(field);
        field = "";
        start = true;
      } else if (char === "\r" || char === "\n") break;
      else {
        field += char;
        if (!/\s/.test(char)) start = false;
      }
    }
    values2.push(field);
    return result(values2);
  }
  if (name === "parse_str") {
    let output = makeArray();
    const parts = a.split("&");
    if (parts.length > 1e3) throw limit("parse_str(): input exceeds 1000 variables");
    const decode3 = (value) => fromByteString(byteString(value).replaceAll("+", " ").replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
    for (const part of parts) {
      if (!part) continue;
      const equal = part.indexOf("="), raw = decode3(equal < 0 ? part : part.slice(0, equal)), value = decode3(equal < 0 ? "" : part.slice(equal + 1));
      const match = raw.match(/^([^\[]+)((?:\[[^\]]*\])*)/);
      if (!match) continue;
      const keys = [match[1].trimStart().replace(/[ .]/g, "_"), ...[...match[2].matchAll(/\[([^\]]*)\]/g)].map((m) => m[1])];
      if (keys.length > 64) throw limit("parse_str(): nesting exceeds 64 levels");
      const write = (array2, index) => {
        array2 = isPhpArray(array2) ? array2 : makeArray();
        const key = keys[index];
        return arrayWrite(array2, key, index === keys.length - 1 ? value : write(array2[key], index + 1), index === keys.length - 1 ? "string" : "array", context, key === "");
      };
      output = write(output, 0);
    }
    items[1].ref.set(output, "array");
    return result(null);
  }
  return null;
};

// src-js/core/php-metaphone.js
var metaphone = (input, maximum, context) => {
  if (maximum < 0) throw failure("ValueError", "metaphone(): max_phonemes must be greater than or equal to 0");
  const word = asciiUpper(byteString(input)).split("\0")[0];
  const letter = (offset) => word[offset] || "", vowel = (char) => /^[AEIOU]$/.test(char), soft = (char) => /^[EIY]$/.test(char);
  let index = word.search(/[A-Z]/), output = "";
  if (index < 0) return output;
  const first = letter(index), second = letter(index + 1);
  if (first === "A" && second === "E") {
    output = "E";
    index += 2;
  } else if (vowel(first)) {
    output = first;
    index++;
  } else if (/^[GKP]$/.test(first) && second === "N") {
    output = "N";
    index += 2;
  } else if (first === "W" && (second === "R" || second === "H" || vowel(second))) {
    output = second === "R" ? "R" : "W";
    index += 2;
  } else if (first === "X") {
    output = "S";
    index++;
  }
  for (; index < word.length && (!maximum || output.length < maximum); index++) {
    work(context);
    const current = letter(index), previous = letter(index - 1), next2 = letter(index + 1), after = letter(index + 2);
    if (current === previous && current !== "C") continue;
    let sound = "";
    switch (current) {
      case "B":
        sound = previous === "M" ? "" : "B";
        break;
      case "C":
        if (soft(next2)) sound = next2 === "I" && after === "A" ? "X" : previous === "S" ? "" : "S";
        else if (next2 === "H") {
          sound = "X";
          index++;
        } else sound = "K";
        break;
      case "D":
        if (next2 === "G" && soft(after)) {
          sound = "J";
          index++;
        } else sound = "T";
        break;
      case "G":
        if (next2 === "H") {
          if (!/^[BDH]$/.test(letter(index - 3)) && letter(index - 4) !== "H") {
            sound = "F";
            index++;
          }
        } else if (next2 === "N") sound = !/^[A-Z]$/.test(after) || after === "E" && letter(index + 3) === "D" ? "" : "K";
        else sound = soft(next2) && previous !== "G" ? "J" : "K";
        break;
      case "H":
        sound = vowel(next2) && !/^[CGPST]$/.test(previous) ? "H" : "";
        break;
      case "K":
        sound = previous === "C" ? "" : "K";
        break;
      case "P":
        sound = next2 === "H" ? "F" : "P";
        break;
      case "Q":
        sound = "K";
        break;
      case "S":
        if (next2 === "H") {
          sound = "X";
          index++;
        } else sound = next2 === "I" && /^[OA]$/.test(after) ? "X" : "S";
        break;
      case "T":
        if (next2 === "I" && /^[OA]$/.test(after)) sound = "X";
        else if (next2 === "H") {
          sound = "0";
          index++;
        } else sound = next2 === "C" && after === "H" ? "" : "T";
        break;
      case "V":
        sound = "F";
        break;
      case "W":
      case "Y":
        sound = vowel(next2) ? current : "";
        break;
      case "X":
        sound = "KS";
        break;
      case "Z":
        sound = "S";
        break;
      default:
        sound = /^[FJLMNR]$/.test(current) ? current : "";
    }
    output += sound;
  }
  return bounded(output);
};

// src-js/core/php-builtin-strings.js
var valueError = (message) => {
  throw failure("ValueError", message);
};
var characterMask = (mask) => {
  const chars = /* @__PURE__ */ new Set();
  for (let i = 0; i < mask.length; i++) {
    if (mask.slice(i + 1, i + 3) === ".." && mask[i + 3] && mask.charCodeAt(i) <= mask.charCodeAt(i + 3)) {
      for (let c = mask.charCodeAt(i); c <= mask.charCodeAt(i + 3); c++) chars.add(String.fromCharCode(c));
      i += 3;
    } else chars.add(mask[i]);
  }
  return chars;
};
var offsetAt = (offset, size) => offset < 0 ? Math.max(0, size + offset) : Math.min(offset, size);
var runStrings = (name, items, context) => {
  const [a, b, c, d, e] = items.map((item) => item.value);
  const result = (value, kind = phpType(value)) => ({ value, kind });
  if (name === "metaphone") return result(metaphone(a, b, context));
  if (["strpos", "stripos", "strrpos", "strripos"].includes(name)) {
    let input = byteString(a), needle = byteString(b);
    const offset = c;
    if (offset < -input.length || offset > input.length) valueError(`${name}(): offset must be contained in the haystack`);
    if (name.includes("ipos")) {
      input = asciiLower(input);
      needle = asciiLower(needle);
    }
    const start = offset < 0 ? input.length + offset : offset;
    const position = name.startsWith("strr") ? offset < 0 ? input.lastIndexOf(needle, start) : input.lastIndexOf(needle) : input.indexOf(needle, start);
    return result(position < 0 || name.startsWith("strr") && offset >= 0 && position < start ? false : position);
  }
  if (["strstr", "stristr", "strrchr"].includes(name)) {
    const input = byteString(a), needle = byteString(b);
    const position = name === "strrchr" ? input.lastIndexOf(needle.slice(0, 1)) : name === "stristr" ? asciiLower(input).indexOf(asciiLower(needle)) : input.indexOf(needle);
    return result(position < 0 ? false : fromByteString(c ? input.slice(0, position) : input.slice(position)));
  }
  if (["strcmp", "strcasecmp", "strncmp", "strncasecmp", "strnatcmp", "strnatcasecmp", "substr_compare"].includes(name)) {
    let x = byteString(a), y = byteString(b), insensitive = name.includes("casecmp");
    if (name.startsWith("strnat")) return result(naturalCompare(a, b, insensitive));
    if (name === "substr_compare") {
      if (c > x.length) valueError("substr_compare(): offset must be contained in string");
      if (d !== null && d < 0) valueError("substr_compare(): length must be greater than or equal to 0");
      x = x.slice(offsetAt(c, x.length));
      insensitive = e;
      if (d !== null) {
        x = x.slice(0, d);
        y = y.slice(0, d);
      }
    } else if (name === "strncmp" || name === "strncasecmp") {
      if (c < 0) valueError(`${name}(): length must be greater than or equal to 0`);
      x = x.slice(0, c);
      y = y.slice(0, c);
    }
    if (insensitive) {
      x = asciiLower(x);
      y = asciiLower(y);
    }
    return result(x === y ? 0 : x < y ? -1 : 1);
  }
  if (name === "substr_count") {
    const input = byteString(a), needle = byteString(b);
    if (needle === "") valueError("substr_count(): needle cannot be empty");
    if (c < -input.length || c > input.length) valueError("substr_count(): offset must be contained in haystack");
    const start = c < 0 ? input.length + c : c, length = d === null ? input.length - start : d < 0 ? input.length - start + d : d;
    if (length < 0 || start + length > input.length) valueError("substr_count(): length must be contained in haystack");
    const part = input.slice(start, start + length);
    let count = 0, offset = 0, found;
    while ((found = part.indexOf(needle, offset)) !== -1) {
      count++;
      offset = found + needle.length;
    }
    return result(count);
  }
  if (name === "substr_replace") {
    const replace = (value, replacement, start, length) => {
      const input = byteString(value);
      start = offsetAt(start, input.length);
      const end = length === null ? input.length : length < 0 ? Math.max(start, input.length + length) : Math.min(input.length, start + length);
      return fromByteString(input.slice(0, start) + byteString(replacement) + input.slice(end));
    };
    if (typeof a === "string") {
      if (isPhpArray(c) || isPhpArray(d)) throw new TypeError("substr_replace(): offset and length must be integers for a string input");
      return result(replace(a, isPhpArray(b) ? arrayEntries(b)[0]?.[1] ?? "" : b, c, d));
    }
    const at = (value, index, fallback) => isPhpArray(value) ? arrayEntries(value)[index]?.[1] ?? fallback : value;
    return result(makeArray(arrayEntries(a).map(([key, value], i) => [key, replace(phpString(value, arrayKind(a, key)), phpString(at(b, i, "")), at(c, i, 0), at(d, i, null))])));
  }
  if (name === "str_ireplace") {
    if (typeof a === "string" && isPhpArray(b)) throw new TypeError("str_ireplace(): replace must be a string when search is a string");
    const searches = typeof a === "string" ? [a] : arrayEntries(a).map(([key, value]) => phpString(value, arrayKind(a, key)));
    const replacements = typeof b === "string" ? null : arrayEntries(b).map(([key, value]) => phpString(value, arrayKind(b, key)));
    let count = 0;
    const replace = (value, kind) => {
      let input = phpString(value, kind);
      searches.forEach((search, i) => {
        if (!search.length) return;
        const folded = asciiLower(input), needle = asciiLower(search), replacement = replacements ? replacements[i] ?? "" : b;
        const parts = [];
        let start = 0, found;
        while ((found = folded.indexOf(needle, start)) >= 0) {
          work(context);
          parts.push(input.slice(start, found), replacement);
          count++;
          start = found + search.length;
        }
        parts.push(input.slice(start));
        if (parts.reduce((n, part) => n + part.length, 0) > 1048576) throw limit("String replacement exceeds 1 MiB");
        input = bounded(parts.join(""));
      });
      return input;
    };
    const output = typeof c === "string" ? replace(c, "string") : makeArray(arrayEntries(c).map(([key, value]) => [key, replace(value, arrayKind(c, key))]));
    items[3].ref?.set(count, "integer");
    return result(output);
  }
  if (name === "str_repeat") {
    if (b < 0) valueError("str_repeat(): times must be greater than or equal to 0");
    if (bytes(a).length * b > 1048576) throw limit("String repetition exceeds 1 MiB");
    return result(a.repeat(b));
  }
  if (name === "str_pad") {
    const input = byteString(a), pad = byteString(c), missing = b - input.length;
    if (missing <= 0) return result(a);
    if (!pad.length || ![0, 1, 2].includes(d)) valueError("str_pad(): invalid pad string or type");
    if (b > 1048576) throw limit("String padding exceeds 1 MiB");
    const fill = (length) => pad.repeat(Math.ceil(length / pad.length)).slice(0, length);
    const left = d === 0 ? missing : d === 2 ? Math.floor(missing / 2) : 0;
    return result(fromByteString(fill(left) + input + fill(missing - left)));
  }
  if (name === "str_split") {
    if (b < 1) valueError("str_split(): length must be greater than 0");
    const input = bytes(a), parts = [];
    arrayLimit(Math.ceil(input.length / b));
    for (let i = 0; i < input.length; i += b) parts.push(text(input.subarray(i, i + b)));
    return result(parts);
  }
  if (name === "strrev") return result(text(bytes(a).reverse()));
  if (name === "str_shuffle") {
    const input = bytes(a);
    for (let i = input.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [input[i], input[j]] = [input[j], input[i]];
    }
    return result(text(input));
  }
  if (name === "str_rot13") return result(a.replace(/[a-zA-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + ((char <= "Z" ? char <= "M" : char <= "m") ? 13 : -13))));
  if (name === "ord") return result(bytes(a)[0] ?? 0);
  if (name === "chr") return result(text(Uint8Array.of(a & 255)));
  if (name === "bin2hex") return result(Array.from(bytes(a), (value) => value.toString(16).padStart(2, "0")).join(""));
  if (name === "hex2bin") {
    if (a.length % 2 || /[^0-9a-f]/i.test(a)) {
      warn(context, "hex2bin(): input must be an even-length hexadecimal string");
      return result(false);
    }
    return result(text(Uint8Array.from(a.match(/../g) || [], (part) => parseInt(part, 16))));
  }
  if (name === "chunk_split") {
    if (b < 1) valueError("chunk_split(): length must be greater than 0");
    const input = bytes(a), parts = [];
    if (input.length + Math.max(1, Math.ceil(input.length / b)) * bytes(c).length > 1048576) throw limit("Chunked string exceeds 1 MiB");
    for (let i = 0; i < input.length; i += b) parts.push(text(input.subarray(i, i + b)), c);
    if (!input.length) parts.push(c);
    return result(bounded(parts.join("")));
  }
  if (name === "nl2br") return result(a.replace(/\r\n|\n\r|\r|\n/g, (newline) => (b ? "<br />" : "<br>") + newline));
  if (name === "addslashes") return result(a.replace(/[\\'"\0]/g, (char) => "\\" + (char === "\0" ? "0" : char)));
  if (name === "stripslashes") return result(a.replace(/\\([\s\S])|\\$/g, (_, char) => char === "0" ? "\0" : char ?? ""));
  if (name === "quotemeta") return result(a.replace(/[.\\+*?\[\]^$()]/g, "\\$&"));
  if (name === "addcslashes") {
    const chars = characterMask(byteString(b));
    return result(fromByteString(byteString(a).split("").map((char) => {
      if (!chars.has(char)) return char;
      const code = char.charCodeAt(0), escape = { 7: "a", 8: "b", 9: "t", 10: "n", 11: "v", 12: "f", 13: "r" }[code];
      return "\\" + (escape || (code < 32 || code >= 127 ? code.toString(8).padStart(3, "0") : char));
    }).join("")));
  }
  if (name === "stripcslashes") return result(fromByteString(byteString(a).replace(/\\(?:x([0-9a-f]{1,2})|([0-7]{1,3})|([\s\S]))/gi, (_, hex, oct, char) => hex ? String.fromCharCode(parseInt(hex, 16)) : oct ? String.fromCharCode(parseInt(oct, 8) & 255) : { a: "\x07", b: "\b", t: "	", n: "\n", v: "\v", f: "\f", r: "\r" }[char] ?? char)));
  if (name === "strspn" || name === "strcspn") {
    const input = byteString(a), start = offsetAt(c, input.length), end = d === null ? input.length : d < 0 ? Math.max(start, input.length + d) : start + d;
    const mask = new Set(byteString(b));
    let length = 0;
    for (const char of input.slice(start, end)) {
      if (mask.has(char) !== (name === "strspn")) break;
      length++;
    }
    return result(length);
  }
  if (name === "strpbrk") {
    if (b === "") valueError("strpbrk(): characters cannot be empty");
    const input = byteString(a), chars = new Set(byteString(b));
    const index = [...input].findIndex((char) => chars.has(char));
    return result(index < 0 ? false : fromByteString(input.slice(index)));
  }
  if (name === "count_chars") {
    if (b < 0 || b > 4) valueError("count_chars(): mode must be between 0 and 4");
    const counts = new Uint32Array(256);
    for (const char of bytes(a)) counts[char]++;
    const pairs = [...counts].map((count, key) => [key, count]).filter(([, count]) => b === 0 || (b === 1 || b === 3 ? count > 0 : count === 0));
    return result(b < 3 ? makeArray(pairs) : text(Uint8Array.from(pairs, ([key]) => key)));
  }
  if (name === "strtr") {
    if (isPhpArray(b)) {
      const replacements = arrayEntries(b).map(([key, value]) => [String(key), phpString(value, arrayKind(b, key))]).filter(([key]) => {
        if (!key.length) warn(context, "strtr(): empty keys are ignored");
        return key.length;
      }).sort((x, y) => y[0].length - x[0].length);
      let output = "";
      for (let i = 0; i < a.length; ) {
        work(context, replacements.length);
        const found = replacements.find(([key]) => a.startsWith(key, i));
        output += found ? found[1] : a[i];
        i += found ? found[0].length : 1;
        if (output.length > 1048576) throw limit("String translation exceeds 1 MiB");
      }
      return result(output);
    }
    if (c === null) throw new TypeError("strtr(): second argument must be an array when third argument is omitted");
    const from = byteString(b), to = byteString(c), map = /* @__PURE__ */ new Map();
    for (let i = 0; i < Math.min(from.length, to.length); i++) map.set(from[i], to[i]);
    return result(fromByteString([...byteString(a)].map((char) => map.get(char) ?? char).join("")));
  }
  if (name === "str_increment" || name === "str_decrement") {
    if (!/^[a-zA-Z0-9]+$/.test(a)) valueError(`${name}(): string must be non-empty and alphanumeric`);
    const chars = [...a], increment = name === "str_increment";
    let carry = true;
    for (let i = chars.length - 1; i >= 0 && carry; i--) {
      const char = chars[i], low = /[0-9]/.test(char) ? "0" : /[a-z]/.test(char) ? "a" : "A", high = low === "0" ? "9" : low === "a" ? "z" : "Z";
      if (char === (increment ? high : low)) chars[i] = increment ? low : high;
      else {
        chars[i] = String.fromCharCode(char.charCodeAt(0) + (increment ? 1 : -1));
        carry = false;
      }
    }
    if (carry) {
      if (increment) chars.unshift(/[0-9]/.test(a[0]) ? "1" : /[a-z]/.test(a[0]) ? "a" : "A");
      else {
        if (chars.length === 1) valueError("str_decrement(): string is not decrementable");
        chars.shift();
      }
    } else if (!increment && chars[0] === "0" && chars.length > 1) chars.shift();
    return result(chars.join(""));
  }
  if (name === "levenshtein") {
    const x = bytes(a), y = bytes(b);
    work(context, x.length * y.length);
    let row = Array.from({ length: y.length + 1 }, (_, i) => i * c);
    for (let i = 0; i < x.length; i++) {
      const next2 = [(i + 1) * e];
      for (let j = 0; j < y.length; j++) next2.push(Math.min(row[j + 1] + e, next2[j] + c, row[j] + (x[i] === y[j] ? 0 : d)));
      row = next2;
    }
    return result(row[y.length]);
  }
  if (["sprintf", "vsprintf", "printf", "vprintf"].includes(name)) {
    const values2 = name[0] === "v" ? arrayEntries(b).map(([key, value]) => ({ value, kind: arrayKind(b, key) })) : items.slice(1);
    const output = formatString(a, values2, context);
    if (name.endsWith("printf") && !name.endsWith("sprintf")) {
      console.log(output);
      return result(bytes(output).length);
    }
    return result(output);
  }
  if (name === "sscanf") return scanString(a, b, items.slice(2), context);
  return runStringCodecs(name, items, context);
};

// phpaml-proxy:php-builtin-mbstring.js
var runMbstring = (...args) => moduleExport("unicode", "runMbstring", true)?.(...args) ?? null;

// phpaml-proxy:php-builtin-bcmath.js
var runBCMath = (...args) => moduleExport("bcmath", "runBCMath", true)?.(...args) ?? null;

// src-js/core/php-function-introspection.js
var staticLocal = (expression, state, context) => {
  if (context.readOnly) throw new Error("Static locals require a frontend event");
  const store = context.functionStatics || (context.staticFields ||= /* @__PURE__ */ new Map()), id = expression.left, key = "@local:" + expression.right.scope + ":" + id;
  if (!store.has(key)) {
    const value = resolveData2(expression.right.value, state, context);
    store.set(key, { value, kind: resolveType(expression.right.value, state, context, value) });
  }
  context.localReferences[id] = { get: () => store.get(key), set: (value, kind) => {
    const item = { value: clonePhp(value), kind };
    store.set(key, item);
    return item;
  } };
  return null;
};
var runFunctionIntrospection = (name, items, context) => {
  if (!["func_get_args", "func_num_args", "func_get_arg"].includes(name)) return null;
  if (context.readOnly) throw new Error("Function argument introspection requires a frontend event");
  const args = context.functionArguments || [];
  if (name === "func_num_args") return { value: args.length, kind: "integer" };
  const get = (item) => item.id ? context.localReferences[item.id]?.get() || { value: context.locals[item.id], kind: context.localTypes[item.id] } : item;
  if (name === "func_get_args") return { value: makeArray(args.map((item, index2) => {
    const value = get(item);
    return [index2, clonePhp(value.value), value.kind];
  })), kind: "array" };
  const index = items[0].value;
  if (index < 0 || index >= args.length) throw Object.assign(new Error("func_get_arg(): Argument must be a valid argument index"), { name: "ValueError" });
  return get(args[index]);
};

// src-js/core/php-builtin-output.js
var preciseFloat = (value, precision) => {
  if (precision === -1 || !Number.isFinite(value) || value === 0) return floatString(value);
  let exponent = Number(Math.abs(value).toExponential().split("e")[1]);
  const buffer = new DataView(new ArrayBuffer(8));
  buffer.setFloat64(0, Math.abs(value));
  const bits = buffer.getBigUint64(0), binaryExponent = Number(bits >> 52n) & 2047;
  let numerator = (bits & (1n << 52n) - 1n) + (binaryExponent ? 1n << 52n : 0n), denominator = 1n;
  const shift = (binaryExponent || 1) - 1023 - 52, places = precision - exponent - 1;
  if (shift >= 0) numerator <<= BigInt(shift);
  else denominator <<= BigInt(-shift);
  if (places >= 0) numerator *= 10n ** BigInt(places);
  else denominator *= 10n ** BigInt(-places);
  let integer = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n > denominator || remainder * 2n === denominator && integer % 2n !== 0n) integer++;
  let digits = integer.toString();
  if (digits.length > precision) exponent++;
  digits = digits.replace(/0+$/, "");
  const sign = value < 0 ? "-" : "";
  if (exponent < -4 || exponent >= precision) return sign + digits[0] + "." + (digits.slice(1) || "0") + "E" + (exponent >= 0 ? "+" : "") + exponent;
  const point = exponent + 1;
  return sign + (point <= 0 ? "0." + "0".repeat(-point) + digits : point >= digits.length ? digits.padEnd(point, "0") : digits.slice(0, point) + "." + digits.slice(point));
};
var runOutput = (name, items, context) => {
  if (!["print_r", "var_export"].includes(name)) return null;
  const returning = items[1].value;
  if (context.readOnly && !returning) throw new Error("Reactive text requires return: true for print_r() and var_export()");
  const exporting = name === "var_export", parts = [];
  let length = 0;
  const append = (text3) => {
    const size = bytes(text3).length;
    work(context, size);
    if ((length += size) > 1048576) throw limit("Frontend output exceeds 1 MiB");
    parts.push(text3);
  };
  const quote2 = (value) => "'" + value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\0/g, `' . "\\0" . '`) + "'";
  const render = (value, kind, depth = 0) => {
    if (depth > 64) throw limit("Frontend output exceeds 64 nested levels");
    work(context);
    if (isRoundingMode(value)) {
      append(exporting ? `\\RoundingMode::${value.name}` : `RoundingMode Enum
${" ".repeat(depth * 8)}(
${" ".repeat(depth * 8 + 4)}[name] => ${value.name}
${" ".repeat(depth * 8)})
`);
    } else if (value instanceof Error || isPhpObject(value) || typeof value === "function") {
      throw new TypeError(`${name}(): frontend output supports scalars, arrays and RoundingMode; exception and closure internals are not available`);
    } else if (isPhpArray(value)) {
      const entries = arrayEntries(value);
      if (entries.length > 1e4) throw limit("Frontend output arrays are limited to 10000 entries");
      if (exporting) {
        append("array (\n");
        for (const [key, item] of entries) {
          append(" ".repeat(depth * 2 + 2) + (typeof key === "string" ? quote2(key) : String(key)) + " => ");
          if (isPhpArray(item) || isRoundingMode(item)) append("\n" + " ".repeat(depth * 2 + 2));
          render(item, arrayKind(value, key), depth + 1);
          append(",\n");
        }
        append(" ".repeat(depth * 2) + ")");
      } else {
        append("Array\n" + " ".repeat(depth * 8) + "(\n");
        for (const [key, item] of entries) {
          append(" ".repeat(depth * 8 + 4) + `[${key}] => `);
          render(item, arrayKind(value, key), depth + 1);
          append("\n");
        }
        append(" ".repeat(depth * 8) + ")\n");
      }
    } else if (kind === "double") {
      const precision = exporting ? context.source?.serializePrecision ?? -1 : context.source?.precision ?? 14;
      if (precision !== -1 && (!Number.isInteger(precision) || precision < 1 || precision > 100)) throw limit("Frontend output precision must be -1 or between 1 and 100");
      let result = preciseFloat(value, precision);
      if (exporting && Number.isFinite(value) && !/[.E]/.test(result)) result += ".0";
      append(result);
    } else if (exporting) {
      append(kind === "NULL" ? "NULL" : kind === "boolean" ? value ? "true" : "false" : kind === "string" ? quote2(value) : String(value));
    } else append(phpString(value, kind, context));
  };
  render(items[0].value, items[0].kind ?? phpType(items[0].value));
  const output = parts.join("");
  if (returning) return { value: output, kind: "string" };
  if (output !== "") console.log(output);
  return exporting ? { value: null, kind: "NULL" } : { value: true, kind: "boolean" };
};

// src-js/core/php-builtin-arrays.js
var records = (array2) => arrayEntries(array2).map(([key, value]) => ({ key, value, kind: arrayKind(array2, key), reference: arrayElementReference(array2, key) }));
var array = (items, reindex = false, next2) => {
  arrayLimit(items.length);
  let index = 0;
  const normalized3 = /* @__PURE__ */ new Map();
  for (const item of items) {
    const key = reindex === true || reindex === "numeric" && typeof item.key === "number" ? index++ : item.key;
    normalized3.set(key, { ...item, key });
  }
  return makeArray([...normalized3].map(([key, item]) => [key, clonePhp(item.value)]), new Map([...normalized3].map(([key, item]) => [key, item.kind])), next2, 0, new Map([...normalized3].filter(([, item]) => item.reference).map(([key, item]) => [key, item.reference])));
};
var valueError2 = (message) => {
  throw failure("ValueError", message);
};
var compare = (left, right, flag, context) => {
  if (![0, 1, 2, 6, 10, 14].includes(flag)) valueError2("Unsupported frontend sort flag; locale-dependent sorting belongs to PHP");
  if (flag === 0) return phpCompare(left.value, right.value, left.kind, right.kind);
  if (flag === 1) return phpFloat(left.value, context) - phpFloat(right.value, context);
  const x = phpString(left.value, left.kind, context), y = phpString(right.value, right.kind, context);
  if ((flag & ~8) === 6) return naturalCompare(x, y, Boolean(flag & 8));
  return compareStrings(flag & 8 ? asciiLower(x) : x, flag & 8 ? asciiLower(y) : y);
};
var runArrays = (name, items, context, invoke) => {
  if (!name.startsWith("array_") && !["count", "current", "end", "in_array", "key", "krsort", "ksort", "natcasesort", "natsort", "next", "prev", "range", "reset", "rsort", "shuffle", "sort", "uasort", "uksort", "usort", "arsort", "asort"].includes(name)) return null;
  const [a, b, c, d] = items.map((item) => item.value);
  const result = (value, kind = phpType(value)) => ({ value, kind });
  const call = (fn, args) => {
    work(context);
    return invoke(fn, args);
  };
  const valuesEqual = (x, y, strict = false) => phpMatches(strict ? "eq" : "looseEq", x.value, y.value, x.kind, y.kind);
  if (name === "array_map") {
    const sources = items.slice(1).map((item) => records(item.value)), size = Math.max(...sources.map((source) => source.length));
    arrayLimit(size);
    if (a === null && sources.length === 1) return result(clonePhp(b));
    const mapped = [];
    for (let index = 0; index < size; index++) {
      const args = sources.map((source) => source[index] || { value: null, kind: "NULL" });
      const item = a === null ? result(array(args, true)) : call(a, args);
      mapped.push({ ...item, key: sources.length === 1 ? sources[0][index].key : index });
    }
    return result(array(mapped));
  }
  if (name === "range") {
    const numericString2 = (value) => typeof value !== "string" || /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);
    const modern = (context.source?.phpVersion ?? 80400) >= 80300;
    let first = a, last = b, step = Math.abs(c), character = typeof a === "string" && typeof b === "string" && a !== "" && b !== "" && (modern ? !numericString2(a) || !numericString2(b) : !numericString2(a) && !numericString2(b));
    if (step === 0 || !Number.isFinite(step)) valueError2("range(): step must be a non-zero finite number");
    if (character && !Number.isInteger(step)) {
      warn(context, "range(): character boundaries converted to 0 for a fractional step");
      first = last = 0;
      character = false;
    } else if (character) {
      if (modern && (bytes(a).length > 1 || bytes(b).length > 1)) warn(context, "range(): character boundaries must contain a single byte");
      first = bytes(a)[0];
      last = bytes(b)[0];
    } else {
      if (modern && [a, b].some((value) => typeof value === "string" && !numericString2(value))) warn(context, "range(): non-numeric or empty boundary converted to 0");
      first = phpFloat(first);
      last = phpFloat(last);
    }
    if (!Number.isFinite(first) || !Number.isFinite(last)) valueError2("range(): boundaries must be finite");
    if (modern && c < 0 && first <= last) valueError2("range(): step must be positive for increasing ranges");
    const distance = Math.abs(last - first);
    if (step > distance && distance > 0) valueError2("range(): step exceeds the specified range");
    const size = Math.floor(distance / step) + 1;
    arrayLimit(size);
    const kind = character ? "string" : items.slice(0, 2).some((item) => item.kind === "double" || hasFloatNumericPrefix(item.value)) || !Number.isInteger(step) || !modern && items[2].kind === "double" ? "double" : "integer";
    return result(array(Array.from({ length: size }, (_, key) => ({ key, value: character ? text(Uint8Array.of(first + key * step * (last < first ? -1 : 1))) : first + key * step * (last < first ? -1 : 1), kind }))));
  }
  if (name === "array_fill") {
    if (b < 0) valueError2("array_fill(): count must be greater than or equal to 0");
    arrayLimit(b);
    return result(array(Array.from({ length: b }, (_, index) => ({ key: a + index, value: c, kind: items[2].kind }))));
  }
  if (name === "array_merge" || name === "array_merge_recursive" || name === "array_replace" || name === "array_replace_recursive") {
    if (!items.length) return result(makeArray());
    const merge = (left, right, depth = 0) => {
      if (depth > 64) valueError2("Array merge exceeds 64 nested levels");
      const pairs = new Map(records(left).map((item) => [item.key, item]));
      let next2 = name.startsWith("array_replace") ? nextArrayKey(left, context) : records(left).filter((item) => typeof item.key === "number").length;
      for (const item of records(right)) {
        work(context);
        let key = item.key, value = item.value, kind = item.kind, reference = item.reference;
        if (name.startsWith("array_merge") && typeof key === "number") key = next2++;
        else if (pairs.has(key) && name.endsWith("_recursive")) {
          const old = pairs.get(key);
          if (name === "array_merge_recursive") {
            const x = isPhpArray(old.value) ? old.value : array([{ key: 0, ...old }], true), y = isPhpArray(value) ? value : array([{ key: 0, value, kind }]);
            value = merge(x, y, depth + 1);
            kind = "array";
            reference = null;
          } else if (isPhpArray(old.value) && isPhpArray(value)) {
            value = merge(old.value, value, depth + 1);
            kind = "array";
            reference = null;
          }
        }
        pairs.set(key, { key, value, kind, reference });
        arrayLimit(pairs.size);
      }
      return array([...pairs.values()]);
    };
    let output = name.startsWith("array_merge") ? makeArray() : clonePhp(a);
    for (const item of items.slice(name.startsWith("array_merge") ? 0 : 1)) output = merge(output, item.value);
    return result(output);
  }
  if (name === "array_multisort") {
    const columns = [];
    for (const item of items) {
      if (isPhpArray(item.value)) {
        if (!item.ref) throw new Error("array_multisort(): arrays must be passed by reference");
        columns.push({ item, values: records(item.value), order: 4, flag: 0 });
      } else {
        const column = columns.at(-1);
        if (!column || typeof item.value !== "number") throw new TypeError("array_multisort(): expected an array or sort flag");
        if ([3, 4].includes(item.value)) {
          if (column.orderSet) throw new TypeError("array_multisort(): duplicate sort order");
          column.order = item.value;
          column.orderSet = true;
        } else {
          if (column.flagSet) throw new TypeError("array_multisort(): duplicate sort flag");
          column.flag = item.value;
          column.flagSet = true;
        }
      }
    }
    if (!columns.length) throw new TypeError("array_multisort(): expected an array");
    if (columns.some((column) => column.values.length !== columns[0].values.length)) valueError2("array_multisort(): inconsistent array sizes");
    const indexes = columns[0].values.map((_, index) => index);
    indexes.sort((x, y) => {
      work(context);
      for (const column of columns) {
        const order = compare(column.values[x], column.values[y], column.flag, context) * (column.order === 3 ? -1 : 1);
        if (order) return order;
      }
      return 0;
    });
    for (const column of columns) column.item.ref.set(array(indexes.map((index) => column.values[index]), "numeric"), "array");
    return result(true);
  }
  if (name === "in_array" || name === "array_search") {
    const found = records(b).find((item) => valuesEqual(item, items[0], c));
    return result(name === "in_array" ? Boolean(found) : found ? found.key : false);
  }
  if (name === "array_key_exists") return result(Object.hasOwn(b, arrayKey(a, context)));
  if (name === "count" && isPhpObject(a)) return countObject(a, b, context);
  const entries = records(a);
  arrayLimit(entries.length);
  if (name === "count") {
    if (![0, 1].includes(b)) valueError2("count(): mode must be COUNT_NORMAL or COUNT_RECURSIVE");
    const count = (values2, depth = 0) => {
      if (depth > 64) valueError2("count(): nested array limit exceeded");
      let size = values2.length;
      if (b === 1) for (const item of values2) {
        work(context);
        if (isPhpArray(item.value)) size += count(records(item.value), depth + 1);
      }
      return size;
    };
    return result(count(entries));
  }
  if (name === "array_is_list") return result(entries.every((item, index) => item.key === index));
  if (name === "array_key_first" || name === "array_key_last") return result((name.endsWith("first") ? entries[0] : entries.at(-1))?.key ?? null);
  if (["current", "key", "next", "prev", "reset", "end"].includes(name)) {
    let cursor = arrayCursor(a);
    if (name === "next") cursor = cursor >= 0 && cursor < entries.length ? cursor + 1 : entries.length;
    if (name === "prev") cursor = cursor >= 0 && cursor < entries.length ? cursor - 1 : entries.length;
    if (name === "reset") cursor = 0;
    if (name === "end") cursor = entries.length - 1;
    if (items[0].ref) items[0].ref.set(withArrayCursor(a, cursor), "array");
    return name === "key" ? result(entries[cursor]?.key ?? null) : entries[cursor] || result(false);
  }
  if (name === "array_values") return result(array(entries, true));
  if (name === "array_keys") return result(entries.filter((item) => !items[1].provided || valuesEqual(item, items[1], c)).map((item) => item.key));
  if (name === "array_reverse") return result(array(entries.reverse(), b ? false : "numeric"));
  if (name === "array_slice") {
    const start = b < 0 ? Math.max(0, entries.length + b) : b, end = c === null ? entries.length : c < 0 ? Math.max(start, entries.length + c) : start + c;
    return result(array(entries.slice(start, end), d ? false : "numeric"));
  }
  if (name === "array_chunk") {
    if (b < 1) valueError2("array_chunk(): length must be greater than 0");
    const chunks = [];
    for (let i = 0; i < entries.length; i += b) chunks.push(array(entries.slice(i, i + b), !c));
    return result(chunks);
  }
  if (name === "array_fill_keys") return result(array(entries.map((item) => ({ key: arrayKey(typeof item.value === "number" && item.kind === "integer" ? item.value : phpString(item.value, item.kind, context), context), value: b, kind: items[1].kind }))));
  if (name === "array_combine") {
    const values2 = records(b);
    if (entries.length !== values2.length) valueError2("array_combine(): both arrays must have an equal number of elements");
    return result(array(entries.map((item, i) => ({ ...values2[i], key: arrayKey(item.kind === "integer" ? item.value : phpString(item.value, item.kind, context), context) }))));
  }
  if (name === "array_change_key_case") {
    if (![0, 1].includes(b)) valueError2("array_change_key_case(): case must be CASE_LOWER or CASE_UPPER");
    return result(array(entries.map((item) => ({ ...item, key: typeof item.key === "string" ? arrayKey(b === 1 ? item.key.replace(/[a-z]/g, (c2) => c2.toUpperCase()) : asciiLower(item.key), context) : item.key }))));
  }
  if (name === "array_flip" || name === "array_count_values") {
    const output = /* @__PURE__ */ new Map();
    for (const item of entries) {
      if (!["integer", "string"].includes(item.kind)) {
        warn(context, `${name}(): can only process string and integer values`);
        continue;
      }
      const key = arrayKey(item.value, context);
      output.set(key, { key, value: name === "array_flip" ? item.key : (output.get(key)?.value ?? 0) + 1, kind: name === "array_flip" ? phpType(item.key) : "integer" });
    }
    return result(array([...output.values()]));
  }
  if (name === "array_sum" || name === "array_product") {
    let value = name === "array_sum" ? 0 : 1, kind = "integer";
    for (const item of entries) {
      if (isPhpArray(item.value) || typeof item.value === "function" || item.value instanceof Error) {
        if ((context.source?.phpVersion ?? 80400) >= 80300) warn(context, `${name}(): addition/multiplication is not supported on ${item.kind}`);
        continue;
      }
      let numeric3;
      try {
        numeric3 = phpNumber(item.value, context);
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        numeric3 = 0;
        if ((context.source?.phpVersion ?? 80400) >= 80300) warn(context, `${name}(): addition/multiplication is not supported on ${item.kind}`);
      }
      value = name === "array_sum" ? value + numeric3 : value * numeric3;
      if (item.kind === "double" || hasFloatNumericPrefix(item.value) || !Number.isSafeInteger(value)) kind = "double";
    }
    return result(value, kind);
  }
  if (name === "array_pad") {
    const size = Math.abs(b);
    arrayLimit(size);
    const extra = Math.max(0, size - entries.length), padding = Array.from({ length: extra }, () => ({ key: 0, value: c, kind: items[2].kind }));
    return result(array(b < 0 ? [...padding, ...entries] : [...entries, ...padding], "numeric"));
  }
  if (name === "array_unique") {
    const selected = [];
    for (const item of entries) {
      work(context, selected.length);
      if (!selected.some((other) => compare(item, other, b, context) === 0)) selected.push(item);
    }
    return result(array(selected));
  }
  if (name === "array_column") {
    const output = [];
    let next2 = 0;
    for (const row of entries) {
      if (!isPhpArray(row.value)) continue;
      const column = b === null ? null : arrayKey(b, context);
      if (column !== null && !Object.hasOwn(row.value, column)) continue;
      const value = column === null ? row.value : row.value[column], kind = column === null ? "array" : arrayKind(row.value, column);
      const index = c === null ? null : arrayKey(c, context);
      let key = next2;
      if (index !== null && Object.hasOwn(row.value, index)) key = arrayKey(row.value[index], context);
      output.push({ key, value, kind });
      if (typeof key === "number") next2 = Math.max(next2, key + 1);
    }
    return result(array(output));
  }
  if (name === "array_filter" || ["array_find", "array_find_key", "array_any", "array_all"].includes(name)) {
    const selected = [];
    for (const item of entries) {
      const key = { value: item.key, kind: phpType(item.key) };
      const args = name === "array_filter" ? c === 2 ? [key] : c === 1 ? [item, key] : [item] : [item, key];
      const yes = b === null ? phpBool(item.value) : phpBool(call(b, args).value);
      if (name === "array_all" && !yes) return result(false);
      if (yes && name === "array_any") return result(true);
      if (yes && name === "array_find") return item;
      if (yes && name === "array_find_key") return result(item.key);
      if (yes) selected.push(item);
    }
    return name === "array_filter" ? result(array(selected)) : result(name === "array_all" ? true : name === "array_any" ? false : null);
  }
  if (name === "array_reduce") {
    let value = items[2];
    for (const item of entries) value = call(b, [value, item]);
    return value;
  }
  if (/^array_(?:u?diff|u?intersect)/.test(name)) {
    const intersection = name.includes("intersect"), dataCallback = /^array_u/.test(name), keyCallback = /uassoc|ukey/.test(name), keysOnly = name.endsWith("key"), withKeys = /assoc|key/.test(name);
    const rest = items.slice(1);
    let keyFn, dataFn;
    if (keyCallback) keyFn = rest.pop()?.value;
    if (dataCallback) dataFn = rest.pop()?.value;
    if (!rest.length) throw failure("ArgumentCountError", `${name}(): at least two arrays are required`);
    const others = rest.map((item) => records(item.value));
    const matches = (x, y) => {
      work(context);
      if (withKeys && (keyCallback ? phpInt(call(keyFn, [{ value: x.key, kind: phpType(x.key) }, { value: y.key, kind: phpType(y.key) }]).value) !== 0 : String(x.key) !== String(y.key))) return false;
      return keysOnly || (dataCallback ? phpInt(call(dataFn, [x, y]).value) === 0 : phpString(x.value, x.kind, context) === phpString(y.value, y.kind, context));
    };
    const selected = entries.filter((item) => intersection ? others.every((source) => source.some((other) => matches(item, other))) : !others.some((source) => source.some((other) => matches(item, other))));
    return result(array(selected));
  }
  if (name === "array_walk" || name === "array_walk_recursive") {
    const visit = (path, depth = 0) => {
      if (depth > 64) valueError2("array_walk_recursive(): nesting limit exceeded");
      const get = () => {
        let value = items[0].ref.get().value;
        for (const key of path) value = value[key];
        return value;
      };
      const put = (key, value, kind) => {
        const update2 = (current, index) => index === path.length ? arrayWrite(current, key, value, kind, context) : arrayWrite(current, path[index], update2(current[path[index]], index + 1), "array", context);
        items[0].ref.set(update2(items[0].ref.get().value, 0), "array");
      };
      for (const item of records(get())) {
        if (name.endsWith("_recursive") && isPhpArray(item.value)) visit([...path, item.key], depth + 1);
        else {
          const ref = { get: () => ({ value: get()[item.key], kind: arrayKind(get(), item.key) }), set: (value, kind) => {
            put(item.key, value, kind);
            return { value, kind };
          } };
          const args = [{ ...item, ref }, { value: item.key, kind: phpType(item.key) }];
          if (items[2].provided) args.push(items[2]);
          call(b, args);
        }
      }
    };
    visit([]);
    return result(true);
  }
  if (name === "array_pop" || name === "array_shift") {
    const removed = name === "array_pop" ? entries.pop() : entries.shift(), previous = nextArrayKey(a, context);
    items[0].ref.set(array(entries, name === "array_shift" ? "numeric" : false, name === "array_pop" ? removed && typeof removed.key === "number" && removed.key === previous - 1 ? removed.key : previous : void 0), "array");
    return removed || result(null);
  }
  if (name === "array_push" || name === "array_unshift") {
    const extra = items.slice(1).map((item, index) => ({ ...item, key: index }));
    let output;
    if (name === "array_push") {
      const next2 = nextArrayKey(a, context);
      output = array([...entries, ...extra.map((item, index) => ({ ...item, key: next2 + index }))]);
    } else output = array([...extra, ...entries], "numeric");
    items[0].ref.set(output, "array");
    return result(arrayEntries(output).length);
  }
  if (name === "array_splice") {
    const start = b < 0 ? Math.max(0, entries.length + b) : Math.min(b, entries.length), length = c === null ? entries.length - start : c < 0 ? Math.max(0, entries.length - start + c) : c;
    const replacement = isPhpArray(d) ? records(d) : d === null ? [] : [{ value: d, kind: items[3].kind }];
    const removed = entries.splice(start, length, ...replacement.map((item) => ({ ...item, key: 0 })));
    items[0].ref.set(array(entries, "numeric"), "array");
    return result(array(removed, "numeric"));
  }
  if (name === "array_rand") {
    if (b < 1 || b > entries.length) valueError2("array_rand(): number of elements must be between 1 and array length");
    if (b === 1) return result(entries[randomInt(0, entries.length - 1)].key);
    const indexes = entries.map((_, index) => index), chosen = /* @__PURE__ */ new Set();
    for (let i = 0; i < b; i++) {
      const j = randomInt(i, indexes.length - 1);
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
      chosen.add(indexes[i]);
    }
    return result(entries.filter((_, index) => chosen.has(index)).map((item) => item.key));
  }
  if (name === "shuffle") {
    for (let i = entries.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    items[0].ref.set(array(entries, true), "array");
    return result(true);
  }
  if (["sort", "rsort", "asort", "arsort", "ksort", "krsort", "usort", "uasort", "uksort", "natsort", "natcasesort"].includes(name)) {
    const user = name.startsWith("u"), keys = ["ksort", "krsort", "uksort"].includes(name), flag = name === "natsort" ? 6 : name === "natcasesort" ? 14 : user ? 0 : b;
    if (!user) compare({ value: "", kind: "string" }, { value: "", kind: "string" }, flag, context);
    entries.sort((x, y) => {
      work(context);
      const left = keys ? { value: x.key, kind: phpType(x.key) } : x, right = keys ? { value: y.key, kind: phpType(y.key) } : y;
      return (user ? phpInt(call(b, [left, right]).value) : compare(left, right, flag, context)) * (["rsort", "arsort", "krsort"].includes(name) ? -1 : 1);
    });
    items[0].ref.set(array(entries, ["sort", "rsort", "usort"].includes(name)), "array");
    return result(true);
  }
  return null;
};

// src-js/core/php-builtins.js
var builtinNames = Object.freeze(Object.keys(builtin_signatures_default));
var failure2 = (name, message) => Object.assign(new Error(message), { name });
var limit2 = (message) => Object.assign(new RangeError(message), { code: "PHP_BUILTIN_LIMIT" });
var encoder2 = new TextEncoder();
var decoder2 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
var bytes2 = (value) => encoder2.encode(value);
var text2 = (value) => {
  try {
    return decoder2.decode(value);
  } catch {
    throw Object.assign(new RangeError("This byte operation produced invalid UTF-8; frontend strings must remain valid UTF-8"), { code: "PHP_INVALID_UTF8" });
  }
};
var bounded2 = (value) => {
  if (value.length > 1048576 || bytes2(value).length > 1048576) throw limit2("Frontend string result exceeds 1 MiB");
  return value;
};
var asciiUpper2 = (value) => value.replace(/[a-z]/g, (letter) => letter.toUpperCase());
var asciiLower2 = (value) => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
var numeric2 = (value) => typeof value === "number" || typeof value === "string" && /^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[\t\n\r\f\v ]*$/.test(value);
var phpRound = (value, precision = 0, mode = 1, phpVersion = 80400) => {
  if (![1, 2, 3, 4].includes(mode)) {
    if (phpVersion < 80400) mode = 1;
    else throw failure2("ValueError", "round(): unsupported rounding mode; use PHP_ROUND_HALF_UP/DOWN/EVEN/ODD");
  }
  if (!Number.isFinite(value)) return value;
  if (value === 0) return value;
  if (precision > 308) return value;
  if (precision < -308) return value < 0 ? -0 : 0;
  const scale = 10 ** Math.abs(precision), magnitude = Math.abs(value);
  const restore = (integer) => precision > 0 ? integer / scale : integer * scale;
  if (phpVersion < 80400) {
    const nearest = (number) => {
      let result2 = Math.floor(number + 0.5);
      if (number === result2 - 0.5 && (mode === 2 || mode === 3 && result2 % 2 !== 0 || mode === 4 && result2 % 2 === 0)) result2--;
      return result2;
    };
    let order = Math.floor(Math.log10(magnitude));
    if (magnitude < 10 ** order) order--;
    const places = 14 - order;
    let scaled;
    if (places > precision && places - 15 < precision) {
      const factor = 10 ** Math.abs(places);
      scaled = nearest(places >= 0 ? magnitude * factor : magnitude / factor) / 10 ** (places - precision);
    } else {
      scaled = precision >= 0 ? magnitude * scale : magnitude / scale;
      if (scaled >= 1e15) return value;
    }
    const integer = nearest(scaled);
    return (value < 0 ? -1 : 1) * (Math.abs(precision) < 23 ? restore(integer) : Number(`${integer}e${-precision}`));
  }
  let whole = Math.floor(precision > 0 ? magnitude * scale : magnitude / scale);
  if (restore(whole + 1) === magnitude) whole++;
  if (whole >= 1e16) return value;
  const half = restore(whole + 0.5);
  if (magnitude > half || magnitude === half && (mode === 1 || mode === 3 && whole % 2 !== 0 || mode === 4 && whole % 2 === 0)) whole++;
  const result = Math.abs(precision) < 23 ? restore(whole) : Number(`${whole}e${-precision}`);
  return (value < 0 ? -1 : 1) * result;
};
var trimBytes = (value, characters, side, context) => {
  const mask = bytes2(characters), allowed = /* @__PURE__ */ new Set();
  for (let i = 0; i < mask.length; i++) {
    if (i + 3 < mask.length && mask[i + 1] === 46 && mask[i + 2] === 46 && mask[i] <= mask[i + 3]) {
      for (let c = mask[i]; c <= mask[i + 3]; c++) allowed.add(c);
      i += 3;
    } else {
      if (mask[i] === 46 && mask[i + 1] === 46) warn(context, `${side}(): Invalid '..'-range in character mask`);
      allowed.add(mask[i]);
    }
  }
  const input = bytes2(value);
  let start = 0, end = input.length;
  if (side !== "rtrim") while (start < end && allowed.has(input[start])) start++;
  if (side !== "ltrim") while (end > start && allowed.has(input[end - 1])) end--;
  return text2(input.subarray(start, end));
};
var randomInt = (min, max) => {
  if (min > max) throw failure2("ValueError", "random_int(): Argument #1 ($min) must be less than or equal to argument #2 ($max)");
  if (min === max) return min;
  if (!globalThis.crypto?.getRandomValues) throw failure2("Random\\RandomException", "Secure browser randomness is unavailable");
  const span = BigInt(max) - BigInt(min) + 1n, space = 1n << 64n, ceiling = space - space % span;
  const buffer = new Uint32Array(2);
  for (let attempt = 0; attempt < 128; attempt++) {
    globalThis.crypto.getRandomValues(buffer);
    const sample = BigInt(buffer[0]) << 32n | BigInt(buffer[1]);
    if (sample < ceiling) return Number(BigInt(min) + sample % span);
  }
  throw failure2("Random\\RandomException", "Secure random sampling failed");
};
var formatNumber = (value, decimals, decimal, thousands, context) => {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "nan" : "inf";
  if (decimals > 1e3) throw limit2("number_format(): frontend decimal precision is limited to 1000");
  if ((context.source?.phpVersion ?? 80400) < 80300) decimals = Math.max(0, decimals);
  const rounded = phpRound(value, decimals, 1, context.source?.phpVersion), digits = Math.max(0, decimals);
  const buffer = new DataView(new ArrayBuffer(8));
  buffer.setFloat64(0, Math.abs(rounded));
  const bits = buffer.getBigUint64(0), exponent = Number(bits >> 52n) & 2047;
  const mantissa = (bits & (1n << 52n) - 1n) + (exponent ? 1n << 52n : 0n);
  const shift = (exponent || 1) - 1023 - 52;
  let numerator = mantissa * 10n ** BigInt(digits), denominator = 1n;
  if (shift >= 0) numerator <<= BigInt(shift);
  else denominator <<= BigInt(-shift);
  let integer = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n > denominator || remainder * 2n === denominator && integer % 2n !== 0n) integer++;
  const all = integer.toString().padStart(digits + 1, "0");
  let whole = digits ? all.slice(0, -digits) : all;
  const decimalPart = digits ? all.slice(-digits) : "";
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, () => thousands ?? ",");
  return bounded2((rounded < 0 ? "-" : "") + whole + (digits ? (decimal ?? ".") + decimalPart : ""));
};
var run = (name, items, context) => {
  const [a, b, c, d] = items.map((item) => item.value);
  if (name === "gettype") return { value: items[0].kind, kind: "string" };
  if (name === "strval") return { value: phpString(a, items[0].kind, context), kind: "string" };
  if (name === "boolval") return { value: phpBool(a), kind: "boolean" };
  if (name === "floatval" || name === "doubleval") return { value: phpFloat(a), kind: "double" };
  if (name === "intval") {
    let value = phpInt(a);
    if (typeof a === "string" && b !== 10) {
      let raw = a.trimStart(), sign = 1, radix = b;
      if (/^[+-]/.test(raw)) {
        if (raw[0] === "-") sign = -1;
        raw = raw.slice(1);
      }
      if (radix === 0) radix = /^0x/i.test(raw) ? 16 : /^0b/i.test(raw) ? 2 : raw[0] === "0" ? 8 : 10;
      if (radix === 16 && /^0x/i.test(raw) || radix === 2 && /^0b/i.test(raw)) raw = raw.slice(2);
      value = radix < 2 || radix > 36 ? 0 : sign * (parseInt(raw, radix) || 0);
      if (!Number.isSafeInteger(value)) throw limit2("intval(): integer exceeds frontend safe precision");
    }
    return { value, kind: "integer" };
  }
  const predicateTypes = { is_array: ["array"], is_bool: ["boolean"], is_float: ["double"], is_double: ["double"], is_int: ["integer"], is_integer: ["integer"], is_long: ["integer"], is_null: ["NULL"], is_scalar: ["boolean", "integer", "double", "string"], is_string: ["string"] };
  if (Object.hasOwn(predicateTypes, name)) return { value: predicateTypes[name].includes(items[0].kind), kind: "boolean" };
  if (name === "strlen") return { value: bytes2(a).length, kind: "integer" };
  if (name === "str_contains") return { value: a.includes(b), kind: "boolean" };
  if (name === "str_starts_with") return { value: a.startsWith(b), kind: "boolean" };
  if (name === "str_ends_with") return { value: a.endsWith(b), kind: "boolean" };
  let result;
  if (name === "substr") {
    const input = bytes2(a), start = b < 0 ? Math.max(0, input.length + b) : Math.min(b, input.length);
    const end = c == null ? input.length : c < 0 ? Math.max(start, input.length + c) : Math.min(input.length, start + c);
    result = text2(input.subarray(start, end));
  } else if (["trim", "ltrim", "rtrim"].includes(name)) result = trimBytes(a, b, name, context);
  else if (name === "strtolower") result = asciiLower2(a);
  else if (name === "strtoupper") result = asciiUpper2(a);
  else if (name === "ucfirst") result = asciiUpper2(a.slice(0, 1)) + a.slice(1);
  else if (name === "lcfirst") result = asciiLower2(a.slice(0, 1)) + a.slice(1);
  else if (name === "ucwords") {
    const input = bytes2(a), separators = new Set(bytes2(b));
    let capital = true;
    for (let i = 0; i < input.length; i++) {
      const original = input[i];
      if (capital && original >= 97 && original <= 122) input[i] -= 32;
      capital = separators.has(original);
    }
    result = text2(input);
  } else if (name === "str_replace") {
    if (typeof a === "string" && typeof b !== "string") throw new TypeError("str_replace(): replace must be a string when search is a string");
    const searches = typeof a === "string" ? [a] : arrayEntries(a).map(([key, value]) => phpString(value, arrayKind(a, key), context));
    const replacements = typeof b === "string" ? null : arrayEntries(b).map(([key, value]) => phpString(value, arrayKind(b, key), context));
    let count = 0;
    const replace = (value, kind) => {
      let current = phpString(value, kind, context);
      searches.forEach((search, index) => {
        if (search === "") return;
        const replacement = replacements ? replacements[index] ?? "" : b;
        const pieces = current.split(search);
        if (pieces.length > 1e5) throw limit2("str_replace(): too many replacements in one operation");
        count += pieces.length - 1;
        if (current.length + (pieces.length - 1) * (replacement.length - search.length) > 1048576) throw limit2("Frontend string result exceeds 1 MiB");
        current = bounded2(pieces.join(replacement));
      });
      return current;
    };
    result = typeof c === "string" ? replace(c, "string") : makeArray(arrayEntries(c).map(([key, value]) => [key, replace(value, arrayKind(c, key))]));
    items[3].ref?.set(count, "integer");
  } else if (name === "explode") {
    if (a === "") throw failure2("ValueError", "explode(): separator cannot be empty");
    const parts = [];
    let offset = 0, found;
    const maximum = c > 0 ? c : c === 0 ? 1 : Infinity;
    while (parts.length + 1 < maximum && (found = b.indexOf(a, offset)) !== -1) {
      if (parts.length >= 9999) throw limit2("explode(): frontend arrays are limited to 10000 pieces");
      parts.push(b.slice(offset, found));
      offset = found + a.length;
    }
    parts.push(b.slice(offset));
    result = c < 0 ? parts.slice(0, Math.max(0, parts.length + c)) : parts;
  } else if (name === "implode") {
    const collection = b ?? (typeof a === "object" ? a : null), separator = typeof a === "string" ? a : "";
    if (collection === null || typeof a !== "string" && b !== null) throw new TypeError("implode(): expected an array, or a string separator and an array");
    const parts = arrayEntries(collection).map(([key, value]) => phpString(value, arrayKind(collection, key), context));
    if (parts.reduce((length, value) => length + value.length, 0) + Math.max(0, parts.length - 1) * separator.length > 1048576) throw limit2("Frontend string result exceeds 1 MiB");
    result = parts.join(separator);
  } else if (name === "is_numeric") result = numeric2(a);
  else if (name === "random_int") return { value: randomInt(a, b), kind: "integer" };
  else if (name === "intdiv") {
    if (b === 0) throw failure2("DivisionByZeroError", "Division by zero");
    return { value: Number(BigInt(a) / BigInt(b)), kind: "integer" };
  } else if (name === "abs") return { value: Math.abs(a), kind: items[0].kind };
  else if (name === "ceil") return { value: Math.ceil(a), kind: "double" };
  else if (name === "floor") return { value: Math.floor(a), kind: "double" };
  else if (name === "round") return { value: phpRound(a, b, c, context.source?.phpVersion), kind: "double" };
  else if (name === "number_format") result = formatNumber(a, b, c, d, context);
  else return null;
  return { value: typeof result === "string" ? bounded2(result) : result, kind: phpType(result) };
};
var parameterAt = (parameters, index, name) => name === void 0 ? parameters[index] || (parameters.at(-1)?.variadic ? parameters.at(-1) : null) : parameters.find((parameter) => parameter.name === name) || (parameters.at(-1)?.variadic ? parameters.at(-1) : null);
var invokeBuiltin = (name, argumentsList, state, context) => {
  name = name.replace(/^\\/, "").toLowerCase();
  if (context.readOnly && ["random_int", "str_shuffle", "shuffle", "array_rand", "printf", "vprintf", "strtok"].includes(name)) throw new Error("Reactive text cannot run output, randomness or stateful tokenization");
  const parameters = Object.hasOwn(builtin_signatures_default, name) ? builtin_signatures_default[name] : null;
  if (!parameters) throw new Error(`Unsupported frontend builtin: ${name}`);
  const assigned = /* @__PURE__ */ new Map(), rest = [];
  let position = 0, named = false;
  for (const argument of argumentsList) {
    let index;
    if (Object.hasOwn(argument, "name")) {
      named = true;
      index = parameters.findIndex((p) => p.name === argument.name);
      if (index < 0) {
        if (!parameters.at(-1)?.variadic) throw new Error(`Unknown named parameter $${argument.name}`);
        if (rest.some((item) => item.name === argument.name)) throw new Error(`Named parameter $${argument.name} overwrites previous argument`);
        rest.push(argument);
        continue;
      }
    } else {
      if (named) throw new Error("Cannot use positional argument after named argument");
      index = position++;
    }
    if (index >= parameters.length || parameters[index]?.variadic) {
      rest.push(argument);
      continue;
    }
    if (assigned.has(index)) throw new Error(`Named parameter $${parameters[index].name} overwrites previous argument`);
    assigned.set(index, argument);
  }
  if (rest.length && !parameters.at(-1)?.variadic) throw failure2("ArgumentCountError", `${name}(): too many arguments`);
  const convert = (item, parameter) => {
    const { name: label, types } = parameter;
    const referenceRequired = parameter.reference && !(name === "array_multisort" && typeof item.value === "number");
    if (referenceRequired && !item.ref) throw new Error(`${name}(): Argument $${label} cannot be passed by reference`);
    const nullable2 = types.startsWith("?") || types.split("|").includes("null"), choices = types.replace("?", "").split("|");
    if (item.value == null && !nullable2 && !choices.includes("mixed") && context.source?.strictTypes === false && choices.some((type) => ["int", "float", "string", "bool"].includes(type))) {
      warn(context, `${name}(): Passing null to parameter $${label} is deprecated`, "PHP_DEPRECATED");
      item = { ...item, value: choices.includes("string") ? "" : 0, kind: choices.includes("string") ? "string" : "integer" };
    }
    if (choices.includes("callable") && item.value !== null) {
      if (!isFrontendCallable(item.value, context)) throw new TypeError(`${name}(): Argument $${label} must be a compiled callable`);
      return { ...item, provided: true };
    }
    try {
      return { ...item, ...assignType({ types: choices, nullable: nullable2 }, item.value, item.kind, context.source?.strictTypes ?? true, context), provided: true };
    } catch (error) {
      if (error instanceof TypeError) throw new TypeError(`${name}(): Argument $${label} must be ${types}, ${item.kind} given`);
      throw error;
    }
  };
  const items = [];
  parameters.forEach((parameter, index) => {
    if (parameter.variadic) {
      items.push(...rest.map((item2) => convert(item2, parameter)));
      return;
    }
    const item = assigned.get(index);
    if (item) {
      items.push(convert(item, parameter));
      return;
    }
    if (!Object.hasOwn(parameter, "default") && !parameter.optional) throw failure2("ArgumentCountError", `${name}(): missing argument $${parameter.name}`);
    const value = parameter.types === "RoundingMode" && parameter.default?.roundingMode ? roundingMode(parameter.default.roundingMode) : parameter.default;
    items.push({ value, kind: phpType(value), provided: false });
  });
  if (/^array_(?:u?diff|u?intersect)/.test(name)) {
    const callbacks = Number(name.startsWith("array_u")) + Number(/uassoc|ukey/.test(name));
    for (const item of callbacks ? items.slice(-callbacks) : []) if (!isFrontendCallable(item.value, context)) throw new TypeError(`${name}(): comparison must be a compiled callable`);
  }
  if (name === "array_keys" && !items[1].provided) items[1].value = void 0;
  const canonical = { chop: "rtrim", join: "implode", strchr: "strstr", key_exists: "array_key_exists", sizeof: "count", pos: "current" }[name] || name;
  const invoke = (callback, args) => invokeFunction(callback, args, state, { ...context, source: { ...context.source, strictTypes: false } });
  const result = runCommon(canonical, items, context) || runSerialization(canonical, items, state, context) || runRandom(canonical, items, context) || runSymbols(canonical, items, state, context) || runUtility(canonical, items, state, context) || (canonical === "is_iterable" ? { value: isIterable(items[0].value), kind: "boolean" } : null) || (canonical === "is_countable" ? { value: isCountable(items[0].value), kind: "boolean" } : null) || run(canonical, items, context) || runIntl(canonical, items, context) || runGrapheme(canonical, items, context) || runWeb(canonical, items, context) || runDates(canonical, items, context) || runJson(canonical, items, context) || runRegex(canonical, items, context, invoke) || runIterators(canonical, items, context, invoke) || runFunctionIntrospection(canonical, items, context) || runObjects(canonical, items, context) || runOutput(canonical, items, context) || runMath(canonical, items, context) || runBCMath(canonical, items, context, parameters) || runMbstring(canonical, items, context, parameters) || runStrings(canonical, items, context) || runArrays(canonical, items, context, invoke);
  if (!result) throw new Error(`Unsupported frontend builtin: ${name}`);
  validateResult(result.value);
  return result;
};
var evaluateBuiltin = (expression, state, context, resolve, kindOf2, reference) => {
  const name = expression.left, parameters = Object.hasOwn(builtin_signatures_default, name) ? builtin_signatures_default[name] : null;
  const data = { ...context, source: expression.right.source || context.source };
  context.builtinBudget ||= { remaining: 1e6 };
  data.builtinBudget = context.builtinBudget;
  context.builtinMemory ||= {};
  data.builtinMemory = context.builtinMemory;
  try {
    if (!parameters) throw new Error(`Unsupported frontend builtin: ${name}`);
    const args = [];
    let position = 0;
    for (const argument of expression.right.arguments) {
      const target = argument.value, assignable3 = target?.$local || target?.$state || ["dynamicLocal", "offset", "appendOffset", "objectProperty", "objectStaticProperty"].includes(target?.$expression?.operation);
      if (argument.spread) {
        const parent = assignable3 ? reference(target, state, data, false, false, true) : null;
        let array2 = parent ? parent.get().value : resolve(target, state, data);
        if (isPhpObject(array2)) {
          for (const { key, item } of spreadEntries(array2, data)) {
            args.push({ ...item, ...key.kind === "string" ? { name: key.value } : {} });
            if (key.kind !== "string") position++;
          }
          continue;
        }
        for (const [key, value] of arrayEntries(array2)) {
          args.push({ ...typeof key === "string" ? { name: key } : {}, value: clonePhp(value), kind: arrayKind(array2, key), ref: {
            get: () => arrayRead(parent ? parent.get().value : array2, key, data),
            set: (value2, kind) => {
              array2 = arrayWrite(parent ? parent.get().value : array2, key, value2, kind, data);
              parent?.set(array2, "array");
              return { value: value2, kind };
            }
          } });
          if (typeof key !== "string") position++;
        }
      } else {
        const parameter = parameterAt(parameters, position, argument.name);
        let ref = parameter?.reference && assignable3 ? reference(target, state, data) : null;
        ref = ref?.indirect?.() || ref;
        const item = ref ? ref.acquire?.() || ref.get(true) : { value: resolve(target, state, data) };
        args.push({ ...argument, ...item, kind: item.kind || kindOf2(target, state, data, item.value), ref });
        if (argument.name === void 0) position++;
      }
    }
    return invokeBuiltin(name, args, state, data);
  } catch (error) {
    throw withSource(error, data.source, data.trace);
  }
};

// src-js/core/php-functions.js
var closures = /* @__PURE__ */ new WeakMap();
var failure3 = (name, message) => Object.assign(new Error(message), { name });
var evaluateDisplay = (expression, state, context) => {
  const data = {
    ...context,
    functions: expression.right.functions || {},
    source: expression.right.source,
    classes: expression.right.classes || {},
    componentProjection: expression.right.projection === true,
    thisObject: null,
    objectScope: null,
    calledClass: null,
    objectBudget: { remaining: 1e4 },
    readOnly: true,
    builtinBudget: { remaining: 1e6 },
    builtinMemory: {},
    locals: /* @__PURE__ */ Object.create(null),
    localTypes: /* @__PURE__ */ Object.create(null),
    localReferences: /* @__PURE__ */ Object.create(null),
    functionDeclarations: /* @__PURE__ */ new Set(),
    functionDefinitionIds: /* @__PURE__ */ new Map(),
    callBudget: { depth: 0, remaining: 1e4 },
    loopBudget: { remaining: 1e4 },
    evaluated: /* @__PURE__ */ new WeakMap(),
    assignState: () => {
      throw new Error("Reactive text cannot modify state");
    }
  };
  try {
    const value = resolveData2(expression.left, state, data);
    return { value, kind: resolveType(expression.left, state, data, value) };
  } catch (error) {
    throw withSource(error, data.source, data.trace);
  }
};
var isFrontendCallable = (value, context) => isMethodCallable(value, context) || hasMagicInvoke(value, context) || typeof value === "string" && builtinNames.includes(value.replace(/^\\/, "").toLowerCase()) || typeof value === "function" && closures.has(value) || typeof value === "string" && Object.values(context.functions || {}).some((fn) => fn.name.toLowerCase() === value.replace(/^\\/, "").toLowerCase() && (fn.declared || context.functionDeclarations?.has(fn.name.toLowerCase())));
var contract = (rule, item, strict, context, label) => {
  if (!rule) return item;
  if (rule.types.includes("@static")) rule = { ...rule, types: rule.types.map((type) => type === "@static" ? context.calledClass || "(static)" : type) };
  if (rule.types.includes("callable") && isFrontendCallable(item.value, context) || rule.types.includes("closure") && typeof item.value === "function" && closures.has(item.value) || rule.types.includes("iterable") && item.kind === "array") return item;
  try {
    return assignType(rule, item.value, item.kind, strict, context);
  } catch (error) {
    if (error instanceof TypeError) throw new TypeError(`${label}: expected ${rule.types.join("|")}, received ${item.kind}`);
    throw error;
  }
};
var createClosure = (id, captures, state, context) => {
  if (!Object.hasOwn(context.functions || {}, id)) throw new Error(`Unknown frontend function: ${id}`);
  const definition = context.functions[id];
  if (!definition.declared) {
    if (!context.functionDeclarations?.has(definition.name.toLowerCase())) throw new Error(`Call to undefined function ${definition.name}()`);
    id = context.functionDefinitionIds?.get(definition.name.toLowerCase()) || id;
  }
  const fn = function() {
  };
  const values2 = /* @__PURE__ */ Object.create(null), types = /* @__PURE__ */ Object.create(null), refs = /* @__PURE__ */ Object.create(null);
  for (const capture of captures || []) {
    if (capture.reference) {
      refs[capture.id] = promoteReference(capture.value, state, context);
      const ref = refs[capture.id];
      if (ref.cell) observeValueOwnership(fn, (active) => active ? ref.cell.bindings.add(fn) : ref.cell.bindings.delete(fn));
      if (capture.value?.$local && !Object.hasOwn(context.locals || {}, capture.value.$local) && !context.localReferences?.[capture.value.$local]) refs[capture.id].set(null, "NULL");
    } else {
      const item = resolveData2(capture.value, state, context);
      values2[capture.id] = clonePhp(item);
      ownArray(values2, capture.id, values2[capture.id]);
      types[capture.id] = resolveType(capture.value, state, context, item);
    }
  }
  closures.set(fn, { id, values: values2, types, refs, staticLocals: definition.name.includes("{closure") ? /* @__PURE__ */ new Map() : null, thisObject: definition.bindThis ? context.thisObject : null, objectScope: definition.objectScope || null, calledClass: definition.objectScope ? context.calledClass : null });
  return fn;
};
var bindGeneratorMethod = (value, method2) => {
  if (!Object.hasOwn(objectData(value).definition.methods, method2.toLowerCase())) throw new Error(`Call to undefined method Generator::${method2}()`);
  const fn = function() {
  };
  closures.set(fn, { generator: value, method: method2.toLowerCase() });
  return fn;
};
var callableDefinition = (target, context) => {
  const fn = callable(target, context);
  return fn.generator ? generatorSignature(fn.method) : context.functions?.[fn.id];
};
var bindMethod = (id, thisObject, objectScope, calledClass, magicName = null) => {
  if (isGenerator(thisObject)) return bindGeneratorMethod(thisObject, id.slice(11));
  const fn = function() {
  };
  closures.set(fn, { id, thisObject, objectScope, calledClass, magicName });
  return fn;
};
var declareFunction = (id, context) => {
  const definition = context.functions?.[id];
  if (!definition) throw new Error(`Unknown frontend function declaration: ${id}`);
  const key = definition.name.toLowerCase();
  if (definition.declared || builtinNames.includes(key) || context.functionDeclarations.has(key) || Object.values(context.functions).some((fn) => fn.declared && fn.name.toLowerCase() === key)) throw new Error(`Cannot redeclare ${definition.name}()`);
  context.functionDeclarations.add(key);
  (context.functionDefinitionIds ||= /* @__PURE__ */ new Map()).set(key, id);
};
var callable = (value, context) => {
  const objectTarget = methodCallable(value, context) || objectInvokeTarget(value, context);
  if (objectTarget) return closures.get(objectTarget);
  if (isPhpObject(value)) throw new Error(`Object of type ${objectData(value).definition.name} is not callable`);
  if (typeof value === "function" && closures.has(value)) return closures.get(value);
  if (typeof value === "string") {
    const key = value.replace(/^\\/, "").toLowerCase();
    const id = context.functionDefinitionIds?.get(key) || Object.keys(context.functions || {}).find((id2) => context.functions[id2].name.toLowerCase() === key);
    if (id) return { id };
    throw new Error(`Call to undefined frontend function ${value}()`);
  }
  if (typeof value === "function") throw new TypeError("Value is not a compiled frontend callable");
  throw new Error("Value is not a compiled frontend callable");
};
var assignable = (node) => node?.$local || node?.$state || node?.$collection || ["dynamicLocal", "offset", "appendOffset", "objectProperty", "objectStaticProperty"].includes(node?.$expression?.operation);
var evaluateCall = (expression, state, context, target = resolveData2(expression.left, state, context)) => {
  if (typeof target === "string" && builtinNames.includes(target.replace(/^\\/, "").toLowerCase())) return evaluateBuiltin({ ...expression, left: target.replace(/^\\/, "").toLowerCase() }, state, context, resolveData2, resolveType, valueReference);
  const source = expression.right.source || context.source;
  try {
    const args = [];
    const definition = callableDefinition(target, context);
    if (definition.builtin) return evaluateBuiltin({ ...expression, left: definition.builtin }, state, context, resolveData2, resolveType, valueReference);
    for (const argument of expression.right.arguments || []) {
      const parameter = Object.hasOwn(argument, "name") ? definition.parameters.find((p) => p.name === argument.name) || definition.parameters.find((p) => p.variadic) : definition.parameters[args.length] || definition.parameters.find((p) => p.variadic);
      let ref = assignable(argument.value) && (parameter?.reference || argument.spread) ? valueReference(argument.value, state, context, false, false, !!argument.spread) : null;
      if (argument.spread) {
        const collection = ref ? ref.get().value : resolveData2(argument.value, state, context);
        if (isPhpObject(collection)) {
          for (const { key, item } of spreadEntries(collection, context)) args.push({ ...item, ...key.kind === "string" ? { name: key.value } : {} });
          continue;
        }
        let temporary = collection;
        const unpacked = ref || { get: () => ({ value: temporary, kind: "array" }), set: (value) => {
          temporary = value;
          return { value, kind: "array" };
        } };
        for (const [key, value] of arrayEntries(collection)) args.push({ ...typeof key === "string" ? { name: key } : {}, value: clonePhp(value), kind: arrayKind(collection, key), ref: { get: () => arrayRead(unpacked.get().value, key, context), set: (value2, kind, source2 = context.source) => {
          unpacked.set(arrayWrite(unpacked.get().value, key, value2, kind, context), "array", source2);
          return { value: value2, kind };
        } } });
      } else {
        if (parameter?.reference) ref = ref?.indirect?.() || ref;
        const item = ref ? parameter?.reference ? ref.acquire?.() || ref.get(true) : ref.get() : { value: resolveData2(argument.value, state, context) };
        if (!item.kind) item.kind = resolveType(argument.value, state, context, item.value);
        args.push({ ...argument, value: clonePhp(item.value), kind: item.kind, ref });
      }
    }
    return invokeFunction(target, args, state, { ...context, source });
  } catch (error) {
    throw withSource(error, source);
  }
};
var invokeFunction = (target, argumentsList, state, context) => {
  if (typeof target === "string" && builtinNames.includes(target.replace(/^\\/, "").toLowerCase())) return invokeBuiltin(target, argumentsList, state, context);
  const closure = callable(target, context), definition = context.functions?.[closure.id];
  if (definition?.internal && argumentsList.length > definition.parameters.length) throw failure3("ArgumentCountError", "Too many enum method arguments");
  if (closure.generator) return generatorMethod(closure.generator, closure.method, argumentsList, context);
  if (closure.magicName !== null && closure.magicName !== void 0) argumentsList = [{ value: closure.magicName, kind: "string" }, { value: magicArguments(argumentsList), kind: "array" }];
  if (definition?.builtin) return invokeBuiltin(definition.builtin, argumentsList, state, context);
  if (!definition || !definition.declared && !context.functionDeclarations?.has(definition.name.toLowerCase())) throw new Error(`Call to undefined function ${definition?.name || closure.id}()`);
  const budget = context.callBudget ||= { depth: 0, remaining: 1e4 };
  if (budget.depth >= 128 || --budget.remaining < 0) throw Object.assign(new RangeError("Frontend function call limit exceeded"), { code: "PHP_CALL_LIMIT" });
  const data = { ...context, returnsReference: !!definition.returnsReference, functionStatics: closure.staticLocals || null, thisObject: closure.thisObject || null, objectScope: closure.objectScope || definition.objectScope || null, calledClass: closure.calledClass || null, locals: clonePhp(closure.values || {}), localTypes: { ...closure.types }, localReferences: { ...closure.refs }, evaluated: /* @__PURE__ */ new WeakMap(), source: definition.source };
  data.trace = [{ file: context.source?.file, line: context.source?.line, function: definition.name }, ...context.trace || []];
  data.assignState = (target2, value, kind, source = data.source) => context.assignState(target2, value, kind, source);
  const parameters = definition.parameters || [], assigned = /* @__PURE__ */ new Map(), rest = [], seen = /* @__PURE__ */ new Set();
  let positional = 0, named = false;
  for (const argument of argumentsList) {
    let index;
    if (Object.hasOwn(argument, "name")) {
      named = true;
      if (seen.has(argument.name)) throw new Error(`Named parameter $${argument.name} overwrites previous argument`);
      seen.add(argument.name);
      index = parameters.findIndex((parameter) => parameter.name === argument.name && !parameter.variadic);
      if (index < 0) {
        if (!parameters.some((parameter) => parameter.variadic)) throw new Error(`Unknown named parameter $${argument.name}`);
        rest.push(argument);
        continue;
      }
    } else {
      if (named) throw new Error("Cannot use positional argument after named argument");
      index = positional++;
      if (index >= parameters.length || parameters[index].variadic) {
        rest.push(argument);
        continue;
      }
    }
    if (assigned.has(index)) throw new Error(`Named parameter $${parameters[index].name} overwrites previous argument`);
    assigned.set(index, argument);
  }
  const bind = (parameter, argument) => {
    if (parameter.reference && !argument.ref) throw new Error(`${definition.name}(): Argument $${parameter.name} cannot be passed by reference`);
    const original = parameter.reference ? argument.ref.get(true) : argument;
    let item;
    try {
      item = contract(parameter.rule, original, context.source?.strictTypes ?? true, data, `${definition.name}(): Argument $${parameter.name}`);
    } catch (error) {
      throw withSource(error, definition.source, data.trace);
    }
    if (parameter.reference) argument.ref.set(item.value, item.kind, context.source);
    return item;
  };
  for (let index = 0; index < parameters.length; index++) {
    const parameter = parameters[index];
    if (parameter.variadic) {
      const refs = /* @__PURE__ */ new Map();
      let values2 = makeArray(), position = 0;
      for (const argument2 of rest) {
        const item2 = bind(parameter, argument2), key = argument2.name ?? position++;
        values2 = arrayWrite(values2, key, item2.value, item2.kind, data);
        if (parameter.reference) refs.set(key, argument2.ref);
      }
      data.locals[parameter.id] = values2;
      data.localTypes[parameter.id] = "array";
      if (parameter.reference) data.localReferences[parameter.id] = {
        get: () => {
          for (const [key, ref] of refs) {
            const item2 = ref.get();
            values2 = arrayWrite(values2, key, item2.value, item2.kind, data);
          }
          return { value: values2, kind: "array" };
        },
        set: (value, kind, source = data.source) => {
          for (const [key, ref] of refs) {
            if (!Object.hasOwn(value, key)) {
              refs.delete(key);
              continue;
            }
            ref.set(value[key], arrayKind(value, key), source);
          }
          values2 = clonePhp(value);
          return { value: values2, kind: "array" };
        }
      };
      continue;
    }
    let argument = assigned.get(index);
    if (!argument) {
      if (!Object.hasOwn(parameter, "default")) throw withSource(failure3("ArgumentCountError", `${definition.name}(): Missing argument $${parameter.name}`), definition.source, data.trace);
      const value = resolveData2(parameter.default, state, data), kind = resolveType(parameter.default, state, data, value);
      let item2 = { value, kind };
      argument = { value, kind, ref: { get: () => item2, set: (value2, kind2) => item2 = { value: value2, kind: kind2 } } };
    }
    const item = bind(parameter, argument);
    data.locals[parameter.id] = clonePhp(item.value);
    ownArray(data.locals, parameter.id, data.locals[parameter.id]);
    data.localTypes[parameter.id] = item.kind;
    if (parameter.reference) data.localReferences[parameter.id] = argument.ref;
  }
  const last = assigned.size ? Math.max(...assigned.keys()) : -1;
  data.functionArguments = [...parameters.slice(0, last + 1).map((parameter) => ({ id: parameter.id })), ...rest.filter((argument) => !Object.hasOwn(argument, "name")).map((argument) => ({ value: clonePhp(argument.value), kind: argument.kind }))];
  if (definition.generator) return contract(definition.returnType, { value: createGenerator(definition, state, data), kind: "object" }, true, data, `${definition.name}(): Return value`);
  budget.depth++;
  try {
    if (definition.nativeReflection) return nativeReflectionMethod(definition, data);
    if (definition.nativeIntl) {
      if (rest.length) throw failure3("ArgumentCountError", `${definition.name}(): too many arguments`);
      return nativeIntlMethod(definition, data);
    }
    if (definition.nativeDate) {
      if (rest.length) throw failure3("ArgumentCountError", `${definition.name}(): too many arguments`);
      return nativeDateMethod(definition, data);
    }
    promoteProperties(definition, state, data);
    const signal = executeFunctionBody(definition.body, state, data);
    let result = signal?.operation === "return" ? { value: clonePhp(signal.value), kind: signal.kind } : { value: null, kind: "NULL" };
    const types = definition.returnType?.types || [];
    if (types.includes("never")) throw new TypeError(`${definition.name}(): never-returning function must not return`);
    if (types.includes("void")) {
      if (signal?.hasValue) throw new TypeError(`${definition.name}(): void function must not return a value`);
      return { value: null, kind: "NULL" };
    }
    if (!signal && definition.returnType) throw new TypeError(`${definition.name}(): Return value is required`);
    try {
      const output = contract(definition.returnType, result, definition.source?.strictTypes ?? true, data, `${definition.name}(): Return value`);
      if (definition.returnsReference && signal?.reference) {
        signal.reference.set(output.value, output.kind);
        return { ...output, reference: signal.reference };
      }
      return output;
    } catch (error) {
      throw withSource(error, signal?.source || definition.source, data.trace);
    }
  } catch (error) {
    error.phpStack ||= [];
    error.phpStack.push({ function: definition.name, source: context.source });
    throw withSource(error, definition.source, data.trace);
  } finally {
    releaseLocalReferences(data);
    releaseArrays(data.locals);
    budget.depth--;
  }
};
var executeFunctionBody = (action, state, context) => {
  if (!action) return;
  const data = { ...context, source: action.phpSource || context.source };
  const value = (node) => resolveData2(node, state, data);
  const item = (node) => {
    const result = value(node);
    return { value: result, kind: resolveType(node, state, data, result) };
  };
  const run2 = (child) => executeFunctionBody(child, state, data);
  const iteration = (count) => {
    if (count > (action.limit || 1e3) || --data.loopBudget.remaining < 0) throw Object.assign(new RangeError("Frontend loop exceeds its safe iteration limit"), { code: "PHP_LOOP_LIMIT" });
  };
  const outer = (signal) => signal.operation === "return" ? signal : { ...signal, levels: signal.levels - 1 };
  const bindings = (rules, source, kind) => bindOffsetPattern(rules, { value: source, kind }, item, (target, current) => assignTarget(target, current.value, current.kind, state, data), data);
  try {
    if (action.type === "try") {
      const flow = exceptionFlow(action, (target, error) => assignTarget(target, error, "object", state, data), data);
      let step = flow.next();
      while (!step.done) {
        try {
          step = flow.next(run2(step.value));
        } catch (error) {
          step = flow.throw(error);
        }
      }
      return step.value;
    }
    if (["sequence", "transaction"].includes(action.type)) {
      for (const child of action.actions || []) {
        const signal = run2(child);
        if (signal) return signal;
      }
      return;
    }
    if (action.type === "return") {
      let reference;
      if (data.returnsReference && action.hasValue) {
        if (assignable(action.value) || ["call", "objectCall"].includes(action.value?.$expression?.operation)) reference = promoteReference(action.value, state, data);
        else warn(data, "Only variable references should be returned by reference", "PHP_NOTICE");
      }
      return { operation: "return", ...reference ? reference.get() : item(action.value), reference, hasValue: action.hasValue, source: data.source };
    }
    if (action.type === "function-declare") {
      declareFunction(action.id, data);
      return;
    }
    if (action.type === "evaluate") {
      value(action.value);
      return;
    }
    if (action.type === "local-set") {
      const result = item(action.value);
      assignTarget({ $local: action.name }, result.value, result.kind, state, data);
      return;
    }
    if (action.type === "condition") {
      const a = item(Object.hasOwn(action, "left") ? action.left : { $state: action.state }), b = item(action.value);
      return run2(phpMatches(action.operator, a.value, b.value, a.kind, b.kind) ? action.then : action.otherwise);
    }
    if (action.type === "loop-control") return { operation: action.operation, levels: action.levels || 1 };
    if (action.type === "console") {
      const values2 = (action.values || []).map(item);
      if (action.level === "echo") console.log(values2.map((entry) => phpString(entry.value, entry.kind, data)).join(""));
      else if (action.level === "dump") console.log(values2.map((entry) => phpDump(entry.value, entry.kind, 0, void 0, data)).join(""));
      else console[action.level === "warn" ? "warn" : action.level === "error" ? "error" : "log"](...values2.map((entry) => entry.value));
      return;
    }
    if (action.type === "set") {
      const result = item(action.value);
      data.assignState(action.target, result.value, result.kind, data.source);
      return;
    }
    if (action.type === "increment" || action.type === "decrement") {
      const current = item({ $state: action.target });
      const next2 = phpIncrement(current.value, current.kind, action.type === "increment" ? 1 : -1, data);
      data.assignState(action.target, next2.value, next2.kind, data.source);
      return;
    }
    if (action.type === "destructure") {
      destructure(action, state, data);
      return;
    }
    if (action.type === "switch") {
      const subject = item(action.value);
      let start = -1, fallback = -1;
      for (let i = 0; i < action.cases.length; i++) {
        const branch = action.cases[i];
        if (branch.default) {
          fallback = i;
          continue;
        }
        const candidate = item(branch.value);
        if (phpMatches("looseEq", subject.value, candidate.value, subject.kind, candidate.kind)) {
          start = i;
          break;
        }
      }
      if (start < 0) start = fallback;
      for (let i = start; i >= 0 && i < action.cases.length; i++) {
        const signal = run2(action.cases[i].action);
        if (!signal) continue;
        if (signal.operation === "return" || signal.levels > 1) return outer(signal);
        if (signal.operation === "continue") warn(data, "continue targeting switch is equivalent to break");
        break;
      }
      return;
    }
    if (action.type === "foreach-local") {
      const patternReference = action.bindings.some((binding) => binding.reference), byReference = action.reference || patternReference;
      const source = byReference ? null : clonePhp(value(action.source));
      let count = 0;
      for (const { key, item: item2, reference } of byReference ? referenceEntries(action.source, state, data, () => iteration(++count)) : foreachEntries(source, !!action.key, data, () => iteration(++count))) {
        if (reference && patternReference) destructureReference(action.bindings, reference, state, data);
        else if (reference) bindReferenceTarget(action.bindings[0].target, reference, state, data);
        else bindings(action.bindings, item2.value, item2.kind);
        if (action.key) assignTarget(action.key, key.value, key.kind, state, data);
        const signal = run2(action.action);
        if (signal?.operation === "return" || signal?.levels > 1) return outer(signal);
        if (signal?.operation === "break") break;
      }
      return;
    }
    if (action.type === "loop") {
      run2(action.init);
      let count = 0;
      const condition = () => {
        let result = true;
        for (const node of action.conditions) result = value(node);
        return phpBool(result);
      };
      while (action.kind === "do" && count === 0 || condition()) {
        iteration(++count);
        const signal = run2(action.action);
        if (signal?.operation === "return" || signal?.levels > 1) return outer(signal);
        if (signal?.operation === "break") break;
        run2(action.update);
      }
      return;
    }
    throw new Error(`Unsupported instruction in a synchronous frontend function: ${action.type}`);
  } catch (error) {
    throw withSource(error, data.source, data.trace);
  }
};
var cloneClosure = (value) => {
  const data = closures.get(value);
  if (!data) return null;
  const fn = function() {
  };
  const copy = { ...data, values: clonePhp(data.values || {}), types: { ...data.types }, refs: { ...data.refs }, staticLocals: data.staticLocals ? new Map([...data.staticLocals].map(([key, item]) => [key, { ...item, value: clonePhp(item.value) }])) : null };
  closures.set(fn, copy);
  for (const ref of Object.values(copy.refs)) if (ref.cell) observeValueOwnership(fn, (active) => active ? ref.cell.bindings.add(fn) : ref.cell.bindings.delete(fn));
  return fn;
};

// src-js/eval/generators.js
var containsYield = (node) => {
  if (!node || typeof node !== "object") return false;
  const rule = node.$expression;
  if (["yield", "yieldFrom"].includes(rule?.operation)) return true;
  if (rule?.operation === "eval") return containsYield(rule.left);
  return Object.values(node).some(containsYield);
};

// src-js/core/php-generator-values.js
var empty = () => ({ value: null, kind: "NULL" });
var expr = (operation, left, right) => ({ $expression: { operation, left, right } });
var assignable2 = (node) => node?.$local || node?.$state || ["dynamicLocal", "offset", "appendOffset", "objectProperty", "objectStaticProperty"].includes(node?.$expression?.operation);
var read = (node, state, context) => {
  const value = resolveData2(node, state, context);
  return { value, kind: resolveType(node, state, context, value) };
};
function* generatorTarget(node, state, context, frame) {
  const rule = node?.$expression;
  if (!rule) return node;
  if (["offset", "appendOffset"].includes(rule.operation)) return expr(rule.operation, yield* generatorTarget(rule.left, state, context, frame), rule.operation === "offset" ? resolvedNode2(yield* generatorValue(rule.right, state, context, frame)) : null);
  if (rule.operation === "objectProperty") return expr(rule.operation, resolvedNode2(yield* generatorValue(rule.left, state, context, frame)), { ...rule.right, name: resolvedNode2(yield* generatorValue(rule.right.name, state, context, frame)) });
  return node;
}
function* shape(node, state, context, frame) {
  if (!node || typeof node !== "object") return node;
  if (Object.keys(node).some((key) => key.startsWith("$"))) return resolvedNode2(yield* generatorValue(node, state, context, frame));
  const result = Array.isArray(node) ? [] : {};
  for (const [key, value] of Object.entries(node)) result[key] = yield* shape(value, state, context, frame);
  return result;
}
function* delegate(source, context) {
  if (!isIterable(source)) throw new Error('Can use "yield from" only with arrays and Traversables');
  if (isGenerator(source)) {
    if (generatorClosed(source)) throw new Error("Generator passed to yield from was aborted without proper return and is unable to continue");
    const call = (method2, args = []) => generatorMethod(source, method2, args, context);
    let count2 = 0;
    while (call("valid").value) {
      if (++count2 > 1e3 || --context.loopBudget.remaining < 0) throw Object.assign(new RangeError("Frontend generator delegation exceeds its iteration limit"), { code: "PHP_LOOP_LIMIT" });
      let sent;
      try {
        sent = yield { key: call("key"), item: call("current") };
      } catch (error) {
        call("throw", [{ value: error, kind: "object" }]);
        continue;
      }
      call("send", [sent || empty()]);
    }
    return call("getreturn");
  }
  let count = 0;
  for (const entry of foreachEntries(source, true, context, () => {
    if (++count > 1e3 || --context.loopBudget.remaining < 0) throw Object.assign(new RangeError("Frontend generator delegation exceeds its iteration limit"), { code: "PHP_LOOP_LIMIT" });
  })) yield entry;
  return empty();
}
function* nullsafeGenerator(node, state, context, frame) {
  const rule = node?.$expression;
  if (rule?.operation === "nullsafeChain") return yield* nullsafeGenerator(rule.left, state, context, frame);
  if (!["objectProperty", "objectCall", "objectMethodRef", "offset", "objectClassName", "objectStaticProperty", "objectClass", "objectConstant"].includes(rule?.operation)) return yield* generatorValue(node, state, context, frame);
  const isStatic = ["objectCall", "objectMethodRef"].includes(rule.operation) && rule.right?.class != null;
  const item = yield* nullsafeGenerator(isStatic ? rule.right.class : rule.left, state, context, frame);
  if (item.skipped || item.value === null && rule.right?.nullable) return { ...empty(), skipped: true };
  const next2 = isStatic ? expr(rule.operation, rule.left, { ...rule.right, class: resolvedNode2(item) }) : expr(rule.operation, resolvedNode2(item), rule.right);
  return yield* generatorValue(next2, state, context, frame);
}
function* generatorValue(node, state, context, frame) {
  if (!containsYield(node)) return read(node, state, context);
  const evaluate = function* (value) {
    return yield* generatorValue(value, state, context, frame);
  };
  const rule = node?.$expression;
  if (node?.$conditional) {
    const c = node.$conditional, a = yield* evaluate(c.left), b = yield* evaluate(c.right);
    return yield* evaluate(phpMatches(c.operator, a.value, b.value, a.kind, b.kind) ? c.then : c.otherwise);
  }
  if (!rule) return read(yield* shape(node, state, context, frame), state, context);
  if (rule.operation === "nullsafeChain") return yield* nullsafeGenerator(rule.left, state, context, frame);
  if (rule.operation === "yield") {
    const key = rule.right.keyed ? yield* evaluate(rule.left) : { value: frame.index + 1, kind: "integer" };
    let reference = null, item;
    if (frame.definition.returnsReference && assignable2(rule.right.value)) {
      reference = promoteReference(yield* generatorTarget(rule.right.value, state, context, frame), state, context);
      item = reference.get();
    } else {
      item = yield* evaluate(rule.right.value);
      if (frame.definition.returnsReference) {
        warn(context, "Only variable references should be yielded by reference", "PHP_NOTICE");
        reference = createReference(item);
      }
    }
    if (key.kind === "integer" && key.value > frame.index) frame.index = key.value;
    if (!Number.isSafeInteger(frame.index)) throw new RangeError("Generator key exceeds safe frontend integer precision");
    return (yield { key, item: { ...item, value: clonePhp(item.value) }, reference }) || empty();
  }
  if (rule.operation === "yieldFrom") return yield* delegate((yield* evaluate(rule.left)).value, context);
  if (["assign", "compoundAssign", "coalesceAssign"].includes(rule.operation)) {
    const frozen = yield* generatorTarget(rule.left, state, context, frame), ref = valueReference(frozen, state, context, false, true);
    if (rule.operation === "coalesceAssign") {
      const current = ref.probe?.() || ref.get(true);
      if (current.value != null) return current;
    }
    const right = rule.operation === "compoundAssign" ? { ...rule.right, value: resolvedNode2(yield* evaluate(rule.right.value)) } : resolvedNode2(yield* evaluate(rule.right));
    return read(expr(rule.operation === "coalesceAssign" ? "assign" : rule.operation, resolvedNode2(empty(), ref), right), state, context);
  }
  if (["preIncrement", "postIncrement", "preDecrement", "postDecrement", "unsetOffset"].includes(rule.operation)) return read(expr(rule.operation, yield* generatorTarget(rule.left, state, context, frame), rule.right), state, context);
  if (["and", "or", "coalesce", "elvis"].includes(rule.operation)) {
    const left = rule.operation === "coalesce" && !containsYield(rule.left) ? read(expr("coalesce", rule.left, null), state, context) : yield* evaluate(rule.left);
    if (rule.operation === "and" && !phpBool(left.value)) return { value: false, kind: "boolean" };
    if (rule.operation === "or" && phpBool(left.value)) return { value: true, kind: "boolean" };
    if (rule.operation === "coalesce" && left.value != null || rule.operation === "elvis" && phpBool(left.value)) return left;
    const right = yield* evaluate(rule.right);
    return ["and", "or"].includes(rule.operation) ? { value: phpBool(right.value), kind: "boolean" } : right;
  }
  if (rule.operation === "match") {
    const subject = yield* evaluate(rule.left);
    let fallback;
    for (const arm of rule.right) {
      if (arm.default) {
        fallback = arm;
        continue;
      }
      for (const condition of arm.conditions) {
        const candidate = yield* evaluate(condition);
        if (phpMatches("eq", subject.value, candidate.value, subject.kind, candidate.kind)) return yield* evaluate(arm.value);
      }
    }
    if (fallback) return yield* evaluate(fallback.value);
    throw Object.assign(new Error("Unhandled match case"), { name: "UnhandledMatchError" });
  }
  if (["call", "objectCall", "builtin"].includes(rule.operation)) {
    let callee;
    if (rule.operation === "objectCall") {
      const options = rule.right.class != null ? { ...rule.right, class: resolvedNode2(yield* evaluate(rule.right.class)) } : rule.right;
      const receiver = yield* evaluate(rule.left);
      if (receiver.value == null && rule.right.nullable) return empty();
      const name = yield* evaluate(rule.right.name);
      callee = read(expr("objectMethodRef", resolvedNode2(receiver), { ...options, name: resolvedNode2(name), arguments: [] }), state, context);
    } else callee = rule.operation === "builtin" ? { value: rule.left, kind: "string" } : yield* evaluate(rule.left);
    if (rule.operation === "objectCall" && callee.value === null && rule.right.nullable) return empty();
    const builtin = typeof callee.value === "string" ? callee.value.replace(/^\\/, "").toLowerCase() : null;
    const parameters = builtin_signatures_default[builtin] || callableDefinition(callee.value, context)?.parameters || [];
    const args = [];
    let position = 0;
    for (const argument of rule.right.arguments || []) {
      const parameter = argument.name !== void 0 ? parameters.find((p) => p.name === argument.name) || parameters.find((p) => p.variadic) : parameters[position] || parameters.find((p) => p.variadic);
      let ref = null, item;
      if ((parameter?.reference || argument.spread) && assignable2(argument.value)) {
        ref = valueReference(yield* generatorTarget(argument.value, state, context, frame), state, context, false, false, !!argument.spread);
        if (parameter?.reference) ref = ref.indirect?.() || ref;
        item = parameter?.reference ? ref.acquire?.() || ref.get(true) : ref.get();
        const original = ref;
        let first = !!argument.spread;
        ref = { ...ref, get: (...a) => first ? (first = false, item) : original.get(...a), acquire: () => original.get(true), indirect: () => ref };
      } else item = yield* evaluate(argument.value);
      args.push({ ...argument, value: resolvedNode2({ ...item, value: clonePhp(item.value) }, ref) });
      if (argument.name === void 0) position += argument.spread ? Object.keys(item.value).length : 1;
    }
    return read(expr("call", resolvedNode2(callee), { ...rule.right, arguments: args }), state, context);
  }
  if (rule.operation === "array") {
    const entries = [];
    for (const entry of rule.left) {
      if (Object.hasOwn(entry, "spread")) entries.push({ spread: resolvedNode2(yield* evaluate(entry.spread)) });
      else {
        const key = Object.hasOwn(entry, "key") ? resolvedNode2(yield* evaluate(entry.key)) : void 0;
        const value = resolvedNode2(yield* evaluate(entry.value));
        entries.push({ ...key === void 0 ? {} : { key }, value });
      }
    }
    return read(expr("array", entries, rule.right), state, context);
  }
  return read(expr(rule.operation, yield* shape(rule.left, state, context, frame), yield* shape(rule.right, state, context, frame)), state, context);
}

// src-js/core/php-generator-body.js
function* executeGeneratorBody(action, state, context, frame) {
  if (!action) return;
  if (!containsYield(action)) return executeFunctionBody(action, state, context);
  const data = { ...context, source: action.phpSource || context.source };
  const item = function* (node) {
    return yield* generatorValue(node, state, data, frame);
  };
  const value = function* (node) {
    return (yield* item(node)).value;
  };
  const run2 = function* (child) {
    return yield* executeGeneratorBody(child, state, data, frame);
  };
  const iteration = (count) => {
    if (count > (action.limit || 1e3) || --data.loopBudget.remaining < 0) throw Object.assign(new RangeError("Frontend loop exceeds its safe iteration limit"), { code: "PHP_LOOP_LIMIT" });
  };
  const outer = (signal) => signal.operation === "return" ? signal : { ...signal, levels: signal.levels - 1 };
  const bindings = function* (rules, source, kind) {
    const cache = /* @__PURE__ */ new Map();
    for (const binding of rules) {
      let current = { value: source, kind };
      for (const [depth, node] of binding.path.entries()) {
        const slot = binding.slots && depth + 1 < binding.path.length ? binding.slots.slice(0, depth + 1).join(".") : null;
        if (slot !== null && cache.has(slot)) current = cache.get(slot);
        else {
          const offset = yield* item(node);
          current = readOffset(current.value, offset.value, offset.kind, data);
          if (slot !== null) cache.set(slot, current);
        }
      }
      assignTarget(yield* generatorTarget(binding.target, state, data, frame), current.value, current.kind, state, data);
    }
  };
  try {
    if (action.type === "try") {
      const flow = exceptionFlow(action, (target, error) => assignTarget(target, error, "object", state, data), data);
      let step = flow.next();
      while (!step.done) {
        try {
          step = flow.next(yield* run2(step.value));
        } catch (error) {
          step = flow.throw(error);
        }
      }
      return step.value;
    }
    if (["sequence", "transaction"].includes(action.type)) {
      for (const child of action.actions || []) {
        const signal = yield* run2(child);
        if (signal) return signal;
      }
      return;
    }
    if (action.type === "return") return { operation: "return", ...yield* item(action.value), hasValue: action.hasValue, source: data.source };
    if (action.type === "function-declare") {
      declareFunction(action.id, data);
      return;
    }
    if (action.type === "evaluate") {
      yield* value(action.value);
      return;
    }
    if (action.type === "local-set") {
      const result = yield* item(action.value);
      assignTarget({ $local: action.name }, result.value, result.kind, state, data);
      return;
    }
    if (action.type === "condition") {
      const a = yield* item(Object.hasOwn(action, "left") ? action.left : { $state: action.state }), b = yield* item(action.value);
      return yield* run2(phpMatches(action.operator, a.value, b.value, a.kind, b.kind) ? action.then : action.otherwise);
    }
    if (action.type === "loop-control") return { operation: action.operation, levels: action.levels || 1 };
    if (action.type === "console") {
      const values2 = [];
      for (const node of action.values || []) values2.push(yield* item(node));
      if (action.level === "echo") console.log(values2.map((entry) => phpString(entry.value, entry.kind, data)).join(""));
      else if (action.level === "dump") console.log(values2.map((entry) => phpDump(entry.value, entry.kind, 0, void 0, data)).join(""));
      else console[action.level === "warn" ? "warn" : action.level === "error" ? "error" : "log"](...values2.map((entry) => entry.value));
      return;
    }
    if (action.type === "set") {
      const result = yield* item(action.value);
      data.assignState(action.target, result.value, result.kind, data.source);
      return;
    }
    if (action.type === "increment" || action.type === "decrement") {
      const current = yield* item({ $state: action.target });
      const next2 = phpIncrement(current.value, current.kind, action.type === "increment" ? 1 : -1, data);
      data.assignState(action.target, next2.value, next2.kind, data.source);
      return;
    }
    if (action.type === "destructure") {
      const result = yield* item(action.value);
      yield* bindings(action.bindings, clonePhp(result.value), result.kind);
      return;
    }
    if (action.type === "switch") {
      const subject = yield* item(action.value);
      let start = -1, fallback = -1;
      for (let i = 0; i < action.cases.length; i++) {
        const branch = action.cases[i];
        if (branch.default) {
          fallback = i;
          continue;
        }
        const candidate = yield* item(branch.value);
        if (phpMatches("looseEq", subject.value, candidate.value, subject.kind, candidate.kind)) {
          start = i;
          break;
        }
      }
      if (start < 0) start = fallback;
      for (let i = start; i >= 0 && i < action.cases.length; i++) {
        const signal = yield* run2(action.cases[i].action);
        if (!signal) continue;
        if (signal.operation === "return" || signal.levels > 1) return outer(signal);
        if (signal.operation === "continue") warn(data, "continue targeting switch is equivalent to break");
        break;
      }
      return;
    }
    if (action.type === "foreach-local") {
      const patternReference = action.bindings.some((binding) => binding.reference), byReference = action.reference || patternReference;
      const source = byReference ? null : clonePhp(yield* value(action.source));
      let count = 0;
      for (const { key, item: item2, reference } of byReference ? referenceEntries(action.source, state, data, () => iteration(++count)) : foreachEntries(source, !!action.key, data, () => iteration(++count))) {
        if (reference && patternReference) destructureReference(action.bindings, reference, state, data);
        else if (reference) bindReferenceTarget(yield* generatorTarget(action.bindings[0].target, state, data, frame), reference, state, data);
        else yield* bindings(action.bindings, item2.value, item2.kind);
        if (action.key) assignTarget(yield* generatorTarget(action.key, state, data, frame), key.value, key.kind, state, data);
        const signal = yield* run2(action.action);
        if (signal?.operation === "return" || signal?.levels > 1) return outer(signal);
        if (signal?.operation === "break") break;
      }
      return;
    }
    if (action.type === "loop") {
      yield* run2(action.init);
      let count = 0;
      const condition = function* () {
        let result = true;
        for (const node of action.conditions) result = yield* value(node);
        return phpBool(result);
      };
      while (action.kind === "do" && count === 0 || (yield* condition())) {
        iteration(++count);
        const signal = yield* run2(action.action);
        if (signal?.operation === "return" || signal?.levels > 1) return outer(signal);
        if (signal?.operation === "break") break;
        yield* run2(action.update);
      }
      return;
    }
    throw new Error(`Unsupported instruction in a synchronous frontend function: ${action.type}`);
  } catch (error) {
    throw withSource(error, data.source, data.trace);
  }
}

// src-js/core/php-generators.js
var generators = /* @__PURE__ */ new WeakMap();
var generatorDefinition = (version = 80400) => ({ name: "Generator", ancestors: ["Iterator", "Traversable"], parent: null, interfaces: ["Iterator"], properties: {}, staticProperties: {}, constants: {}, final: true, abstract: false, methods: Object.fromEntries(["rewind", "valid", "current", "key", "next", "send", "throw", "getReturn", version >= 80400 ? "__debugInfo" : "__wakeup"].map((name) => [name.toLowerCase(), { name, id: "@generator:" + name.toLowerCase(), visibility: "public", owner: "Generator", static: false, abstract: false }])) });
var empty2 = () => ({ value: null, kind: "NULL" });
var failure4 = (message) => Object.assign(new Error(message), { name: "Exception" });
var generatorMethods = ["current", "key", "next", "rewind", "valid", "send", "throw", "getreturn", "__debuginfo", "__wakeup"];
var generatorSignature = (method2) => ({ parameters: ["send", "throw"].includes(method2) ? [{ name: method2 === "send" ? "value" : "exception", reference: false, variadic: false }] : [] });
var isGenerator = (value) => generators.has(value);
var createGenerator = (definition, state, context) => {
  if (--(context.objectBudget ||= { remaining: 1e4 }).remaining < 0) throw new RangeError("Frontend object allocation limit exceeded");
  const value = makeObject(generatorDefinition(context.source?.phpVersion));
  const frame = { definition, state, context, started: false, done: false, running: false, advanced: false, packet: null, result: null, index: -1 };
  frame.caller = { ...context };
  for (const key of ["loopBudget", "callBudget", "objectBudget", "builtinBudget"]) {
    const original = context[key] ||= { remaining: key === "builtinBudget" ? 1e6 : 1e4 };
    frame.caller[key] = original;
    const proxy = {};
    for (const field of key === "callBudget" ? ["remaining", "depth"] : ["remaining"]) Object.defineProperty(proxy, field, { enumerable: true, get: () => frame.caller[key][field], set: (value2) => {
      frame.caller[key][field] = value2;
    } });
    context[key] = proxy;
  }
  const assign2 = context.assignState;
  frame.caller.assignState = assign2;
  context.assignState = (...args) => frame.caller.assignState(...args);
  frame.iterator = executeGeneratorBody(definition.body, state, context, frame);
  generators.set(value, frame);
  return value;
};
var generatorClosed = (value) => generators.get(value)?.done === true;
var refresh = (frame, caller) => {
  frame.caller = { ...caller };
};
var advance = (frame, method2, item, caller) => {
  if (frame.running) throw new Error("Cannot resume an already running generator");
  refresh(frame, caller);
  const budget = caller.callBudget ||= { depth: 0, remaining: 1e4 };
  if (budget.depth >= 128 || --budget.remaining < 0) throw Object.assign(new RangeError("Frontend function call limit exceeded"), { code: "PHP_CALL_LIMIT" });
  budget.depth++;
  frame.running = true;
  try {
    const step = method2 === "throw" ? frame.iterator.throw(item.value) : frame.iterator.next(item);
    frame.started = true;
    frame.done = step.done;
    if (step.done) {
      frame.result = step.value?.operation === "return" ? { value: clonePhp(step.value.value), kind: step.value.kind } : empty2();
      frame.packet = null;
    } else frame.packet = step.value;
  } catch (error) {
    frame.done = true;
    frame.started = true;
    frame.packet = null;
    throw withSource(error, frame.definition.source, frame.context.trace);
  } finally {
    frame.running = false;
    budget.depth--;
  }
};
var generatorMethod = (value, method2, args, context) => {
  const frame = generators.get(value);
  method2 = method2.toLowerCase();
  if (!frame || !generatorMethods.includes(method2)) throw new Error(`Call to undefined method Generator::${method2}()`);
  if (context.readOnly) throw new Error("Generators must be used in frontend events");
  const names2 = generatorSignature(method2).parameters.map((p) => p.name), values2 = [];
  let named = false;
  for (const arg of args) {
    if (arg.name !== void 0) {
      named = true;
      if (!names2.includes(arg.name)) throw new Error(`Unknown named parameter $${arg.name}`);
    } else if (named) throw new Error("Cannot use positional argument after named argument");
    if (values2.length) {
      if (arg.name !== void 0) throw new Error("Named parameter overwrites previous argument");
      throw Object.assign(new Error("Too many Generator arguments"), { name: "ArgumentCountError" });
    }
    values2.push(arg);
  }
  if (values2.length !== names2.length) throw Object.assign(new Error(`Generator::${method2}() expects ${names2.length} arguments`), { name: "ArgumentCountError" });
  if (method2 === "throw" && !(values2[0].value instanceof Error)) throw new TypeError("Generator::throw(): expected Throwable");
  if (frame.running) throw new Error("Cannot resume an already running generator");
  if (method2 === "__wakeup") throw failure4("Unserialization of Generator is not allowed");
  if (method2 === "__debuginfo") return { value: { function: frame.definition.name }, kind: "array" };
  if (!frame.started) advance(frame, "next", empty2(), context);
  if (method2 === "getreturn") {
    if (!frame.done || !frame.result) throw failure4("Cannot get return value of a generator that hasn't returned");
    return frame.result;
  }
  if (method2 === "rewind") {
    if (frame.advanced) throw failure4("Cannot rewind a generator that was already run");
    return empty2();
  }
  if (method2 === "valid") return { value: !frame.done, kind: "boolean" };
  if (method2 === "current") return frame.packet?.reference?.get() || frame.packet?.item || empty2();
  if (method2 === "key") return frame.packet?.key || empty2();
  if (!frame.done) {
    frame.advanced = true;
    advance(frame, method2 === "throw" ? "throw" : "next", values2[0] || empty2(), context);
  } else if (method2 === "throw") throw values2[0].value;
  return method2 === "next" ? empty2() : frame.packet?.reference?.get() || frame.packet?.item || empty2();
};
var generatorReference = (value, context) => {
  const frame = generators.get(value);
  if (!frame?.definition.returnsReference) throw new Error("You can only iterate a generator by-reference if it declared that it yields by-reference");
  generatorMethod(value, "valid", [], context);
  return frame.packet?.reference;
};

// src-js/core/php-static-properties.js
var serviceRuntime = (config, action) => {
  if (!action.serviceScope && !Object.keys(action.classes || {}).length) return { fields: /* @__PURE__ */ new Map(), classes: {}, functions: action.functions || {} };
  const scopes = config ? config.serviceScopes ||= /* @__PURE__ */ new Map() : /* @__PURE__ */ new Map();
  const scope = action.serviceScope || "__aml_services";
  const runtime = scopes.get(scope) || { fields: /* @__PURE__ */ new Map(), classes: {}, functions: {} };
  const classes = { ...runtime.classes, ...action.classes }, functions = { ...runtime.functions, ...action.functions };
  if (Object.keys(classes).length > 64 || Object.keys(functions).length > 256) throw new RangeError("Frontend component service catalogue exceeds 64 classes or 256 functions");
  runtime.classes = classes;
  runtime.functions = functions;
  scopes.set(scope, runtime);
  return runtime;
};
var stores = /* @__PURE__ */ new WeakMap();
var staticPropertyReference = (expression, state, context) => {
  const className = expression.left === "@static" ? context.calledClass : resolveData2(expression.left, state, context);
  const name = phpString(resolveData2(expression.right.name, state, context), void 0, context), property = objectMemberLookup(className, name, "staticProperties", context, false);
  const allowed = property && objectMemberAccessible(property, context);
  const fields = context.staticFields ||= /* @__PURE__ */ new Map();
  const key = property && property.owner.toLowerCase() + "::$" + name;
  const check = (quiet = false) => {
    if (!property) {
      if (quiet) return false;
      throw new Error(`Access to undeclared static property ${className}::$${name}`);
    }
    if (!allowed) {
      if (quiet) return false;
      throw new Error(`Cannot access ${property.visibility} property ${property.owner}::$${name}`);
    }
    return true;
  };
  const initialize = () => {
    if (!fields.has(key) && Object.hasOwn(property, "default")) {
      const value = resolveData2(property.default, state, { ...context, objectScope: property.owner, calledClass: className });
      fields.set(key, assignType(property.rule, clonePhp(value), resolveType(property.default, state, { ...context, objectScope: property.owner, calledClass: className }, value), true, context));
      ownArray(fields, key, fields.get(key).value);
    }
  };
  let bindings = stores.get(fields);
  if (!bindings) {
    bindings = /* @__PURE__ */ new Map();
    stores.set(fields, bindings);
  }
  const reference = {
    initialized: () => {
      check();
      initialize();
      return fields.has(key);
    },
    get: (quiet = false) => {
      if (!check(quiet)) return { value: null, kind: "NULL" };
      initialize();
      if (!fields.has(key)) {
        if (quiet) return { value: null, kind: "NULL" };
        throw new Error(`Typed static property ${property.owner}::$${name} must not be accessed before initialization`);
      }
      return fields.get(key);
    },
    acquire: () => {
      check();
      initialize();
      if (!fields.has(key)) {
        if (property.rule && !property.rule.nullable) throw new Error(`Cannot access uninitialized non-nullable property ${property.owner}::$${name} by reference`);
        fields.set(key, { value: null, kind: "NULL" });
      }
      return fields.get(key);
    },
    set: (value, kind, source = context.source) => {
      check();
      if (context.readOnly) throw new Error("Static properties must be modified in frontend events");
      const result = assignType(property.rule, value, kind, source?.strictTypes ?? true, context);
      if (bindings.has(key)) return bindings.get(key).ref.set(result.value, result.kind);
      fields.set(key, { value: clonePhp(result.value), kind: result.kind });
      ownArray(fields, key, fields.get(key).value);
      return result;
    },
    remove: () => {
      check();
      throw new Error(`Attempt to unset static property ${property.owner}::$${name}`);
    },
    bind: (ref) => {
      check();
      if (!ref.cell) throw new Error("Property binding requires a reference cell");
      const item = ref.get(), checked = assignType(property.rule, item.value, item.kind, context.source?.strictTypes ?? true, context);
      ref.set(checked.value, checked.kind);
      const previous = bindings.get(key);
      previous?.ref.cell.guards.delete(previous.token);
      previous?.ref.cell.bindings.delete(previous.token);
      const token2 = {};
      bindings.set(key, { ref, token: token2 });
      ref.cell.bindings.add(token2);
      ref.cell.guards.set(token2, (value, kind) => assignType(property.rule, value, kind, context.source?.strictTypes ?? true, context));
      fields.set(key, { get value() {
        return ref.get().value;
      }, get kind() {
        return ref.get().kind;
      }, reference: ref });
      return ref;
    },
    reference: () => bindings.get(key)?.ref || reference.bind(createReference(reference.get()))
  };
  return reference;
};

// src-js/core/php-objects.js
var classDefinition = (name, context) => typeof name === "string" && Object.hasOwn(context.classes || {}, name.toLowerCase()) && context.classes[name.toLowerCase()] || (name?.toLowerCase() === "generator" ? generatorDefinition(context.source?.phpVersion) : name?.toLowerCase() === "stdclass" ? stdClassDefinition() : null) || dateDefinition(name) || (() => {
  throw new Error(`Unknown compiled frontend class: ${name}`);
})();
var lineage2 = (name, context) => {
  const result = [];
  while (name) {
    const item = classDefinition(name, context);
    result.push(item);
    name = item.parent;
  }
  return result;
};
var related = (a, b, context) => !!a && (a.toLowerCase() === b.toLowerCase() || lineage2(a, context).some((entry) => entry.name.toLowerCase() === b.toLowerCase()));
var objectMemberAccessible = (member, context) => member.visibility === "public" || member.visibility === "private" && context.objectScope?.toLowerCase() === member.owner.toLowerCase() || member.visibility === "protected" && (related(context.objectScope, member.owner, context) || context.objectScope && related(member.owner, context.objectScope, context));
var objectMemberLookup = (name, member, table, context, virtual = true) => {
  const scoped = context.objectScope && context.classes?.[context.objectScope.toLowerCase()]?.[table]?.[member];
  if (virtual && scoped?.visibility === "private" && related(name, context.objectScope, context)) return scoped;
  for (const item of lineage2(name, context)) if (Object.hasOwn(item[table] || {}, member)) return item[table][member];
  return null;
};
var keyOf = (property) => property.visibility === "private" ? property.owner + "::$" + property.name : property.name;
var objectPropertyReference = (expression, state, context) => {
  const value = resolveData2(expression.left, state, context), name = value == null && expression.right.nullable ? "" : phpString(resolveData2(expression.right.name, state, context), void 0, context), data = objectData(value);
  const dynamic = stdClassReference(value, name, context);
  if (dynamic) return dynamic;
  const dateProperty = advancedDateProperty(value, name, context, expression.left?.$expression?.operation === "objectProperty" ? context.evaluated?.get(expression.left.$expression.left)?.value : null);
  if (dateProperty) return dateProperty;
  const property = data && objectMemberLookup(data.definition.name, name, "properties", context);
  const key = property && keyOf(property), allowed = property && objectMemberAccessible(property, context);
  const overloaded = () => data && (!allowed || data.unsetFields.has(key));
  const hook = (method2, args = []) => {
    const member = data && magicMember(data.definition.name, method2, context), guard = method2 + ":" + name;
    if (!member || data.magicGuards.has(guard)) return null;
    if (context.readOnly && !context.componentProjection) throw new Error("Service objects must be used in frontend events");
    data.magicGuards.add(guard);
    try {
      return callMagic(value, data.definition.name, member, [{ value: name, kind: "string" }, ...args], state, context);
    } finally {
      data.magicGuards.delete(guard);
    }
  };
  const check = (quiet = false) => {
    if (!data) {
      if (quiet || value == null && expression.right.nullable) return false;
      throw new Error(`Attempt to read property ${name} on ${phpType(value)}`);
    }
    if (!property) {
      if (quiet) return false;
      throw new Error(`Undefined frontend property ${data.definition.name}::$${name}`);
    }
    if (!allowed) {
      if (quiet) return false;
      throw new Error(`Cannot access ${property.visibility} property ${property.owner}::$${name}`);
    }
    return true;
  };
  const hookAccess = (operation, item = null) => {
    const member = property?.hooks?.[operation], guard = "property:" + key + ":" + operation;
    if (!member || data.magicGuards.has(guard)) return null;
    data.magicGuards.add(guard);
    try {
      return callMagic(value, data.definition.name, member, item ? [item] : [], state, context);
    } finally {
      data.magicGuards.delete(guard);
    }
  };
  const writeAccess = () => {
    if (property?.setVisibility && !objectMemberAccessible({ ...property, visibility: property.setVisibility }, context)) throw new Error("Cannot modify " + property.setVisibility + "(set) property " + property.owner + "::$" + name);
  };
  const reference = {
    initialized: () => {
      check();
      return !!property.virtual || data.fields.has(key);
    },
    get: (quiet = false) => {
      if (!data) {
        if (!quiet && !expression.right.nullable) warn(context, `Attempt to read property ${name} on ${phpType(value)}`);
        return { value: null, kind: "NULL" };
      }
      if (overloaded()) {
        const result = hook("__get");
        if (result) return allowed ? assignType(property.rule, result.value, result.kind, context.source?.strictTypes ?? true, context) : result;
        if (!property && data.magicGuards.has("__get:" + name)) {
          if (!quiet) warn(context, `Undefined property: ${data.definition.name}::$${name}`);
          return { value: null, kind: "NULL" };
        }
      }
      if (!check(quiet)) return { value: null, kind: "NULL" };
      const hooked = hookAccess("get");
      if (hooked) return hooked;
      if (property?.virtual) throw new Error("Property has no getter");
      if (!data.fields.has(key)) {
        if (quiet) return { value: null, kind: "NULL" };
        throw new Error(`Typed property ${property.owner}::$${name} must not be accessed before initialization`);
      }
      return data.fields.get(key);
    },
    probe: (issetOnly = false) => {
      if (overloaded()) {
        const exists = hook("__isset");
        if (!exists || !phpBool(exists.value)) return { value: null, kind: "NULL" };
        return issetOnly ? { value: true, kind: "boolean" } : reference.get(true);
      }
      return reference.get(true);
    },
    set: (value2, kind, source = context.source) => {
      if (context.readOnly && !context.componentProjection) throw new Error("Reactive text cannot modify service objects");
      if (expression.right.nullable) throw new Error("Cannot write through a nullsafe property");
      writeAccess();
      if (overloaded() && hook("__set", [{ value: value2, kind }])) return { value: value2, kind };
      check();
      if (!data || !property) throw new Error("Cannot create dynamic frontend properties");
      if (property.readonly && (data.fields.has(key) && !data.cloneWritable?.has(key) || !((source?.phpVersion ?? 80400) >= 80400 ? related(context.objectScope, property.owner, context) : context.objectScope?.toLowerCase() === property.owner.toLowerCase()))) throw new Error(`Cannot modify readonly property ${property.owner}::$${name}`);
      if (property.hooks?.set && !data.magicGuards.has("property:" + key + ":set")) {
        const parameter = context.functions[property.hooks.set.id].parameters[0];
        const argument = assignType(parameter?.rule, value2, kind, source?.strictTypes ?? true, context);
        hookAccess("set", argument);
        return argument;
      }
      const result = assignType(property.rule, value2, kind, source?.strictTypes ?? true, context);
      const hooked = hookAccess("set", result);
      if (hooked) return result;
      if (property.virtual) throw new Error("Property has no setter");
      data.cloneWritable?.delete(key);
      data.unsetFields.delete(key);
      if (data.fieldReferences?.has(key)) return data.fieldReferences.get(key).set(result.value, result.kind);
      data.fields.set(key, { value: clonePhp(result.value), kind: result.kind });
      ownArray(data.fields, key, data.fields.get(key).value);
      return result;
    },
    remove: () => {
      writeAccess();
      if (overloaded()) {
        if (hook("__unset")) return;
        if (!property) return;
      }
      check();
      if (!data || !property) return;
      if (property.readonly && (!data.cloneWritable?.has(key) || !((context.source?.phpVersion ?? 80400) >= 80400 ? related(context.objectScope, property.owner, context) : context.objectScope?.toLowerCase() === property.owner.toLowerCase()))) throw new Error(`Cannot unset readonly property ${property.owner}::$${name}`);
      const previous = data.fieldReferences?.get(key);
      previous?.cell?.guards.delete(data.fieldTokens?.get(key));
      previous?.cell?.bindings.delete(data.fieldTokens?.get(key));
      data.fieldReferences?.delete(key);
      ownArray(data.fields, key, null);
      data.fields.delete(key);
      data.unsetFields.add(key);
    },
    indirect: () => overloaded() && magicMember(data.definition.name, "__get", context) ? reference.reference() : reference
  };
  reference.bind = (ref) => {
    check();
    writeAccess();
    if (property.readonly || property.hooks?.set || property.virtual) throw new Error("Cannot bind a reference to this property");
    if (!ref.cell) throw new Error("Property binding requires a reference cell");
    const item = ref.get(), checked = assignType(property.rule, item.value, item.kind, context.source?.strictTypes ?? true, context);
    ref.set(checked.value, checked.kind);
    data.fieldReferences ||= /* @__PURE__ */ new Map();
    data.fieldTokens ||= /* @__PURE__ */ new Map();
    const token2 = data.fieldTokens.get(key) || {};
    data.fieldTokens.set(key, token2);
    const previous = data.fieldReferences.get(key);
    previous?.cell?.guards.delete(token2);
    previous?.cell?.bindings.delete(token2);
    data.fieldReferences.set(key, ref);
    ref.cell.bindings.add(token2);
    ref.cell.guards.set(token2, (value2, kind) => assignType(property.rule, value2, kind, context.source?.strictTypes ?? true, context));
    data.fields.set(key, { get value() {
      return ref.get().value;
    }, get kind() {
      return ref.get().kind;
    }, reference: ref });
    data.unsetFields.delete(key);
    return ref;
  };
  reference.reference = () => {
    writeAccess();
    if (property?.hooks?.set || property?.virtual) throw new Error("Cannot acquire a reference to a hooked property");
    if (property?.readonly && !overloaded()) throw new Error(`Cannot acquire reference to readonly property ${property.owner}::$${name}`);
    if (overloaded() && magicMember(data.definition.name, "__get", context)) {
      const item = hook("__get");
      if (item?.reference) return item.reference;
      return detachedMagicReference(() => item, data.definition.name, name, context);
    }
    return data.fieldReferences?.get(key) || reference.bind(createReference(reference.get()));
  };
  return reference;
};
var promoteProperties = (definition, state, context) => {
  for (const property of definition.promoted || []) objectPropertyReference({ left: { $expression: { operation: "objectThis" } }, right: { name: property.name } }, state, context).set(context.locals[property.id], context.localTypes[property.id], definition.source);
};
var method = (value, options, context) => {
  const instance = objectData(value);
  const name = options.class === "@static" ? context.calledClass : options.class || instance?.definition.name;
  if (!name) throw new Error(`Call to a member function ${options.name}() on ${phpType(value)}`);
  const found = objectMemberLookup(name, options.name.toLowerCase(), "methods", context, !options.class);
  if (!found || !objectMemberAccessible(found, context)) {
    const bound2 = value || (options.forward && objectIs(context.thisObject, name) ? context.thisObject : null);
    const magic = magicMember(name, bound2 ? "__call" : "__callstatic", context);
    if (magic) return bindMethod(magic.id, bound2, magic.owner, options.forward ? context.calledClass || name : instance?.definition.name || name, options.name);
  }
  if (!found) throw new Error(`Call to undefined method ${name}::${options.name}()`);
  if (!objectMemberAccessible(found, context)) throw new Error(`Call to ${found.visibility} method ${found.owner}::${options.name}()`);
  if (found.abstract) throw new Error(`Cannot call abstract method ${found.owner}::${options.name}()`);
  const bound = found.static ? null : value || (options.forward ? context.thisObject : null);
  if (!found.static && !objectIs(bound, found.owner)) throw new Error(`Non-static method ${found.owner}::${options.name}() cannot be called statically`);
  const called = options.forward ? context.calledClass || name : instance?.definition.name || name;
  return bindMethod(found.id, bound, found.owner, called);
};
var evaluateObject = (expression, state, context) => {
  let options = expression.right || {};
  if (context.readOnly && !context.componentProjection) throw new Error("Service objects must be used in frontend events");
  if (expression.operation === "objectDeclare") {
    const key = expression.left.toLowerCase();
    if (context.classes[key]) throw new Error("Cannot declare class " + expression.left + ", because the name is already in use");
    context.classes[key] = { ...expression.right, runtimeDeclaration: false };
    return { value: null, kind: "NULL" };
  }
  if (expression.operation === "objectClassName") {
    const value2 = resolveData2(expression.left, state, context);
    if (isPhpObject(value2)) return { value: objectData(value2).definition.name, kind: "string" };
    if (typeof value2 !== "string") throw new Error("Class name must be a valid object or a string");
    return { value: value2.replace(/^\\/, ""), kind: "string" };
  }
  if (expression.operation === "objectClass" && options.dynamic) {
    const value2 = resolveData2(expression.left, state, context);
    if (!isPhpObject(value2)) throw new TypeError("Cannot use ::class on a non-object");
    return { value: objectData(value2).definition.name, kind: "string" };
  }
  if (expression.operation === "objectClass" || expression.operation === "objectConstant") {
    const name = expression.left === "@static" ? context.calledClass : resolveData2(expression.left, state, context);
    if (expression.operation === "objectClass") return { value: name, kind: "string" };
    const item = objectMemberLookup(name, expression.right, "constants", context, false);
    if (!item || !objectMemberAccessible(item, context)) throw new Error(`Undefined or inaccessible class constant ${name}::${expression.right}`);
    const budget = context.constantBudget ||= { depth: 0 };
    if (budget.depth >= 64) throw new Error("Circular or excessively nested class constant");
    budget.depth++;
    const data = { ...context, objectScope: item.owner, calledClass: name };
    try {
      const value2 = resolveData2(item.value, state, data);
      return { value: value2, kind: resolveType(item.value, state, data, value2) };
    } finally {
      budget.depth--;
    }
  }
  if (expression.operation === "objectThis") {
    if (!isPhpObject(context.thisObject)) throw new Error("Using $this when not in object context");
    return { value: context.thisObject, kind: "object" };
  }
  if (expression.operation === "objectStaticProperty") return staticPropertyReference(expression, state, context).get();
  if (expression.operation === "objectProperty") return objectPropertyReference(expression, state, context).get();
  if (expression.operation === "objectNew") {
    const name = expression.left === "@static" ? context.calledClass : resolveData2(expression.left, state, context), descriptor = classDefinition(name, context);
    if (descriptor.enum) throw new Error(`Cannot instantiate enum ${name}`);
    if (descriptor.abstract) throw new Error(`Cannot instantiate abstract class ${name}`);
    const budget = context.objectBudget ||= { remaining: 1e4 };
    if (--budget.remaining < 0) throw new RangeError("Frontend object allocation limit exceeded");
    const fields = /* @__PURE__ */ new Map();
    for (const ancestor of lineage2(name, context).reverse()) for (const property of Object.values(ancestor.properties)) {
      const key = keyOf(property);
      fields.delete(key);
      if (Object.hasOwn(property, "default")) {
        const value3 = resolveData2(property.default, state, { ...context, objectScope: property.owner, calledClass: name });
        fields.set(key, assignType(property.rule, clonePhp(value3), resolveType(property.default, state, { ...context, objectScope: property.owner, calledClass: name }, value3), true, context));
      }
    }
    const value2 = watchObjectFields(makeObject(descriptor, fields)), constructor = objectMemberLookup(name, "__construct", "methods", context, false);
    if (constructor && !options.skipConstructor) evaluateCall({ right: options }, state, context, method(value2, { name: "__construct", class: name }, context));
    else if (options.arguments?.length) {
      const id = "@emptyConstructor", fn = { name: name + "::__construct", parameters: [], declared: true, source: options.source || context.source, body: { type: "sequence", actions: [] } };
      evaluateCall({ right: options }, state, { ...context, functions: { ...context.functions, [id]: fn } }, bindMethod(id, value2, name, name));
    }
    return { value: value2, kind: "object" };
  }
  const value = expression.left === null ? null : resolveData2(expression.left, state, context);
  if (expression.operation === "objectClone") {
    const closure = cloneClosure(value);
    if (closure) return { value: closure, kind: "object" };
    if (!isPhpObject(value)) throw new Error("__clone method called on non-object");
    if (--(context.objectBudget ||= { remaining: 1e4 }).remaining < 0) throw new RangeError("Frontend object allocation limit exceeded");
    const intlCopy = cloneIntl(value);
    if (intlCopy) return { value: intlCopy, kind: "object" };
    const dateCopy = cloneDate(value, context);
    if (dateCopy) return { value: dateCopy, kind: "object" };
    const stdClassCopy = cloneStdClass(value);
    if (stdClassCopy) return { value: stdClassCopy, kind: "object" };
    const data = objectData(value);
    const hook = objectMemberLookup(data.definition.name, "__clone", "methods", context, false);
    if (hook && !objectMemberAccessible(hook, context)) throw new Error(`Call to ${hook.visibility} method ${hook.owner}::__clone()`);
    if (data.definition.enum) throw new Error("Trying to clone an uncloneable enum");
    if (isGenerator(value)) throw new Error("Trying to clone an uncloneable object of class Generator");
    const copy = watchObjectFields(makeObject(data.definition, copyObjectFields(data.fields))), cloned = objectData(copy);
    for (const [key, item] of cloned.fields) if (item.reference) {
      const name = key.includes("::$") ? key.split("::$").at(-1) : key, owner = key.includes("::$") ? key.split("::$")[0] : data.definition.name;
      objectPropertyReference({ left: resolvedNode2({ value: copy, kind: "object" }), right: { name } }, state, { ...context, objectScope: owner }).bind(item.reference);
    }
    cloned.unsetFields = new Set(data.unsetFields);
    cloneSpl(value, copy);
    if ((context.source?.phpVersion ?? 80400) >= 80300) cloned.cloneWritable = new Set(data.fields.keys());
    try {
      if (hook) callMagic(copy, data.definition.name, hook, [], state, context);
    } finally {
      cloned.cloneWritable = null;
    }
    return { value: copy, kind: "object" };
  }
  if (value == null && options.nullable) return { value: null, kind: "NULL" };
  options = { ...options, ...options.class != null && options.class !== "@static" ? { class: resolveData2(options.class, state, context) } : {}, name: resolveData2(options.name, state, context) };
  if (typeof options.name !== "string") throw new Error("Method name must be a string");
  if (value instanceof Error && expression.operation === "objectCall") {
    if (options.arguments?.length) throw new Error("Throwable getters do not accept arguments");
    const result = evaluateException({ operation: "exceptionGet", left: expression.left, right: { ...options, method: options.name.toLowerCase() } }, state, context, () => value, resolveType);
    return { value: result, kind: phpType(result) };
  }
  const callable2 = isGenerator(value) ? bindGeneratorMethod(value, options.name) : method(value, options, context);
  return expression.operation === "objectMethodRef" ? { value: callable2, kind: "object" } : evaluateCall({ right: options }, state, context, callable2);
};
var methodCallable = (value, context) => {
  if (typeof value === "string" && value.includes("::")) {
    const [className, name] = value.replace(/^\\/, "").split("::");
    return method(null, { class: className, name }, context);
  }
  if (isPhpArray(value) && arrayEntries(value).length === 2 && Object.hasOwn(value, 0) && typeof value[1] === "string") {
    if (isPhpObject(value[0])) return isGenerator(value[0]) ? bindGeneratorMethod(value[0], value[1]) : method(value[0], { name: value[1] }, context);
    if (typeof value[0] === "string") return method(null, { class: value[0].replace(/^\\/, ""), name: value[1] }, context);
  }
  return null;
};
var isMethodCallable = (value, context) => {
  try {
    return !!methodCallable(value, context);
  } catch {
    return false;
  }
};

// src-js/core/php-magic.js
var magicMember = (className, name, context) => objectMemberLookup(className, name, "methods", context, false);
var callMagic = (value, className, member, args, state, context) => invokeFunction(
  bindMethod(member.id, member.static ? null : value, member.owner, className),
  args.map((item) => ({ value: item.value, kind: item.kind || phpType(item.value) })),
  state,
  context
);
var hasMagicInvoke = (value, context) => isPhpObject(value) && !!magicMember(objectData(value).definition.name, "__invoke", context);
var objectInvokeTarget = (value, context) => {
  if (!isPhpObject(value)) return null;
  const name = objectData(value).definition.name, member = magicMember(name, "__invoke", context);
  return member && bindMethod(member.id, value, member.owner, name);
};
var objectToString = (value, context) => {
  const name = objectData(value).definition.name, member = context && magicMember(name, "__tostring", context);
  if (!member) throw new Error(`Object of class ${name} could not be converted to string`);
  if (context.readOnly) throw new Error("Service objects must be used in frontend events");
  const result = callMagic(value, name, member, [], context.objectState || {}, context);
  if (typeof result.value !== "string") throw new TypeError(`${name}::__toString() must return a string`);
  return result.value;
};
var magicArguments = (args) => {
  let result = makeArray(), position = 0, named = false;
  const seen = /* @__PURE__ */ new Set();
  for (const arg of args) {
    const hasName = Object.hasOwn(arg, "name");
    if (!hasName && named) throw new Error("Cannot use positional argument after named argument");
    const key = hasName ? arg.name : position++;
    if (hasName) {
      named = true;
      if (seen.has(key)) throw new Error(`Named parameter $${key} overwrites previous argument`);
      seen.add(key);
    }
    result = arrayWrite(result, key, clonePhp(arg.value), arg.kind, null);
  }
  return result;
};
var detachedMagicReference = (read2, className, name, context) => {
  let item, warned = false;
  const notice = () => {
    if (!warned) {
      warned = true;
      warn(context, `Indirect modification of overloaded property ${className}::$${name} has no effect`, "PHP_NOTICE");
    }
  };
  const get = () => item ||= (() => {
    const result = read2();
    return { ...result, value: clonePhp(result.value) };
  })();
  return {
    get,
    acquire: () => {
      const result = get();
      notice();
      return result;
    },
    warnIndirect: notice,
    set: (value, kind) => {
      notice();
      item = { value: clonePhp(value), kind };
      return item;
    },
    remove: notice
  };
};

// src-js/core/php-values.js
var numericPrefix = (value) => value.match(/^[\t\n\r\f\v ]*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
var hasFloatNumericPrefix = (value) => typeof value === "string" && /[.eE]/.test(numericPrefix(value)?.[0] || "");
var phpBool = (value) => value instanceof Error || isPhpObject(value) || !(value == null || value === false || value === 0 || value === "" || value === "0" || typeof value === "object" && value !== null && Object.keys(value).length === 0);
var floatString = (value, precision = null) => {
  if (Object.is(value, -0)) return "-0";
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "NAN" : value < 0 ? "-INF" : "INF";
  const rounded = precision === null ? value : Number(value.toPrecision(precision));
  const [significand, exponentText] = rounded.toExponential().split("e");
  const exponent = Number(exponentText);
  if (exponent < -4 || exponent >= (precision ?? 17)) {
    const fraction = significand.includes(".") ? significand : significand + ".0";
    return `${fraction}E${exponent < 0 ? "" : "+"}${exponent}`;
  }
  return String(rounded);
};
var phpString = (value, type = phpType(value), context = null) => {
  if (isPhpObject(value)) return objectToString(value, context);
  if (isRoundingMode(value)) throw new TypeError("Object of class RoundingMode could not be converted to string");
  if (value instanceof Error) return formatThrowable(value);
  if (typeof value === "function") throw new TypeError("Object of class Closure could not be converted to string");
  if (value == null || value === false) return "";
  if (value === true) return "1";
  if (typeof value === "object") {
    warn(context, "Array to string conversion");
    return "Array";
  }
  if (type === "double") return floatString(value, 14);
  return String(value);
};
var phpFloat = (value) => {
  if (typeof value === "string") {
    const prefix = numericPrefix(value);
    return prefix ? Number(prefix[0]) : 0;
  }
  if (typeof value === "object" && value !== null) return phpBool(value) ? 1 : 0;
  return Number(value ?? 0);
};
var phpInt = (value) => {
  const result = Math.trunc(phpFloat(value));
  if (!Number.isFinite(result)) return 0;
  if (!Number.isSafeInteger(result)) throw new RangeError("Frontend integer exceeds JavaScript safe integer precision");
  return result;
};
var phpNumber = (value, context = null) => {
  if (value == null || typeof value === "boolean" || typeof value === "number") return Number(value ?? 0);
  if (typeof value === "string") {
    const match = numericPrefix(value);
    if (match) {
      if (value.slice(match[0].length).trim() !== "") warn(context, "A non-numeric value encountered");
      return Number(match[0]);
    }
  }
  throw new TypeError(`Unsupported operand type: ${phpType(value)}`);
};
var phpArithmetic = (operation, left, right, floatResult, context = null) => {
  let a = phpNumber(left, context), b = phpNumber(right, context);
  if (operation === "modulo") {
    for (const number of [a, b]) if (!Number.isInteger(number)) warn(context, "Implicit conversion from float to int loses precision", "PHP_DEPRECATED");
    a = phpInt(a);
    b = phpInt(b);
  }
  if (["divide", "modulo"].includes(operation) && b === 0) {
    const error = new Error("Division by zero in AML state expression");
    error.name = "DivisionByZeroError";
    throw error;
  }
  const result = operation === "add" ? a + b : operation === "subtract" ? a - b : operation === "multiply" ? a * b : operation === "divide" ? a / b : operation === "power" ? a ** b : a % b;
  if (!floatResult && Number.isInteger(result) && !Number.isSafeInteger(result)) throw new RangeError("Frontend integer exceeds JavaScript safe integer precision");
  return operation === "modulo" && Object.is(result, -0) ? 0 : result;
};
var phpType = (value) => value == null ? "NULL" : value instanceof Error || isPhpObject(value) || isRoundingMode(value) ? "object" : typeof value === "boolean" ? "boolean" : typeof value === "function" ? "object" : typeof value === "string" ? "string" : typeof value === "number" ? Number.isInteger(value) ? "integer" : "double" : "array";
var phpDump = (value, type = phpType(value), depth = 0, budget = { remaining: 1e4, seen: /* @__PURE__ */ new WeakSet() }, context = null) => {
  if (--budget.remaining < 0 || depth > 64) throw new RangeError("Frontend dump exceeds its nesting or value limit");
  if (isPhpObject(value)) {
    if (budget.seen.has(value)) return "*RECURSION*\n";
    budget.seen.add(value);
    const data = objectData(value), indent2 = "  ".repeat(depth);
    if (data.definition.enum) return `enum(${data.definition.name}::${data.fields.get("name").value})
`;
    try {
      let entries2 = dateDebugEntries(value, context || {}) || [...data.fields];
      const hook = context && magicMember(data.definition.name, "__debuginfo", context);
      if (hook) {
        const debug = callMagic(value, data.definition.name, hook, [], context.objectState || {}, context).value;
        if (debug != null && !isPhpArray(debug)) throw new TypeError("__debugInfo() must return an array or null");
        entries2 = debug == null ? [] : arrayEntries(debug).map(([key, item]) => [key, { value: item, kind: arrayKind(debug, key) }]);
      }
      return `object(${data.definition.name}) (${entries2.length}) {
` + entries2.map(([key, item]) => `${indent2}  [${typeof key === "number" ? key : `"${key}"`}]=>
${indent2}  ${phpDump(item.value, item.kind, depth + 1, budget, context)}`).join("") + `${indent2}}
`;
    } finally {
      budget.seen.delete(value);
    }
  }
  if (isRoundingMode(value)) return `enum(RoundingMode::${value.name})
`;
  if (value instanceof Error) return formatThrowable(value) + "\n";
  if (type === "NULL") return "NULL\n";
  if (type === "boolean") return `bool(${value ? "true" : "false"})
`;
  if (type === "integer") return `int(${value})
`;
  if (type === "double") return `float(${floatString(value)})
`;
  if (type === "string") return `string(${new TextEncoder().encode(value).length}) "${value}"
`;
  const indent = "  ".repeat(depth);
  const entries = arrayEntries(value || []);
  return `array(${entries.length}) {
` + entries.map(
    ([key, item]) => `${indent}  [${typeof key === "number" ? key : `"${key}"`}]=>
${indent}  ${phpDump(item, arrayKind(value, key), depth + 1, budget, context)}`
  ).join("") + `${indent}}
`;
};

// src-js/core/php-casts.js
var compoundCast = (operation, value, kind, context) => {
  if (operation === "toObject" && (isPhpObject(value) || value instanceof Error || typeof value === "function" || isRoundingMode(value))) return { value, kind: "object" };
  if (value instanceof Error || typeof value === "function") throw new TypeError("Frontend compound casts do not expose exception or closure internals");
  if (operation === "toObject") {
    if (context.readOnly) throw new Error("Create objects inside frontend events");
    if (--(context.objectBudget ||= { remaining: 1e4 }).remaining < 0) throw new RangeError("Frontend object allocation limit exceeded");
    const temporary = {};
    ownArray(temporary, "source", value);
    try {
      return { value: isPhpArray(value) ? makeStdClassFromArray(value) : makeStdClass(value == null ? [] : [["scalar", { value, kind }]]), kind: "object" };
    } finally {
      ownArray(temporary, "source", null);
    }
  }
  if (isRoundingMode(value)) return { value: makeArray([["name", value.name, "string"]]), kind: "array" };
  if (isPhpObject(value)) {
    const name = objectData(value).definition.name.toLowerCase();
    if (name === "stdclass") return { value: stdClassArray(value) || makeArray(), kind: "array" };
    if (["dateinterval", "dateperiod"].includes(name)) {
      const entries2 = advancedDateEntries(value, context);
      return { value: makeArray(entries2.map(([key, item2]) => [key, item2.value, item2.kind])), kind: "array" };
    }
    if (["arrayiterator", "arrayobject"].includes(name)) return invokeCollectionMethod(value, "getarraycopy", [], context);
    if (["datetime", "datetimeimmutable", "datetimezone"].includes(name)) throw new TypeError("Frontend array casts do not expose internal date fields; use format()");
    const data = objectData(value), properties = /* @__PURE__ */ new Map(), chain = [];
    let item = data.definition;
    while (item) {
      chain.unshift(item);
      item = item.parent && context.classes?.[item.parent.toLowerCase()];
    }
    for (const definition of chain) for (const property of Object.values(definition.properties || {})) properties.set(property.visibility === "private" ? property.owner + "::$" + property.name : property.name, property);
    const types = /* @__PURE__ */ new Map();
    const entries = [...data.fields].map(([key, item2]) => {
      const property = properties.get(key), name2 = arrayKey(property && property.visibility !== "public" ? "\0" + (property.visibility === "private" ? property.owner : "*") + "\0" + property.name : key, context);
      types.set(name2, item2.kind);
      return [name2, clonePhp(item2.value)];
    });
    return { value: makeArray(entries, types), kind: "array" };
  }
  return { value: isPhpArray(value) ? clonePhp(value) : makeArray(value == null ? [] : [[0, value, kind]]), kind: "array" };
};

// src-js/core/php-symbols.js
var encoder3 = new TextEncoder();
var decoder3 = new TextDecoder();
var dynamicLocalId = (value, context) => {
  const name = phpString(value, void 0, context);
  if (["this", "GLOBALS", "_SERVER", "_GET", "_POST", "_FILES", "_COOKIE", "_SESSION", "_REQUEST", "_ENV"].includes(name)) throw new Error("Cannot access reserved frontend variable $" + name);
  return "v" + [...encoder3.encode(name)].map((n) => n.toString(16).padStart(2, "0")).join("");
};
var localName2 = (id) => decoder3.decode(Uint8Array.from(id.slice(1).match(/../g) || [], (pair) => parseInt(pair, 16)));
var valid = (name) => /^[A-Za-z_\x80-\uffff][A-Za-z0-9_\x80-\uffff]*$/.test(name);
var runSymbols = (name, items, state, context) => {
  if (!["get_debug_type", "settype", "get_defined_vars", "compact", "extract"].includes(name)) return null;
  const [a, b, c] = items.map((item) => item.value);
  if (name === "get_debug_type") {
    const value = isPhpObject(a) ? objectData(a).definition.name.replace(/class@anonymous:.*/, "class@anonymous") : a instanceof Error ? a.name : typeof a === "function" ? "Closure" : { integer: "int", double: "float", boolean: "bool", NULL: "null" }[items[0].kind] || items[0].kind;
    return { value, kind: "string" };
  }
  if (context.readOnly) throw new Error(name + "() requires an event scope");
  const read2 = (id) => context.localReferences?.[id]?.get() || { value: context.locals[id], kind: context.localTypes[id] || phpType(context.locals[id]) };
  const exists = (id) => Object.hasOwn(context.locals, id) || Object.hasOwn(context.localReferences || {}, id);
  if (name === "settype") {
    const type = b.toLowerCase();
    let item;
    if (["int", "integer"].includes(type)) item = { value: phpInt(a, context), kind: "integer" };
    else if (["float", "double"].includes(type)) item = { value: phpFloat(a, context), kind: "double" };
    else if (["bool", "boolean"].includes(type)) item = { value: phpBool(a), kind: "boolean" };
    else if (type === "string") item = { value: phpString(a, items[0].kind, context), kind: "string" };
    else if (type === "null") item = { value: null, kind: "NULL" };
    else if (["array", "object"].includes(type)) item = compoundCast(type === "array" ? "toArray" : "toObject", a, items[0].kind, context);
    else throw failure("ValueError", "settype(): Argument #2 ($type) must be a valid type");
    items[0].ref.set(item.value, item.kind);
    return { value: true, kind: "boolean" };
  }
  if (name === "get_defined_vars") {
    return { value: makeArray([.../* @__PURE__ */ new Set([...context.source?.localOrder || [], ...Object.keys(context.locals), ...Object.keys(context.localReferences || {})])].filter((id) => exists(id) && /^v(?:[0-9a-f]{2})*$/.test(id)).map((id) => {
      const item = read2(id);
      return [localName2(id), clonePhp(item.value), item.kind];
    })), kind: "array" };
  }
  if (name === "compact") {
    const entries = /* @__PURE__ */ new Map();
    const visit = (value, depth = 0) => {
      work(context);
      if (depth > 64) throw new RangeError("compact() nesting exceeds 64 levels");
      if (isPhpArray(value)) {
        for (const [, part] of arrayEntries(value)) visit(part, depth + 1);
        return;
      }
      if (typeof value !== "string") {
        warn(context, "compact(): Argument must be string or array of strings");
        return;
      }
      const id = dynamicLocalId(value, context);
      if (!exists(id)) {
        warn(context, "compact(): Undefined variable $" + value);
        return;
      }
      const item = read2(id);
      entries.set(value, [value, clonePhp(item.value), item.kind]);
    };
    items.forEach((item) => visit(item.value));
    return { value: makeArray([...entries.values()]), kind: "array" };
  }
  const mode = b & ~256, references = !!(b & 256), prefix = c;
  if (b < 0 || b & ~263 || mode > 6) throw failure("ValueError", "extract(): Argument #2 ($flags) must be a valid extract type");
  if ([2, 3, 4, 5].includes(mode) && !valid(prefix)) throw failure("ValueError", "extract(): Argument #3 ($prefix) must be a valid identifier");
  let count = 0;
  for (const [key, part] of arrayEntries(a)) {
    work(context);
    let target = String(key), id = "v" + [...encoder3.encode(target)].map((n) => n.toString(16).padStart(2, "0")).join(""), present = exists(id), good = valid(target);
    if (mode === 1 && present || mode === 5 && !present || mode === 6 && !present) continue;
    if (mode === 3 || mode === 2 && present || mode === 4 && !good || mode === 5) target = prefix + "_" + target;
    if (!valid(target)) continue;
    id = dynamicLocalId(target, context);
    if (references) {
      const parent = resolvedNode2({ value: a, kind: "array" }, items[0].ref), node = { $expression: { operation: "offset", left: parent, right: key } };
      bindLocalReference(context, id, promoteReference(node, state, context));
    } else valueReference({ $local: id }, state, context).set(clonePhp(part), arrayKind(a, key));
    count++;
  }
  return { value: count, kind: "integer" };
};

// src-js/core/php-nullsafe.js
var resolveNullsafe = (node, state, context, quiet = false, issetOnly = false) => {
  const expression = node?.$expression, operation = expression?.operation;
  if (operation === "nullsafeChain") return resolveNullsafe(expression.left, state, context, quiet, issetOnly);
  if (!["objectProperty", "objectCall", "objectMethodRef", "offset", "objectClassName", "objectStaticProperty", "objectClass", "objectConstant"].includes(operation)) {
    const value2 = quiet ? resolveQuiet(node, state, context, issetOnly) : resolveData2(node, state, context);
    return { value: value2, kind: resolveType(node, state, context, value2) };
  }
  const isStatic = ["objectCall", "objectMethodRef"].includes(operation) && expression.right?.class != null;
  const item = resolveNullsafe(isStatic ? expression.right.class : expression.left, state, context, quiet);
  if (item.skipped || item.value === null && expression.right?.nullable) return { value: null, kind: "NULL", skipped: true };
  const next2 = { $expression: isStatic ? { ...expression, right: { ...expression.right, class: resolvedNode2(item) } } : { ...expression, left: resolvedNode2(item) } };
  const value = quiet ? resolveQuiet(next2, state, context, issetOnly) : resolveData2(next2, state, context);
  return { value, kind: resolveType(next2, state, context, value) };
};

// src-js/core/php-eval-classes.js
var serial = 0;
var instantiateEvalClasses = (program) => {
  const names2 = Object.values(program.classes || {}).filter((item) => item.name.startsWith("class@anonymous:")).map((item) => item.name);
  if (!names2.length) return program;
  const suffix = ":eval" + ++serial, replacements = new Map(names2.map((name) => [name, name + suffix]));
  for (const id of Object.keys(program.functions || {})) replacements.set(id, id + suffix);
  const text3 = (value) => {
    for (const [before, after] of replacements) value = value.replaceAll(before, after);
    return value;
  };
  const copy = (value) => typeof value === "string" ? text3(value) : Array.isArray(value) ? value.map(copy) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [text3(key), copy(item)])) : value;
  return copy(program);
};

// src-js/core/php-eval.js
var compiler = null;
var loading = null;
var assetUrl = null;
var assetNonce = "";
var configureEvalAsset = (url, nonce = "") => {
  assetUrl = url;
  assetNonce = nonce;
};
var needsEvalParser = (node) => {
  if (!node || typeof node !== "object") return false;
  if (node.$expression?.operation === "eval" && !node.$expression.right?.program) return true;
  return Object.values(node).some(needsEvalParser);
};
var prepareEval = async (node) => {
  if (compiler || !needsEvalParser(node)) return;
  if (!loading) loading = new Promise((resolve, reject) => {
    if (!assetUrl || typeof document === "undefined") {
      reject(new Error("The optional PHP eval parser has not been configured"));
      return;
    }
    const url = new URL(assetUrl, location.href);
    if (url.origin !== location.origin) {
      reject(new Error("The PHP eval parser must be a same-origin asset"));
      return;
    }
    const script = document.createElement("script");
    script.src = url.href;
    if (assetNonce) script.nonce = assetNonce;
    script.onload = () => {
      const module = globalThis.AMLPhpEval;
      if (module?.version !== ENGINE_VERSION || typeof module.compile !== "function") {
        reject(new Error("Incompatible PHP eval parser asset"));
        return;
      }
      compiler = module.compile;
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("Unable to load the optional PHP eval parser"));
    };
    document.head.append(script);
  }).catch((error) => {
    loading = null;
    throw error;
  });
  await loading;
};
var evaluateEval = (expression, state, context, resolve, type) => {
  if (context.readOnly) throw new Error("eval() is not allowed in reactive text");
  const options = expression.right, origin = options.source || context.source;
  const budget = context.callBudget ||= { depth: 0, remaining: 1e4 };
  if (budget.depth >= 128 || --budget.remaining < 0) throw Object.assign(new RangeError("Frontend eval/function call limit exceeded"), { code: "PHP_CALL_LIMIT" });
  const input = resolve(expression.left, state, context), code = phpString(input, type(expression.left, state, context, input), context);
  if (bytes(code).length > 65536) throw Object.assign(new Error("Frontend eval source exceeds 64 KiB"), { name: "ValueError" });
  work(context, code.length);
  budget.depth++;
  try {
    if (!options.program && !compiler) throw new Error("The optional PHP eval parser must load before this event");
    const program = instantiateEvalClasses(options.program || compiler(code, options, { functions: context.functions || {}, classes: context.classes || {}, builtinNames }));
    if (program.error) throw withSource(Object.assign(new Error(program.error.message), { name: program.error.name }), program.error.source, context.trace);
    const classes = context.classes ||= {};
    if (Object.keys({ ...classes, ...program.classes }).length > 64) throw Object.assign(new Error("Frontend eval exceeds 64 class definitions"), { name: "ValueError" });
    Object.assign(classes, Object.fromEntries(Object.entries(program.classes || {}).filter(([, definition]) => !definition.runtimeDeclaration)));
    if (program.empty) return { value: false, kind: "boolean" };
    const functions = context.functions ||= {};
    context.functionDeclarations ||= /* @__PURE__ */ new Set();
    context.functionDefinitionIds ||= /* @__PURE__ */ new Map();
    if (Object.keys(functions).length + Object.keys(program.functions).filter((id) => !Object.hasOwn(functions, id)).length > 256) throw Object.assign(new Error("Frontend eval exceeds 256 function definitions"), { name: "ValueError" });
    for (const [id, definition] of Object.entries(program.functions)) {
      functions[id] = definition;
      if (context.evalFunctions) context.evalFunctions[id] = definition;
    }
    const data = {
      ...context,
      source: program.source,
      evaluated: /* @__PURE__ */ new WeakMap(),
      trace: [{ file: origin.file, line: origin.line, function: "eval" }, ...context.trace || []]
    };
    const signal = executeFunctionBody(program.body, state, data);
    return signal?.operation === "return" ? { value: signal.value, kind: signal.kind } : { value: null, kind: "NULL" };
  } catch (error) {
    throw withSource(error, origin, context.trace);
  } finally {
    budget.depth--;
  }
};

// src-js/core/php-collections.js
var collectionOperations = /* @__PURE__ */ new Set(["array", "count", "sum", "contains", "filter", "map", "reduce", "find", "any", "all", "sortBy", "sort", "keys", "values", "keyExists", "arrayMutate"]);
var evaluateCollection = (expression, state, context, resolve, type, reference) => {
  const operation = expression.operation;
  const value = (node, data = context) => resolve(node, state, data);
  const kind = (node, result, data = context) => type(node, state, data, result);
  const callableCache = /* @__PURE__ */ new Map();
  const callback = (node, args, kinds = []) => {
    if (node && Object.hasOwn(node, "$callable")) {
      if (!callableCache.has(node)) callableCache.set(node, value(node.$callable));
      return invokeFunction(callableCache.get(node), args.map((value2, index) => ({ value: value2, kind: kinds[index] || phpType(value2) })), state, { ...context, source: { ...context.source, strictTypes: false } });
    }
    const rule = node?.$callback;
    if (!rule) throw new TypeError("Expected a frontend arrow callback");
    const data = { ...context, locals: clonePhp(context.locals || {}), localTypes: { ...context.localTypes }, evaluated: /* @__PURE__ */ new WeakMap(), collection: { ...context.collection }, collectionTypes: { ...context.collectionTypes } };
    rule.parameters.forEach((name, index) => {
      data.collection[name] = args[index];
      data.collectionTypes[name] = kinds[index] || phpType(args[index]);
    });
    const result = value(rule.expression, data);
    return { value: result, kind: kind(rule.expression, result, data) };
  };
  for (const node of [expression.right, expression.right?.callback]) if (node && Object.hasOwn(node, "$callable")) {
    const fn = value(node.$callable);
    if (!isFrontendCallable(fn, context)) throw new TypeError("Expected a compiled frontend callable");
    callableCache.set(node, fn);
  }
  if (operation === "array") {
    let result = makeArray();
    for (const entry of expression.left) {
      if (Object.hasOwn(entry, "spread")) {
        const source2 = value(entry.spread);
        for (const { key, item } of spreadEntries(source2, context)) {
          const ref = isPhpArray(source2) && arrayElementReference(source2, key.value);
          result = ref ? arrayWithReference(result, key.value, ref, context, key.kind === "integer") : arrayWrite(result, key.value, item.value, item.kind, context, key.kind === "integer");
        }
      } else {
        const key = Object.hasOwn(entry, "key") ? value(entry.key) : null;
        if (entry.reference) {
          result = arrayWithReference(result, key, promoteReference(entry.value, state, context), context, !Object.hasOwn(entry, "key"));
          continue;
        }
        const item = value(entry.value);
        result = arrayWrite(result, key, item, kind(entry.value, item), context, !Object.hasOwn(entry, "key"));
      }
    }
    return { value: result, kind: "array" };
  }
  if (operation === "arrayMutate") {
    const ref = reference(expression.left, state, context);
    const original = ref.get();
    const source2 = original.value;
    const entries2 = arrayEntries(source2), options = expression.right;
    const refsFor2 = (pairs, sourceEntries = entries2) => new Map(pairs.map(([key], index) => [key, arrayElementReference(source2, sourceEntries[index][0])]).filter(([, ref2]) => ref2));
    const args = (options.args || []).map((node) => ({ value: value(node), node }));
    let next2, result = { value: true, kind: "boolean" };
    const fn = options.function;
    if (fn === "array_pop" || fn === "array_shift") {
      const removed = fn === "array_pop" ? entries2.pop() : entries2.shift();
      result = removed ? { value: removed[1], kind: arrayKind(source2, removed[0]) } : { value: null, kind: "NULL" };
      let position = 0;
      const pairs = fn === "array_shift" ? entries2.map(([key, item]) => [typeof key === "number" ? position++ : key, item]) : entries2;
      const types2 = new Map(pairs.map(([key], index) => [key, arrayKind(source2, entries2[index][0])]));
      const previous = nextArrayKey(source2, context);
      next2 = makeArray(pairs, types2, fn === "array_pop" ? removed && typeof removed[0] === "number" && removed[0] === previous - 1 ? removed[0] : previous : void 0, 0, refsFor2(pairs));
    } else if (fn === "array_push" || fn === "array_unshift") {
      if (fn === "array_push") {
        next2 = clonePhp(source2);
        for (const item of args) next2 = arrayWrite(next2, null, item.value, kind(item.node, item.value), context, true);
      } else {
        let index = args.length;
        const pairs = [...args.map((item, index2) => [index2, item.value]), ...entries2.map(([key, item]) => [typeof key === "number" ? index++ : key, item])];
        const types2 = new Map(args.map((item, index2) => [index2, kind(item.node, item.value)]));
        for (let i = 0; i < entries2.length; i++) types2.set(pairs[args.length + i][0], arrayKind(source2, entries2[i][0]));
        next2 = makeArray(pairs, types2, void 0, 0, refsFor2(pairs.slice(args.length)));
      }
      result = { value: arrayEntries(next2).length, kind: "integer" };
    } else {
      const flag = args[0]?.value ?? 0;
      if (![0, 1, 2, 10].includes(flag)) throw new Error(`Unsupported frontend sort flag: ${flag}`);
      const compare2 = (left, right, leftKind, rightKind) => {
        if (flag === 1) return Number(left) - Number(right);
        if ([2, 10].includes(flag)) {
          let a = phpString(left, leftKind), b = phpString(right, rightKind);
          if (flag & 8) {
            a = a.toLowerCase();
            b = b.toLowerCase();
          }
          return compareStrings(a, b);
        }
        return phpCompare(left, right, leftKind, rightKind);
      };
      const keys = fn === "ksort" || fn === "krsort";
      entries2.sort((a, b) => (fn === "usort" ? Number(callback(options.callback, [a[1], b[1]], [arrayKind(source2, a[0]), arrayKind(source2, b[0])]).value) : keys ? compare2(a[0], b[0], phpType(a[0]), phpType(b[0])) : compare2(a[1], b[1], arrayKind(source2, a[0]), arrayKind(source2, b[0]))) * (["rsort", "arsort", "krsort"].includes(fn) ? -1 : 1));
      const preserve = ["asort", "arsort", "ksort", "krsort"].includes(fn);
      next2 = makeArray(entries2.map(([key, item], index) => [preserve ? key : index, item]), new Map(entries2.map(([key], index) => [preserve ? key : index, arrayKind(source2, key)])), void 0, 0, new Map(entries2.map(([key], index) => [preserve ? key : index, arrayElementReference(source2, key)]).filter(([, ref2]) => ref2)));
    }
    ref.set(next2, "array");
    return result;
  }
  const source = value(expression.left);
  if (operation === "count" && isPhpObject(source)) return countObject(source, 0, context);
  const entries = arrayEntries(source);
  const arrayResult = (pairs, types2 = /* @__PURE__ */ new Map(), refs = /* @__PURE__ */ new Map()) => ({ value: makeArray(pairs, types2, void 0, 0, refs), kind: "array" });
  const refsFor = (pairs, sourceEntries = entries) => new Map(pairs.map(([key], index) => [key, arrayElementReference(source, sourceEntries[index][0])]).filter(([, ref]) => ref));
  if (operation === "count") return { value: entries.length, kind: "integer" };
  if (operation === "sum") {
    const sum = entries.reduce((sum2, [, item]) => sum2 + (Number(item) || 0), 0);
    return { value: sum, kind: entries.some(([key]) => arrayKind(source, key) === "double") ? "double" : phpType(sum) };
  }
  if (operation === "keys") return arrayResult(entries.map(([key], index) => [index, key]));
  if (operation === "values") return arrayResult(entries.map(([, item], index) => [index, clonePhp(item)]), new Map(entries.map(([key], index) => [index, arrayKind(source, key)])), refsFor(entries.map(([, item], index) => [index, item])));
  if (operation === "keyExists") return { value: Object.hasOwn(source, arrayKey(value(expression.right), context)), kind: "boolean" };
  if (operation === "contains") {
    const modern = expression.right && Object.hasOwn(expression.right, "needle") && Object.hasOwn(expression.right, "strict");
    const needleNode = modern ? expression.right.needle : expression.right;
    const needle = value(needleNode), needleType = kind(needleNode, needle);
    const strict = modern ? phpBool(value(expression.right.strict)) : true;
    return { value: entries.some(([key, item]) => phpMatches(strict ? "eq" : "looseEq", item, needle, arrayKind(source, key), needleType)), kind: "boolean" };
  }
  if (operation === "sort" || operation === "sortBy") {
    entries.sort((a, b) => operation === "sort" ? phpCompare(a[1], b[1], arrayKind(source, a[0]), arrayKind(source, b[0])) : Number(callback(expression.right, [a[1], b[1]]).value));
    return arrayResult(entries.map(([, item], index) => [index, clonePhp(item)]), new Map(entries.map(([key], index) => [index, arrayKind(source, key)])), refsFor(entries.map(([, item], index) => [index, item])));
  }
  if (operation === "reduce") {
    let result = { value: value(expression.right.initial), kind: null };
    result.kind = kind(expression.right.initial, result.value);
    for (const [key, item] of entries) result = callback(expression.right, [result.value, item], [result.kind, arrayKind(source, key)]);
    return result;
  }
  const selected = [], types = /* @__PURE__ */ new Map();
  for (const [key, item] of entries) {
    const result = expression.right ? callback(expression.right, [item], [arrayKind(source, key)]) : { value: phpBool(item), kind: "boolean" };
    if (operation === "map") {
      selected.push([key, clonePhp(result.value)]);
      types.set(key, result.kind);
    } else if (operation === "filter" && phpBool(result.value)) {
      selected.push([key, clonePhp(item)]);
      types.set(key, arrayKind(source, key));
    } else if (operation === "find" && phpBool(result.value)) return { value: clonePhp(item), kind: arrayKind(source, key) };
    else if (operation === "any" && phpBool(result.value)) return { value: true, kind: "boolean" };
    else if (operation === "all" && !phpBool(result.value)) return { value: false, kind: "boolean" };
  }
  if (operation === "find") return { value: null, kind: "NULL" };
  if (operation === "any" || operation === "all") return { value: operation === "all", kind: "boolean" };
  return arrayResult(selected, types, operation === "filter" ? new Map(selected.map(([key]) => [key, arrayElementReference(source, key)]).filter(([, ref]) => ref)) : /* @__PURE__ */ new Map());
};

// src-js/core/value.js
var resolved = /* @__PURE__ */ new WeakMap();
var resolvedNode2 = (item, reference = null) => {
  const node = reference ? { $local: "v67656e657261746f72" } : {};
  resolved.set(node, { ...item, reference });
  return node;
};
var resolveData2 = (value, state, eventData = null) => {
  eventData ??= {};
  eventData.objectState = state;
  eventData.evaluated ??= /* @__PURE__ */ new WeakMap();
  if (resolved.has(value)) {
    const item = resolved.get(value);
    eventData.evaluated.set(value, item);
    return item.value;
  }
  const result = resolveValue(value, state, eventData);
  if (value && typeof value === "object") eventData.evaluated.set(value, { ...eventData.evaluated.get(value), value: result, kind: resultType(value, state, eventData, result) });
  return result;
};
var record = (node, result, context) => {
  context.evaluated.set(node, result);
  return result.value;
};
var assign = (target, value, kind, state, context) => {
  if (target?.$collection) {
    context.collection[target.$collection] = clonePhp(value);
    context.collectionTypes[target.$collection] = kind;
    return { value, kind };
  }
  if (target?.$local) {
    if (!/^v(?:[0-9a-f]{2})*$/.test(target.$local) || !context.locals) throw new Error("Invalid frontend local assignment");
    if (context.localReferences?.[target.$local]) return context.localReferences[target.$local].set(value, kind, context.source);
    context.locals[target.$local] = clonePhp(value, sameArrayOrigin(value, context.locals[target.$local]));
    context.localTypes[target.$local] = kind;
    ownArray(context.locals, target.$local, context.locals[target.$local]);
    return { value, kind };
  }
  if (target?.$state && context.assignState) return context.assignState(target.$state, value, kind, context.source);
  throw new Error("A mutating expression requires an action scope and an assignable target");
};
var valueReference = (target, state, context, indirect = false, quiet = false, unpack = false) => {
  if (target?.$expression?.operation === "dynamicLocal") target = { $local: dynamicLocalId(resolveData2(target.$expression.left, state, context), context) };
  if (resolved.get(target)?.reference) return resolved.get(target).reference;
  if (target?.$local) {
    const id = target.$local, remove = () => {
      unbindLocalReference(context, id);
      ownArray(context.locals, id, null);
      delete context.locals[id];
      delete context.localTypes[id];
    };
    const reference = context.localReferences?.[id];
    if (reference) return { ...reference, set: (value, kind, source = context.source) => reference.set(value, kind, source), remove };
  }
  if (["objectThis", "objectCall", "objectNew", "call"].includes(target?.$expression?.operation)) {
    const value = resolveData2(target, state, context);
    return { get: () => ({ value, kind: phpType(value) }) };
  }
  if (target?.$expression?.operation === "objectStaticProperty") return staticPropertyReference(target.$expression, state, context);
  if (target?.$expression?.operation === "objectProperty") {
    const ref = objectPropertyReference(target.$expression, state, context);
    return indirect ? ref.indirect() : ref;
  }
  if (["offset", "appendOffset"].includes(target?.$expression?.operation)) {
    const rule = target.$expression;
    const parent = valueReference(rule.left, state, context, false, quiet, unpack);
    const append = rule.operation === "appendOffset";
    const key = append ? null : resolveData2(rule.right, state, context);
    const keyKind = append ? "NULL" : resolveType(rule.right, state, context, key);
    let prepared;
    const prepare = () => prepared ??= offsetReference(parent, key, keyKind, append, context, unpack);
    const ref = quiet ? {
      probe: (issetOnly = false) => readOffset((parent.probe?.() || parent.get(true)).value, key, keyKind, context, true, issetOnly),
      get: (...args) => prepare().get(...args),
      set: (...args) => prepare().set(...args),
      remove: () => prepare().remove(),
      indirect: () => {
        const actual = prepare();
        return actual.indirect?.() || actual;
      }
    } : prepare();
    return indirect ? ref.indirect?.() || ref : ref;
  }
  return {
    ...target?.$state ? { embeddable: false } : {},
    get: (quiet2 = false) => {
      const value = quiet2 ? resolveQuiet(target, state, context) : resolveData2(target, state, context);
      return { value, kind: resolveType(target, state, context, value) };
    },
    set: (value, kind, source = context.source) => assign(target, value, kind, state, { ...context, source }),
    remove: () => {
      if (target?.$local) {
        ownArray(context.locals, target.$local, null);
        delete context.locals[target.$local];
        delete context.localTypes[target.$local];
        if (context.localReferences) delete context.localReferences[target.$local];
      } else throw new Error("Cannot unset a root state property");
    }
  };
};
var offsetReference = (reference, key, keyKind, append, context, unpack = false) => {
  const parent = unpack ? reference : reference.indirect?.() || reference;
  const container = parent.get(true).value;
  if (isPhpObject(container)) {
    const ref = objectOffsetReference(container, key, keyKind, context);
    if (!unpack) return ref;
    let item = ref.get();
    item = { ...item, value: clonePhp(item.value) };
    return { get: () => item, set: (value, kind) => item = { value, kind } };
  }
  if (phpType(container) === "object") throw new Error("Cannot use object as array");
  return {
    get: (quiet = false) => arrayRead(parent.get(quiet).value, key, context, quiet),
    probe: () => readOffset((reference.probe?.() || reference.get(true)).value, key, keyKind, context, true),
    acquire: () => {
      const result = arrayRead(parent.get(true).value, key, context, true);
      parent.warnIndirect?.();
      return result;
    },
    set: (value, kind, source = context.source) => {
      const current = parent.get(true).value, ref = !append && isPhpArray(current) ? arrayElementReference(current, key) : null;
      if (ref) return ref.set(value, kind);
      parent.set(arrayWrite(current, key, value, kind, context, append), "array", source);
      return { value, kind };
    },
    remove: () => {
      const current = parent.get(true).value;
      if (current != null) parent.set(arrayUnset(current, key, context), "array");
    }
  };
};
var assignTarget = (target, value, kind, state, context) => valueReference(target, state, context).set(value, kind);
var resolveQuiet = (node, state, context, issetOnly = false) => {
  if (node?.$expression?.operation === "nullsafeChain") return record(node, resolveNullsafe(node.$expression.left, state, context, true, issetOnly), context);
  if (node?.$expression?.operation === "dynamicLocal") return resolveQuiet({ $local: dynamicLocalId(resolveData2(node.$expression.left, state, context), context) }, state, context, issetOnly);
  if (node?.$expression?.operation === "objectStaticProperty") return record(node, staticPropertyReference(node.$expression, state, context).get(true), context);
  if (node?.$expression?.operation === "objectProperty") return record(node, objectPropertyReference(node.$expression, state, context).probe(issetOnly), context);
  if (node?.$local && context.localReferences?.[node.$local]) return record(node, context.localReferences[node.$local].get(true), context);
  if (node?.$local && !Object.hasOwn(context.locals || {}, node.$local)) return record(node, { value: null, kind: "NULL" }, context);
  if (node?.$expression?.operation === "offset") {
    const parent = resolveQuiet(node.$expression.left, state, context);
    const key = resolveData2(node.$expression.right, state, context);
    return record(node, readOffset(parent, key, resolveType(node.$expression.right, state, context, key), context, true, issetOnly), context);
  }
  return resolveData2(node, state, context);
};
var resolveValue = (value, state, eventData) => {
  if (Array.isArray(value)) return value.map((item) => resolveData2(item, state, eventData));
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, "$float")) return Number(value.$float);
    if (typeof value.$local === "string") {
      if (eventData.localReferences?.[value.$local]) return record(value, eventData.localReferences[value.$local].get(), eventData);
      if (!eventData?.locals || !Object.hasOwn(eventData.locals, value.$local)) throw new Error(`Undefined frontend local: ${localName(value.$local)}`);
      return eventData.locals[value.$local];
    }
    if (typeof value.$state === "string") return readPath(state, value.$state);
    if (typeof value.$event === "string") return readPath(eventData || {}, value.$event);
    if (typeof value.$loop === "string") return readPath(eventData?.loop || {}, value.$loop);
    if (typeof value.$collection === "string") return readPath(eventData?.collection || {}, value.$collection);
    if (value.$expression && typeof value.$expression === "object") {
      const expression = value.$expression;
      if (expression.operation === "dynamicLocal") {
        const target = { $local: dynamicLocalId(resolveData2(expression.left, state, eventData), eventData) };
        const result = resolveData2(target, state, eventData);
        return record(value, { value: result, kind: resolveType(target, state, eventData, result) }, eventData);
      }
      if (expression.operation === "nullsafeChain") return record(value, resolveNullsafe(expression.left, state, eventData), eventData);
      if (expression.operation.startsWith("object")) return record(value, evaluateObject(expression, state, eventData), eventData);
      if (expression.operation === "eval") return record(value, evaluateEval(expression, state, eventData, resolveData2, resolveType), eventData);
      if (["exception", "exceptionGet", "exceptionIs", "throw", "assert"].includes(expression.operation)) return evaluateException(expression, state, eventData, resolveData2, resolveType);
      if (expression.operation === "display") return record(value, evaluateDisplay(expression, state, eventData), eventData);
      if (expression.operation === "assignReference") {
        const ref = promoteReference(expression.right, state, eventData);
        bindReferenceTarget(expression.left, ref, state, eventData);
        return record(value, ref.get(), eventData);
      }
      if (expression.operation === "splMethod") return record(value, splMethod(expression, state, eventData), eventData);
      if (expression.operation === "builtin") return record(value, evaluateBuiltin(expression, state, eventData, resolveData2, resolveType, valueReference), eventData);
      if (expression.operation === "staticLocal") return staticLocal(expression, state, eventData);
      if (["enumCase", "enumCases", "enumFrom"].includes(expression.operation)) return record(value, evaluateEnum(expression, state, eventData), eventData);
      if (expression.operation === "roundingMode") return roundingMode(expression.left);
      if (expression.operation === "call") return record(value, evaluateCall(expression, state, eventData), eventData);
      if (expression.operation === "closure" || expression.operation === "functionRef") return createClosure(expression.left, expression.operation === "closure" ? expression.right : [], state, eventData);
      if (collectionOperations.has(expression.operation)) return record(value, evaluateCollection(expression, state, eventData, resolveData2, resolveType, valueReference), eventData);
      if (expression.operation === "match") {
        const subject = resolveData2(expression.left, state, eventData);
        const subjectType = resolveType(expression.left, state, eventData, subject);
        let fallback;
        for (const arm of expression.right) {
          if (arm.default) {
            fallback = arm;
            continue;
          }
          for (const condition of arm.conditions) {
            const candidate = resolveData2(condition, state, eventData);
            if (phpMatches("eq", subject, candidate, subjectType, resolveType(condition, state, eventData, candidate))) {
              const result = resolveData2(arm.value, state, eventData);
              return record(value, { value: result, kind: resolveType(arm.value, state, eventData, result) }, eventData);
            }
          }
        }
        if (fallback) {
          const result = resolveData2(fallback.value, state, eventData);
          return record(value, { value: result, kind: resolveType(fallback.value, state, eventData, result) }, eventData);
        }
        const error = new Error("Unhandled match case");
        error.name = "UnhandledMatchError";
        throw error;
      }
      if (["assign", "coalesceAssign", "compoundAssign", "unsetOffset"].includes(expression.operation)) {
        const ref = valueReference(expression.left, state, eventData, false, ["assign", "coalesceAssign", "compoundAssign"].includes(expression.operation));
        if (expression.operation === "unsetOffset") {
          ref.remove();
          return null;
        }
        if (expression.operation === "coalesceAssign") {
          const current = ref.probe?.() || ref.get(true);
          if (current.value != null) return record(value, current, eventData);
        }
        if (expression.operation === "compoundAssign") {
          const right3 = resolveData2(expression.right.value, state, eventData);
          const current = ref.get();
          const operator = expression.right.operator;
          const rightType = resolveType(expression.right.value, state, eventData, right3);
          const operation = { "+": "add", "-": "subtract", "*": "multiply", "/": "divide", "%": "modulo", "**": "power" }[operator];
          const floating = operator !== "%" && (current.kind === "double" || rightType === "double" || hasFloatNumericPrefix(current.value) || hasFloatNumericPrefix(right3) || operator === "**" && Number(right3) < 0);
          const bitOperation = { "<<": "shiftLeft", ">>": "shiftRight", "&": "bitAnd", "|": "bitOr", "^": "bitXor" }[operator];
          const result = bitOperation ? resolveData2({ $expression: { operation: bitOperation, left: resolvedNode2(current), right: resolvedNode2({ value: right3, kind: rightType }) } }, state, eventData) : operator === "." ? phpString(current.value, current.kind, eventData) + phpString(right3, rightType, eventData) : phpArithmetic(operation, current.value, right3, floating, eventData);
          return record(value, ref.set(result, !bitOperation && floating ? "double" : phpType(result)), eventData);
        }
        const right2 = resolveData2(expression.right, state, eventData);
        return record(value, ref.set(right2, resolveType(expression.right, state, eventData, right2)), eventData);
      }
      if (["preIncrement", "postIncrement", "preDecrement", "postDecrement"].includes(expression.operation)) {
        let ref = valueReference(expression.left, state, eventData);
        ref = ref.increment?.() || ref;
        const before = ref.get();
        const next2 = phpIncrement(before.value, before.kind, expression.operation.endsWith("Increment") ? 1 : -1, eventData);
        const after = ref.set(next2.value, next2.kind);
        return record(value, expression.operation.startsWith("post") ? before : after, eventData);
      }
      const left = ["coalesce", "isset", "empty"].includes(expression.operation) ? resolveQuiet(expression.left, state, eventData, expression.operation === "isset") : resolveData2(expression.left, state, eventData);
      if (expression.operation === "and") return phpBool(left) && phpBool(resolveData2(expression.right, state, eventData));
      if (expression.operation === "or") return phpBool(left) || phpBool(resolveData2(expression.right, state, eventData));
      if (expression.operation === "coalesce" || expression.operation === "elvis") {
        if (expression.operation === "coalesce" ? left != null : phpBool(left)) return record(value, { value: left, kind: resolveType(expression.left, state, eventData, left) }, eventData);
        const right2 = resolveData2(expression.right, state, eventData);
        return record(value, { value: right2, kind: resolveType(expression.right, state, eventData, right2) }, eventData);
      }
      if (expression.operation === "isset") return left != null;
      if (expression.operation === "empty") return !phpBool(left);
      if (["incrementValue", "decrementValue"].includes(expression.operation)) return record(value, phpIncrement(left, resolveType(expression.left, state, eventData, left), expression.operation === "incrementValue" ? 1 : -1, eventData), eventData);
      if (expression.operation === "isObject") return phpType(left) === "object";
      if (expression.operation === "gettype") return resolveType(expression.left, state, eventData, left);
      const right = resolveData2(expression.right, state, eventData);
      if (expression.operation === "offset") return record(value, readOffset(left, right, resolveType(expression.right, state, eventData, right), eventData), eventData);
      if (expression.operation === "xor") return phpBool(left) !== phpBool(right);
      if (["bitNot", "shiftLeft", "shiftRight"].includes(expression.operation)) return phpBitwise(expression.operation, left, right, eventData);
      if (["bitOr", "bitAnd", "bitXor"].includes(expression.operation)) {
        const a = left, b = right, op = expression.operation;
        if (typeof a === "string" && typeof b === "string") {
          const x = bytes(a), y = bytes(b), output = new Uint8Array(op === "bitOr" ? Math.max(x.length, y.length) : Math.min(x.length, y.length));
          for (let i = 0; i < output.length; i++) output[i] = op === "bitOr" ? (x[i] || 0) | (y[i] || 0) : op === "bitAnd" ? x[i] & y[i] : x[i] ^ y[i];
          return text(output);
        }
        return phpBitwise(op, a, b, eventData);
      }
      if (["add", "subtract", "multiply", "divide", "modulo", "power"].includes(expression.operation)) {
        const floating = resolveType(expression.left, state, eventData, left) === "double" || resolveType(expression.right, state, eventData, right) === "double" || [left, right].some(hasFloatNumericPrefix) || expression.operation === "power" && Number(right) < 0;
        return phpArithmetic(expression.operation, left, right, expression.operation !== "modulo" && floating, eventData);
      }
      if (["identical", "notIdentical", "equal", "notEqual", "less", "lessEqual", "greater", "greaterEqual"].includes(expression.operation)) {
        return phpMatches(expression.operation, left, right, resolveType(expression.left, state, eventData, left), resolveType(expression.right, state, eventData, right));
      }
      if (expression.operation === "concat") return phpString(left, resolveType(expression.left, state, eventData, left), eventData) + phpString(right, resolveType(expression.right, state, eventData, right), eventData);
      if (expression.operation === "not") return !phpBool(left);
      if (expression.operation === "column") {
        if (!Array.isArray(left) || typeof right !== "string") return [];
        return left.map((item) => item && typeof item === "object" ? readPath(item, right) : null);
      }
      if (expression.operation === "unique") {
        return Array.isArray(left) ? [...new Set(left)] : [];
      }
      if (expression.operation === "reverse") {
        return Array.isArray(left) ? [...left].reverse() : [];
      }
      if (expression.operation === "slice") {
        if (!Array.isArray(left)) return [];
        const offset = Number(resolveData2(expression.right?.offset, state, eventData) ?? 0);
        const length = expression.right && Object.hasOwn(expression.right, "length") ? Number(resolveData2(expression.right.length, state, eventData)) : null;
        if (!Number.isInteger(offset) || length !== null && !Number.isInteger(length)) return [];
        if (length === null) return left.slice(offset);
        const start = offset < 0 ? Math.max(0, left.length + offset) : offset;
        const end = length >= 0 ? start + length : Math.max(start, left.length + length);
        return left.slice(start, end);
      }
      if (expression.operation === "merge") {
        const collections = Array.isArray(expression.right) ? expression.right : [];
        return [left, ...collections].map((collection) => resolveData2(collection, state, eventData)).filter(Array.isArray).flat();
      }
      if (expression.operation === "search") {
        if (!Array.isArray(left)) return false;
        const position = left.findIndex((item) => item === right);
        return position === -1 ? false : position;
      }
      if (expression.operation === "ceil") return Math.ceil(Number(left ?? 0));
      if (expression.operation === "floor") return Math.floor(Number(left ?? 0));
      if (expression.operation === "round") {
        return phpRound(Number(left ?? 0), Number(right ?? 0), 1, eventData.source?.phpVersion);
      }
      if (expression.operation === "min") return Math.min(Number(left ?? 0), Number(right ?? 0));
      if (expression.operation === "max") return Math.max(Number(left ?? 0), Number(right ?? 0));
      if (["toArray", "toObject"].includes(expression.operation)) return record(value, compoundCast(expression.operation, left, resolveType(expression.left, state, eventData, left), eventData), eventData);
      if (expression.operation === "toInt") return phpInt(left);
      if (expression.operation === "toFloat") return phpFloat(left);
      if (expression.operation === "toString") return phpString(left, resolveType(expression.left, state, eventData, left), eventData);
      if (expression.operation === "toBool") return phpBool(left);
      if (expression.operation === "compare") {
        const result = phpCompare(left, right, resolveType(expression.left, state, eventData, left), resolveType(expression.right, state, eventData, right));
        return Number.isNaN(result) ? 1 : result;
      }
      throw new Error(`Unknown AML state expression: ${expression.operation}`);
    }
    if (value.$conditional && typeof value.$conditional === "object") {
      const condition = value.$conditional;
      const left = resolveData2(condition.left, state, eventData);
      const right = resolveData2(condition.right, state, eventData);
      const matches = phpMatches(condition.operator, left, right, resolveType(condition.left, state, eventData, left), resolveType(condition.right, state, eventData, right));
      const selected = matches ? condition.then : condition.otherwise;
      const result = resolveData2(selected, state, eventData);
      return record(value, { value: result, kind: resolveType(selected, state, eventData, result) }, eventData);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveData2(item, state, eventData)]));
  }
  return value;
};
var resolveType = (expression, state, context = null, value = void 0) => {
  context ??= {};
  const record2 = expression && typeof expression === "object" ? context.evaluated?.get(expression) : null;
  if (record2) return record2.kind;
  if (value === void 0) value = resolveData2(expression, state, context);
  return resultType(expression, state, context, value);
};
var resultType = (expression, state, context, value) => {
  if (resolved.has(expression)) return resolved.get(expression).kind;
  if (value == null || typeof value !== "number") return phpType(value);
  if (!expression || typeof expression !== "object") return phpType(value);
  if (Object.hasOwn(expression, "$float")) return "double";
  if (expression.$local) return context.localTypes?.[expression.$local] || phpType(value);
  if (expression.$collection) return context.collectionTypes?.[expression.$collection] || phpType(value);
  if (expression.$state) {
    const type = context.valueTypes?.[expression.$state] || context.stateTypes?.[expression.$state];
    return ["float", "double"].includes(type) ? "double" : ["int", "integer"].includes(type) ? "integer" : phpType(value);
  }
  if (expression.$conditional) return context.evaluated?.get(expression)?.kind || phpType(value);
  const rule = expression.$expression;
  if (!rule) return phpType(value);
  if (collectionOperations.has(rule.operation) || ["match", "offset", "call", "builtin", "display", "eval", "objectProperty", "objectStaticProperty", "objectCall", "objectConstant"].includes(rule.operation)) return context.evaluated?.get(expression)?.kind || phpType(value);
  if (["compoundAssign", "assign", "coalesceAssign", "preIncrement", "postIncrement", "preDecrement", "postDecrement", "incrementValue", "decrementValue", "coalesce", "elvis"].includes(rule.operation)) return context.evaluated?.get(expression)?.kind || phpType(value);
  if (["toFloat", "ceil", "floor", "round"].includes(rule.operation)) return "double";
  if (["toInt", "count", "compare", "modulo"].includes(rule.operation)) return "integer";
  if (["add", "subtract", "multiply", "divide", "power", "min", "max"].includes(rule.operation)) {
    for (const node of [rule.left, rule.right]) {
      const evaluated = node && typeof node === "object" ? context.evaluated?.get(node) : { value: node, kind: phpType(node) };
      if (evaluated?.kind === "double" || hasFloatNumericPrefix(evaluated?.value)) return "double";
    }
    const exponent = rule.right && typeof rule.right === "object" ? context.evaluated?.get(rule.right)?.value : rule.right;
    if (rule.operation === "power" && Number(exponent) < 0) return "double";
  }
  return phpType(value);
};
var promoteReference = (target, state, context) => {
  if (target?.$expression?.operation === "dynamicLocal") target = { $local: dynamicLocalId(resolveData2(target.$expression.left, state, context), context) };
  if (["call", "objectCall", "builtin"].includes(target?.$expression?.operation)) {
    const value = resolveData2(target, state, context), item = context.evaluated.get(target);
    if (item.reference) return item.reference;
    warn(context, "Only variables should be assigned by reference", "PHP_NOTICE");
    return createReference({ value, kind: item.kind });
  }
  if (target?.$local) {
    const id = target.$local;
    if (!Object.hasOwn(context.locals || {}, id) && hasLocalBinding(context, id)) unbindLocalReference(context, id);
    return context.localReferences?.[id] ? bindLocalReference(context, id, context.localReferences[id]) : bindLocalReference(context, id, createReference({ value: context.locals?.[id] ?? null, kind: context.localTypes?.[id] || phpType(context.locals?.[id]) }));
  }
  if (["offset", "appendOffset"].includes(target?.$expression?.operation)) {
    const rule = target.$expression, parent = valueReference(rule.left, state, context), key = resolveData2(rule.right, state, context);
    const source = parent.get(true).value;
    if (isPhpObject(source)) return objectOffsetReference(source, key, phpType(key), context).reference();
    const item = arrayReference(source, key, context, rule.operation === "appendOffset");
    const guard = {};
    item.reference.cell?.bindings.add(guard);
    parent.set(item.array, "array");
    item.reference.cell?.bindings.delete(guard);
    return item.reference;
  }
  let reference = valueReference(target, state, context);
  reference = reference.reference?.() || reference;
  if (!reference.set) throw new Error("Expression cannot be referenced");
  return reference;
};
var bindReferenceTarget = (target, reference, state, context) => {
  if (target?.$expression?.operation === "dynamicLocal") target = { $local: dynamicLocalId(resolveData2(target.$expression.left, state, context), context) };
  if (target?.$local) return bindLocalReference(context, target.$local, reference);
  if (["objectProperty", "objectStaticProperty"].includes(target?.$expression?.operation)) {
    const destination = valueReference(target, state, context);
    if (destination.bind) return destination.bind(reference);
    throw new Error("This property does not support reference binding");
  }
  if (["offset", "appendOffset"].includes(target?.$expression?.operation)) {
    const rule = target.$expression, parent = valueReference(rule.left, state, context), key = resolveData2(rule.right, state, context);
    parent.set(arrayWithReference(parent.get(true).value, key, reference, context, rule.operation === "appendOffset"), "array");
    return reference;
  }
  throw new Error("Reference binding requires a local variable or an array offset");
};

// src-js/core/php-iterators.js
var isIterable = (value) => isPhpArray(value) || objectIs(value, "Traversable");
function* foreachEntries(source, withKey, context, iteration) {
  if (!isPhpObject(source)) {
    if (source == null || typeof source !== "object") {
      warn(context, "foreach() argument must be of type array|object");
      return;
    }
    for (const [key, value] of arrayEntries(source)) {
      iteration();
      yield { key: { value: key, kind: phpType(key) }, item: { value, kind: arrayKind(source, key), reference: arrayElementReference(source, key) } };
    }
    return;
  }
  let depth = 0;
  while (objectIs(source, "IteratorAggregate")) {
    if (++depth > 128) throw Object.assign(new RangeError("Frontend iterator delegation exceeds 128 levels"), { code: "PHP_ITERATOR_LIMIT" });
    const next2 = invokeCollectionMethod(source, "getiterator", [], context).value;
    if (!isPhpObject(next2) || !objectIs(next2, "Traversable") || next2 === source) throw Object.assign(new Error(`Objects returned by ${objectData(source).definition.name}::getIterator() must be traversable or implement interface Iterator`), { name: "Exception" });
    source = next2;
  }
  if (!objectIs(source, "Iterator")) throw new TypeError("Frontend foreach on service objects requires Iterator or IteratorAggregate");
  if (isGenerator(source) && generatorClosed(source)) throw Object.assign(new Error("Cannot traverse an already closed generator"), { name: "Exception" });
  const call = (method2) => invokeCollectionMethod(source, method2, [], context);
  call("rewind");
  while (phpBool(call("valid").value)) {
    iteration();
    const result = call("current"), item = { ...result, value: clonePhp(result.value) };
    const key = withKey ? call("key") : null;
    if (isSplObject(source)) item.reference = arrayElementReference(splStorageReference(source).get().value, key?.value ?? call("key").value);
    yield { key, item };
    call("next");
  }
}
function* spreadEntries(value, context) {
  if (isPhpArray(value)) {
    for (const [key, item] of arrayEntries(value)) yield { key: { value: key, kind: phpType(key) }, item: { value: item, kind: arrayKind(value, key) } };
    return;
  }
  if (!objectIs(value, "Traversable")) throw new TypeError("Only arrays and Traversables can be unpacked");
  let count = 0;
  const iteration = () => {
    if (++count > 1e3 || --(context.loopBudget ||= { remaining: 1e4 }).remaining < 0) throw Object.assign(new RangeError("Frontend loop limit exceeded"), { code: "PHP_LOOP_LIMIT" });
  };
  for (const entry of foreachEntries(value, true, context, iteration)) {
    if (!["integer", "string"].includes(entry.key.kind)) throw new Error("Keys must be of type int|string during unpacking");
    yield entry;
  }
}
function* referenceEntries(target, state, context, iteration) {
  if (["call", "objectCall"].includes(target?.$expression?.operation)) {
    const value = resolveData(target, state, context);
    target = resolvedNode({ value, kind: "object" });
  }
  let parent = target?.$expression || target?.$local || target?.$state ? promoteReference(target, state, context) : { get: () => ({ value: resolveData(target, state, context) }) };
  let initial = parent.get().value;
  if (isSplObject(initial)) {
    parent = splStorageReference(initial);
    initial = parent.get().value;
  }
  if (isGenerator(initial)) {
    generatorReference(initial, context);
    generatorMethod(initial, "rewind", [], context);
    while (generatorMethod(initial, "valid", [], context).value) {
      iteration();
      const reference = generatorReference(initial, context);
      yield { key: generatorMethod(initial, "key", [], context), item: reference.get(), reference };
      generatorMethod(initial, "next", [], context);
    }
    return;
  }
  if (!isPhpArray(initial)) throw new Error("Frontend foreach by reference requires an array");
  let array2 = initial;
  if (!arrayOrigin(array2)) {
    array2 = clonePhp(array2);
    parent.set(array2, "array");
    array2 = parent.get().value;
  }
  if (!arrayOrigin(array2)) {
    const entries = arrayEntries(array2);
    if (!entries.length) return;
    const first = arrayReference(array2, entries[0][0], context);
    parent.set(first.array, "array");
    array2 = parent.get().value;
  }
  let origin = arrayOrigin(array2);
  const cursor = { position: 0 };
  (origin.iterators ||= /* @__PURE__ */ new Set()).add(cursor);
  try {
    while (cursor.position < arrayEntries(origin.current).length) {
      iteration();
      const [key] = arrayEntries(origin.current)[cursor.position];
      const acquired = arrayReference(origin.current, key, context);
      const guard = {};
      acquired.reference.cell?.bindings.add(guard);
      if (arrayOrigin(parent.get().value) === origin) {
        parent.set(acquired.array, "array");
        const stored = arrayOrigin(parent.get().value);
        if (stored && stored !== origin) {
          origin.iterators.delete(cursor);
          origin = stored;
          (origin.iterators ||= /* @__PURE__ */ new Set()).add(cursor);
        }
      }
      acquired.reference.cell?.bindings.delete(guard);
      yield { key: { value: key, kind: phpType(key) }, item: acquired.reference.get(), reference: acquired.reference };
      if (isPhpArray(parent.get().value) && arrayOrigin(parent.get().value) !== origin) {
        origin.iterators.delete(cursor);
        origin = arrayOrigin(parent.get().value);
        if (!origin) break;
        (origin.iterators ||= /* @__PURE__ */ new Set()).add(cursor);
        cursor.position = -1;
      }
      cursor.position++;
    }
  } finally {
    origin.iterators.delete(cursor);
  }
}

export {
  releaseLocalReferences,
  isPhpObject,
  objectData,
  makeObject,
  objectIs,
  withSource,
  warn,
  ownArray,
  releaseArrays,
  isPhpArray,
  arrayKey,
  arrayEntries,
  arrayKind,
  makeArray,
  arrayWrite,
  arrayUnset,
  arrayRead,
  arrayWithReference,
  clonePhp,
  restoreArrayMetadata,
  describeArray,
  validatePhpValue,
  snapshotPhp,
  validateStateReferences,
  clone,
  safeSegments,
  readPath,
  writePath,
  pathAffects,
  owningTarget,
  recomputeComputed,
  coerce,
  deletePath,
  dateData,
  timezone,
  dateParts,
  bindOffsetPattern,
  foreachEntries,
  referenceEntries,
  failure,
  limit,
  bytes,
  text,
  bounded,
  arrayLimit,
  work,
  byteString,
  fromByteString,
  phpMatches,
  phpIncrement,
  assignType,
  formatThrowable,
  exceptionFlow,
  serviceRuntime,
  staticPropertyReference,
  objectMemberLookup,
  objectPropertyReference,
  evaluateObject,
  phpBool,
  phpString,
  phpArithmetic,
  phpType,
  phpDump,
  runGrapheme,
  invokeBuiltin,
  configureEvalAsset,
  prepareEval,
  resolvedNode2 as resolvedNode,
  resolveData2 as resolveData,
  assignTarget,
  resolveType,
  bindReferenceTarget,
  destructure,
  destructureReference,
  isFrontendCallable,
  bindMethod,
  declareFunction,
  invokeFunction
};
/*! Bundled license information:

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
