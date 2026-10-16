import {arrayEntries} from './php-arrays.js';

export const fileLimit = (limit = 1048576) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 16777216) throw new RangeError('File size limit must be between 1 and 16777216 bytes.');
  return limit;
};
const checkText = (text, limit) => {
  if (typeof text !== 'string') throw new TypeError('Text file content must be a string.');
  if (text.length > limit || new TextEncoder().encode(text).length > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
  return text;
};
const delimiter = (separator) => {
  if (typeof separator !== 'string' || !/^[\x20-\x7e\t]$/.test(separator) || separator === '"') throw new TypeError('Invalid CSV separator.');
  return separator;
};
const checkedData = (value, maxBytes = Infinity) => {
  let remaining = 100000, minimumBytes = 0;
  const countBytes = (item) => {
    minimumBytes += typeof item === 'string' ? new TextEncoder().encode(item).length : 1;
    if (minimumBytes > maxBytes) throw new RangeError(`File exceeds ${maxBytes} bytes.`);
  };
  const walk = (item, depth) => {
    if (--remaining < 0 || depth > 64) throw new RangeError('File data exceeds 100000 values or 64 nesting levels.');
    countBytes(item);
    if (typeof item === 'number' && (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))) throw new RangeError('File contains an unsafe number; represent large identifiers as strings.');
    if (item === null || ['string', 'boolean', 'number'].includes(typeof item)) return item;
    if (typeof item !== 'object' || ![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(item))) throw new TypeError('File data must contain JSON-compatible values.');
    if (Object.keys(item).length > remaining) throw new RangeError('File data exceeds 100000 values.');
    const entries = arrayEntries(item);
    const list = Array.isArray(item) && entries.every(([key], index) => key === index);
    const result = list ? [] : {};
    for (const [key, child] of entries) {
      if (!list) countBytes(String(key));
      if (['__proto__', 'prototype', 'constructor'].includes(String(key).toLowerCase())) throw new TypeError(`Reserved file data key: ${key}`);
      Object.defineProperty(result, key, {value: walk(child, depth + 1), enumerable: true, writable: true, configurable: true});
    }
    return result;
  };
  return walk(value, 0);
};
export const parseCsv = (text, separator = ',') => {
  delimiter(separator);
  if (text === '') return [];
  const rows = []; let row = [], field = '', quoted = false, closed = false, cells = 0;
  const cell = () => { if (++cells > 100000) throw new RangeError('CSV exceeds 100000 cells.'); row.push(field); field = ''; closed = false; };
  const line = () => { cell(); if (rows.length >= 10000) throw new RangeError('CSV exceeds 10000 rows.'); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += char;
    } else if (char === separator) cell();
    else if (char === '\r' || char === '\n') { line(); if (char === '\r' && text[i + 1] === '\n') i++; }
    else if (char === '"' && field === '' && !closed) quoted = true;
    else { if (closed || char === '"') throw new SyntaxError('Invalid CSV quoting.'); field += char; }
  }
  if (quoted) throw new SyntaxError('Unterminated CSV quoted field.');
  if (row.length || field !== '' || closed || !/[\r\n]$/.test(text)) line();
  return rows;
};
export const decodeFile = (text, action) => {
  checkText(text, fileLimit(action.maxBytes));
  if (action.format === 'text') return text;
  const clean = text.replace(/^\uFEFF/, '');
  if (action.format === 'json') return checkedData(JSON.parse(clean));
  if (action.format === 'csv') return parseCsv(clean, action.separator ?? ',');
  throw new TypeError('Unknown file format.');
};
export const encodeFile = (value, action) => {
  const limit = fileLimit(action.maxBytes);
  if (action.format === 'text') return checkText(value, limit);
  if (action.format === 'json') return checkText(JSON.stringify(checkedData(value, limit), null, action.pretty === false ? 0 : 2), limit);
  if (action.format !== 'csv') throw new TypeError('Unknown file format.');
  const separator = delimiter(action.separator ?? ',');
  if (!Array.isArray(value)) throw new TypeError('CSV data must be a list of rows.');
  if (value.length > 10000) throw new RangeError('CSV exceeds 10000 rows.');
  let cells = 0, bytes = 0;
  return value.map((row) => {
    if (!Array.isArray(row) || row.length === 0) throw new TypeError('Each CSV row must be a nonempty list of scalar cells.');
    if ((cells += row.length) > 100000) throw new RangeError('CSV exceeds 100000 cells.');
    bytes += 2; // CRLF
    const line = row.map((cell, index) => {
      if (cell !== null && !['string', 'number', 'boolean'].includes(typeof cell)) throw new TypeError('CSV cells must be scalar values.');
      if (typeof cell === 'number' && (!Number.isFinite(cell) || (Number.isInteger(cell) && !Number.isSafeInteger(cell)))) throw new RangeError('CSV contains an unsafe number.');
      let text = cell == null || cell === false ? '' : cell === true ? '1' : String(cell);
      // Escape formula-like text for spreadsheet programs; raw CSV is opt-in.
      if (action.spreadsheetSafe !== false && typeof cell === 'string' && (/^[\t\r\n]/.test(text) || /^\s*[=+\-@]/.test(text))) text = "'" + text;
      checkText(text, limit);
      const encoded = '"' + text.replaceAll('"', '""') + '"';
      bytes += new TextEncoder().encode(encoded).length + (index ? 1 : 0);
      if (bytes > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
      return encoded;
    }).join(separator) + '\r\n';
    if (bytes > limit) throw new RangeError(`File exceeds ${limit} bytes.`);
    return line;
  }).join('');
};
export const downloadName = (name) => {
  if (typeof name !== 'string' || !name || new TextEncoder().encode(name).length > 240 || /[\\/:*?"<>|\x00-\x1f\x7f]/.test(name) || /[. ]$/.test(name)) throw new TypeError('A download requires a plain filename without a path.');
  return name;
};
