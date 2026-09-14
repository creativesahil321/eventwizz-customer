import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCoarseUkFallbackPin,
  isCountryOnlyAddress,
  isUnusableMapPin,
  shouldApplyMapCoords,
  shouldGeocodeMapAddress,
  shouldRefreshMapForAddress,
} from "./sync-event-location-map";

test("applies new coords and skips the same pin", () => {
  assert.deepEqual(shouldApplyMapCoords(51.51, -0.14, null), {
    lat: 51.51,
    lng: -0.14,
  });
  assert.equal(
    shouldApplyMapCoords(51.51, -0.14, { lat: 51.51, lng: -0.14 }),
    null,
  );
  assert.equal(shouldApplyMapCoords(undefined, undefined, null), null);
});

test("never applies a UK country centroid as a venue pin", () => {
  assert.equal(shouldApplyMapCoords(55.378, -3.436, null), null);
  assert.equal(
    shouldApplyMapCoords(55.378, -3.436, { lat: 51.51, lng: -0.14 }),
    null,
  );
  assert.equal(shouldApplyMapCoords(54.7024, -3.2766, null), null);
});

test("geocodes every time the address text changes", () => {
  assert.equal(
    shouldGeocodeMapAddress("15 John Prince's St, London", ""),
    true,
  );
  assert.equal(
    shouldGeocodeMapAddress(
      "165 Regent St, London",
      "15 John Prince's St, London",
    ),
    true,
  );
  assert.equal(
    shouldGeocodeMapAddress(
      "15 John Prince's St, London",
      "15 John Prince's St, London",
    ),
    false,
  );
  assert.equal(shouldGeocodeMapAddress("", "old"), false);
});

test("UK country centroids and country geocodes are not usable pins", () => {
  assert.equal(isCoarseUkFallbackPin(55.3780051, -3.435973), true);
  assert.equal(isCoarseUkFallbackPin(51.512, -0.142), false);
  assert.equal(isUnusableMapPin(51.512, -0.142, ["country"]), true);
  assert.equal(isUnusableMapPin(51.512, -0.142, ["street_address"]), false);
  assert.equal(
    isUnusableMapPin(51.512, -0.142, ["locality"], "United Kingdom"),
    true,
  );
  assert.equal(isCountryOnlyAddress("Saffron Walden, UK"), false);
});

test("still geocodes when the address text matches but the pin is the UK blob", () => {
  assert.equal(
    shouldRefreshMapForAddress({
      address: "Saffron Walden, UK",
      lastAppliedAddress: "Saffron Walden, UK",
      pinLat: 55.378051,
      pinLng: -3.435973,
    }),
    true,
  );
  assert.equal(
    shouldRefreshMapForAddress({
      address: "Salisbury, UK",
      lastAppliedAddress: "United Kingdom",
      pinLat: 55.378051,
      pinLng: -3.435973,
    }),
    true,
  );
  assert.equal(
    shouldRefreshMapForAddress({
      address: "Saffron Walden, UK",
      lastAppliedAddress: "Saffron Walden, UK",
      pinLat: 52.022,
      pinLng: 0.24,
    }),
    false,
  );
});
