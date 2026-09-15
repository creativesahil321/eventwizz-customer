import assert from "node:assert/strict";
import { test } from "node:test";
import { MESSY_XMAS_VENDOR_PROMPT } from "@/app/(on-boarding)/on-boarding/_lib/vendor-messy-prompt.fixture";
import {
  buildAiEventSystemPrompt,
  parseAiEventVendorIntent,
  resolveRoomMenuFields,
} from "./ai-event-vendor-intent";

const shared = {
  catering_option: 1,
  menu_title: "Festive menu",
  menu_description: "Three courses",
  menus: [
    {
      name: "Starters",
      items: [{ title: "Soup", description: "Seasonal soup" }],
    },
  ],
};

test("room stubs with catering_option 0 and empty menus inherit the shared menu", () => {
  const resolved = resolveRoomMenuFields(
    "The Office",
    shared,
    [
      {
        room_name: "The Office",
        catering_option: 0,
        menu_title: "",
        menu_description: "",
        menus: [],
      },
    ],
  );

  assert.equal(resolved.catering_option, 1);
  assert.equal(resolved.menu_title, "Festive menu");
  assert.equal(resolved.menus?.length, 1);
  assert.equal(resolved.menus?.[0]?.name, "Starters");
});

test("vendor dashboard AI treats the messy xmas rant as shared dates plus drinks on two rooms", () => {
  const intent = parseAiEventVendorIntent(MESSY_XMAS_VENDOR_PROMPT, [
    "Ballroom",
    "Open Terrace",
    "Hall",
  ]);
  assert.equal(intent.wantsSameDatesAllRooms, true);
  assert.equal(intent.wantsPerRoomDrinks, true);
  assert.equal(intent.prefersDepositPayment, true);
  assert.equal(intent.wantsPerRoomDates, false);
  assert.match(intent.sanitizedDescription, /pound 50/i);
});

test("vendor event system prompt trains the model on messy vendor English", () => {
  const prompt = buildAiEventSystemPrompt(10);
  assert.match(prompt, /MESSY VENDOR ENGLISH/);
  assert.match(prompt, /PRICE LABEL/);
});

test("a room with its own menus keeps them", () => {
  const resolved = resolveRoomMenuFields(
    "The snowball",
    shared,
    [
      {
        room_name: "The snowball",
        catering_option: 1,
        menu_title: "Snowball menu",
        menu_description: "Room specials",
        menus: [
          {
            name: "Mains",
            items: [{ title: "Pie", description: "Steak pie" }],
          },
        ],
      },
    ],
  );

  assert.equal(resolved.menu_title, "Snowball menu");
  assert.equal(resolved.menus?.[0]?.name, "Mains");
});
