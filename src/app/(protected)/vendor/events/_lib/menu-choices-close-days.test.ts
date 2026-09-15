import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MENU_CHOICES_CLOSE_DEFAULT_DAYS,
  MENU_CHOICES_CLOSE_MIN_MESSAGE,
  hydrateMenuChoicesCloseDaysBefore,
  menuChoicesCloseDaysBeforeSchema,
  serializeMenuChoicesCloseDaysBefore,
} from "./menu-choices-close-days";

test("hydrates missing, null, 0, and empty to the API default of 14", () => {
  assert.equal(MENU_CHOICES_CLOSE_DEFAULT_DAYS, 14);
  assert.equal(hydrateMenuChoicesCloseDaysBefore(undefined), 14);
  assert.equal(hydrateMenuChoicesCloseDaysBefore(null), 14);
  assert.equal(hydrateMenuChoicesCloseDaysBefore(0), 14);
  assert.equal(hydrateMenuChoicesCloseDaysBefore(""), 14);
});

test("hydrates valid integers of 1 or more", () => {
  assert.equal(hydrateMenuChoicesCloseDaysBefore(1), 1);
  assert.equal(hydrateMenuChoicesCloseDaysBefore(7), 7);
  assert.equal(hydrateMenuChoicesCloseDaysBefore(14), 14);
  assert.equal(hydrateMenuChoicesCloseDaysBefore("7"), 7);
});

test("serialize sends valid integers and defaults empty or invalid values to 14", () => {
  assert.equal(serializeMenuChoicesCloseDaysBefore(1), 1);
  assert.equal(serializeMenuChoicesCloseDaysBefore(10), 10);
  assert.equal(serializeMenuChoicesCloseDaysBefore(null), 14);
  assert.equal(serializeMenuChoicesCloseDaysBefore(undefined), 14);
  assert.equal(serializeMenuChoicesCloseDaysBefore(""), 14);
  assert.equal(serializeMenuChoicesCloseDaysBefore(0), 14);
  assert.equal(serializeMenuChoicesCloseDaysBefore(1.5), 14);
});

test("schema allows empty so save can default to 14", () => {
  assert.equal(
    menuChoicesCloseDaysBeforeSchema.safeParse(undefined).success,
    true,
  );
  assert.equal(menuChoicesCloseDaysBeforeSchema.safeParse(null).success, true);
  assert.deepEqual(menuChoicesCloseDaysBeforeSchema.parse(null), null);
});

test("schema accepts integers of 1 or more", () => {
  assert.deepEqual(menuChoicesCloseDaysBeforeSchema.parse(1), 1);
  assert.deepEqual(menuChoicesCloseDaysBeforeSchema.parse(14), 14);
});

test("schema rejects 0, negatives, and non-integers", () => {
  for (const value of [0, -1, 1.5]) {
    const result = menuChoicesCloseDaysBeforeSchema.safeParse(value);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(
        result.error.issues[0]?.message,
        MENU_CHOICES_CLOSE_MIN_MESSAGE,
      );
    }
  }
});
