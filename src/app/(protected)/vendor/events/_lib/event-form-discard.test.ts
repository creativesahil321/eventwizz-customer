import assert from "node:assert/strict";
import { test } from "node:test";
import {
  eventFormHasUnsavedEdits,
  shouldAdoptPristineEditorAsSaved,
  vendorPreviewDraftHasUnsavedEdits,
} from "./event-form-discard";
import type { EventSchemaType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";

function stubEvent(overrides: object = {}): EventSchemaType {
  return {
    currentStep: 1,
    stepOne: {
      event_id: 77,
      event_name: "Christmas Lunch",
      vendor_location_id: 1,
    },
    stepTwo: { rooms: [{ room_id: 3, name: "Hall" }] },
    stepThree: {},
    stepFour: {
      menus: [{ name: "Starters", items: [{ title: "Soup" }] }],
    },
    stepFive: {},
    stepSix: {},
    stepSeven: {},
    stepEight: {},
    ...overrides,
  } as EventSchemaType;
}

test("GET sort_order on menus is not an unsaved edit", () => {
  const saved = stubEvent({
    stepFour: {
      menus: [
        {
          name: "Starters",
          sort_order: 0,
          items: [{ title: "Soup" }],
        },
      ],
    },
  });
  const live = stubEvent({
    stepFour: {
      menus: [{ name: "Starters", items: [{ title: "Soup" }] }],
    },
  });
  assert.equal(eventFormHasUnsavedEdits(live, saved), false);
});

test("changing a menu category name is an unsaved edit", () => {
  const saved = stubEvent();
  const live = stubEvent({
    stepFour: {
      menus: [{ name: "Dessert", items: [{ title: "Soup" }] }],
    },
  });
  assert.equal(eventFormHasUnsavedEdits(live, saved), true);
});

test("catalog room label fill is not an unsaved edit", () => {
  const saved = stubEvent({
    stepTwo: { rooms: [{ room_id: 3, name: "Room 3" }] },
  });
  const live = stubEvent({
    stepTwo: { rooms: [{ room_id: 3, name: "Great Hall" }] },
  });
  assert.equal(eventFormHasUnsavedEdits(live, saved), false);
});

test("changing the selected room is an unsaved edit", () => {
  const saved = stubEvent({
    stepTwo: { rooms: [{ room_id: 3, name: "Hall" }] },
  });
  const live = stubEvent({
    stepTwo: { rooms: [{ room_id: 9, name: "Hall" }] },
  });
  assert.equal(eventFormHasUnsavedEdits(live, saved), true);
});

test("API numeric strings vs form numbers are not an unsaved edit", () => {
  const saved = stubEvent({
    stepOne: {
      event_id: 77,
      event_name: "Christmas Lunch",
      vendor_location_id: 1,
      latitude: "51.5",
      longitude: "-2.6",
    },
  });
  const live = stubEvent({
    stepOne: {
      event_id: 77,
      event_name: "Christmas Lunch",
      vendor_location_id: 1,
      latitude: 51.5,
      longitude: -2.6,
    },
  });
  assert.equal(eventFormHasUnsavedEdits(live, saved), false);
});

test("boolean feature flags vs 0/1 are not an unsaved edit", () => {
  const saved = stubEvent({
    stepFour: {
      catering_option: true,
      menus: [{ name: "Starters", items: [{ title: "Soup" }] }],
    },
  });
  const live = stubEvent({
    stepFour: {
      catering_option: 1,
      menus: [{ name: "Starters", items: [{ title: "Soup" }] }],
    },
  });
  assert.equal(eventFormHasUnsavedEdits(live, saved), false);
});

test("shouldAdoptPristineEditorAsSaved only while catch-up is allowed", () => {
  assert.equal(
    shouldAdoptPristineEditorAsSaved({
      catchupEnabled: true,
      isDirty: false,
      hasUnsavedEdits: true,
    }),
    true,
  );
  assert.equal(
    shouldAdoptPristineEditorAsSaved({
      catchupEnabled: true,
      isDirty: true,
      hasUnsavedEdits: true,
    }),
    false,
  );
  assert.equal(
    shouldAdoptPristineEditorAsSaved({
      catchupEnabled: false,
      isDirty: false,
      hasUnsavedEdits: true,
    }),
    false,
  );
});

test("opening preview with no draft is not unsaved", () => {
  assert.equal(vendorPreviewDraftHasUnsavedEdits(stubEvent(), null), false);
  assert.equal(vendorPreviewDraftHasUnsavedEdits(stubEvent(), {}), false);
});

test("a preview draft that only changes wizard UI state is not unsaved", () => {
  assert.equal(
    vendorPreviewDraftHasUnsavedEdits(stubEvent(), { currentStep: 8 }),
    false,
  );
});

test("a preview draft that changes event name is unsaved", () => {
  assert.equal(
    vendorPreviewDraftHasUnsavedEdits(stubEvent(), {
      stepOne: { event_name: "Holi night" },
    }),
    true,
  );
});

test("opening preview with a full saved snapshot is not unsaved", () => {
  const saved = stubEvent();
  assert.equal(vendorPreviewDraftHasUnsavedEdits(saved, saved), false);
});
