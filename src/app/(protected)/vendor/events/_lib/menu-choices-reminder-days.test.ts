import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MENU_CHOICES_REMINDER_DEFAULT_DAYS,
  MENU_CHOICES_REMINDER_MIN_MESSAGE,
  hydrateMenuChoicesReminderDays,
  menuChoicesReminderDaysSchema,
  serializeMenuChoicesReminderDays,
} from "./menu-choices-reminder-days";

test("hydrates missing, null, and 0 to the API default of 7", () => {
  assert.equal(MENU_CHOICES_REMINDER_DEFAULT_DAYS, 7);
  assert.equal(hydrateMenuChoicesReminderDays(undefined), 7);
  assert.equal(hydrateMenuChoicesReminderDays(null), 7);
  assert.equal(hydrateMenuChoicesReminderDays(0), 7);
  assert.equal(hydrateMenuChoicesReminderDays(""), 7);
});

test("hydrates valid integers of 6 or more", () => {
  assert.equal(hydrateMenuChoicesReminderDays(6), 6);
  assert.equal(hydrateMenuChoicesReminderDays(7), 7);
  assert.equal(hydrateMenuChoicesReminderDays(10), 10);
  assert.equal(hydrateMenuChoicesReminderDays("10"), 10);
});

test("serialize sends valid integers and omits empty or invalid values", () => {
  assert.equal(serializeMenuChoicesReminderDays(6), 6);
  assert.equal(serializeMenuChoicesReminderDays(10), 10);
  assert.equal(serializeMenuChoicesReminderDays(null), null);
  assert.equal(serializeMenuChoicesReminderDays(undefined), null);
  assert.equal(serializeMenuChoicesReminderDays(""), null);
  assert.equal(serializeMenuChoicesReminderDays(0), null);
  assert.equal(serializeMenuChoicesReminderDays(5), null);
});

test("schema allows empty so the backend can default to 7", () => {
  assert.equal(menuChoicesReminderDaysSchema.safeParse(undefined).success, true);
  assert.equal(menuChoicesReminderDaysSchema.safeParse(null).success, true);
  assert.deepEqual(menuChoicesReminderDaysSchema.parse(null), null);
});

test("schema accepts integers greater than 5", () => {
  assert.deepEqual(menuChoicesReminderDaysSchema.parse(6), 6);
  assert.deepEqual(menuChoicesReminderDaysSchema.parse(7), 7);
  assert.deepEqual(menuChoicesReminderDaysSchema.parse(10), 10);
});

test("schema rejects 0, 5, and non-integers with a clear message", () => {
  for (const value of [0, 5, 5.5]) {
    const result = menuChoicesReminderDaysSchema.safeParse(value);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(
        result.error.issues[0]?.message,
        MENU_CHOICES_REMINDER_MIN_MESSAGE,
      );
    }
  }
});
