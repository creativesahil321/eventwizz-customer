/**
 * WCAG 2.1 contrast helpers for hex colors (Site Essentials palettes).
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace(/^#/, "").trim();
  if (!raw) return null;
  const h =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.length === 6 || raw.length === 8
        ? raw.slice(0, 6)
        : null;
  if (!h || h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channelToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1–21). Null if either color is not parseable. */
export function contrastRatio(hexFg: string, hexBg: string): number | null {
  const a = hexToRgb(hexFg);
  const b = hexToRgb(hexBg);
  if (!a || !b) return null;
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const L1 = Math.max(l1, l2);
  const L2 = Math.min(l1, l2);
  return (L1 + 0.05) / (L2 + 0.05);
}

/** True when page background is visually “light” (for Try theme filters). */
export function isLightUiBackground(hex: string | undefined): boolean {
  const rgb = hexToRgb(hex ?? "");
  if (!rgb) return true;
  return relativeLuminance(rgb) > 0.45;
}

export type PaletteAccessibilityFlags = {
  /** WCAG AA body text (4.5:1) */
  bodyTextAa: boolean;
  /** Large text / UI components vs surface (3:1) */
  primaryOnSurfaceUi: boolean;
};

export function paletteAccessibilityFlags(colors: {
  text?: string;
  background?: string;
  primary?: string;
  surface?: string;
}): PaletteAccessibilityFlags {
  const text = colors.text?.trim() || "#000000";
  const bg = colors.background?.trim() || "#ffffff";
  const primary = colors.primary?.trim() || "#000000";
  const surface = colors.surface?.trim() || "#ffffff";
  const tBg = contrastRatio(text, bg);
  const pS = contrastRatio(primary, surface);
  return {
    bodyTextAa: tBg != null && tBg >= 4.5,
    primaryOnSurfaceUi: pS != null && pS >= 3,
  };
}
