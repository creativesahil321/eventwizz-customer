import assert from "node:assert/strict";
import { test } from "node:test";
import { EVENT_DATE_MIN_MESSAGE } from "@/lib/min-event-date";

test("firstReactHookFormMessage reads nested event_date errors", () => {
  assert.equal(
    firstReactHookFormMessage({
      event_date: { message: "Event date must be today or in the future." },
    }),
    "Event date must be today or in the future.",
  );
});

test("firstReactHookFormMessage walks ticket/table children", () => {
  assert.equal(
    firstReactHookFormMessage({
      tickets: {
        0: { ticket_name: { message: "Ticket name is required" } },
      },
    }),
    "Ticket name is required",
  );
});

test("getDateRowErrorNode supports sparse object arrays from RHF", () => {
  const datesErrors = {
    2: { event_date: { message: "Event date must be today or in the future." } },
  };
  assert.equal(
    firstReactHookFormMessage(getDateRowErrorNode(datesErrors, 2)),
    "Event date must be today or in the future.",
  );
  assert.equal(firstReactHookFormMessage(getDateRowErrorNode(datesErrors, 0)), null);
});

test("firstDateRowErrorIndex returns the first invalid date row", () => {
  assert.equal(
    firstDateRowErrorIndex({
      0: undefined,
      2: { event_date: { message: "Event date must be today or in the future." } },
    }),
    2,
  );
  assert.equal(
    firstDateRowErrorIndex({
      message: "Dates must be in chronological ascending order.",
    }),
    0,
  );
  assert.equal(firstDateRowErrorIndex(undefined), null);
});
