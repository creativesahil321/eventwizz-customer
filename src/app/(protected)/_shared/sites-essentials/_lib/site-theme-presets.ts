import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { SiteEssentialsFormValues } from "./schema";
import { siteEssentialsGoogleFontStack } from "@/lib/site-typography-google-fonts";

/**
 * OAuth buttons use these hex values as full button backgrounds with white label
 * text (see OAuthButtons). Never use white or near-white here — it hides the text.
 * Note: `colors.socialLogin.microsoft` drives the Facebook button in the app.
 */
const PRESET_SOCIAL_GOOGLE_BG = "#1a73e8";
const PRESET_SOCIAL_FACEBOOK_BG = "#1877f2";

export type SiteThemePresetId =
  | "dark-elegant"
  | "royal-blue"
  | "emerald-night"
  | "warm-sunset"
  | "minimal-light"
  | "mono-carbon";

export interface SiteThemePreset {
  id: SiteThemePresetId;
  name: string;
  tagline: string;
  /** Short labels for the card (must match loaded Google presets). */
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
 * Curated professional bundles (colors + typography). All fonts use stacks from
 * Site Essentials Google font presets — no extra stylesheets required.
 */
export const SITE_THEME_PRESETS: SiteThemePreset[] = [
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
      socialLogin: {
        google: PRESET_SOCIAL_GOOGLE_BG,
        microsoft: PRESET_SOCIAL_FACEBOOK_BG,
      },
    },
    typography: {
      fontFamily: {
        heading: siteEssentialsGoogleFontStack("Playfair Display"),
        body: siteEssentialsGoogleFontStack("Lato"),
      },
      customFontStylesheetUrls: [],
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
      socialLogin: {
        google: PRESET_SOCIAL_GOOGLE_BG,
        microsoft: PRESET_SOCIAL_FACEBOOK_BG,
      },
    },
    typography: {
      fontFamily: {
        heading: siteEssentialsGoogleFontStack("Merriweather"),
        body: siteEssentialsGoogleFontStack("Open Sans"),
      },
      customFontStylesheetUrls: [],
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
      socialLogin: {
        google: PRESET_SOCIAL_GOOGLE_BG,
        microsoft: PRESET_SOCIAL_FACEBOOK_BG,
      },
    },
    typography: {
      fontFamily: {
        heading: siteEssentialsGoogleFontStack("Merriweather"),
        body: siteEssentialsGoogleFontStack("Montserrat"),
      },
      customFontStylesheetUrls: [],
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
      socialLogin: {
        google: PRESET_SOCIAL_GOOGLE_BG,
        microsoft: PRESET_SOCIAL_FACEBOOK_BG,
      },
    },
    typography: {
      fontFamily: {
        heading: siteEssentialsGoogleFontStack("Playfair Display"),
        body: siteEssentialsGoogleFontStack("Nunito"),
      },
      customFontStylesheetUrls: [],
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
      socialLogin: {
        google: "#4285F4",
        microsoft: PRESET_SOCIAL_FACEBOOK_BG,
      },
    },
    typography: {
      fontFamily: {
        heading: siteEssentialsGoogleFontStack("Poppins"),
        body: siteEssentialsGoogleFontStack("Open Sans"),
      },
      customFontStylesheetUrls: [],
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
      socialLogin: {
        google: PRESET_SOCIAL_GOOGLE_BG,
        microsoft: PRESET_SOCIAL_FACEBOOK_BG,
      },
    },
    typography: {
      fontFamily: {
        heading: siteEssentialsGoogleFontStack("Oswald"),
        body: siteEssentialsGoogleFontStack("Roboto"),
      },
      customFontStylesheetUrls: [],
    },
  },
];

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

/** Returns the preset id if the form exactly matches a bundle, else null. */
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

/** Distinct heading/body pairs from presets — for preview customizer font grid. */
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
    const h = p.typography.fontFamily.heading;
    const b = p.typography.fontFamily.body;
    const key = `${h}\0${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: p.id,
      headingFontLabel: p.headingFontLabel,
      bodyFontLabel: p.bodyFontLabel,
      headingStack: h,
      bodyStack: b,
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
