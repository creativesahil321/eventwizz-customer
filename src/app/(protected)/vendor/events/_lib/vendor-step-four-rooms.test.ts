import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appendVendorStepFourRoomToFormData,
  cloneVendorStepFourRoomMenu,
  defaultVendorStepFourRoomMenu,
  normalizeVendorStepFourRooms,
  roomEntryToStepFourFields,
  stepFourFieldsToRoomEntry,
} from "./vendor-step-four-rooms";

test("normalizeVendorStepFourRooms hydrates per-room close days, defaulting empty to 14", () => {
  const rooms = normalizeVendorStepFourRooms({
    "Dining Hall": {
      room_id: 1,
      catering_option: 1,
      menu_title: "Dining",
      menu_description: "Hall menu",
      menu_choices_close_days_before: 14,
      menus: [],
    },
    "Snow ball": {
      room_id: 2,
      catering_option: 1,
      menu_title: "Snow",
      menu_description: "Ball menu",
      menu_choices_close_days_before: "7",
      menus: [],
    },
    Lounge: {
      room_id: 3,
      catering_option: 1,
      menu_title: "Lounge",
      menu_description: "Lounge menu",
      menus: [],
    },
  });

  assert.equal(rooms[0]?.menu_choices_close_days_before, 14);
  assert.equal(rooms[1]?.menu_choices_close_days_before, 7);
  assert.equal(rooms[2]?.menu_choices_close_days_before, 14);
});

test("room field mapping round-trips close days and blanks become 14", () => {
  const fromApi = roomEntryToStepFourFields({
    room_id: 9,
    catering_option: 1,
    menu_title: "Menu",
    menu_description: "Desc",
    menu_choices_close_days_before: 7,
    menus: [],
  });
  assert.equal(fromApi.menu_choices_close_days_before, 7);

  const saved = stepFourFieldsToRoomEntry(9, {
    catering_option: 1,
    menu_title: "Menu",
    menu_description: "Desc",
    event_menu_category_id: 1,
    menus: [],
    menu_background_image: null,
    menu_choices_close_days_before: null,
  });
  assert.equal(saved.menu_choices_close_days_before, 14);
});

test("new rooms default close days to 14 and clone copies the value", () => {
  assert.equal(
    defaultVendorStepFourRoomMenu().menu_choices_close_days_before,
    14,
  );
  const clone = cloneVendorStepFourRoomMenu({
    room_id: 1,
    ...defaultVendorStepFourRoomMenu(),
    menu_choices_close_days_before: 3,
  });
  assert.equal(clone.menu_choices_close_days_before, 3);
});

test("room FormData includes close days only when catering is Yes", () => {
  const withCatering = new FormData();
  appendVendorStepFourRoomToFormData(withCatering, 0, {
    room_id: 4,
    catering_option: 1,
    menu_title: "Menu",
    menu_description: "Desc",
    menu_choices_close_days_before: 7,
    menus: [],
  });
  assert.equal(
    withCatering.get("rooms[0][menu_choices_close_days_before]"),
    "7",
  );

  const withoutCatering = new FormData();
  appendVendorStepFourRoomToFormData(withoutCatering, 0, {
    room_id: 4,
    catering_option: 0,
    menu_title: "",
    menu_description: "",
    menu_choices_close_days_before: 7,
    menus: [],
  });
  assert.equal(
    withoutCatering.get("rooms[0][menu_choices_close_days_before]"),
    null,
  );
});
