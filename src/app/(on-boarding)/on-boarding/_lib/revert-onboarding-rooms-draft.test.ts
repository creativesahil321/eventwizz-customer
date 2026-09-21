import assert from "node:assert/strict";
import { test } from "node:test";
import { nextMultiSpaceAfterRoomsDraftRevert } from "./revert-onboarding-rooms-draft";

const draftOff = {
  enabled: false,
  currentRoomIndex: 0,
  rooms: [{ name: "Hall" }],
};

test("skip without Step 4 save restores saved rooms Yes", () => {
  const next = nextMultiSpaceAfterRoomsDraftRevert(draftOff, true);
  assert.equal(next?.enabled, true);
  assert.equal(next?.rooms.length, 1);
});

test("leave without save keeps saved No if draft was Yes", () => {
  const next = nextMultiSpaceAfterRoomsDraftRevert(
    { enabled: true, currentRoomIndex: 0, rooms: [] },
    false,
  );
  assert.equal(next?.enabled, false);
});

test("no-op when draft already matches saved is_rooms", () => {
  const current = { enabled: true, currentRoomIndex: 1, rooms: [] };
  assert.equal(nextMultiSpaceAfterRoomsDraftRevert(current, true), current);
});
