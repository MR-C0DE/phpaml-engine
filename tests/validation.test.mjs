import test from 'node:test';
import assert from 'node:assert/strict';

import { validateValue, validationMessage } from '../src-js/validation.js';

const rules = [
  {type: 'required', message: 'Required'},
  {type: 'min-length', value: 3, message: 'Too short'},
  {type: 'email', message: 'Invalid email'},
];

test('validates required, minimum-length and email rules in order', () => {
  assert.equal(validateValue(rules, '   '), 'Required');
  assert.equal(validateValue(rules, 'a'), 'Too short');
  assert.equal(validateValue(rules, 'not-an-email'), 'Invalid email');
  assert.equal(validateValue(rules, 'ada@example.test'), '');
});

test('keeps optional empty fields valid', () => {
  assert.equal(validateValue([{type: 'email', message: 'Invalid'}], ''), '');
  assert.equal(validateValue([{type: 'min-length', value: 4, message: 'Short'}], ''), '');
});

test('reads checkbox values from their checked state', () => {
  const dataset = {amlValidate: JSON.stringify([{type: 'required', message: 'Accept terms'}])};
  assert.equal(validationMessage({dataset, type: 'checkbox', checked: false, value: 'yes'}), 'Accept terms');
  assert.equal(validationMessage({dataset, type: 'checkbox', checked: true, value: 'yes'}), '');
});

test('accepts controls without declarative rules', () => {
  assert.equal(validationMessage({dataset: {}, type: 'text', value: 'anything'}), '');
});
