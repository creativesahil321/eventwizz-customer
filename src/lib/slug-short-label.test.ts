import assert from "node:assert/strict";
import { test } from "node:test";
import { eventBreadcrumbCityLabel } from "./slug-short-label";

test("prefers stored city over the street", () => {
  assert.equal(
    eventBreadcrumbCityLabel({
      city: "Bristol",
      address: "G F Flat Old Tavern House, 31 High St, Fortrose IV10 8SU, UK",
    }),
    "Bristol",
  );
});

test("parses city from the street when city is missing", () => {
  assert.equal(
    eventBreadcrumbCityLabel({
      address: "London Rd, Six Mile Bottom, Newmarket CB8 0NN, UK",
    }),
    "Newmarket",
  );
});

test("treats a comma-filled city as a street", () => {
  assert.equal(
    eventBreadcrumbCityLabel({
      city: "London Rd, Six Mile Bottom, Newmarket CB8 0…",
    }),
    "Newmarket",
  );
});
