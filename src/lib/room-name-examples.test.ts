import assert from "node:assert/strict";
import { test } from "node:test";
import {
  padMinRoomNames,
  roomNameExample,
  roomNamePlaceholder,
  unnamedRoomLabel,
} from "./room-name-examples";

test("cycles professional venue examples instead of Room 1 / Room 2", () => {
  assert.equal(roomNameExample(0), "Dining Hall");
  assert.equal(roomNameExample(1), "Snowball");
  assert.equal(roomNameExample(2), "Grand Ballroom");
  assert.equal(roomNamePlaceholder(0), "e.g. Dining Hall");
  assert.equal(roomNamePlaceholder(1), "e.g. Snowball");
  assert.equal(unnamedRoomLabel(), "Untitled space");
});

test("pads missing room names with venue examples, skipping names already used", () => {
  assert.deepEqual(padMinRoomNames([], 2, 3), ["Dining Hall", "Snowball"]);
  assert.deepEqual(padMinRoomNames(["Snowball"], 2, 3), [
    "Snowball",
    "Dining Hall",
  ]);
  assert.deepEqual(padMinRoomNames(["Dining Hall", "Snowball"], 2, 3), [
    "Dining Hall",
    "Snowball",
  ]);
});
