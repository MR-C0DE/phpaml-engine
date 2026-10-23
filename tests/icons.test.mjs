import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iconName, iconGeometry} from '../src-js/icon-bindings.js';

test('icon names cannot select a URL, fragment or path outside the catalogue', () => {
  for (const name of ['heart', 'arrow-right', 'a-1']) assert.equal(iconName(name), name);
  for (const name of ['', '../heart', 'heart#x', 'https://example.com', 'Heart', 24, null, {}, 'a'.repeat(101)]) assert.throws(() => iconName(name));
});
test('icon geometry accepts inert SVG shapes and rejects executable or external content', () => {
  assert.deepEqual(iconGeometry([['path', {d: 'M0 0h24v24z'}]]), [['path', {d: 'M0 0h24v24z'}]]);
  iconGeometry([['circle', {cx: '12', cy: '12', r: '2', fill: 'currentColor'}]]);
  assert.throws(() => iconGeometry([[['path'], {d: 'M0 0'}]]));
  for (const value of [[], [['script', {d: 'M0 0'}]], [['foreignObject', {d: 'M0 0'}]], [['use', {href: '/other.svg'}]], [['path', {d: 'M0 0', onload: 'bad'}]], [['path', {d: '<script>'}]], [['circle', {fill: 'url(#x)'}]], [['constructor', {}]], [['path', []]]]) assert.throws(() => iconGeometry(value));
});
