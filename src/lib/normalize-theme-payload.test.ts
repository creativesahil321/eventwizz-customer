import assert from "node:assert/strict";
import { test } from "node:test";
import { generateThemeCSS } from "@/services/common/theme/constants/theme";
import { googleFontsHrefFromTheme } from "./site-typography-google-fonts";
import {
  normalizeThemePayload,
  normalizeThemeTypography,
} from "./normalize-theme-payload";
import type { ThemeSchema } from "@/types/theme.types";

const STOCKBROOK_FLAT_THEME = {
  colors: { primary: "#4E5B38", secondary: "#E9E8DF" },
  typography: {
    heading: "Lora, serif",
    body: "Karla, sans-serif",
    customFontStylesheetUrls: [],
    headingEmphasis: "uniform",
  },
} as ThemeSchema;

test("moves flat API fonts under typography.fontFamily", () => {
  const result = normalizeThemeTypography({
    name: "Vendor",
    typography: {
      heading: "Lora, serif",
      body: "Karla, sans-serif",
      customFontStylesheetUrls: [],
      headingEmphasis: "uniform",
    },
  });
  assert.deepEqual(result, {
    name: "Vendor",
    typography: {
      fontFamily: { heading: "Lora, serif", body: "Karla, sans-serif" },
      customFontStylesheetUrls: [],
      headingEmphasis: "uniform",
    },
  });
});

test("keeps nested fonts and prefers them over flat values", () => {
  const result = normalizeThemeTypography({
    typography: {
      heading: "Lora, serif",
      fontFamily: { heading: "Poppins, sans-serif", body: "DM Sans, sans-serif" },
    },
  });
  assert.deepEqual(result.typography, {
    fontFamily: { heading: "Poppins, sans-serif", body: "DM Sans, sans-serif" },
  });
});

test("omits a missing font instead of writing an empty string", () => {
  const result = normalizeThemeTypography({
    typography: { heading: "Lora, serif" },
  });
  assert.deepEqual(result.typography, { fontFamily: { heading: "Lora, serif" } });
});

test("returns payloads without typography untouched", () => {
  const payload = { colors: { primary: "#000" } };
  assert.equal(normalizeThemeTypography(payload), payload);
  assert.equal(normalizeThemeTypography(null), null);
});

test("generateThemeCSS writes flat API fonts onto --font-heading and --font-body", () => {
  const css = generateThemeCSS(STOCKBROOK_FLAT_THEME);
  assert.match(css, /--font-heading: Lora, serif;/);
  assert.match(css, /--font-body: Karla, sans-serif;/);
  assert.doesNotMatch(css, /Roboto Slab/);
  assert.doesNotMatch(css, /Open Sans/);
});

test("googleFontsHrefFromTheme loads Lora and Karla from a flat API theme", () => {
  const href = googleFontsHrefFromTheme(STOCKBROOK_FLAT_THEME);
  assert.ok(href);
  assert.match(href, /Lora/);
  assert.match(href, /Karla/);
});

test("normalizeThemePayload also flattens info_pages", () => {
  const result = normalizeThemePayload({
    info_pages: { privacy_policy: "<p>x</p>" },
    typography: { heading: "Lora, serif", body: "Karla, sans-serif" },
  }) as Record<string, unknown>;
  assert.equal(result.privacy_policy, "<p>x</p>");
  assert.deepEqual(result.typography, {
    fontFamily: { heading: "Lora, serif", body: "Karla, sans-serif" },
  });
});
