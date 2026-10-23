import test from 'node:test';
import assert from 'node:assert/strict';
import {runGrapheme} from '../src-js/core/php-builtin-grapheme.js';

test('grapheme_strstr preserves the compiling PHP substring collation behavior', () => {
  for (const [haystack, needle, before, expected] of [
    ['aéé', 'e\u0301', false, 'éé'], ['aéé', 'e\u0301', true, 'a'],
    ['a\u00adb', 'ab', false, 'a\u00adb'], ['a\u00adb', 'ab', true, ''],
  ]) {
    const items = [haystack, needle, before].map(value => ({value}));
    assert.equal(runGrapheme('grapheme_strstr', items, {source: {}}).value, false);
    assert.equal(runGrapheme('grapheme_strstr', items, {source: {graphemeSubstringCollation: true}}).value, expected);
  }
  for (const graphemeSubstringCollation of [false, true]) {
    const context = {source: {graphemeSubstringCollation}};
    assert.equal(runGrapheme('grapheme_strstr', ['aéé', 'é', false].map(value => ({value})), context).value, 'éé');
    assert.equal(runGrapheme('grapheme_strstr', ['abc', 'missing', false].map(value => ({value})), context).value, false);
  }
});
