import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { SiteEssentialsFormValues } from "./schema";
import { normalizeCustomFontStylesheetUrls } from "@/lib/site-custom-font-stylesheets";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import {
  collectSiteEssentialsGoogleFamilies,
  siteEssentialsGoogleFontStack,
} from "@/lib/site-typography-google-fonts";

/**
 * OAuth buttons use these hex values as full button backgrounds with white label
 * text (see OAuthButtons). Never use white or near-white here — hides the text.
 * Note: `colors.socialLogin.microsoft` drives the Facebook button in the app.
 */
const PRESET_SOCIAL_GOOGLE_BG = "#1a73e8";
const PRESET_SOCIAL_FACEBOOK_BG = "#1877f2";

type SocialLoginColors = NonNullable<
  SiteEssentialsFormValues["colors"]["socialLogin"]
>;

const SOCIAL_LOGIN_DARK: SocialLoginColors = {
  google: PRESET_SOCIAL_GOOGLE_BG,
  microsoft: PRESET_SOCIAL_FACEBOOK_BG,
};

const SOCIAL_LOGIN_LIGHT: SocialLoginColors = {
  google: "#4285F4",
  microsoft: PRESET_SOCIAL_FACEBOOK_BG,
};

export type SiteThemePresetId =
  | "dark-elegant"
  | "royal-blue"
  | "emerald-night"
  | "warm-sunset"
  | "minimal-light"
  | "onyx-teal"
  | "rose-noir"
  | "navy-gold"
  | "sage-earth"
  | "wine-rust"
  | "arctic-frost"
  | "slate-ember"
  | "violet-aurora"
  | "espresso-cream"
  | "script-soiree"
  | "vibes-script"
  | "allura-garden"
  | "pinyon-formal"
  | "ivory-luxe"
  | "fuchsia-velvet"
  | "copper-forge"
  | "indigo-depth"
  | "crimson-eclipse"
  | "peach-serenade"
  | "editorial-slate"
  | "blush-clay"
  | "spa-mint"
  | "golden-amber"
  | "forest-jade"
  | "lilac-atelier"
  | "lovable-purple-magenta"
  | "lovable-ocean-blue"
  | "lovable-golden-fire"
  | "lovable-emerald-night"
  | "lovable-red-rose"
  | "lovable-midnight-indigo"
  | "lovable-lavender-light"
  | "lovable-sky-breeze"
  | "lovable-warm-sand"
  | "lovable-mint-fresh"
  | "lovable-rose-petal"
  | "lovable-clean-white"
  | "venue-estate-green"
  | "venue-wine-candlelight"
  | "venue-midnight-navy-brass"
  | "venue-terracotta-sage"
  | "venue-rosewood-blush"
  | "venue-slate-copper"
  | "venue-noir-champagne";

export function isVenueThemePresetId(id: SiteThemePresetId): boolean {
  return id.startsWith("venue-");
}

export interface SiteThemePreset {
  id: SiteThemePresetId;
  name: string;
  tagline: string;
  headingFontLabel: string;
  bodyFontLabel: string;
  swatch: [string, string, string];
  colors: SiteEssentialsFormValues["colors"];
  /** Landing / site-wide heading style this recipe is designed for. */
  headingEmphasis?: HeadingEmphasis;
  typography: Pick<
    SiteEssentialsFormValues["typography"],
    "fontFamily" | "customFontStylesheetUrls"
  >;
}

/**
 * Preset definition before typography is resolved. Optional `headingFontStack` /
 * `bodyFontStack` override Google stacks from labels; `customFontStylesheetUrls`
 * loads CDN fonts (e.g. CDNFonts) — must stay within form max (5) and https only.
 */
type PresetShell = Omit<SiteThemePreset, "typography"> & {
  headingFontStack?: string;
  bodyFontStack?: string;
  customFontStylesheetUrls?: readonly string[];
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s / 100);
  const ll = clamp01(l / 100);

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

function hslTokenToHex(token: string): string {
  // expected: "280 100% 65%"
  const t = token.trim().replace(/\s+/g, " ");
  const [hRaw, sRaw, lRaw] = t.split(" ");
  const h = parseFloat(hRaw);
  const s = parseFloat((sRaw ?? "").replace("%", ""));
  const l = parseFloat((lRaw ?? "").replace("%", ""));
  if (![h, s, l].every((n) => Number.isFinite(n))) {
    throw new Error(`Invalid HSL token: "${token}"`);
  }
  return hslToHex(h, s, l);
}

function withTypography(shell: PresetShell): SiteThemePreset {
  const {
    headingFontStack,
    bodyFontStack,
    customFontStylesheetUrls: shellSheets,
    ...rest
  } = shell;
  return {
    ...rest,
    typography: {
      fontFamily: {
        heading:
          headingFontStack ??
          siteEssentialsGoogleFontStack(rest.headingFontLabel),
        body:
          bodyFontStack ?? siteEssentialsGoogleFontStack(rest.bodyFontLabel),
      },
      customFontStylesheetUrls: [...(shellSheets ?? [])],
    },
  };
}

/**
 * Curated bundles: Google font pairings and optional CDN script/display fonts.
 * Keep `primary` visually distinct from body `text`; badges and primary buttons use
 * `--color-primary-foreground` / `--color-secondary-foreground` (not body text).
 */
