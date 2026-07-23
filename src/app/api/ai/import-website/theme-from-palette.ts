/**
 * Build Site Essentials colors from evidence found on the source site —
 * applied CSS roles (body / header / footer / buttons) and frequency in theme
 * stylesheets. No hue-family “guessing” (purple vs gold boosts, invented moods).
 */

export type ImportedColorTheme = {
  primary: string;
  secondary: string;
  header: string;
  footer: string;
  background: string;
  surface: string;
  text: string;
  textDimmed: string;
  socialLogin: {
    google: string;
    microsoft: string;
  };
};

/** Colors taken from real CSS rules on the page / theme stylesheets. */
export type AppliedSiteColors = {
  /** Most common solid button / CTA background. */
  primary?: string;
  /** body/html text color. */
  text?: string;
  /** body/html background. */
  background?: string;
  /** header / .site-header background. */
  header?: string;
  /** footer background. */
  footer?: string;
  /** Button backgrounds in cascade order (last wins per selector group). */
  buttonBackgrounds: string[];
  /** Link / accent `color` values from theme CSS. */
  linkColors: string[];
};

type Hsl = { h: number; s: number; l: number };

function normalizeHex(input: string): string | null {
  const raw = input.trim();
  if (!/^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/.test(raw)) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
  }
  return raw.toUpperCase();
}

function hexToHsl(hex: string): Hsl {
  const n = normalizeHex(hex)!;
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d) % 6;
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
      break;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

