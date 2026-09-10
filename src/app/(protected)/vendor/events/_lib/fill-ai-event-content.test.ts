import assert from "node:assert/strict";
import { test } from "node:test";
import { fillAiEventGeneratedDefaults } from "./fill-ai-event-content";
import type { AIEventInput } from "@/app/api/ai/generate-event/route";

const roomsInput: AIEventInput = {
  eventName: "Christmas Lunch",
  eventType: "corporate",
  has_room_system: true,
  room_names: ["The Office", "The snowball", "The Oaksmith"],
  venueAddress: "Bristol",
};

const starterMenu = [
  {
    name: "Starters",
    items: [{ title: "Soup", description: "Seasonal soup" }],
  },
];

test("shared menus are copied onto every room when AI left room menus empty", () => {
  const filled = fillAiEventGeneratedDefaults(
    {
      stepFour: {
        catering_option: 1,
        menu_title: "Festive menu",
        menu_description: "Three courses",
        menus: starterMenu,
        rooms: [
          {
            room_name: "The Office",
            catering_option: 0,
            menus: [],
          },
        ],
      },
    },
    roomsInput,
  );

  assert.equal(filled.stepFour.catering_option, 1);
  assert.equal(filled.stepFour.rooms?.length, 3);
  for (const room of filled.stepFour.rooms ?? []) {
    assert.equal(room.catering_option, 1, `${room.room_name} should keep catering on`);
    assert.equal(room.menus?.[0]?.name, "Starters", `${room.room_name} should get the shared menu`);
  }
});

test("menus that only exist on one room are cloned to the other rooms", () => {
  const filled = fillAiEventGeneratedDefaults(
    {
      stepFour: {
        catering_option: 1,
        menu_title: "",
        menu_description: "",
        menus: [],
        rooms: [
          {
            room_name: "The Office",
            catering_option: 1,
            menus: starterMenu,
          },
        ],
      },
    },
    roomsInput,
  );

  assert.ok((filled.stepFour.menus?.length ?? 0) > 0);
  assert.equal(filled.stepFour.rooms?.length, 3);
  for (const room of filled.stepFour.rooms ?? []) {
    assert.equal(room.catering_option, 1);
    assert.ok((room.menus?.length ?? 0) > 0, `${room.room_name} missing cloned menus`);
  }
});

test("empty AI catering still gets a fallback menu on every room", () => {
  const filled = fillAiEventGeneratedDefaults(
    {
      stepFour: {
        catering_option: 0,
        menu_title: "",
        menu_description: "",
        menus: [],
      },
    },
    roomsInput,
  );

  assert.equal(filled.stepFour.catering_option, 1);
  assert.ok((filled.stepFour.menus?.length ?? 0) > 0);
  assert.equal(filled.stepFour.rooms?.length, 3);
  for (const room of filled.stepFour.rooms ?? []) {
    assert.equal(room.catering_option, 1);
    assert.ok((room.menus?.length ?? 0) > 0);
  }
});

test("vendor omit catering keeps every room without menus", () => {
  const filled = fillAiEventGeneratedDefaults(
    {
      stepFour: {
        catering_option: 1,
        menu_title: "Festive menu",
        menu_description: "Three courses",
        menus: starterMenu,
      },
    },
    {
      ...roomsInput,
      eventDescription: "No catering, skip the menus",
    },
  );

  assert.equal(filled.stepFour.catering_option, 0);
  assert.equal(filled.stepFour.menus.length, 0);
  for (const room of filled.stepFour.rooms ?? []) {
    assert.equal(room.catering_option, 0);
    assert.equal(room.menus?.length ?? 0, 0);
  }
});
