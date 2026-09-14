import assert from "node:assert/strict";
import { test } from "node:test";
import { mapOnboardingEventToDetailData } from "./map-onboarding-event-to-detail";
import type { OnboardingPreviewEventData } from "./onboarding-preview-types";

const LOCATION_ADDRESS = "Vendor HQ, London SW1A 1AA, UK";
const EVENT_ADDRESS = "Seaton Delaval, Whitley Bay NE25 0QT, UK";
const MAP_ADDRESS = "The Dining Hall, Seaton Delaval, Whitley Bay NE25 0QT, UK";

function siteWithEvent(
  event: NonNullable<OnboardingPreviewEventData["event"]>,
): OnboardingPreviewEventData {
  return {
    contactDetails: { address: LOCATION_ADDRESS },
    locations: [
      {
        city: "London",
        slug: "london",
        address: LOCATION_ADDRESS,
        latitude: 51.5074,
        longitude: -0.1278,
      },
    ],
    event,
  } as OnboardingPreviewEventData;
}

function roomBrochure(
  mapped: NonNullable<ReturnType<typeof mapOnboardingEventToDetailData>>,
  roomName: string,
): Record<string, unknown> | undefined {
  return (
    mapped.stepFive as { rooms?: Record<string, Record<string, unknown>> }
  ).rooms?.[roomName];
}

test("uses event-level event_address and lat/long, never rooms or locations[]", () => {
  const mapped = mapOnboardingEventToDetailData(
    siteWithEvent({
      event_id: 687,
      is_rooms: true,
      event_name: "Celeste Cote Christmas Gala",
      address: EVENT_ADDRESS,
      event_address: MAP_ADDRESS,
      lat: "55.080055",
      long: "-1.530894",
      rooms: {
        "The Dinning Hall": {
          room_id: 737,
          dates: [{ event_date: "2026-09-12", price: 30, sold_out: false }],
          packages: [
            {
              id: 1707,
              title: "Mulled Wine",
              description: "Spiced red wine",
              price: "5.00",
              available_quantity: 200,
            },
          ],
        } as never,
        "Hall of frame": {
          room_id: 738,
          dates: [{ event_date: "2026-09-13", price: 30, sold_out: false }],
        } as never,
      },
    }),
  );

  assert.ok(mapped);
  assert.equal(mapped.stepOne?.event_address, MAP_ADDRESS);
  assert.equal(mapped.stepFive?.event_address, MAP_ADDRESS);
  assert.equal(mapped.stepOne?.lat, 55.080055);
  assert.equal(mapped.stepOne?.long, -1.530894);
  assert.notEqual(mapped.stepOne?.lat, 51.5074);
  assert.equal(roomBrochure(mapped, "The Dinning Hall")?.event_address, undefined);
  assert.equal(mapped.stepEight?.address, MAP_ADDRESS);
  assert.equal(
    (
      mapped.stepSix as
        | { rooms?: Record<string, { packages?: unknown[] }> }
        | undefined
    )?.rooms?.["The Dinning Hall"]?.packages?.length,
    1,
  );
});

test("falls back to event.address when event_address is blank", () => {
  const mapped = mapOnboardingEventToDetailData(
    siteWithEvent({
      event_id: 1,
      is_rooms: true,
      address: EVENT_ADDRESS,
      event_address: "",
      rooms: {
        Hall: {
          room_id: 1,
          dates: [{ event_date: "2026-09-12", price: 10, sold_out: false }],
        } as never,
      },
    }),
  );

  assert.ok(mapped);
  assert.equal(mapped.stepOne?.event_address, EVENT_ADDRESS);
  assert.equal(mapped.stepOne?.lat, null);
  assert.equal(mapped.stepOne?.long, null);
});

test("does not use the parent location address when the event has no pin", () => {
  const mapped = mapOnboardingEventToDetailData(
    siteWithEvent({
      event_id: 1,
      event_name: "Untitled",
    }),
  );

  assert.ok(mapped);
  assert.equal(mapped.stepOne?.event_address, undefined);
  assert.equal(mapped.stepFive?.event_address, undefined);
});

test("ignores leftover room event_address / lat / long if the API still sends them", () => {
  const mapped = mapOnboardingEventToDetailData(
    siteWithEvent({
      event_id: 2,
      is_rooms: true,
      event_address: MAP_ADDRESS,
      lat: "55.08",
      long: "-1.53",
      rooms: {
        Hall: {
          room_id: 1,
          event_address: "Should not be used",
          lat: "1",
          long: "2",
          dates: [{ event_date: "2026-09-12", price: 10, sold_out: false }],
        } as never,
      },
    }),
  );

  assert.ok(mapped);
  assert.equal(mapped.stepOne?.event_address, MAP_ADDRESS);
  assert.equal(mapped.stepOne?.lat, 55.08);
  assert.equal(mapped.stepOne?.long, -1.53);
  assert.equal(roomBrochure(mapped, "Hall")?.event_address, undefined);
});