function luminance(hex: string): number {
  const n = normalizeHex(hex)!;
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

/** Parse a CSS color token to #RRGGBB (skips var()/transparent/gradients). */
export function cssColorToHex(value: string): string | null {
  const v = value.trim().replace(/!important/gi, "").trim();
  if (!v) return null;
  if (/^(transparent|inherit|initial|unset|currentcolor)$/i.test(v)) return null;
  if (/^var\(/i.test(v) || /gradient\(/i.test(v) || /url\(/i.test(v)) return null;

  if (v.startsWith("#")) return normalizeHex(v);

  const rgb = v.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (rgb) {
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    if ([r, g, b].some((n) => n > 255)) return null;
    // Ignore near-transparent rgba with alpha ~0
    const alpha = v.startsWith("rgba")
      ? Number(v.match(/,\s*([\d.]+)\s*\)$/)?.[1] ?? 1)
      : 1;
    if (alpha < 0.35) return null;
    return `#${[r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()}`;
  }

  return null;
}

function propColor(block: string, prop: string): string | null {
  const re = new RegExp(`${prop}\\s*:\\s*([^;}]+)`, "i");
  const m = block.match(re);
  return m ? cssColorToHex(m[1]) : null;
}

function backgroundColor(block: string): string | null {
  // Prefer explicit background-color; fall back to solid background shorthand.
  return (
    propColor(block, "background-color") ||
    propColor(block, "background")
  );
}

function isChromeNoise(hex: string): boolean {
  // Gutenberg / classic-themes defaults that show up on every WP site.
  return (
    hex === "#32373C" ||
    hex === "#007CBA" ||
    hex === "#006BA1" ||
    hex === "#005A87" ||
    hex === "#7A00DF" ||
    hex === "#9B51E0" ||
    hex === "#0693E3" ||
    hex === "#00D084" ||
    hex === "#ABB8C3" ||
    hex === "#EEEADD" ||
    hex === "#D1E4DD" ||
    hex === "#D1D1E4" ||
    hex === "#D1DFE4" ||
    hex === "#E4D1D1" ||
    hex === "#E4DAD1" ||
    hex === "#F5F5F5"
  );
}

function isUsableAccent(hex: string): boolean {
  if (isChromeNoise(hex)) return false;
  const { s, l } = hexToHsl(hex);
  // Skip near-white / near-black — those are surfaces/text, not brand CTAs.
  if (l > 92 || l < 8) return false;
  if (s < 8 && l > 20 && l < 80) return false;
  return true;
}

function isUsableSurface(hex: string): boolean {
  const { l } = hexToHsl(hex);
  return l >= 8; // anything except pure black voids
}

function mostFrequent(hexes: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const h of hexes) {
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [hex, count] of counts) {
    if (count > bestCount) {
      best = hex;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Read applied colors from theme CSS text. Later rules win for body/header/footer;
 * button backgrounds are collected for frequency.
 */
export function extractAppliedColorsFromCss(css: string): AppliedSiteColors {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  const result: AppliedSiteColors = {
    buttonBackgrounds: [],
    linkColors: [],
  };

  const scan = (
    selectorRe: RegExp,
    apply: (block: string) => void,
  ) => {
    let m: RegExpExecArray | null;
    const re = new RegExp(selectorRe.source, selectorRe.flags);
    while ((m = re.exec(cleaned)) !== null) {
      apply(m[3] ?? m[2] ?? "");
    }
  };

  scan(
    /(^|[{},;\s])(html|body)\b[^{]*\{([^{}]{0,800})\}/gi,
    (block) => {
      const bg = backgroundColor(block);
      const color = propColor(block, "color");
      if (bg && isUsableSurface(bg)) result.background = bg;
      if (color) result.text = color;
    },
  );

  scan(
    /(^|[{},;\s])(#masthead|header|\.site-header|\.main-header)\b[^{]*\{([^{}]{0,800})\}/gi,
    (block) => {
      const bg = backgroundColor(block);
      // Ignore accent/CTA fills mistakenly applied to a "header" promo strip.
      if (bg && isUsableSurface(bg) && !isUsableAccent(bg)) {
        result.header = bg;
      } else if (bg && isUsableSurface(bg) && hexToHsl(bg).l > 85) {
        result.header = bg;
      }
    },
  );

  scan(
    /(^|[{},;\s])(footer|\.site-footer|\.main-footer)\b[^{]*\{([^{}]{0,800})\}/gi,
    (block) => {
      const bg = backgroundColor(block);
      if (bg && isUsableSurface(bg) && !isUsableAccent(bg)) {
        result.footer = bg;
      } else if (bg && isUsableSurface(bg) && hexToHsl(bg).l > 85) {
        result.footer = bg;
      } else if (bg && isUsableSurface(bg) && hexToHsl(bg).l < 35) {
        result.footer = bg;
      }
    },
  );

  scan(
    /(^|[{},;\s])(button|\.btn\b|\.button\b|\.vc_btn3|input\[type=["']?submit["']?|\.wp-block-button__link|\.popup-btn\b)\b[^{]*\{([^{}]{0,800})\}/gi,
    (block) => {
      const bg = backgroundColor(block);
      if (bg && isUsableAccent(bg)) result.buttonBackgrounds.push(bg);
    },
  );

  // Links / menu accents — brand gold often lives here on venue sites.
  scan(
    /(^|[{},;\s])(a|\.nav-link|\.menu\s+a|\.morelink)\b[^{]*\{([^{}]{0,500})\}/gi,
    (block) => {
      const color = propColor(block, "color");
      if (color && isUsableAccent(color)) result.linkColors.push(color);
      const bg = backgroundColor(block);
      if (bg && isUsableAccent(bg)) result.buttonBackgrounds.push(bg);
    },
  );

  const primary =
    mostFrequent(result.buttonBackgrounds.filter(isUsableAccent)) ||
    mostFrequent(result.linkColors.filter(isUsableAccent));
  if (primary) result.primary = primary;

  return result;
}

/** Merge multiple CSS extractionsions; later sheets override body/header/footer. */
export function mergeAppliedColors(
  parts: AppliedSiteColors[],
): AppliedSiteColors {
  const merged: AppliedSiteColors = {
    buttonBackgrounds: [],
    linkColors: [],
  };
  for (const part of parts) {
    if (part.background) merged.background = part.background;
    if (part.text) merged.text = part.text;
    if (part.header) merged.header = part.header;
    if (part.footer) merged.footer = part.footer;
    if (part.primary) merged.primary = part.primary;
    merged.buttonBackgrounds.push(...part.buttonBackgrounds);
    merged.linkColors.push(...part.linkColors);
  }
  const primary =
    mostFrequent(merged.buttonBackgrounds.filter(isUsableAccent)) ||
    mostFrequent(merged.linkColors.filter(isUsableAccent)) ||
    merged.primary;
  if (primary) merged.primary = primary;
  return merged;
}

type Ranked = { hex: string; count: number; hsl: Hsl };

/** Simple frequency rank — no hue-family bias. */
export function rankPalette(rawColors: string[]): Ranked[] {
  const counts = new Map<string, number>();
  for (const c of rawColors) {
    const hex = normalizeHex(c);
    if (!hex) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const ranked: Ranked[] = [];
  for (const [hex, count] of counts) {
    const hsl = hexToHsl(hex);
    if (hsl.l > 97 || hsl.l < 5) continue;
    ranked.push({ hex, count, hsl });
  }
  return ranked.sort((a, b) => b.count - a.count || b.hsl.s - a.hsl.s);
}

function readableTextOn(bg: string): { text: string; textDimmed: string } {
  if (luminance(bg) < 140) {
    return { text: "#F8FAFC", textDimmed: "#CBD5E1" };
  }
  return { text: "#1C1917", textDimmed: "#57534E" };
}

function pickFallbackAccent(palette: string[]): string | undefined {
  const ranked = rankPalette(palette);
  return ranked.find((c) => isUsableAccent(c.hex))?.hex;
}

function pickFallbackSurface(palette: string[], dark: boolean): string | undefined {
  const ranked = rankPalette(palette);
  if (dark) {
    return ranked.find((c) => c.hsl.l < 40 && c.count >= 2)?.hex;
  }
  return ranked.find((c) => c.hsl.l > 85 && c.count >= 1)?.hex;
}

/**
 * Assemble the Site Essentials theme from applied CSS evidence first.
 * Palette frequency is only a fallback for missing roles — never a hue guess.
 */
export function buildColorThemeFromApplied(
  applied: AppliedSiteColors,
  palette: string[],
): ImportedColorTheme | null {
  const primary =
    applied.primary ||
    mostFrequent(applied.buttonBackgrounds) ||
    mostFrequent(applied.linkColors) ||
    pickFallbackAccent(palette);

  if (!primary) return null;

  const surface =
    applied.background ||
    pickFallbackSurface(palette, false) ||
    "#FFFFFF";

  // If theme CSS never set body background but a dark surface dominates the
  // real theme stylesheet palette, use that (e.g. Best Parties Ever #112337).
  const ranked = rankPalette(palette);
  const dominant = ranked[0];
  const darkDominant =
    dominant &&
    dominant.count >= 8 &&
    dominant.hsl.l < 35 &&
    !applied.background;

  let resolvedSurface = darkDominant ? dominant!.hex : surface;

  // Many luxury venues use cream paper while body { background: #fff } from a
  // parent theme — prefer a frequent cream from the child stylesheet.
  if (normalizeHex(resolvedSurface) === "#FFFFFF") {
    const cream = ranked.find(
      (c) =>
        !isChromeNoise(c.hex) &&
        c.count >= 4 &&
        c.hsl.l >= 88 &&
        c.hsl.l <= 97 &&
        c.hsl.s >= 3 &&
        c.hsl.s <= 60 &&
        c.hsl.h >= 20 &&
        c.hsl.h <= 70,
    );
    if (cream) resolvedSurface = cream.hex;
  }

  const header =
    applied.header ||
    resolvedSurface;

  const footer =
    applied.footer ||
    applied.header ||
    resolvedSurface;

  const textPair = applied.text
    ? {
        text: applied.text,
        textDimmed:
          luminance(resolvedSurface) < 140 ? "#CBD5E1" : "#57534E",
      }
    : readableTextOn(resolvedSurface);

  // Secondary = second real button/link color, else the page surface — never invented.
  const secondButton = [...applied.buttonBackgrounds, ...applied.linkColors].find(
    (c) => c !== primary && isUsableAccent(c),
  );
  const secondary = secondButton || resolvedSurface;

  return {
    primary,
    secondary,
    header,
    footer,
    background: resolvedSurface,
    surface: resolvedSurface,
    text: textPair.text,
    textDimmed: textPair.textDimmed,
    socialLogin: { google: "#dd4b39", microsoft: "#0078d7" },
  };
}

/** @deprecated Prefer buildColorThemeFromApplied — kept for callers with palette only. */
export function buildColorThemeFromPalette(
  rawColors: string[],
): ImportedColorTheme | null {
  return buildColorThemeFromApplied(
    { buttonBackgrounds: [], linkColors: [] },
    rawColors,
  );
}