const PRESET_SHELLS: readonly PresetShell[] = [
  {
    id: "dark-elegant",
    name: "Dark Elegant",
    tagline: "Premium venues, galas, and fine dining",
    headingFontLabel: "Playfair Display",
    bodyFontLabel: "Lato",
    swatch: ["#0a0a0a", "#C9A962", "#f5f5f4"],
    colors: {
      primary: "#C9A962",
      secondary: "#3f3f3a",
      header: "#0c0c0c",
      footer: "#080808",
      background: "#0a0a0a",
      surface: "#171717",
      text: "#f5f5f4",
      textDimmed: "#a8a29e",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    tagline: "Corporate events, conferences, and trust-led brands",
    headingFontLabel: "Merriweather",
    bodyFontLabel: "Open Sans",
    swatch: ["#0b1220", "#3b82f6", "#f1f5f9"],
    colors: {
      primary: "#3b82f6",
      secondary: "#1e4976",
      header: "#0f172a",
      footer: "#0c1322",
      background: "#0b1220",
      surface: "#132238",
      text: "#f1f5f9",
      textDimmed: "#94a3b8",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "emerald-night",
    name: "Emerald Night",
    tagline: "Wellness launches, sustainable brands, and modern nightlife",
    headingFontLabel: "Merriweather",
    bodyFontLabel: "Montserrat",
    swatch: ["#041f1a", "#10b981", "#ecfdf5"],
    colors: {
      primary: "#10b981",
      secondary: "#047857",
      header: "#022c22",
      footer: "#011c17",
      background: "#041f1a",
      surface: "#064e3b",
      text: "#ecfdf5",
      textDimmed: "#6ee7b7",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "warm-sunset",
    name: "Warm Sunset",
    tagline: "Festivals, weddings, and high-energy social events",
    headingFontLabel: "Playfair Display",
    bodyFontLabel: "Nunito",
    swatch: ["#140808", "#ea580c", "#fef3c7"],
    colors: {
      primary: "#ea580c",
      secondary: "#b45309",
      header: "#1c0a0a",
      footer: "#150505",
      background: "#140808",
      surface: "#292524",
      text: "#fef3c7",
      textDimmed: "#d6d3d1",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "minimal-light",
    name: "Minimal Light",
    tagline: "Daytime markets, workshops, and clean B2B sites",
    headingFontLabel: "Poppins",
    bodyFontLabel: "Open Sans",
    swatch: ["#f8fafc", "#2563eb", "#0f172a"],
    colors: {
      primary: "#2563eb",
      secondary: "#64748b",
      header: "#ffffff",
      footer: "#f1f5f9",
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      textDimmed: "#64748b",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "onyx-teal",
    name: "Onyx Teal",
    tagline: "Nightlife, clubs, and dark UIs with a crisp accent",
    headingFontLabel: "Oswald",
    bodyFontLabel: "Roboto",
    swatch: ["#0a0a0a", "#14b8a6", "#f0fdfa"],
    colors: {
      primary: "#14b8a6",
      secondary: "#525252",
      header: "#171717",
      footer: "#0a0a0a",
      background: "#0a0a0a",
      surface: "#262626",
      text: "#f5f5f5",
      textDimmed: "#a3a3a3",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "rose-noir",
    name: "Rose Noir",
    tagline: "Fashion, beauty launches, and editorial nightlife",
    headingFontLabel: "Libre Baskerville",
    bodyFontLabel: "DM Sans",
    swatch: ["#1a0f14", "#ec4899", "#fce7f3"],
    colors: {
      primary: "#ec4899",
      secondary: "#9d174d",
      header: "#150810",
      footer: "#12060c",
      background: "#1a0f14",
      surface: "#2a1520",
      text: "#fdf2f8",
      textDimmed: "#f9a8d4",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "navy-gold",
    name: "Navy & Gold",
    tagline: "Gala dinners, awards, and heritage venues",
    headingFontLabel: "Playfair Display",
    bodyFontLabel: "Lora",
    swatch: ["#0a1628", "#c9a227", "#faf8f3"],
    colors: {
      primary: "#c9a227",
      secondary: "#1e3a5f",
      header: "#0c1a30",
      footer: "#080f1c",
      background: "#0a1628",
      surface: "#132a45",
      text: "#faf8f3",
      textDimmed: "#c4b59a",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "sage-earth",
    name: "Sage Earth",
    tagline: "Outdoor events, farm venues, and eco-conscious brands",
    headingFontLabel: "Lora",
    bodyFontLabel: "Work Sans",
    swatch: ["#1c261c", "#8f9f6f", "#f4f1e8"],
    colors: {
      primary: "#8f9f6f",
      secondary: "#3f4f3a",
      header: "#243524",
      footer: "#161f16",
      background: "#1c261c",
      surface: "#2d3b2d",
      text: "#f4f1e8",
      textDimmed: "#b8c4a8",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "wine-rust",
    name: "Wine & Rust",
    tagline: "Tastings, supper clubs, and intimate gatherings",
    headingFontLabel: "Merriweather",
    bodyFontLabel: "Raleway",
    swatch: ["#1f0a0f", "#c2410c", "#fff1f2"],
    colors: {
      primary: "#c2410c",
      secondary: "#7f1d1d",
      header: "#2a0a12",
      footer: "#18060c",
      background: "#1f0a0f",
      surface: "#3a1520",
      text: "#fff1f2",
      textDimmed: "#fda4af",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "arctic-frost",
    name: "Arctic Frost",
    tagline: "Winter markets, ice venues, and crisp tech brands",
    headingFontLabel: "DM Sans",
    bodyFontLabel: "Inter",
    swatch: ["#0c1821", "#38bdf8", "#f0f9ff"],
    colors: {
      primary: "#38bdf8",
      secondary: "#0e7490",
      header: "#0f1c28",
      footer: "#0a141f",
      background: "#0c1821",
      surface: "#163347",
      text: "#f0f9ff",
      textDimmed: "#7dd3fc",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "slate-ember",
    name: "Slate Ember",
    tagline: "Sports nights, live shows, and high-contrast energy",
    headingFontLabel: "Raleway",
    bodyFontLabel: "Montserrat",
    swatch: ["#171717", "#f97316", "#fafafa"],
    colors: {
      primary: "#f97316",
      secondary: "#525252",
      header: "#1f1f1f",
      footer: "#0f0f0f",
      background: "#171717",
      surface: "#2a2a2a",
      text: "#fafafa",
      textDimmed: "#a3a3a3",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "violet-aurora",
    name: "Violet Aurora",
    tagline: "Electronic events, creative studios, and neon-forward brands",
    headingFontLabel: "Inter",
    bodyFontLabel: "Lato",
    swatch: ["#1e1034", "#8b5cf6", "#f5f3ff"],
    colors: {
      primary: "#8b5cf6",
      secondary: "#5b21b6",
      header: "#261447",
      footer: "#160a2a",
      background: "#1e1034",
      surface: "#2d1b4e",
      text: "#f5f3ff",
      textDimmed: "#c4b5fd",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "espresso-cream",
    name: "Espresso Cream",
    tagline: "Brunch clubs, coffeehouse events, and warm hospitality",
    headingFontLabel: "Libre Baskerville",
    bodyFontLabel: "Raleway",
    swatch: ["#292524", "#b8956a", "#faf7f2"],
    colors: {
      primary: "#b8956a",
      secondary: "#57534e",
      header: "#1c1917",
      footer: "#0f0e0d",
      background: "#292524",
      surface: "#3f3a36",
      text: "#faf7f2",
      textDimmed: "#d6d3d1",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "script-soiree",
    name: "Script Soirée",
    tagline:
      "Weddings and invitations — Brownhill Script (CDN Fonts) + Open Sans",
    headingFontLabel: "Brownhill Script",
    bodyFontLabel: "Open Sans",
    headingFontStack: '"Brownhill Script", cursive',
    customFontStylesheetUrls: [
      "https://fonts.cdnfonts.com/css/brownhill-script",
    ],
    swatch: ["#1f1410", "#b8925a", "#fdf8f3"],
    colors: {
      primary: "#b8925a",
      secondary: "#5c4a38",
      header: "#1a1410",
      footer: "#120e0b",
      background: "#1f1410",
      surface: "#2d2420",
      text: "#fdf8f3",
      textDimmed: "#d4c4b0",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "vibes-script",
    name: "Vibes Script",
    tagline: "Glam and nightlife — Great Vibes (CDN Fonts) + Montserrat",
    headingFontLabel: "Great Vibes",
    bodyFontLabel: "Montserrat",
    headingFontStack: '"Great Vibes", cursive',
    customFontStylesheetUrls: ["https://fonts.cdnfonts.com/css/great-vibes"],
    swatch: ["#0c0a09", "#fb7185", "#fff1f2"],
    colors: {
      primary: "#fb7185",
      secondary: "#9f1239",
      header: "#1c1917",
      footer: "#0f0e0d",
      background: "#0c0a09",
      surface: "#292524",
      text: "#fff1f2",
      textDimmed: "#fda4af",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "allura-garden",
    name: "Allura Garden",
    tagline: "Garden parties and heritage venues — Allura (CDN Fonts) + Lato",
    headingFontLabel: "Allura",
    bodyFontLabel: "Lato",
    headingFontStack: '"Allura", cursive',
    customFontStylesheetUrls: ["https://fonts.cdnfonts.com/css/allura"],
    swatch: ["#142018", "#6fa37e", "#f0fdf4"],
    colors: {
      primary: "#6fa37e",
      secondary: "#3f5244",
      header: "#1a2e22",
      footer: "#0f1812",
      background: "#142018",
      surface: "#1f3328",
      text: "#f0fdf4",
      textDimmed: "#bbf7d0",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "pinyon-formal",
    name: "Pinyon Formal",
    tagline: "Black-tie and ceremonies — Pinyon Script (CDN Fonts) + Merriweather",
    headingFontLabel: "Pinyon Script",
    bodyFontLabel: "Merriweather",
    headingFontStack: '"Pinyon Script", cursive',
    customFontStylesheetUrls: ["https://fonts.cdnfonts.com/css/pinyon-script"],
    swatch: ["#0f172a", "#64748b", "#f8fafc"],
    colors: {
      primary: "#64748b",
      secondary: "#475569",
      header: "#1e293b",
      footer: "#0f172a",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f8fafc",
      textDimmed: "#94a3b8",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "ivory-luxe",
    name: "Ivory Luxe",
    tagline: "Five-star hotels, bridal suites, and champagne receptions",
    headingFontLabel: "Playfair Display",
    bodyFontLabel: "Lato",
    swatch: ["#f5f2eb", "#7c5e3c", "#1c1917"],
    colors: {
      primary: "#7c5e3c",
      secondary: "#44403c",
      header: "#ffffff",
      footer: "#ebe8e0",
      background: "#f5f2eb",
      surface: "#ffffff",
      text: "#1c1917",
      textDimmed: "#78716c",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "fuchsia-velvet",
    name: "Fuchsia Velvet",
    tagline: "DJ sets, drag brunches, and bold beauty launches",
    headingFontLabel: "Cinzel",
    bodyFontLabel: "Outfit",
    swatch: ["#18081f", "#e879f9", "#fdf4ff"],
    colors: {
      primary: "#e879f9",
      secondary: "#86198f",
      header: "#1f0a28",
      footer: "#120618",
      background: "#18081f",
      surface: "#2d1a35",
      text: "#fdf4ff",
      textDimmed: "#f0abfc",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "copper-forge",
    name: "Copper Forge",
    tagline: "Whiskey tastings, craft fairs, and steampunk gatherings",
    headingFontLabel: "Oswald",
    bodyFontLabel: "Instrument Sans",
    swatch: ["#1a120a", "#d97706", "#fffbeb"],
    colors: {
      primary: "#d97706",
      secondary: "#92400e",
      header: "#22160c",
      footer: "#140e08",
      background: "#1a120a",
      surface: "#3d2810",
      text: "#fffbeb",
      textDimmed: "#fcd34d",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "indigo-depth",
    name: "Indigo Depth",
    tagline: "SaaS summits, hackathons, and deep-tech keynotes",
    headingFontLabel: "Space Grotesk",
    bodyFontLabel: "Inter",
    swatch: ["#0f0f23", "#6366f1", "#eef2ff"],
    colors: {
      primary: "#6366f1",
      secondary: "#4338ca",
      header: "#14142b",
      footer: "#0a0a18",
      background: "#0f0f23",
      surface: "#1e1b4b",
      text: "#eef2ff",
      textDimmed: "#a5b4fc",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "crimson-eclipse",
    name: "Crimson Eclipse",
    tagline: "Valentine galas, cabaret, and runway afterparties",
    headingFontLabel: "Cinzel",
    bodyFontLabel: "Crimson Text",
    swatch: ["#1a0508", "#f43f5e", "#fff1f2"],
    colors: {
      primary: "#f43f5e",
      secondary: "#881337",
      header: "#240a0f",
      footer: "#140508",
      background: "#1a0508",
      surface: "#3f0d18",
      text: "#fff1f2",
      textDimmed: "#fda4af",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "peach-serenade",
    name: "Peach Serenade",
    tagline: "Baby showers, farmers markets, and sunny pop-ups",
    headingFontLabel: "Fraunces",
    bodyFontLabel: "Sora",
    swatch: ["#fffbeb", "#ea580c", "#1c1917"],
    colors: {
      primary: "#ea580c",
      secondary: "#c2410c",
      header: "#ffffff",
      footer: "#fef3c7",
      background: "#fffbeb",
      surface: "#ffffff",
      text: "#1c1917",
      textDimmed: "#78716c",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "editorial-slate",
    name: "Editorial Slate",
    tagline: "Magazines, speaker series, and minimalist portfolios",
    headingFontLabel: "EB Garamond",
    bodyFontLabel: "Inter",
    swatch: ["#f8fafc", "#475569", "#0f172a"],
    colors: {
      primary: "#475569",
      secondary: "#334155",
      header: "#ffffff",
      footer: "#f1f5f9",
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      textDimmed: "#64748b",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "blush-clay",
    name: "Blush Clay",
    tagline: "Bridal fairs, florists, and romantic workshops",
    headingFontLabel: "Cormorant Garamond",
    bodyFontLabel: "Lato",
    swatch: ["#fff1f2", "#e11d48", "#1f2937"],
    colors: {
      primary: "#e11d48",
      secondary: "#9f1239",
      header: "#ffffff",
      footer: "#ffe4e6",
      background: "#fff1f2",
      surface: "#ffffff",
      text: "#1f2937",
      textDimmed: "#9ca3af",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "spa-mint",
    name: "Spa Mint",
    tagline: "Med-spa openings, dental events, and clean beauty",
    headingFontLabel: "Outfit",
    bodyFontLabel: "Plus Jakarta Sans",
    swatch: ["#f0fdfa", "#0d9488", "#134e4a"],
    colors: {
      primary: "#0d9488",
      secondary: "#0f766e",
      header: "#ffffff",
      footer: "#ccfbf1",
      background: "#f0fdfa",
      surface: "#ffffff",
      text: "#134e4a",
      textDimmed: "#5eead4",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "golden-amber",
    name: "Golden Amber",
    tagline: "Jazz lounges, night markets, and golden-hour weddings",
    headingFontLabel: "DM Serif Display",
    bodyFontLabel: "DM Sans",
    swatch: ["#17130a", "#f59e0b", "#fffbeb"],
    colors: {
      primary: "#f59e0b",
      secondary: "#b45309",
      header: "#1f170c",
      footer: "#0f0c06",
      background: "#17130a",
      surface: "#2d2212",
      text: "#fffbeb",
      textDimmed: "#fde68a",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "forest-jade",
    name: "Forest Jade",
    tagline: "Plant shops, wellness retreats, and eco product drops",
    headingFontLabel: "Syne",
    bodyFontLabel: "Inter",
    swatch: ["#071512", "#22c55e", "#f0fdf4"],
    colors: {
      primary: "#22c55e",
      secondary: "#166534",
      header: "#0c1f16",
      footer: "#050f0c",
      background: "#071512",
      surface: "#14532d",
      text: "#f0fdf4",
      textDimmed: "#86efac",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "lilac-atelier",
    name: "Lilac Atelier",
    tagline: "Design studios, podcasts, and creative collectives",
    headingFontLabel: "Fraunces",
    bodyFontLabel: "DM Sans",
    swatch: ["#16131f", "#7c3aed", "#eef2ff"],
    colors: {
      primary: "#7c3aed",
      secondary: "#5b21b6",
      header: "#1e1b2e",
      footer: "#12101c",
      background: "#16131f",
      surface: "#252136",
      text: "#eef2ff",
      textDimmed: "#c4b5fd",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  /* ---- High-impact marketing presets (mode-based); ids unchanged for stored selections ---- */
  {
    id: "lovable-purple-magenta",
    name: "Purple Magenta",
    tagline: "Dark: neon purple + magenta accents",
    headingFontLabel: "Space Grotesk",
    bodyFontLabel: "Inter",
    swatch: [
      hslTokenToHex("260 20% 5%"),
      hslTokenToHex("280 100% 65%"),
      hslTokenToHex("0 0% 97%"),
    ],
    colors: {
      primary: hslTokenToHex("280 100% 65%"),
      secondary: hslTokenToHex("260 15% 14%"),
      header: hslTokenToHex("260 20% 5%"),
      footer: hslTokenToHex("260 20% 5%"),
      background: hslTokenToHex("260 20% 5%"),
      surface: hslTokenToHex("260 20% 8%"),
      text: hslTokenToHex("0 0% 97%"),
      textDimmed: hslTokenToHex("260 10% 55%"),
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "lovable-ocean-blue",
    name: "Ocean Blue",
    tagline: "Dark: electric blue + cyan",
    headingFontLabel: "Space Grotesk",
    bodyFontLabel: "Inter",
    swatch: [
      hslTokenToHex("220 25% 5%"),
      hslTokenToHex("210 100% 60%"),
      hslTokenToHex("0 0% 97%"),
    ],
    colors: {
      primary: hslTokenToHex("210 100% 60%"),
      secondary: hslTokenToHex("220 15% 14%"),
      header: hslTokenToHex("220 25% 5%"),
      footer: hslTokenToHex("220 25% 5%"),
      background: hslTokenToHex("220 25% 5%"),
      surface: hslTokenToHex("220 25% 8%"),
      text: hslTokenToHex("0 0% 97%"),
      textDimmed: hslTokenToHex("220 10% 55%"),
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "lovable-golden-fire",
    name: "Golden Fire",
    tagline: "Dark: warm gold + orange accents",
    headingFontLabel: "Poppins",
    bodyFontLabel: "DM Sans",
    swatch: [
      hslTokenToHex("25 20% 5%"),
      hslTokenToHex("38 100% 55%"),
      hslTokenToHex("0 0% 97%"),
    ],
    colors: {
      primary: hslTokenToHex("38 100% 55%"),
      secondary: hslTokenToHex("25 15% 14%"),
      header: hslTokenToHex("25 20% 5%"),
      footer: hslTokenToHex("25 20% 5%"),
      background: hslTokenToHex("25 20% 5%"),
      surface: hslTokenToHex("25 20% 8%"),
      text: hslTokenToHex("0 0% 97%"),
      textDimmed: hslTokenToHex("25 10% 55%"),
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "lovable-emerald-night",
    name: "Emerald Night",
    tagline: "Dark: emerald + fresh green accents",
    headingFontLabel: "Outfit",
    bodyFontLabel: "Plus Jakarta Sans",
    swatch: [
      hslTokenToHex("170 25% 4%"),
      hslTokenToHex("160 100% 45%"),
      hslTokenToHex("0 0% 97%"),
    ],
    colors: {
      primary: hslTokenToHex("160 100% 45%"),
      secondary: hslTokenToHex("170 15% 13%"),
      header: hslTokenToHex("170 25% 4%"),
      footer: hslTokenToHex("170 25% 4%"),
      background: hslTokenToHex("170 25% 4%"),
      surface: hslTokenToHex("170 25% 7%"),
      text: hslTokenToHex("0 0% 97%"),
      textDimmed: hslTokenToHex("170 10% 50%"),
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "lovable-red-rose",
    name: "Red Rose",
    tagline: "Dark: rose primary + pink accent",
    headingFontLabel: "Montserrat",
    bodyFontLabel: "Lato",
    swatch: [
      hslTokenToHex("345 20% 5%"),
      hslTokenToHex("350 90% 55%"),
      hslTokenToHex("0 0% 97%"),
    ],
    colors: {
      primary: hslTokenToHex("350 90% 55%"),
      secondary: hslTokenToHex("345 15% 14%"),
      header: hslTokenToHex("345 20% 5%"),
      footer: hslTokenToHex("345 20% 5%"),
      background: hslTokenToHex("345 20% 5%"),
      surface: hslTokenToHex("345 20% 8%"),
      text: hslTokenToHex("0 0% 97%"),
      textDimmed: hslTokenToHex("345 10% 50%"),
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "lovable-midnight-indigo",
    name: "Midnight Indigo",
    tagline: "Dark: indigo primary + violet accent",
    headingFontLabel: "Sora",
    bodyFontLabel: "Nunito Sans",
    swatch: [
      hslTokenToHex("240 25% 5%"),
      hslTokenToHex("245 90% 65%"),
      hslTokenToHex("0 0% 97%"),
    ],
    colors: {
      primary: hslTokenToHex("245 90% 65%"),
      secondary: hslTokenToHex("240 15% 14%"),
      header: hslTokenToHex("240 25% 5%"),
      footer: hslTokenToHex("240 25% 5%"),
      background: hslTokenToHex("240 25% 5%"),
      surface: hslTokenToHex("240 25% 8%"),
      text: hslTokenToHex("0 0% 97%"),
      textDimmed: hslTokenToHex("240 10% 55%"),
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    id: "lovable-lavender-light",
    name: "Lavender Light",
    tagline: "Light: lavender base + magenta accent",
    headingFontLabel: "Space Grotesk",
    bodyFontLabel: "Inter",
    swatch: [
      hslTokenToHex("270 20% 98%"),
      hslTokenToHex("280 80% 55%"),
      hslTokenToHex("260 25% 12%"),
    ],
    colors: {
      primary: hslTokenToHex("280 80% 55%"),
      secondary: hslTokenToHex("270 15% 94%"),
      header: hslTokenToHex("0 0% 100%"),
      footer: hslTokenToHex("270 15% 94%"),
      background: hslTokenToHex("270 20% 98%"),
      surface: hslTokenToHex("0 0% 100%"),
      text: hslTokenToHex("260 25% 12%"),
      textDimmed: hslTokenToHex("260 10% 45%"),
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "lovable-sky-breeze",
    name: "Sky Breeze",
    tagline: "Light: sky blue + crisp neutrals",
    headingFontLabel: "Poppins",
    bodyFontLabel: "DM Sans",
    swatch: [
      hslTokenToHex("210 30% 98%"),
      hslTokenToHex("210 90% 50%"),
      hslTokenToHex("220 30% 10%"),
    ],
    colors: {
      primary: hslTokenToHex("210 90% 50%"),
      secondary: hslTokenToHex("210 15% 94%"),
      header: hslTokenToHex("0 0% 100%"),
      footer: hslTokenToHex("210 15% 94%"),
      background: hslTokenToHex("210 30% 98%"),
      surface: hslTokenToHex("0 0% 100%"),
      text: hslTokenToHex("220 30% 10%"),
      textDimmed: hslTokenToHex("220 10% 45%"),
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "lovable-warm-sand",
    name: "Warm Sand",
    tagline: "Light: warm neutrals + orange accent",
    headingFontLabel: "Outfit",
    bodyFontLabel: "Plus Jakarta Sans",
    swatch: [
      hslTokenToHex("35 30% 97%"),
      hslTokenToHex("25 90% 50%"),
      hslTokenToHex("25 30% 12%"),
    ],
    colors: {
      primary: hslTokenToHex("25 90% 50%"),
      secondary: hslTokenToHex("30 15% 93%"),
      header: hslTokenToHex("30 20% 100%"),
      footer: hslTokenToHex("30 15% 93%"),
      background: hslTokenToHex("35 30% 97%"),
      surface: hslTokenToHex("30 20% 100%"),
      text: hslTokenToHex("25 30% 12%"),
      textDimmed: hslTokenToHex("25 10% 45%"),
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "lovable-mint-fresh",
    name: "Mint Fresh",
    tagline: "Light: mint base + green accent",
    headingFontLabel: "Montserrat",
    bodyFontLabel: "Lato",
    swatch: [
      hslTokenToHex("150 20% 97%"),
      hslTokenToHex("160 80% 40%"),
      hslTokenToHex("160 30% 10%"),
    ],
    colors: {
      primary: hslTokenToHex("160 80% 40%"),
      secondary: hslTokenToHex("150 15% 93%"),
      header: hslTokenToHex("0 0% 100%"),
      footer: hslTokenToHex("150 15% 93%"),
      background: hslTokenToHex("150 20% 97%"),
      surface: hslTokenToHex("0 0% 100%"),
      text: hslTokenToHex("160 30% 10%"),
      textDimmed: hslTokenToHex("160 10% 45%"),
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "lovable-rose-petal",
    name: "Rose Petal",
    tagline: "Light: rose base + warm accents",
    headingFontLabel: "Raleway",
    bodyFontLabel: "Open Sans",
    swatch: [
      hslTokenToHex("350 25% 97%"),
      hslTokenToHex("340 75% 55%"),
      hslTokenToHex("345 25% 12%"),
    ],
    colors: {
      primary: hslTokenToHex("340 75% 55%"),
      secondary: hslTokenToHex("350 15% 93%"),
      header: hslTokenToHex("0 0% 100%"),
      footer: hslTokenToHex("350 15% 93%"),
      background: hslTokenToHex("350 25% 97%"),
      surface: hslTokenToHex("0 0% 100%"),
      text: hslTokenToHex("345 25% 12%"),
      textDimmed: hslTokenToHex("345 10% 45%"),
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "lovable-clean-white",
    name: "Clean White",
    tagline: "Light: clean white base + cool accents",
    headingFontLabel: "Space Grotesk",
    bodyFontLabel: "Inter",
    swatch: [
      hslTokenToHex("0 0% 100%"),
      hslTokenToHex("240 60% 55%"),
      hslTokenToHex("240 10% 10%"),
    ],
    colors: {
      primary: hslTokenToHex("240 60% 55%"),
      secondary: hslTokenToHex("240 5% 96%"),
      header: hslTokenToHex("0 0% 100%"),
      footer: hslTokenToHex("240 5% 96%"),
      background: hslTokenToHex("0 0% 100%"),
      surface: hslTokenToHex("0 0% 100%"),
      text: hslTokenToHex("240 10% 10%"),
      textDimmed: hslTokenToHex("240 4% 46%"),
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  // Venue recipes from the Stock Brook / customer-site brand audit.
  // Tapping one in Try theme applies colors + fonts + heading emphasis together.
  {
    id: "venue-estate-green",
    name: "Estate Green",
    tagline: "Country club default",
    headingFontLabel: "Fraunces",
    bodyFontLabel: "Source Sans 3",
    headingEmphasis: "accent_tail",
    swatch: ["#10231B", "#1E4B3B", "#C29A3B"],
    colors: {
      primary: "#1E4B3B",
      secondary: "#C29A3B",
      header: "#10231B",
      footer: "#0C1811",
      background: "#F6F4EE",
      surface: "#FFFFFF",
      text: "#1F2A24",
      textDimmed: "#5E6B63",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "venue-wine-candlelight",
    name: "Wine & Candlelight",
    tagline: "Christmas & concerts",
    headingFontLabel: "Cormorant Garamond",
    bodyFontLabel: "Karla",
    headingEmphasis: "accent_tail",
    swatch: ["#2A1218", "#6B2231", "#D9A441"],
    colors: {
      primary: "#6B2231",
      secondary: "#D9A441",
      header: "#2A1218",
      footer: "#1E0D12",
      background: "#FAF6F1",
      surface: "#FFFFFF",
      text: "#2A1B1E",
      textDimmed: "#6E5A5E",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "venue-midnight-navy-brass",
    name: "Midnight Navy",
    tagline: "Corporate dinners",
    headingFontLabel: "Marcellus",
    bodyFontLabel: "Work Sans",
    headingEmphasis: "uniform",
    swatch: ["#0F1929", "#1C2E4A", "#C9A961"],
    colors: {
      primary: "#1C2E4A",
      secondary: "#C9A961",
      header: "#0F1929",
      footer: "#0A111C",
      background: "#F4F5F7",
      surface: "#FFFFFF",
      text: "#1B2430",
      textDimmed: "#5B6572",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "venue-terracotta-sage",
    name: "Terracotta Sage",
    tagline: "Summer garden parties",
    headingFontLabel: "Playfair Display",
    bodyFontLabel: "Public Sans",
    headingEmphasis: "accent_tail",
    swatch: ["#3A2A22", "#A84B25", "#4E5F45"],
    colors: {
      primary: "#A84B25",
      secondary: "#4E5F45",
      header: "#3A2A22",
      footer: "#2A1E18",
      background: "#FAF5EF",
      surface: "#FFFFFF",
      text: "#2E2620",
      textDimmed: "#6E6259",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "venue-rosewood-blush",
    name: "Rosewood Blush",
    tagline: "Weddings & afternoon tea",
    headingFontLabel: "EB Garamond",
    bodyFontLabel: "Jost",
    headingEmphasis: "accent_tail",
    swatch: ["#33141E", "#8A3B4A", "#D4A054"],
    colors: {
      primary: "#8A3B4A",
      secondary: "#D4A054",
      header: "#33141E",
      footer: "#25101A",
      background: "#FBF5F3",
      surface: "#FFFFFF",
      text: "#2E1B21",
      textDimmed: "#6E5D66",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "venue-slate-copper",
    name: "Slate & Copper",
    tagline: "Modern boathouse",
    headingFontLabel: "Archivo",
    bodyFontLabel: "Karla",
    headingEmphasis: "uniform",
    swatch: ["#171B1E", "#2F3A3F", "#C17A4F"],
    colors: {
      primary: "#2F3A3F",
      secondary: "#C17A4F",
      header: "#171B1E",
      footer: "#101315",
      background: "#F3F2F0",
      surface: "#FFFFFF",
      text: "#23282B",
      textDimmed: "#5D6468",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
  {
    id: "venue-noir-champagne",
    name: "Noir & Champagne",
    tagline: "Black tie & NYE",
    headingFontLabel: "Fraunces",
    bodyFontLabel: "Source Sans 3",
    headingEmphasis: "uniform",
    swatch: ["#0B0D0E", "#14181A", "#C7A24B"],
    colors: {
      primary: "#14181A",
      secondary: "#C7A24B",
      header: "#0B0D0E",
      footer: "#070808",
      background: "#F7F6F2",
      surface: "#FFFFFF",
      text: "#16181A",
      textDimmed: "#5C5F63",
      socialLogin: { ...SOCIAL_LOGIN_LIGHT },
    },
  },
];

export const SITE_THEME_PRESETS: SiteThemePreset[] =
  PRESET_SHELLS.map(withTypography);

/**
 * Unique https CDN stylesheet URLs from all presets (e.g. cdnfonts.com).
 * Used to preload @font-face before "Apply" so preset grid previews match applied typography.
 */
export function allPresetGridCdnStylesheetUrls(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of SITE_THEME_PRESETS) {
    for (const href of normalizeCustomFontStylesheetUrls(
      p.typography.customFontStylesheetUrls,
    )) {
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

/**
 * Curated Google-only pairs for Try theme (beyond full color presets). Deduped
 * against preset pairs when building {@link TRY_THEME_FONT_GRID_OPTIONS}.
 */
export const TRY_THEME_EXTRA_FONT_PAIRS: ReadonlyArray<{
  key: string;
  headingFontLabel: string;
  bodyFontLabel: string;
  headingStack: string;
  bodyStack: string;
  tagline: string;
}> = [
  {
    key: "cinzel-outfit",
    headingFontLabel: "Cinzel",
    bodyFontLabel: "Outfit",
    headingStack: siteEssentialsGoogleFontStack("Cinzel"),
    bodyStack: siteEssentialsGoogleFontStack("Outfit"),
    tagline: "Roman luxury headlines with a clean geometric body",
  },
  {
    key: "cormorant-plus-jakarta",
    headingFontLabel: "Cormorant Garamond",
    bodyFontLabel: "Plus Jakarta Sans",
    headingStack: siteEssentialsGoogleFontStack("Cormorant Garamond"),
    bodyStack: siteEssentialsGoogleFontStack("Plus Jakarta Sans"),
    tagline: "Editorial serif meets modern startup polish",
  },
  {
    key: "fraunces-sora",
    headingFontLabel: "Fraunces",
    bodyFontLabel: "Sora",
    headingStack: siteEssentialsGoogleFontStack("Fraunces"),
    bodyStack: siteEssentialsGoogleFontStack("Sora"),
    tagline: "Expressive display with a soft, futuristic body",
  },
  {
    key: "dm-serif-instrument",
    headingFontLabel: "DM Serif Display",
    bodyFontLabel: "Instrument Sans",
    headingStack: siteEssentialsGoogleFontStack("DM Serif Display"),
    bodyStack: siteEssentialsGoogleFontStack("Instrument Sans"),
    tagline: "High-contrast editorial titles, neutral reading text",
  },
  {
    key: "eb-garamond-space",
    headingFontLabel: "EB Garamond",
    bodyFontLabel: "Space Grotesk",
    headingStack: siteEssentialsGoogleFontStack("EB Garamond"),
    bodyStack: siteEssentialsGoogleFontStack("Space Grotesk"),
    tagline: "Classic book typography with tech-forward UI body",
  },
  {
    key: "crimson-dm-sans",
    headingFontLabel: "Crimson Text",
    bodyFontLabel: "DM Sans",
    headingStack: siteEssentialsGoogleFontStack("Crimson Text"),
    bodyStack: siteEssentialsGoogleFontStack("DM Sans"),
    tagline: "Readable long-form serif with a friendly sans companion",
  },
  {
    key: "syne-inter",
    headingFontLabel: "Syne",
    bodyFontLabel: "Inter",
    headingStack: siteEssentialsGoogleFontStack("Syne"),
    bodyStack: siteEssentialsGoogleFontStack("Inter"),
    tagline: "Bold gallery-style headings and neutral interface copy",
  },
];

/**
 * Color-only palettes for Try theme (beyond full SITE_THEME_PRESETS). Deduped
 * against preset palettes when building {@link TRY_THEME_COLOR_GRID_OPTIONS}.
 */
export const TRY_THEME_EXTRA_COLOR_PALETTES: ReadonlyArray<{
  key: string;
  name: string;
  tagline: string;
  swatch: [string, string, string];
  colors: SiteEssentialsFormValues["colors"];
}> = [
  {
    key: "teal-abyss",
    name: "Teal Abyss",
    tagline: "Spa retreats, dive bars, and coastal nightlife",
    swatch: ["#031a18", "#2dd4bf", "#ecfdf5"],
    colors: {
      primary: "#2dd4bf",
      secondary: "#115e59",
      header: "#042f2e",
      footer: "#021c1a",
      background: "#031a18",
      surface: "#134e4a",
      text: "#ecfdf5",
      textDimmed: "#5eead4",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    key: "lilac-studio",
    name: "Lilac Studio",
    tagline: "Design studios, podcasts, and creative collectives",
    swatch: ["#16131f", "#a5b4fc", "#eef2ff"],
    colors: {
      primary: "#a5b4fc",
      secondary: "#4338ca",
      header: "#1e1b2e",
      footer: "#12101c",
      background: "#16131f",
      surface: "#252136",
      text: "#eef2ff",
      textDimmed: "#c7d2fe",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    key: "jade-noir",
    name: "Jade Noir",
    tagline: "Plant shops, yoga immersions, and eco product launches",
    swatch: ["#071512", "#4ade80", "#f0fdf4"],
    colors: {
      primary: "#4ade80",
      secondary: "#166534",
      header: "#0c1f16",
      footer: "#050f0c",
      background: "#071512",
      surface: "#14532d",
      text: "#f0fdf4",
      textDimmed: "#86efac",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    key: "amber-district",
    name: "Amber District",
    tagline: "Street food nights, jazz lounges, and golden-hour weddings",
    swatch: ["#17130a", "#fbbf24", "#fffbeb"],
    colors: {
      primary: "#fbbf24",
      secondary: "#b45309",
      header: "#1f170c",
      footer: "#0f0c06",
      background: "#17130a",
      surface: "#2d2212",
      text: "#fffbeb",
      textDimmed: "#fde68a",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
  {
    key: "deep-indigo",
    name: "Deep Indigo",
    tagline: "Dev conferences, SaaS launches, and midnight hackathons",
    swatch: ["#0f0f23", "#818cf8", "#eef2ff"],
    colors: {
      primary: "#818cf8",
      secondary: "#3730a3",
      header: "#14142b",
      footer: "#0a0a18",
      background: "#0f0f23",
      surface: "#1e1b4b",
      text: "#eef2ff",
      textDimmed: "#a5b4fc",
      socialLogin: { ...SOCIAL_LOGIN_DARK },
    },
  },
];

/**
 * Every Site Essentials Google family needed for preset cards + Try theme grid.
 */
export function allPresetGridGoogleFontFamilies(): string[] {
  const seen = new Set<string>();
  const addStacks = (heading?: string, body?: string) => {
    for (const name of collectSiteEssentialsGoogleFamilies(heading, body)) {
      seen.add(name);
    }
  };
  for (const p of SITE_THEME_PRESETS) {
    addStacks(p.typography.fontFamily.heading, p.typography.fontFamily.body);
  }
  for (const x of TRY_THEME_EXTRA_FONT_PAIRS) {
    addStacks(x.headingStack, x.bodyStack);
  }
  return [...seen];
}

/** True when the preset injects at least one https custom font stylesheet. */
export function presetIncludesCdnStylesheets(preset: SiteThemePreset): boolean {
  return (preset.typography.customFontStylesheetUrls?.length ?? 0) > 0;
}

/** Stable key for comparing heading/body stacks (preview + form). */
export function siteEssentialsFontPairKey(
  typography:
    | Pick<
        SiteEssentialsFormValues["typography"],
        "fontFamily"
      >
    | undefined,
): string {
  const h = typography?.fontFamily?.heading ?? "";
  const b = typography?.fontFamily?.body ?? "";
  return `${h}\0${b}`;
}

function normColor(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** Full palette equality (preview grid active state, dedupe). */
export function siteEssentialsColorsMatch(
  a: SiteEssentialsFormValues["colors"],
  b: SiteEssentialsFormValues["colors"],
): boolean {
  return (
    normColor(a.primary) === normColor(b.primary) &&
    normColor(a.secondary) === normColor(b.secondary) &&
    normColor(a.header) === normColor(b.header) &&
    normColor(a.footer) === normColor(b.footer) &&
    normColor(a.background) === normColor(b.background) &&
    normColor(a.surface) === normColor(b.surface) &&
    normColor(a.text) === normColor(b.text) &&
    normColor(a.textDimmed) === normColor(b.textDimmed) &&
    normColor(a.socialLogin?.google) === normColor(b.socialLogin?.google) &&
    normColor(a.socialLogin?.microsoft) ===
      normColor(b.socialLogin?.microsoft)
  );
}

function normFontStack(v: string | undefined): string {
  return (v ?? "").trim().replace(/\s+/g, " ");
}

/** Same URLs regardless of order (API / form may reorder). */
function normalizedStylesheetUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const out = new Set<string>();
  for (const item of urls) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t) out.add(t);
  }
  return [...out].sort();
}

function typographyMatch(
  a: SiteEssentialsFormValues["typography"],
  b: SiteEssentialsFormValues["typography"],
): boolean {
  const urlsA = normalizedStylesheetUrls(a.customFontStylesheetUrls);
  const urlsB = normalizedStylesheetUrls(b.customFontStylesheetUrls);
  if (urlsA.length !== urlsB.length) return false;
  if (!urlsA.every((u, i) => u === urlsB[i])) return false;
  return (
    normFontStack(a.fontFamily?.heading) ===
      normFontStack(b.fontFamily?.heading) &&
    normFontStack(a.fontFamily?.body) === normFontStack(b.fontFamily?.body)
  );
}

export function getMatchingSiteThemePresetId(
  values: Pick<SiteEssentialsFormValues, "colors" | "typography">,
): SiteThemePresetId | null {
  for (const p of SITE_THEME_PRESETS) {
    if (
      siteEssentialsColorsMatch(values.colors, p.colors) &&
      typographyMatch(values.typography, p.typography)
    ) {
      return p.id;
    }
  }
  return null;
}

export function applySiteThemePreset(
  preset: SiteThemePreset,
  setValue: UseFormSetValue<SiteEssentialsFormValues>,
  getValues: UseFormGetValues<SiteEssentialsFormValues>,
): void {
  const opts = { shouldDirty: true, shouldTouch: true } as const;
  const prevTypography = getValues("typography");
  setValue("colors", { ...preset.colors }, opts);
  setValue(
    "typography",
    {
      ...(prevTypography
        ? (() => {
            try {
              return structuredClone(prevTypography);
            } catch {
              return JSON.parse(JSON.stringify(prevTypography));
            }
          })()
        : {}),
      fontFamily: { ...preset.typography.fontFamily },
      customFontStylesheetUrls: [
        ...(preset.typography.customFontStylesheetUrls ?? []) as string[],
      ],
      ...(preset.headingEmphasis
        ? { headingEmphasis: preset.headingEmphasis }
        : {}),
    },
    opts,
  );
}

/** Distinct heading/body pairs from presets — preview customizer font grid. */
export const PREVIEW_FONT_OPTIONS: Array<{
  id: SiteThemePresetId;
  headingFontLabel: string;
  bodyFontLabel: string;
  headingStack: string;
  bodyStack: string;
}> = (() => {
  const seen = new Set<string>();
  const out: Array<{
    id: SiteThemePresetId;
    headingFontLabel: string;
    bodyFontLabel: string;
    headingStack: string;
    bodyStack: string;
  }> = [];
  for (const p of SITE_THEME_PRESETS) {
    const key = siteEssentialsFontPairKey(p.typography);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: p.id,
      headingFontLabel: p.headingFontLabel,
      bodyFontLabel: p.bodyFontLabel,
      headingStack: p.typography.fontFamily.heading,
      bodyStack: p.typography.fontFamily.body,
    });
  }
  return out;
})();

export type TryThemeFontGridOption =
  | {
      source: "preset";
      id: SiteThemePresetId;
      headingFontLabel: string;
      bodyFontLabel: string;
      headingStack: string;
      bodyStack: string;
      tagline: string;
    }
  | {
      source: "extra";
      key: string;
      headingFontLabel: string;
      bodyFontLabel: string;
      headingStack: string;
      bodyStack: string;
      tagline: string;
    };

/** Preset pairs + premium extra pairs for Try theme / preview sidebar (deduped). */
export const TRY_THEME_FONT_GRID_OPTIONS: TryThemeFontGridOption[] = (() => {
  const seen = new Set<string>();
  const out: TryThemeFontGridOption[] = [];
  const stackKey = (h: string, b: string) => `${h}\0${b}`;
  for (const p of PREVIEW_FONT_OPTIONS) {
    const k = stackKey(p.headingStack, p.bodyStack);
    if (seen.has(k)) continue;
    seen.add(k);
    const presetRow = SITE_THEME_PRESETS.find((pr) => pr.id === p.id);
    out.push({
      source: "preset",
      id: p.id,
      headingFontLabel: p.headingFontLabel,
      bodyFontLabel: p.bodyFontLabel,
      headingStack: p.headingStack,
      bodyStack: p.bodyStack,
      tagline: presetRow?.tagline ?? "",
    });
  }
  for (const x of TRY_THEME_EXTRA_FONT_PAIRS) {
    const k = stackKey(x.headingStack, x.bodyStack);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      source: "extra",
      key: x.key,
      headingFontLabel: x.headingFontLabel,
      bodyFontLabel: x.bodyFontLabel,
      headingStack: x.headingStack,
      bodyStack: x.bodyStack,
      tagline: x.tagline,
    });
  }
  return out;
})();

export type TryThemeColorGridOption =
  | {
      source: "preset";
      id: SiteThemePresetId;
      name: string;
      tagline: string;
      swatch: [string, string, string];
      colors: SiteEssentialsFormValues["colors"];
    }
  | {
      source: "extra";
      key: string;
      name: string;
      tagline: string;
      swatch: [string, string, string];
      colors: SiteEssentialsFormValues["colors"];
    };

/** Preset palettes + extra color-only options for Try theme (deduped by full palette). */
export const TRY_THEME_COLOR_GRID_OPTIONS: TryThemeColorGridOption[] = (() => {
  const out: TryThemeColorGridOption[] = [];
  const pushUnique = (opt: TryThemeColorGridOption) => {
    for (const existing of out) {
      if (siteEssentialsColorsMatch(existing.colors, opt.colors)) return;
    }
    out.push(opt);
  };
  for (const p of SITE_THEME_PRESETS) {
    pushUnique({
      source: "preset",
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      swatch: p.swatch,
      colors: p.colors,
    });
  }
  for (const x of TRY_THEME_EXTRA_COLOR_PALETTES) {
    pushUnique({
      source: "extra",
      key: x.key,
      name: x.name,
      tagline: x.tagline,
      swatch: x.swatch,
      colors: x.colors,
    });
  }
  return out;
})();

/** Apply Google heading/body only (clears CDN stylesheets — use after script presets). */
export function mergeGoogleOnlyFontsIntoValues(
  values: SiteEssentialsFormValues,
  headingStack: string,
  bodyStack: string,
): SiteEssentialsFormValues {
  return {
    ...values,
    typography: {
      ...values.typography,
      fontFamily: { heading: headingStack, body: bodyStack },
      customFontStylesheetUrls: [],
    },
  };
}

export function mergeColorPaletteIntoValues(
  values: SiteEssentialsFormValues,
  colors: SiteEssentialsFormValues["colors"],
): SiteEssentialsFormValues {
  return {
    ...values,
    colors: { ...colors },
  };
}

export function mergePresetColorsIntoValues(
  values: SiteEssentialsFormValues,
  preset: SiteThemePreset,
): SiteEssentialsFormValues {
  return mergeColorPaletteIntoValues(values, preset.colors);
}

export function mergePresetFontsIntoValues(
  values: SiteEssentialsFormValues,
  preset: SiteThemePreset,
): SiteEssentialsFormValues {
  return {
    ...values,
    typography: {
      ...values.typography,
      fontFamily: { ...preset.typography.fontFamily },
      customFontStylesheetUrls: [
        ...(preset.typography.customFontStylesheetUrls ?? []),
      ],
    },
  };
}

/** Full venue recipe: colors + fonts + recommended heading emphasis. */
export function mergeFullPresetIntoValues(
  values: SiteEssentialsFormValues,
  preset: SiteThemePreset,
): SiteEssentialsFormValues {
  const withFonts = mergePresetFontsIntoValues(values, preset);
  return {
    ...withFonts,
    colors: { ...preset.colors },
    typography: {
      ...withFonts.typography,
      ...(preset.headingEmphasis
        ? { headingEmphasis: preset.headingEmphasis }
        : {}),
    },
  };
}

export function tryThemeFontGridOptionStorageKey(
  opt: TryThemeFontGridOption,
): string {
  return opt.source === "preset" ? `preset:${opt.id}` : `extra:${opt.key}`;
}

export function tryThemeColorGridOptionStorageKey(
  opt: TryThemeColorGridOption,
): string {
  return opt.source === "preset" ? `preset:${opt.id}` : `extra:${opt.key}`;
}
