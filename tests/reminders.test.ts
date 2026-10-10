/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REMINDER_DAYS, REMINDER_HOUR, reminderDates } from '../src/reminderDates';

test('reminders cover the next two weeks at 9:00', () => {
  const dates = reminderDates(new Date(2026, 9, 10, 7, 30), false);
  assert.equal(dates.length, REMINDER_DAYS);
  assert.deepEqual(dates[0], new Date(2026, 9, 10, REMINDER_HOUR));
  assert.deepEqual(dates.at(-1), new Date(2026, 9, 23, REMINDER_HOUR));
});

test("no reminder today once today's word is solved or 9:00 has passed", () => {
  const solved = reminderDates(new Date(2026, 9, 10, 7, 30), true);
  assert.deepEqual(solved[0], new Date(2026, 9, 11, REMINDER_HOUR));
  const late = reminderDates(new Date(2026, 9, 10, 21, 0), false);
  assert.deepEqual(late[0], new Date(2026, 9, 11, REMINDER_HOUR));
  assert.equal(late.length, REMINDER_DAYS - 1);
});

test('month ends roll over', () => {
  const dates = reminderDates(new Date(2026, 11, 30, 10, 0), false);
  assert.deepEqual(dates[0], new Date(2026, 11, 31, REMINDER_HOUR));
  assert.deepEqual(dates[1], new Date(2027, 0, 1, REMINDER_HOUR));
});
