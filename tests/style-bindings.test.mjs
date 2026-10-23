import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStyleValue, styleDeclaration} from '../src-js/style-bindings.js';

test('icon dimensions reject negative numbers and CSS literals without changing other styles', () => {
  for (const property of ['width', 'height', 'stroke-width']) {
    for (const value of [-10, -.5, '-10', '-.5em', '-2px !important', ' /* negative */ -1e2%', Infinity, NaN]) {
      assert.throws(() => normalizeStyleValue(property, value, 'iconDimension'));
    }
    for (const value of [0, .5, '0', '1.5em', '25%', 'calc(100% - 2px)', 'var(--icon-size)', 'inherit']) {
      assert.doesNotThrow(() => normalizeStyleValue(property, value, 'iconDimension'));
    }
  }
  assert.equal(normalizeStyleValue('margin', -10), '-10px');
});

test('bound CSS separates priority from tokens and preserves empty custom properties', () => {
  assert.deepEqual(styleDeclaration('color', 'red ! /* note */ IMPORTANT'), {value:'red', important:true, active:true, keyword:null});
  assert.deepEqual(styleDeclaration('content', '"$1 !important"'), {value:'"$1 !important"', important:false, active:true, keyword:null});
  assert.deepEqual(styleDeclaration('width', ''), {value:'', important:false, active:false, keyword:null});
  assert.deepEqual(styleDeclaration('--empty', ''), {value:' ', important:false, active:true, keyword:null});
  assert.deepEqual(styleDeclaration('opacity', '0.8 !important', true), {value:'0.8', important:false, active:false, keyword:null});
});
test('malformed CSS values fail before mutating rendered declarations', () => {
  for (const value of ['red /*', '"unclosed', 'calc(2px', 'red\\', 'var(--x))']) assert.throws(() => normalizeStyleValue('color', value));
  assert.equal(normalizeStyleValue('width', 32), '32px');
  assert.equal(normalizeStyleValue('content', '"literal \\" !important"'), '"literal \\" !important"');
});

test('CSS-wide keywords apply to the target declaration with explicit keyframe limits', () => {
  assert.equal(styleDeclaration('color', 'INITIAL /* reset */ !important').keyword, 'initial');
  assert.equal(styleDeclaration('color', 'ini/**/tial').keyword, null);
  assert.throws(() => styleDeclaration('color', 'inherit', true), /statically in keyframes/);
});
