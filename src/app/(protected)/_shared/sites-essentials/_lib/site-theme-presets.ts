import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { SiteEssentialsFormValues } from "./schema";
import { siteEssentialsGoogleFontStack } from "@/lib/site-typography-google-fonts";

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

function colorsMatch(
  a: SiteEssentialsFormValues["colors"],
  b: SiteEssentialsFormValues["colors"],
): boolean {
  return (
    (a.primary || "") === (b.primary || "") &&
    (a.secondary || "") === (b.secondary || "") &&
    (a.header || "") === (b.header || "") &&
    (a.footer || "") === (b.footer || "") &&
    (a.background || "") === (b.background || "") &&
    (a.surface || "") === (b.surface || "") &&
    (a.text || "") === (b.text || "") &&
    (a.textDimmed || "") === (b.textDimmed || "") &&
    (a.socialLogin?.google || "") === (b.socialLogin?.google || "") &&
    (a.socialLogin?.microsoft || "") === (b.socialLogin?.microsoft || "")
  );
}

function typographyMatch(
  a: SiteEssentialsFormValues["typography"],
  b: SiteEssentialsFormValues["typography"],
): boolean {
  const urlsA = a.customFontStylesheetUrls ?? [];
  const urlsB = b.customFontStylesheetUrls ?? [];
  if (urlsA.length !== urlsB.length) return false;
  if (!urlsA.every((u, i) => u === urlsB[i])) return false;
  return (
    (a.fontFamily?.heading || "") === (b.fontFamily?.heading || "") &&
    (a.fontFamily?.body || "") === (b.fontFamily?.body || "")
  );
}

export function getMatchingSiteThemePresetId(
  values: Pick<SiteEssentialsFormValues, "colors" | "typography">,
): SiteThemePresetId | null {
  for (const p of SITE_THEME_PRESETS) {
    if (
      colorsMatch(values.colors, p.colors) &&
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

export function mergePresetColorsIntoValues(
  values: SiteEssentialsFormValues,
  preset: SiteThemePreset,
): SiteEssentialsFormValues {
  return {
    ...values,
    colors: { ...preset.colors },
  };
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
