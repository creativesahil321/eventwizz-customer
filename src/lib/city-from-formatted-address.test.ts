import assert from "node:assert/strict";
import { test } from "node:test";
import { cityFromFormattedAddress } from "./city-from-formatted-address";

test("picks UK postal town and drops country", () => {
  assert.equal(
    cityFromFormattedAddress(
      "London Rd, Six Mile Bottom, Newmarket CB8 0NN, UK",
    ),
    "Newmarket",
  );
});

test("picks city from a truncated hero address", () => {
  assert.equal(
    cityFromFormattedAddress("London Rd, Six Mile Bottom, Newmarket CB8 0…"),
    "Newmarket",
  );
});

test("returns null for empty input", () => {
  assert.equal(cityFromFormattedAddress("  "), null);
  assert.equal(cityFromFormattedAddress(null), null);
});
