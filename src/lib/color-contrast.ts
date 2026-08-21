/**
 * WCAG 2.1 relative luminance and contrast helpers.
 * Used for Site Essentials preview and shared with theme token generation.
 */

export function normalizeHex(color: string): string {
  if (color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return color;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/.test(value);
}

export function getAnchorColor(value: string): string {
  if (isHexColor(value)) return normalizeHex(value);
  const match = value.match(/#[0-9A-Fa-f]{3,6}/);
  return match ? normalizeHex(match[0]) : "#FFFFFF";
}

export function relativeLuminance(hexColor: string): number {
  const hex = normalizeHex(getAnchorColor(hexColor));
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (channel: number) =>
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  return (
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(getAnchorColor(foreground));
  const l2 = relativeLuminance(getAnchorColor(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const LIGHT_FG = "#F8FAFC";
const DARK_FG = "#0F172A";

/** Picks light or dark foreground for maximum contrast on a background (solid or first hex in a value). */
export function pickReadableForeground(background: string): string {
  const lightRatio = contrastRatio(LIGHT_FG, background);
  const darkRatio = contrastRatio(DARK_FG, background);
  return darkRatio >= lightRatio ? DARK_FG : LIGHT_FG;
}

const HERO_OVERLAY_FALLBACK = "#0F172A";

/**
 * Photo-hero wash color — darker of header vs footer chrome.
 * Matches Lovable `bg-maroon/70` without using a light header as a 70% white veil.
 */
export function pickHeroOverlayColor(
  header: string,
  footer: string,
  fallback = HERO_OVERLAY_FALLBACK,
): string {
  const candidates = [header, footer, fallback].map((value) =>
    getAnchorColor(value),
  );
  return candidates.reduce((darkest, next) =>
    relativeLuminance(next) < relativeLuminance(darkest) ? next : darkest,
  );
}

/** All hex color stops in a CSS color string (solid or gradient). */
export function extractHexStops(value: string): string[] {
  const matches = value.match(/#[0-9A-Fa-f]{3,8}/gi) ?? [];
  return matches.map((m) => getAnchorColor(m));
}

/**
 * Worst-case contrast of foreground against background (important for gradients:
 * uses the minimum ratio across all gradient stops).
 */
export function minContrastOnBackground(
  foreground: string,
  background: string
): number {
  const stops = extractHexStops(background);
  if (stops.length === 0) {
    return contrastRatio(foreground, getAnchorColor(background));
  }
  return Math.min(...stops.map((stop) => contrastRatio(foreground, stop)));
}

export type ContrastBand = "pass" | "large-only" | "fail";

/** WCAG AA: 4.5:1 body, 3:1 large / UI graphics. */
export function contrastBand(ratio: number): ContrastBand {
  if (ratio >= 4.5) return "pass";
  if (ratio >= 3) return "large-only";
  return "fail";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Darkens a hex color by a fraction (default 12%). Used for hover states on theme tokens. */
export function darkenHex(hexColor: string, amount = 0.12): string {
  const hex = normalizeHex(getAnchorColor(hexColor));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const darkenChannel = (channel: number) =>
    clamp(Math.round(channel * (1 - amount)), 0, 255);

  const nr = darkenChannel(r);
  const ng = darkenChannel(g);
  const nb = darkenChannel(b);

  return `#${nr.toString(16).padStart(2, "0")}${ng
    .toString(16)
    .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}
