import assert from "node:assert/strict";
import { test } from "node:test";
import { duplicateEventDateIndexes } from "./event-dates-sort";

test("duplicateEventDateIndexes flags every row that shares a date", () => {
  assert.deepEqual(
    duplicateEventDateIndexes([
      { event_date: "2026-09-18" },
      { event_date: "2026-09-19" },
      { event_date: "2026-09-18" },
    ]),
    [0, 2],
  );
});

test("duplicateEventDateIndexes ignores empty dates and uses original indexes", () => {
  assert.deepEqual(
    duplicateEventDateIndexes([
      { event_date: "" },
      { event_date: "2026-09-18" },
      { event_date: "2026-09-18" },
    ]),
    [1, 2],
  );
});

test("duplicateEventDateIndexes can skip cancelled rows", () => {
  assert.deepEqual(
    duplicateEventDateIndexes(
      [
        { event_date: "2026-09-18" },
        { event_date: "2026-09-18" },
        { event_date: "2026-09-18" },
      ],
      { skipIndex: (index) => index === 1 },
    ),
    [0, 2],
  );
});
