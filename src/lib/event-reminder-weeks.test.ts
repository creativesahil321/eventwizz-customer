import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EVENT_REMINDER_DEFAULT_DAYS,
  EVENT_REMINDER_WEEK_OPTIONS,
  normalizeReminderDaysToWeeks,
  reminderDaysToSelectValue,
} from "./event-reminder-weeks";

test("reminder options are 1–8 weeks in days", () => {
  assert.equal(EVENT_REMINDER_WEEK_OPTIONS.length, 8);
  assert.equal(EVENT_REMINDER_WEEK_OPTIONS[0]?.days, 7);
  assert.equal(EVENT_REMINDER_WEEK_OPTIONS[7]?.days, 56);
  assert.equal(EVENT_REMINDER_DEFAULT_DAYS, 14);
});

test("snaps legacy day counts onto the nearest week", () => {
  assert.equal(normalizeReminderDaysToWeeks(undefined), undefined);
  assert.equal(normalizeReminderDaysToWeeks(10), 14);
  assert.equal(normalizeReminderDaysToWeeks(7), 7);
  assert.equal(normalizeReminderDaysToWeeks(21), 21);
  assert.equal(reminderDaysToSelectValue(10), "14");
});
