import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isVendorRoomDrinksStepComplete,
  mapVendorDrinksFieldsForApi,
  resolveAiDrinksEnabled,
  resolveDrinksOptionFlag,
  roomEntryToStepSixFields,
} from "./vendor-step-six-rooms";

test("resolveDrinksOptionFlag uses an explicit drinks_option flag", () => {
  assert.equal(
    resolveDrinksOptionFlag({
      drinks_option: 0,
      drink_title: "VIP extras",
      packages: [{ title: "Wine", description: "House wine", price: 10, available_quantity: 20 }],
    }),
    0,
  );
  assert.equal(
    resolveDrinksOptionFlag({
      drinks_option: "1",
      drink_title: "",
      packages: [],
    }),
    1,
  );
});

test("resolveDrinksOptionFlag infers Yes from drink content when the flag is missing", () => {
  assert.equal(
    resolveDrinksOptionFlag({
      drink_title: "Drinks packages",
    }),
    1,
  );
  assert.equal(
    resolveDrinksOptionFlag({
      packages: [
        {
          title: "Welcome drink",
          description: "A drink on arrival",
          price: 8,
          available_quantity: 100,
        },
      ],
    }),
    1,
  );
  assert.equal(resolveDrinksOptionFlag({ drink_title: "", packages: [] }), 0);
  assert.equal(
    resolveDrinksOptionFlag({
      packages: [{ title: "", description: "", price: 0, available_quantity: 0 }],
    }),
    0,
  );
});

test("isVendorRoomDrinksStepComplete is true when drinks are skipped", () => {
  assert.equal(
    isVendorRoomDrinksStepComplete({
      drinks_option: 0,
      drink_title: "",
      drink_description: "",
      packages: [],
    }),
    true,
  );
});

test("isVendorRoomDrinksStepComplete requires title, description, and a valid package when Yes", () => {
  assert.equal(
    isVendorRoomDrinksStepComplete({
      drinks_option: 1,
      drink_title: "",
      drink_description: "Notes",
      packages: [
        {
          title: "Wine",
          description: "House wine",
          price: 10,
          available_quantity: 20,
        },
      ],
    }),
    false,
  );
  assert.equal(
    isVendorRoomDrinksStepComplete({
      drinks_option: 1,
      drink_title: "Extras",
      drink_description: "Notes",
      packages: [
        {
          title: "Wine",
          description: "House wine",
          price: 10,
          available_quantity: 20,
        },
      ],
    }),
    true,
  );
});

test("mapVendorDrinksFieldsForApi omits drink content when option is No", () => {
  assert.deepEqual(
    mapVendorDrinksFieldsForApi({
      drinks_option: 0,
      drink_title: "Kept locally",
      drink_description: "Kept locally",
      packages: [
        {
          title: "Wine",
          description: "House wine",
          price: 10,
          available_quantity: 20,
        },
      ],
    }),
    {
      drinks_option: 0,
      drink_title: "",
      drink_description: "",
      packages: [],
    },
  );
});

test("roomEntryToStepSixFields does not seed a dummy package when drinks are skipped", () => {
  const fields = roomEntryToStepSixFields({
    room_id: 2,
    drinks_option: 0,
    drink_title: "",
    drink_description: "",
    packages: [],
  });
  assert.equal(fields.drinks_option, 0);
  assert.deepEqual(fields.packages, []);
});

test("resolveAiDrinksEnabled requires real packages even if the flag is Yes", () => {
  assert.equal(
    resolveAiDrinksEnabled({
      drinks_option: 1,
      drink_title: "Drinks",
      packages: [],
    }),
    0,
  );
  assert.equal(
    resolveAiDrinksEnabled({
      drinks_option: 1,
      packages: [
        {
          title: "Wine",
          description: "House wine",
          price: 10,
          available_quantity: 20,
        },
      ],
    }),
    1,
  );
  assert.equal(
    resolveAiDrinksEnabled(
      {
        drinks_option: 1,
        packages: [
          {
            title: "Wine",
            description: "House wine",
            price: 10,
            available_quantity: 20,
          },
        ],
      },
      { forceOff: true },
    ),
    0,
  );
  assert.equal(
    resolveAiDrinksEnabled({
      drinks_option: 1,
      drink_title: "Conference Drinks",
      packages: [
        {
          title: "Tea & Coffee",
          description: "Complimentary tea and coffee",
          price: 0,
          available_quantity: 100,
        },
      ],
    }),
    0,
  );
});
