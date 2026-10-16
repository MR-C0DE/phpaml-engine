import {rootStates, rootConfigs, rootControllers, rootCleanups, transactions} from './context.js';
import {commit, resolveData} from './state-runtime.js';
import {clonePhp} from './core/php-arrays.js';
import {decodeFile, encodeFile, fileLimit, downloadName} from './core/file-codecs.js';

const pending = new WeakMap(), busy = new WeakMap();
const cancelled = {operation: 'return', cancelled: true, hasValue: false};
const resolveValue = (node, state, context) => {
  if (Object.hasOwn(node, 'expression')) return resolveData(node.expression, state, context?.eventData);
  if (Object.hasOwn(node, 'items')) return Array.isArray(node.items) ? node.items.map((item) => resolveValue(item, state, context)) : Object.fromEntries(Object.entries(node.items).map(([key, item]) => [key, resolveValue(item, state, context)]));
  return node.literal;
};
const markBusy = (trigger) => {
  if (!trigger) return () => {};
  const entry = busy.get(trigger) || {count: 0, aria: trigger.getAttribute('aria-busy'), disabled: trigger.disabled};
  busy.set(trigger, entry); entry.count++;
  trigger.setAttribute('aria-busy', 'true');
  if (trigger.tagName === 'BUTTON') trigger.disabled = true;
  return () => {
    if (--entry.count) return;
    busy.delete(trigger);
    if (entry.aria === null) trigger.removeAttribute('aria-busy'); else trigger.setAttribute('aria-busy', entry.aria);
    if (trigger.tagName === 'BUTTON') trigger.disabled = entry.disabled;
  };
};
const readText = (file, signal) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  const abort = () => { reader.abort(); finish(new DOMException('File read cancelled.', 'AbortError')); };
  const finish = (error, value) => {
    signal.removeEventListener('abort', abort);
    reader.onload = reader.onerror = reader.onabort = null;
    if (error) reject(error); else resolve(value);
  };
  reader.onerror = () => finish(reader.error || new Error('Cannot read this file.'));
  reader.onabort = () => finish(new DOMException('File read cancelled.', 'AbortError'));
  reader.onload = () => { try { finish(null, new TextDecoder('utf-8', {fatal: true}).decode(reader.result)); } catch { finish(new TypeError('File must contain valid UTF-8 text.')); } };
  if (signal.aborted) { abort(); return; }
  signal.addEventListener('abort', abort, {once: true});
  try { reader.readAsArrayBuffer(file); } catch (error) { finish(error); }
});
const download = (root, text, action) => {
  const filename = downloadName(action.filename);
  const mime = {text: 'text/plain', json: 'application/json', csv: 'text/csv'}[action.format];
  const url = URL.createObjectURL(new Blob([text], {type: `${mime};charset=utf-8`}));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.hidden = true;
  const cleanups = rootCleanups.get(root);
  let timer;
  const release = () => { clearTimeout(timer); URL.revokeObjectURL(url); cleanups?.delete(release); };
  try { document.body.append(anchor); anchor.click(); }
  catch (error) { release(); throw error; }
  finally { anchor.remove(); }
  // Allow the browser to consume the Blob before revoking its URL.
  timer = setTimeout(release, 1000); cleanups?.add(release);
};
export const executeFile = async (root, state, action, trigger, context) => {
  if (transactions.has(root)) throw new Error('File actions cannot run inside a state transaction. Use Actions::sequence().');
  const operations = pending.get(root) || new Map(); pending.set(root, operations);
  const key = action.operation === 'read' ? action.result : action;
  const previous = operations.get(key);
  previous?.controller.abort();
  if (previous?.loading && previous.loading !== action.loading && rootStates.get(root) === state) commit(root, state, previous.loading, false, context);
  const controller = new AbortController();
  const entry = {controller, loading: action.loading}; operations.set(key, entry);
  const owner = context?.owner || context, generation = owner?.generation;
  const mounted = () => rootStates.get(root) === state;
  const latest = () => mounted() && operations.get(key) === entry;
  const current = () => latest() && !controller.signal.aborted && (!owner || owner.concurrency === 'parallel' || owner.generation === generation);
  const controllers = rootControllers.get(root);
  controllers?.add(controller); owner?.controllers?.add(controller);
  const restoreBusy = markBusy(trigger);
  try {
    if (action.loading) commit(root, state, action.loading, true, context);
    if (action.error) commit(root, state, action.error, '', context);
    const limit = fileLimit(action.maxBytes);
    if (action.operation === 'read') {
      if (!action.result) throw new Error('File read requires a result state.');
      const inputs = action.source === null ? [trigger] : [...root.querySelectorAll('input[type="file"][data-aml-file-source]')].filter((input) => input.getAttribute('data-aml-file-source') === action.source && input.closest('[data-aml-client]') === root);
      if (inputs.length !== 1 || inputs[0]?.type !== 'file') throw new Error('File input is missing or ambiguous. Use a unique FileInput name in this component.');
      const input = inputs[0], index = action.index ?? 0;
      if (!Number.isInteger(index) || index < 0 || index > 999) throw new RangeError('Invalid selected file index.');
      const file = input.files?.[index];
      if (!file) throw new Error('No file selected.');
      if (file.size > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
      const text = await readText(file, controller.signal);
      if (!current() || input.files?.[index] !== file || !root.contains(input)) return cancelled;
      const value = decodeFile(text, action);
      const snapshot = clonePhp(state), config = rootConfigs.get(root), kinds = {...config?.valueTypes};
      try { commit(root, state, action.result, value, context); }
      catch (error) {
        Object.keys(state).forEach((key) => delete state[key]); Object.assign(state, snapshot);
        if (config) config.valueTypes = kinds;
        throw error;
      }
      root.dispatchEvent(new CustomEvent('aml:file-success', {detail: {operation: 'read', format: action.format, name: file.name, size: file.size, target: action.result}}));
    } else if (action.operation === 'download') {
      const text = encodeFile(resolveValue(action.value, state, context), action);
      if (!current()) return cancelled;
      download(root, text, action);
      root.dispatchEvent(new CustomEvent('aml:file-success', {detail: {operation: 'download', format: action.format, name: action.filename}}));
    } else throw new Error('Unknown file operation.');
  } catch (error) {
    if (!current() || error?.name === 'AbortError') return cancelled;
    if (action.error) commit(root, state, action.error, error.message, context);
    root.dispatchEvent(new CustomEvent('aml:file-error', {detail: {operation: action.operation, format: action.format, error}}));
    throw error;
  } finally {
    controllers?.delete(controller); owner?.controllers?.delete(controller);
    restoreBusy();
    if (latest()) {
      operations.delete(key);
      if (action.loading && ![...operations.values()].some((operation) => operation.loading === action.loading)) commit(root, state, action.loading, false, context);
    }
  }
};
