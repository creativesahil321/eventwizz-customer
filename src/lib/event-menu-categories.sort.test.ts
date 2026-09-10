import assert from "node:assert/strict";
import { test } from "node:test";
import { sortMenusForOnboardingDisplay } from "./event-menu-categories";

test("sorts dessert-first add order into starters, mains, dessert", () => {
  const sorted = sortMenusForOnboardingDisplay([
    { name: "Dessert", items: [{ title: "Tart" }] },
    { name: "Starters", items: [{ title: "Soup" }] },
    { name: "Mains", items: [{ title: "Steak" }] },
  ]);
  assert.deepEqual(
    sorted.map((menu) => menu.name),
    ["Starters", "Mains", "Dessert"],
  );
});

test("skips missing courses and keeps a 4th category last", () => {
  const sorted = sortMenusForOnboardingDisplay([
    { name: "Kids menu" },
    { name: "Dessert" },
    { name: "Starters" },
  ]);
  assert.deepEqual(
    sorted.map((menu) => menu.name),
    ["Starters", "Dessert", "Kids menu"],
  );
});

test("keeps relative order of custom categories", () => {
  const sorted = sortMenusForOnboardingDisplay([
    { name: "Sides" },
    { name: "Dessert" },
    { name: "Kids" },
    { name: "Main course" },
  ]);
  assert.deepEqual(
    sorted.map((menu) => menu.name),
    ["Main course", "Dessert", "Sides", "Kids"],
  );
});

test("matches course names case-insensitively and with plurals", () => {
  const sorted = sortMenusForOnboardingDisplay([
    { name: "desserts" },
    { name: "MAIN COURSE" },
    { name: "starter" },
  ]);
  assert.deepEqual(
    sorted.map((menu) => menu.name),
    ["starter", "MAIN COURSE", "desserts"],
  );
});

test("does not mutate the original array", () => {
  const original = [{ name: "Dessert" }, { name: "Starters" }];
  const sorted = sortMenusForOnboardingDisplay(original);
  assert.deepEqual(
    original.map((menu) => menu.name),
    ["Dessert", "Starters"],
  );
  assert.notEqual(sorted, original);
});

test("returns an empty array for missing menus", () => {
  assert.deepEqual(sortMenusForOnboardingDisplay(undefined), []);
  assert.deepEqual(sortMenusForOnboardingDisplay([]), []);
});
