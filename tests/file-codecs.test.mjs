import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeFile, encodeFile, downloadName, fileLimit} from '../src-js/core/file-codecs.js';
import {hasAsyncAction} from '../src-js/core/action-analysis.js';

const json = {format: 'json'}, csv = {format: 'csv', spreadsheetSafe: false}, text = {format: 'text'};
test('JSON imports scalar and structured data, BOM and expression-looking keys as data', () => {
  for (const data of [null, false, 1.25, 'André', [], {}, {name: 'André', '$state': 'private', children: [true, null]}]) {
    assert.deepEqual(decodeFile('\ufeff' + JSON.stringify(data), json), data);
    assert.deepEqual(JSON.parse(encodeFile(data, json)), data);
  }
});
test('invalid and unsafe JSON is rejected instead of corrupting client state', () => {
  for (const source of ['{', '{"a":NaN}', '{"a":1e400}', '{"id":9007199254740993}', '{"__proto__":{}}', '{"x":{"Constructor":1}}', '['.repeat(66) + '0' + ']'.repeat(66)]) assert.throws(() => decodeFile(source, json));
  for (const value of [NaN, Infinity, () => {}, {x: undefined}, new Date()]) assert.throws(() => encodeFile(value, json));
  const cyclic = {}; cyclic.self = cyclic; assert.throws(() => encodeFile(cyclic, json), /nesting/);
  assert.throws(() => encodeFile(Array(100001).fill(null), json), /100000/);
  assert.throws(() => encodeFile(Array(100).fill('long'), {...json, maxBytes: 16}), /bytes/);
  assert.equal(encodeFile(Array(1000).fill(0), {...json, pretty: false, maxBytes: 2001}).length, 2001);
});
test('CSV handles quoted delimiters, CRLF, empty cells, doubled quotes and multiline fields', () => {
  const rows = [['nom', 'note', ''], ['André', 'a,"b"\r\nc', '0'], ['', '', '']];
  for (const separator of [',', ';', '\t']) {
    const options = {...csv, separator};
    assert.deepEqual(decodeFile(encodeFile(rows, options), options), rows);
  }
  assert.deepEqual(decodeFile('a,b,\r\nc,d,\r\n', csv), [['a', 'b', ''], ['c', 'd', '']]);
  assert.deepEqual(decodeFile('', csv), []);
  assert.deepEqual(decodeFile('\n', csv), [['']]);
  assert.deepEqual(decodeFile('""', csv), [['']]);
  for (const value of ['a"b,c', '"a"x,b', '"unterminated']) assert.throws(() => decodeFile(value, csv), SyntaxError);
});
test('CSV validates structure and bounds, preserving scalar PHP text conversions', () => {
  assert.deepEqual(decodeFile(encodeFile([[null, false, true, 3.5]], csv), csv), [['', '', '1', '3.5']]);
  for (const value of [{name: 1}, [[]], [['ok', {}]], [[NaN]]]) assert.throws(() => encodeFile(value, csv));
  assert.throws(() => decodeFile('a\n'.repeat(10001), csv), /10000 rows/);
  assert.throws(() => decodeFile('a,'.repeat(100000), csv), /100000 cells/);
  assert.throws(() => decodeFile('a', {...csv, separator: '"'}), /separator/);
  assert.throws(() => encodeFile([Array(100).fill('long')], {...csv, maxBytes: 16}), /bytes/);
});
test('CSV spreadsheet protection is explicit and raw round trips are available', () => {
  const rows = [['=1+1', ' +2', '\ttext', '-2', '@x', 'André', -2]];
  assert.deepEqual(decodeFile(encodeFile(rows, {format: 'csv'}), csv), [["'=1+1", "' +2", "'\ttext", "'-2", "'@x", 'André', '-2']]);
  assert.deepEqual(decodeFile(encodeFile([rows[0].slice(0, 6)], csv), csv), [rows[0].slice(0, 6)]);
});
test('limits count UTF-8 bytes and downloads accept filenames, never paths', () => {
  assert.equal(encodeFile('é', {...text, maxBytes: 2}), 'é');
  assert.throws(() => encodeFile('é', {...text, maxBytes: 1}), /bytes/);
  assert.throws(() => decodeFile('é', {...text, maxBytes: 1}), /bytes/);
  assert.throws(() => encodeFile(2, text), TypeError);
  for (const limit of [0, -1, 16777217, 0.5]) assert.throws(() => fileLimit(limit));
  for (const name of ['', '..', '../secret', '/tmp/a', 'a\\b', 'https://a', 'a\nb', 'x.']) assert.throws(() => downloadName(name));
  assert.equal(downloadName('André.csv'), 'André.csv');
  assert.equal(hasAsyncAction({type: 'sequence', actions: [{type: 'file'}]}), true);
});
