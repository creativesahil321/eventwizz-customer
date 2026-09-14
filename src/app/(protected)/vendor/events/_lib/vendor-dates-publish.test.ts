import assert from "node:assert/strict";
import { test } from "node:test";
import { getVendorDatesPublishIssue } from "./vendor-dates-publish";

test("blocks publish when there is no event date", () => {
  const issue = getVendorDatesPublishIssue({
    stepTwo: { is_rooms: 0 },
    stepThree: { dates: [{ event_date: "", booking_type: "tickets" }] },
  });
  assert.ok(issue);
  assert.match(issue.message, /event date/i);
});

test("blocks publish when the date row is still New Date (empty)", () => {
  const issue = getVendorDatesPublishIssue({
    stepTwo: { is_rooms: 0 },
    stepThree: {
      dates: [
        {
          event_date: "   ",
          booking_type: "tickets",
          tickets: [{ title: "Early Bird", price: "10" }],
        },
      ],
    },
  });
  assert.ok(issue);
});

test("allows publish when a real YYYY-MM-DD date is set", () => {
  assert.equal(
    getVendorDatesPublishIssue({
      stepTwo: { is_rooms: 0 },
      stepThree: {
        dates: [{ event_date: "2026-09-11", booking_type: "tickets" }],
      },
    }),
    null,
  );
});

test("blocks publish when any room is missing a date", () => {
  const issue = getVendorDatesPublishIssue({
    stepTwo: {
      is_rooms: 1,
      rooms: [
        { room_id: 1, name: "Room 1" },
        { room_id: 2, name: "Room 2" },
      ],
    },
    stepThree: {
      dates: [{ event_date: "", booking_type: "tickets" }],
      rooms: [
        {
          room_id: 1,
          dates: [{ event_date: "2026-09-11", booking_type: "tickets" }],
        },
        { room_id: 2, dates: [{ event_date: "", booking_type: "tickets" }] },
      ],
    },
  });
  assert.ok(issue);
  assert.equal(issue?.roomIndex, 1);
  assert.match(issue.message, /Room 2/);
});

test("allows publish when every room has a real event date", () => {
  assert.equal(
    getVendorDatesPublishIssue({
      stepTwo: {
        is_rooms: 1,
        rooms: [
          { room_id: 10, name: "Room 1" },
          { room_id: 20, name: "Room 2" },
        ],
      },
      stepThree: {
        rooms: [
          {
            room_id: 10,
            dates: [{ event_date: "2026-10-01", booking_type: "tickets" }],
          },
          {
            room_id: 20,
            dates: [{ event_date: "2026-10-02", booking_type: "tickets" }],
          },
        ],
      },
    }),
    null,
  );
});
