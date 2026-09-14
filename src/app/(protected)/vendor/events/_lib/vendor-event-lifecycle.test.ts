import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getVendorPublishCopy,
  isVendorEventStructureLocked,
  resolveVendorEventLifecycle,
} from "./vendor-event-lifecycle";

test("resolveVendorEventLifecycle reads is_live and has_bookings from GET data", () => {
  const flags = resolveVendorEventLifecycle({
    status: true,
    data: {
      is_live: true,
      has_bookings: true,
      current_step: 8,
    },
  });
  assert.equal(flags.isLive, true);
  assert.equal(flags.hasBookings, true);
  assert.equal(flags.lockStructure, true);
});

test("structure is locked when the event is live even without bookings", () => {
  assert.equal(
    resolveVendorEventLifecycle({ is_live: true, has_bookings: false })
      .lockStructure,
    true,
  );
  assert.equal(
    isVendorEventStructureLocked({ is_live: 0, has_bookings: true }),
    true,
  );
  assert.equal(
    isVendorEventStructureLocked({ is_live: false, has_bookings: false }),
    false,
  );
});

test("getVendorPublishCopy uses live wording when the event is already published", () => {
  const live = getVendorPublishCopy(true);
  assert.equal(live.activeTitle, "Keep it live");
  assert.equal(live.actionActive, "Save live event");
  assert.equal(live.draftTitle, "Take offline");

  const draft = getVendorPublishCopy(false);
  assert.equal(draft.activeTitle, "Publish event");
  assert.equal(draft.actionDraft, "Save as draft");
});
