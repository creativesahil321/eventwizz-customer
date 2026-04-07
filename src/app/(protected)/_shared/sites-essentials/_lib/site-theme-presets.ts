import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { SiteEssentialsFormValues } from "./schema";
import { normalizeCustomFontStylesheetUrls } from "@/lib/site-custom-font-stylesheets";
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
  | "mono-carbon"
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
  | "pinyon-formal";

export interface SiteThemePreset {
  id: SiteThemePresetId;
  name: string;
  tagline: string;
  headingFontLabel: string;
  bodyFontLabel: string;
  swatch: [string, string, string];
  colors: SiteEssentialsFormValues["colors"];
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
    id: "mono-carbon",
    name: "Mono Carbon",
    tagline: "Music, clubs, and bold monochrome aesthetics",
    headingFontLabel: "Oswald",
    bodyFontLabel: "Roboto",
    swatch: ["#0a0a0a", "#fafafa", "#737373"],
    colors: {
      primary: "#fafafa",
      secondary: "#737373",
      header: "#171717",
      footer: "#0a0a0a",
      background: "#0a0a0a",
      surface: "#262626",
      text: "#fafafa",
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
    swatch: ["#1a0f14", "#f472b6", "#fce7f3"],
    colors: {
      primary: "#f472b6",
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
    swatch: ["#0a1628", "#d4af37", "#faf8f3"],
    colors: {
      primary: "#d4af37",
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
    swatch: ["#1c261c", "#a3b18a", "#f4f1e8"],
    colors: {
      primary: "#a3b18a",
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
    swatch: ["#1e1034", "#a78bfa", "#f5f3ff"],
    colors: {
      primary: "#a78bfa",
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
    swatch: ["#292524", "#d6c0a4", "#faf7f2"],
    colors: {
      primary: "#d6c0a4",
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
    swatch: ["#1f1410", "#c9a87c", "#fdf8f3"],
    colors: {
      primary: "#c9a87c",
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
    swatch: ["#142018", "#86b893", "#f0fdf4"],
    colors: {
      primary: "#86b893",
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
    swatch: ["#0f172a", "#cbd5e1", "#f8fafc"],
    colors: {
      primary: "#cbd5e1",
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
    key: "fuchsia-velvet",
    name: "Fuchsia Velvet",
    tagline: "DJ sets, drag brunches, and bold beauty brands",
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
    key: "copper-patina",
    name: "Copper Patina",
    tagline: "Whiskey tastings, steampunk fairs, and craft makers",
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
  {
    key: "crimson-eclipse",
    name: "Crimson Eclipse",
    tagline: "Valentine galas, burlesque revues, and runway afterparties",
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
    key: "peach-cream",
    name: "Peach Cream",
    tagline: "Brunch pop-ups, baby showers, and sunny farmers markets",
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
    key: "slate-editorial",
    name: "Slate Editorial",
    tagline: "Magazine sites, speaker series, and minimalist portfolios",
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
    key: "rose-clay",
    name: "Rose Clay",
    tagline: "Bridal fairs, florists, and romantic workshop series",
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
    key: "mint-breeze",
    name: "Mint Breeze",
    tagline: "Dental open houses, med-spa promos, and clean beauty",
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
      ...prevTypography,
      fontFamily: { ...preset.typography.fontFamily },
      customFontStylesheetUrls: [
        ...(preset.typography.customFontStylesheetUrls ?? []) as string[],
      ],
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
