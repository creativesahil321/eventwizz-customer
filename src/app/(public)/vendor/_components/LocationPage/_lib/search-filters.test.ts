import assert from "node:assert/strict";
import { test } from "node:test";
import {
  locationSearchQueryPlaceholder,
  resolveVendorHasMultipleLocations,
} from "./search-filters";

test("single-location page search says Search events", () => {
  assert.equal(
    locationSearchQueryPlaceholder({
      hideCity: true,
      hasMultipleLocations: false,
    }),
    "Search events",
  );
});

test("multi-location page search says Search location events", () => {
  assert.equal(
    locationSearchQueryPlaceholder({
      hideCity: true,
      hasMultipleLocations: true,
    }),
    "Search location events",
  );
});

test("brand home search keeps city-scoped copy", () => {
  assert.equal(
    locationSearchQueryPlaceholder({
      hideCity: false,
      hasMultipleLocations: true,
    }),
    "Search event and category",
  );
});

test("explicit multi-location flag wins over a single listed venue", () => {
  assert.equal(resolveVendorHasMultipleLocations(1, true), true);
  assert.equal(resolveVendorHasMultipleLocations(3, false), false);
  assert.equal(resolveVendorHasMultipleLocations(2), true);
  assert.equal(resolveVendorHasMultipleLocations(1), false);
  assert.equal(resolveVendorHasMultipleLocations(undefined), false);
});
