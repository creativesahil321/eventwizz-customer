import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolvePublicEventMapLocation,
  hasPublicEventMapCoordinates,
} from "./event-location";
import { LONDON_DEFAULT_LAT, LONDON_DEFAULT_LNG } from "./london-default-coords";

test("mapAddress prefers event_address over venue address", () => {
  const resolved = resolvePublicEventMapLocation({
    event_address: "The Dining Hall, Seaton Delaval NE25 0QT, UK",
    address: "Vendor HQ, London SW1A 1AA, UK",
    lat: "55.080055",
    long: "-1.530894",
  });
  assert.equal(
    resolved.address,
    "The Dining Hall, Seaton Delaval NE25 0QT, UK",
  );
  assert.equal(resolved.latitude, 55.080055);
  assert.equal(resolved.longitude, -1.530894);
});

test("mapAddress falls back to event.address when event_address is blank", () => {
  const resolved = resolvePublicEventMapLocation({
    event_address: "  ",
    address: "Seaton Delaval, Whitley Bay NE25 0QT, UK",
  });
  assert.equal(
    resolved.address,
    "Seaton Delaval, Whitley Bay NE25 0QT, UK",
  );
  assert.equal(resolved.latitude, null);
  assert.equal(resolved.longitude, null);
});

test("does not use room location leftovers or site location list coords", () => {
  const resolved = resolvePublicEventMapLocation({
    event_address: "Event pin street",
    address: "Venue street",
    lat: "55.08",
    long: "-1.53",
    rooms: {
      Hall: { event_address: "Room pin", lat: "1", long: "2" },
    },
    locations: [{ latitude: 51.5, longitude: -0.12 }],
  });
  assert.equal(resolved.address, "Event pin street");
  assert.equal(resolved.latitude, 55.08);
  assert.equal(resolved.longitude, -1.53);
});

test("empty or omitted lat/long skip the map pin", () => {
  assert.equal(
    hasPublicEventMapCoordinates({ event_address: "Somewhere", lat: "", long: "" }),
    false,
  );
  assert.equal(
    hasPublicEventMapCoordinates({ event_address: "Somewhere" }),
    false,
  );
  assert.equal(
    hasPublicEventMapCoordinates({
      lat: LONDON_DEFAULT_LAT,
      long: LONDON_DEFAULT_LNG,
    }),
    false,
  );
  assert.equal(
    hasPublicEventMapCoordinates({ lat: "55.08", long: "-1.53" }),
    true,
  );
});
