import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EVENT_DATE_MIN_MESSAGE,
  getMinEventDateString,
  getTodayLocalDateString,
  isEventDateBeforeMinimum,
} from "./min-event-date";

const noonOn = (year: number, monthIndex: number, day: number) =>
  new Date(year, monthIndex, day, 12, 0, 0);

test("minimum event date is tomorrow in local time, not today", () => {
  const now = noonOn(2026, 8, 10);
  assert.equal(getTodayLocalDateString(now), "2026-09-10");
  assert.equal(getMinEventDateString(now), "2026-09-11");
  assert.equal(isEventDateBeforeMinimum("2026-09-09", now), true);
  assert.equal(isEventDateBeforeMinimum("2026-09-10", now), true);
  assert.equal(isEventDateBeforeMinimum("2026-09-11", now), false);
  assert.equal(isEventDateBeforeMinimum("2026-12-01", now), false);
});

test("minimum event date rolls across month boundaries", () => {
  assert.equal(getMinEventDateString(noonOn(2026, 8, 30)), "2026-10-01");
});

test("invalid ISO dates are not treated as too soon", () => {
  const now = noonOn(2026, 8, 10);
  assert.equal(isEventDateBeforeMinimum("", now), false);
  assert.equal(isEventDateBeforeMinimum("10-09-2026", now), false);
});

test("EVENT_DATE_MIN_MESSAGE tells vendors to pick tomorrow or later", () => {
  assert.match(EVENT_DATE_MIN_MESSAGE, /tomorrow/i);
});
