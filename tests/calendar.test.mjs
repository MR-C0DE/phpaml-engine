import {test} from 'node:test';
import assert from 'node:assert/strict';
import {civilDate, moveCalendarDay, moveCalendarMonth} from '../src-js/calendar.js';

test('calendar civil arithmetic preserves leap days, month ends and year boundaries', () => {
  assert.equal(civilDate('2027-02-29'), null);
  assert.equal(civilDate('0000-01-01'), null);
  assert.equal(civilDate('2028-02-29').toISOString(), '2028-02-29T00:00:00.000Z');
  assert.equal(moveCalendarMonth('2028-01-31', 1), '2028-02-29');
  assert.equal(moveCalendarMonth('2028-02-29', 12), '2029-02-28');
  assert.equal(moveCalendarMonth('0001-01-01', -1), null);
  assert.equal(moveCalendarDay('9999-12-31', 1), null);
  assert.equal(moveCalendarDay('2028-03-12', 1), '2028-03-13');
  assert.equal(moveCalendarDay('0001-01-01', 1), '0001-01-02');
});
