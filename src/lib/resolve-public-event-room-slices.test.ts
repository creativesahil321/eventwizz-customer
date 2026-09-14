import assert from "node:assert/strict";
import { test } from "node:test";
import type { EventDetail } from "../services/common/events/type";
import { resolvePublicEventActiveSlices } from "./resolve-public-event-room-slices";

function eventWithRooms(
  overrides: Partial<EventDetail> = {},
): EventDetail {
  return {
    is_rooms: true,
    address: "Venue street",
    event_address: "Event pin street",
    lat: "55.080055",
    long: "-1.530894",
    rooms: {
      Hall: {
        room_id: 1,
        dates: [{ event_date: "2026-09-12", price: 10 }],
        event_address: "Room leftover",
        lat: "1",
        long: "2",
      },
    },
    ...overrides,
  } as EventDetail;
}

test("room mode map uses event.event_address and event.lat/long only", () => {
  const slices = resolvePublicEventActiveSlices(eventWithRooms(), 0);
  assert.equal(slices.event_address, "Event pin street");
  assert.equal(slices.lat, 55.080055);
  assert.equal(slices.long, -1.530894);
});

test("flat event map falls back to event.address and skips missing coords", () => {
  const slices = resolvePublicEventActiveSlices(
    {
      is_rooms: false,
      address: "Seaton Delaval, Whitley Bay NE25 0QT, UK",
      event_address: "",
      dates: [{ event_date: "2026-09-12", price: 10 }],
    } as EventDetail,
    0,
  );
  assert.equal(
    slices.event_address,
    "Seaton Delaval, Whitley Bay NE25 0QT, UK",
  );
  assert.equal(slices.lat, null);
  assert.equal(slices.long, null);
});
