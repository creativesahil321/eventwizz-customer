import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AI_COLLECT_DRAFT_STORAGE_KEY,
  applyRoomSystemChoice,
  clearAiCollectDraft,
  readAiCollectDraft,
  resolveCollectDraftRestore,
  writeAiCollectDraft,
  type AiCollectDraftV1,
  type DraftStorage,
} from "./ai-collect-draft-cache";

function memoryStorage(seed?: Record<string, string>): DraftStorage {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function sampleDraft(
  overrides: Partial<AiCollectDraftV1> = {},
): AiCollectDraftV1 {
  return {
    v: 1,
    userKey: "sahil@so-creative.co.uk",
    updatedAt: Date.now(),
    locationGateDone: true,
    isPlaceSelected: true,
    has_multiple_locations: false,
    has_room_system: true,
    room_names: [{ name: "The Dinning Hall" }, { name: "Hall of frame" }],
    room_names_stash: [{ name: "The Dinning Hall" }, { name: "Hall of frame" }],
    venueName: "Stock Brook Manor Golf & Country Club",
    selectedPlaceId: "place-1",
    venueType: "12",
    city: "Billericay",
    address: "Queens Park Ave, Billericay CM12 0SP, UK",
    contactNumber: "+44 1277 653816",
    email: "sahil@so-creative.co.uk",
    description: "xmas 25th + 27th, tables only, 50pp",
    latitude: 51.63,
    longitude: 0.43,
    ...overrides,
  };
}

test("write then read round-trips the collect draft for that vendor", () => {
  const storage = memoryStorage();
  const draft = sampleDraft();
  writeAiCollectDraft(draft, storage);
  const read = readAiCollectDraft(draft.userKey, storage);
  assert.equal(read?.venueName, draft.venueName);
  assert.equal(read?.has_room_system, true);
  assert.equal(read?.room_names[1]?.name, "Hall of frame");
  assert.equal(read?.selectedPlaceId, "place-1");
  assert.equal(read?.locationGateDone, true);
});

test("draft for a different vendor is ignored", () => {
  const storage = memoryStorage();
  writeAiCollectDraft(sampleDraft(), storage);
  assert.equal(readAiCollectDraft("other@venue.com", storage), null);
});

test("corrupt storage does not throw and returns null", () => {
  const storage = memoryStorage({ [AI_COLLECT_DRAFT_STORAGE_KEY]: "{not-json" });
  assert.equal(readAiCollectDraft("sahil@so-creative.co.uk", storage), null);
});

test("clearing the draft removes it so a later generate cannot reuse it", () => {
  const storage = memoryStorage();
  writeAiCollectDraft(sampleDraft(), storage);
  clearAiCollectDraft(storage);
  assert.equal(readAiCollectDraft("sahil@so-creative.co.uk", storage), null);
});

test("Yes → No stashes room names; Yes again restores them", () => {
  const named = [{ name: "Ballroom" }, { name: "Open Terrace" }];
  const disabled = applyRoomSystemChoice({
    enabled: false,
    roomNames: named,
    stash: [],
  });
  assert.deepEqual(disabled.roomNames, []);
  assert.equal(disabled.stash[0]?.name, "Ballroom");
  assert.equal(disabled.stash[1]?.name, "Open Terrace");

  const enabled = applyRoomSystemChoice({
    enabled: true,
    roomNames: [],
    stash: disabled.stash,
  });
  assert.equal(enabled.roomNames[0]?.name, "Ballroom");
  assert.equal(enabled.roomNames[1]?.name, "Open Terrace");
});

test("Yes with fewer than two rooms pads blanks instead of inventing names", () => {
  const next = applyRoomSystemChoice({
    enabled: true,
    roomNames: [{ name: "Hall" }],
    stash: [],
  });
  assert.equal(next.roomNames.length, 2);
  assert.equal(next.roomNames[0]?.name, "Hall");
  assert.equal(next.roomNames[1]?.name, "");
});

test("rapid No then Yes keeps the latest typed names, not an old stash", () => {
  const afterEdit = applyRoomSystemChoice({
    enabled: false,
    roomNames: [{ name: "Ballroom" }, { name: "Hall" }],
    stash: [{ name: "Old A" }, { name: "Old B" }],
  });
  assert.equal(afterEdit.stash[0]?.name, "Ballroom");
  assert.equal(afterEdit.stash[1]?.name, "Hall");
});

test("restore prefers in-memory initialData over an older cached description", () => {
  const restored = resolveCollectDraftRestore({
    userKey: "sahil@so-creative.co.uk",
    draft: sampleDraft({ description: "cached old notes" }),
    initialData: {
      venueName: "Stock Brook Manor Golf & Country Club",
      venueType: "Christmas Events",
      city: "Billericay",
      address: "Queens Park Ave",
      contactNumber: "+44",
      email: "sahil@so-creative.co.uk",
      description: "latest generate payload",
    },
    persistedHasMultipleLocations: null,
    persistedHasRoomSystem: null,
    persistedRoomNames: [],
  });
  assert.equal(restored?.description, "latest generate payload");
});

test("saved persistence locks win over cache so generate cannot revive a stale room choice", () => {
  const restored = resolveCollectDraftRestore({
    userKey: "sahil@so-creative.co.uk",
    draft: sampleDraft({
      has_room_system: true,
      room_names: [{ name: "Cached A" }, { name: "Cached B" }],
    }),
    initialData: null,
    persistedHasMultipleLocations: false,
    persistedHasRoomSystem: false,
    persistedRoomNames: [],
  });
  assert.equal(restored?.has_room_system, false);
  assert.deepEqual(restored?.room_names, []);
  assert.equal(restored?.locationGateDone, true);
});

test("persisted rooms replace cached names when the API already has a room system", () => {
  const restored = resolveCollectDraftRestore({
    userKey: "sahil@so-creative.co.uk",
    draft: sampleDraft(),
    initialData: null,
    persistedHasMultipleLocations: null,
    persistedHasRoomSystem: true,
    persistedRoomNames: ["Ballroom", "Open Terrace", "Hall"],
  });
  assert.equal(restored?.has_room_system, true);
  assert.deepEqual(
    restored?.room_names.map((r) => r.name),
    ["Ballroom", "Open Terrace", "Hall"],
  );
});

test("with no persistence yet, refresh restores the cached Yes rooms and pin", () => {
  const restored = resolveCollectDraftRestore({
    userKey: "sahil@so-creative.co.uk",
    draft: sampleDraft(),
    initialData: null,
    persistedHasMultipleLocations: null,
    persistedHasRoomSystem: null,
    persistedRoomNames: [],
  });
  assert.equal(restored?.has_room_system, true);
  assert.equal(restored?.room_names[0]?.name, "The Dinning Hall");
  assert.equal(restored?.isPlaceSelected, true);
  assert.equal(restored?.selectedPlaceId, "place-1");
  assert.equal(restored?.latitude, 51.63);
});
