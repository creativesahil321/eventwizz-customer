import assert from "node:assert/strict";
import { test } from "node:test";
import { getVendorEventTabStatus } from "./vendor-event-tab-status";

test("active tab is current even when content is incomplete", () => {
  assert.equal(
    getVendorEventTabStatus({
      stepId: 3,
      stepValue: "dates",
      activeTab: "dates",
      unlockStep: 8,
      contentComplete: { dates: false },
    }),
    "current",
  );
});

test("dates tab does not show complete without a real event date", () => {
  assert.equal(
    getVendorEventTabStatus({
      stepId: 3,
      stepValue: "dates",
      activeTab: "publish",
      unlockStep: 8,
      contentComplete: { dates: false },
    }),
    "upcoming",
  );
});

test("dates tab shows complete when every required date is set", () => {
  assert.equal(
    getVendorEventTabStatus({
      stepId: 3,
      stepValue: "dates",
      activeTab: "publish",
      unlockStep: 8,
      contentComplete: { dates: true },
    }),
    "complete",
  );
});

test("tabs without a content check still follow unlock progress", () => {
  assert.equal(
    getVendorEventTabStatus({
      stepId: 2,
      stepValue: "package",
      activeTab: "publish",
      unlockStep: 8,
    }),
    "complete",
  );
  assert.equal(
    getVendorEventTabStatus({
      stepId: 7,
      stepValue: "faqs",
      activeTab: "package",
      unlockStep: 3,
    }),
    "upcoming",
  );
});
