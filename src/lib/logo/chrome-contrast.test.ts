import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOGO_CONTRAST_FLIP_FILTER,
  logoContrastFilters,
} from "./chrome-contrast";

const invert = LOGO_CONTRAST_FLIP_FILTER;

test("Walled Garden: white header keeps the black mark; dark footer flips it", () => {
  const filters = logoContrastFilters("#FFFFFF", "#2D3326");
  assert.equal(filters.header, "none");
  assert.equal(filters.footer, invert);
});

test("Harbour Slate and Porcelain Blush use the same mixed-chrome flip", () => {
  for (const footer of ["#1C2B31", "#3A2A2F"]) {
    const filters = logoContrastFilters("#FFFFFF", footer);
    assert.equal(filters.header, "none");
    assert.equal(filters.footer, invert);
  }
});

test("Gallery Neutral: light header and light footer leave a dark mark alone", () => {
  const filters = logoContrastFilters("#FFFFFF", "#EEEDEA");
  assert.equal(filters.header, "none");
  assert.equal(filters.footer, "none");
});

test("Country Estate (both dark, unknown tone) does not guess-invert a possibly light mark", () => {
  const filters = logoContrastFilters("#1E3529", "#172A20");
  assert.equal(filters.header, "none");
  assert.equal(filters.footer, "none");
});

test("Country Estate with a known dark wordmark inverts on every dark surface", () => {
  const filters = logoContrastFilters("#1E3529", "#172A20", "dark");
  assert.equal(filters.header, invert);
  assert.equal(filters.footer, invert);
  assert.equal(filters.darkPanel, invert);
  assert.equal(filters.lightPanel, "none");
});

test("dark-header theme with a known light mark stays unflipped on dark chrome", () => {
  const filters = logoContrastFilters("#1E3529", "#172A20", "light");
  assert.equal(filters.header, "none");
  assert.equal(filters.footer, "none");
  assert.equal(filters.darkPanel, "none");
  assert.equal(filters.lightPanel, invert);
});

test("onboarding dark panel inverts a header-darkened mark when the public header is light", () => {
  const filters = logoContrastFilters("#FFFFFF", "#2D3326");
  assert.equal(filters.darkPanel, invert);
  assert.equal(filters.lightPanel, "none");
});

test("default platform theme (white header, slate footer) flips the footer mark", () => {
  const filters = logoContrastFilters("#FFFFFF", "#0F172A");
  assert.equal(filters.footer, invert);
  assert.equal(filters.header, "none");
});
