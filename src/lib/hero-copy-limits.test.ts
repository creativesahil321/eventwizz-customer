import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BANNER_HEADING_MAX_CHARS,
  BANNER_HEADING_MAX_WORDS,
  clampHeroHeading,
  truncateAtWordBoundary,
} from "./hero-copy-limits";

test("never cuts a word in half", () => {
  const sub =
    "An exclusive New Year party featuring live entertainment, fine dining, and a midnight toast";
  const out = truncateAtWordBoundary(sub, 80);
  assert.ok(out.length <= 80);
  assert.equal(out, "An exclusive New Year party featuring live entertainment, fine dining, and a");
  assert.ok(sub.startsWith(out));
});

test("drops dangling punctuation at the cut", () => {
  assert.equal(truncateAtWordBoundary("Food, drinks, music, dancing", 14), "Food, drinks");
});

test("keeps short text and normalises whitespace", () => {
  assert.equal(truncateAtWordBoundary("  Hello   world ", 80), "Hello world");
  assert.equal(truncateAtWordBoundary("", 10), "");
});

test("hard-cuts a single oversized word instead of returning empty", () => {
  assert.equal(truncateAtWordBoundary("Supercalifragilistic", 10), "Supercalif");
});

test("clampHeroHeading enforces both word and character caps", () => {
  const long = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
  const out = clampHeroHeading(long);
  assert.ok(out.split(" ").length <= BANNER_HEADING_MAX_WORDS);
  assert.ok(out.length <= BANNER_HEADING_MAX_CHARS);
  assert.equal(clampHeroHeading(null), "");
});
