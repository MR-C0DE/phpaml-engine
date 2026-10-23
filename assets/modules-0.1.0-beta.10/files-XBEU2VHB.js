import {
  commit,
  markBusy,
  rootCleanups,
  rootConfigs,
  rootControllers,
  rootStates,
  transactions
} from "./chunk-F7NIHWFI.js";
import {
  arrayEntries,
  clonePhp,
  resolveData
} from "./chunk-URCPTMHR.js";
import {
  __export,
  registerModule
} from "./chunk-DER6LTKY.js";

// src-js/files-runtime.js
var files_runtime_exports = {};
__export(files_runtime_exports, {
  executeFile: () => executeFile
});

// src-js/core/file-codecs.js
var file_codecs_exports = {};
__export(file_codecs_exports, {
  decodeFile: () => decodeFile,
  downloadName: () => downloadName,
  encodeFile: () => encodeFile,
  fileLimit: () => fileLimit,
  parseCsv: () => parseCsv
});
var fileLimit = (limit = 1048576) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 16777216) throw new RangeError("File size limit must be between 1 and 16777216 bytes.");
  return limit;
};
var checkText = (text, limit) => {
  if (typeof text !== "string") throw new TypeError("Text file content must be a string.");
  if (text.length > limit || new TextEncoder().encode(text).length > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
  return text;
};
var delimiter = (separator) => {
  if (typeof separator !== "string" || !/^[\x20-\x7e\t]$/.test(separator) || separator === '"') throw new TypeError("Invalid CSV separator.");
  return separator;
};
var checkedData = (value, maxBytes = Infinity) => {
  let remaining = 1e5, minimumBytes = 0;
  const countBytes = (item) => {
    minimumBytes += typeof item === "string" ? new TextEncoder().encode(item).length : 1;
    if (minimumBytes > maxBytes) throw new RangeError(`File exceeds ${maxBytes} bytes.`);
  };
  const walk = (item, depth) => {
    if (--remaining < 0 || depth > 64) throw new RangeError("File data exceeds 100000 values or 64 nesting levels.");
    countBytes(item);
    if (typeof item === "number" && (!Number.isFinite(item) || Number.isInteger(item) && !Number.isSafeInteger(item))) throw new RangeError("File contains an unsafe number; represent large identifiers as strings.");
    if (item === null || ["string", "boolean", "number"].includes(typeof item)) return item;
    if (typeof item !== "object" || ![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(item))) throw new TypeError("File data must contain JSON-compatible values.");
    if (Object.keys(item).length > remaining) throw new RangeError("File data exceeds 100000 values.");
    const entries = arrayEntries(item);
    const list = Array.isArray(item) && entries.every(([key], index) => key === index);
    const result = list ? [] : {};
    for (const [key, child] of entries) {
      if (!list) countBytes(String(key));
      if (["__proto__", "prototype", "constructor"].includes(String(key).toLowerCase())) throw new TypeError(`Reserved file data key: ${key}`);
      Object.defineProperty(result, key, { value: walk(child, depth + 1), enumerable: true, writable: true, configurable: true });
    }
    return result;
  };
  return walk(value, 0);
};
var parseCsv = (text, separator = ",") => {
  delimiter(separator);
  if (text === "") return [];
  const rows = [];
  let row = [], field = "", quoted = false, closed = false, cells = 0;
  const cell = () => {
    if (++cells > 1e5) throw new RangeError("CSV exceeds 100000 cells.");
    row.push(field);
    field = "";
    closed = false;
  };
  const line = () => {
    cell();
    if (rows.length >= 1e4) throw new RangeError("CSV exceeds 10000 rows.");
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === separator) cell();
    else if (char === "\r" || char === "\n") {
      line();
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else if (char === '"' && field === "" && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new SyntaxError("Invalid CSV quoting.");
      field += char;
    }
  }
  if (quoted) throw new SyntaxError("Unterminated CSV quoted field.");
  if (row.length || field !== "" || closed || !/[\r\n]$/.test(text)) line();
  return rows;
};
var decodeFile = (text, action) => {
  checkText(text, fileLimit(action.maxBytes));
  if (action.format === "text") return text;
  const clean = text.replace(/^\uFEFF/, "");
  if (action.format === "json") return checkedData(JSON.parse(clean));
  if (action.format === "csv") return parseCsv(clean, action.separator ?? ",");
  throw new TypeError("Unknown file format.");
};
var encodeFile = (value, action) => {
  const limit = fileLimit(action.maxBytes);
  if (action.format === "text") return checkText(value, limit);
  if (action.format === "json") return checkText(JSON.stringify(checkedData(value, limit), null, action.pretty === false ? 0 : 2), limit);
  if (action.format !== "csv") throw new TypeError("Unknown file format.");
  const separator = delimiter(action.separator ?? ",");
  if (!Array.isArray(value)) throw new TypeError("CSV data must be a list of rows.");
  if (value.length > 1e4) throw new RangeError("CSV exceeds 10000 rows.");
  let cells = 0, bytes = 0;
  return value.map((row) => {
    if (!Array.isArray(row) || row.length === 0) throw new TypeError("Each CSV row must be a nonempty list of scalar cells.");
    if ((cells += row.length) > 1e5) throw new RangeError("CSV exceeds 100000 cells.");
    bytes += 2;
    const line = row.map((cell, index) => {
      if (cell !== null && !["string", "number", "boolean"].includes(typeof cell)) throw new TypeError("CSV cells must be scalar values.");
      if (typeof cell === "number" && (!Number.isFinite(cell) || Number.isInteger(cell) && !Number.isSafeInteger(cell))) throw new RangeError("CSV contains an unsafe number.");
      let text = cell == null || cell === false ? "" : cell === true ? "1" : String(cell);
      if (action.spreadsheetSafe !== false && typeof cell === "string" && (/^[\t\r\n]/.test(text) || /^\s*[=+\-@]/.test(text))) text = "'" + text;
      checkText(text, limit);
      const encoded = '"' + text.replaceAll('"', '""') + '"';
      bytes += new TextEncoder().encode(encoded).length + (index ? 1 : 0);
      if (bytes > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
      return encoded;
    }).join(separator) + "\r\n";
    if (bytes > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
    return line;
  }).join("");
};
var downloadName = (name) => {
  if (typeof name !== "string" || !name || new TextEncoder().encode(name).length > 240 || /[\\/:*?"<>|\x00-\x1f\x7f]/.test(name) || /[. ]$/.test(name)) throw new TypeError("A download requires a plain filename without a path.");
  return name;
};

// src-js/files-runtime.js
var pending = /* @__PURE__ */ new WeakMap();
var cancelled = { operation: "return", cancelled: true, hasValue: false };
var resolveValue = (node, state, context) => {
  if (Object.hasOwn(node, "expression")) return resolveData(node.expression, state, context?.eventData);
  if (Object.hasOwn(node, "items")) return Array.isArray(node.items) ? node.items.map((item) => resolveValue(item, state, context)) : Object.fromEntries(Object.entries(node.items).map(([key, item]) => [key, resolveValue(item, state, context)]));
  return node.literal;
};
var readText = (file, signal) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  const abort = () => {
    reader.abort();
    finish(new DOMException("File read cancelled.", "AbortError"));
  };
  const finish = (error, value) => {
    signal.removeEventListener("abort", abort);
    reader.onload = reader.onerror = reader.onabort = null;
    if (error) reject(error);
    else resolve(value);
  };
  reader.onerror = () => finish(reader.error || new Error("Cannot read this file."));
  reader.onabort = () => finish(new DOMException("File read cancelled.", "AbortError"));
  reader.onload = () => {
    try {
      finish(null, new TextDecoder("utf-8", { fatal: true }).decode(reader.result));
    } catch {
      finish(new TypeError("File must contain valid UTF-8 text."));
    }
  };
  if (signal.aborted) {
    abort();
    return;
  }
  signal.addEventListener("abort", abort, { once: true });
  try {
    reader.readAsArrayBuffer(file);
  } catch (error) {
    finish(error);
  }
});
var download = (root, text, action) => {
  const filename = downloadName(action.filename);
  const mime = { text: "text/plain", json: "application/json", csv: "text/csv" }[action.format];
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  const cleanups = rootCleanups.get(root);
  let timer;
  const release = () => {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
    cleanups?.delete(release);
  };
  try {
    document.body.append(anchor);
    anchor.click();
  } catch (error) {
    release();
    throw error;
  } finally {
    anchor.remove();
  }
  timer = setTimeout(release, 1e3);
  cleanups?.add(release);
};
var executeFile = async (root, state, action, trigger, context) => {
  if (transactions.has(root)) throw new Error("File actions cannot run inside a state transaction. Use Actions::sequence().");
  const operations = pending.get(root) || /* @__PURE__ */ new Map();
  pending.set(root, operations);
  const key = action.operation === "read" ? action.result : action;
  const previous = operations.get(key);
  previous?.controller.abort();
  if (previous?.loading && previous.loading !== action.loading && rootStates.get(root) === state) commit(root, state, previous.loading, false, context);
  const controller = new AbortController();
  const entry = { controller, loading: action.loading };
  operations.set(key, entry);
  const owner = context?.owner || context, generation = owner?.generation;
  const mounted = () => rootStates.get(root) === state;
  const latest = () => mounted() && operations.get(key) === entry;
  const current = () => latest() && !controller.signal.aborted && (!owner || owner.concurrency === "parallel" || owner.generation === generation);
  const controllers = rootControllers.get(root);
  controllers?.add(controller);
  owner?.controllers?.add(controller);
  const restoreBusy = markBusy(trigger);
  try {
    if (action.loading) commit(root, state, action.loading, true, context);
    if (action.error) commit(root, state, action.error, "", context);
    const limit = fileLimit(action.maxBytes);
    if (action.operation === "read") {
      if (!action.result) throw new Error("File read requires a result state.");
      const inputs = action.source === null ? [trigger] : [...root.querySelectorAll('input[type="file"][data-aml-file-source]')].filter((input2) => input2.getAttribute("data-aml-file-source") === action.source && input2.closest("[data-aml-client]") === root);
      if (inputs.length !== 1 || inputs[0]?.type !== "file") throw new Error("File input is missing or ambiguous. Use a unique FileInput name in this component.");
      const input = inputs[0], index = action.index ?? 0;
      if (!Number.isInteger(index) || index < 0 || index > 999) throw new RangeError("Invalid selected file index.");
      const file = input.files?.[index];
      if (!file) throw new Error("No file selected.");
      if (file.size > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
      const text = await readText(file, controller.signal);
      if (!current() || input.files?.[index] !== file || !root.contains(input)) return cancelled;
      const value = decodeFile(text, action);
      const snapshot = clonePhp(state), config = rootConfigs.get(root), kinds = { ...config?.valueTypes };
      try {
        commit(root, state, action.result, value, context);
      } catch (error) {
        Object.keys(state).forEach((key2) => delete state[key2]);
        Object.assign(state, snapshot);
        if (config) config.valueTypes = kinds;
        throw error;
      }
      root.dispatchEvent(new CustomEvent("aml:file-success", { detail: { operation: "read", format: action.format, name: file.name, size: file.size, target: action.result } }));
    } else if (action.operation === "download") {
      const text = encodeFile(resolveValue(action.value, state, context), action);
      if (!current()) return cancelled;
      download(root, text, action);
      root.dispatchEvent(new CustomEvent("aml:file-success", { detail: { operation: "download", format: action.format, name: action.filename } }));
    } else throw new Error("Unknown file operation.");
  } catch (error) {
    if (!current() || error?.name === "AbortError") return cancelled;
    if (action.error) commit(root, state, action.error, error.message, context);
    root.dispatchEvent(new CustomEvent("aml:file-error", { detail: { operation: action.operation, format: action.format, error } }));
    throw error;
  } finally {
    controllers?.delete(controller);
    owner?.controllers?.delete(controller);
    restoreBusy();
    if (latest()) {
      operations.delete(key);
      if (action.loading && ![...operations.values()].some((operation) => operation.loading === action.loading)) commit(root, state, action.loading, false, context);
    }
  }
};

// phpaml-module:files
registerModule("files", "0.1.0-beta.10", { ...files_runtime_exports, ...file_codecs_exports });
