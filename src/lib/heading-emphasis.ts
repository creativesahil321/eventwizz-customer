/**
 * Customer-facing heading presentation (public vendor site only).
 * Dashboards and onboarding should use plain headings, not this module.
 */

export const HEADING_EMPHASIS_VALUES = [
  "uniform",
  "accent_tail",
  "full_primary",
] as const;

export type HeadingEmphasis = (typeof HEADING_EMPHASIS_VALUES)[number];

export function isHeadingEmphasis(v: unknown): v is HeadingEmphasis {
  return (
    typeof v === "string" &&
    (HEADING_EMPHASIS_VALUES as readonly string[]).includes(v)
  );
}

export function normalizeHeadingEmphasis(
  v: unknown,
): HeadingEmphasis {
  return isHeadingEmphasis(v) ? v : "uniform";
}

export type SplitBannerHeading = {
  base: string;
  accent: string;
};

/**
 * Splits a banner title for accent-tail rendering (`SiteHeading`).
 * `base` = lead (readable body font + neutral); `accent` = tail (display heading + primary).
 * If `accentHint` is set and appears in `full`, uses the last occurrence.
 * Otherwise uses the last two words (or the second word if only two words total).
 */
export function splitBannerHeading(
  full: string,
  accentHint: string | null | undefined,
): SplitBannerHeading {
  const t = full.trim();
  if (!t) return { base: "", accent: "" };

  const hint = accentHint?.trim();
  if (hint && t.includes(hint)) {
    const idx = t.lastIndexOf(hint);
    const base = t.slice(0, idx).trimEnd();
    return { base: base || t, accent: hint };
  }

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return { base: t, accent: "" };
  }
  if (words.length === 2) {
    return { base: words[0]!, accent: words[1]! };
  }
  const accent = words.slice(-2).join(" ");
  const base = words.slice(0, -2).join(" ");
  return { base, accent };
}
