import type { ThemeSchema } from "@/types/theme.types";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";

/**
 * Default vendor-site preview theme for onboarding (Site Essentials preset: Clean White).
 * Mirrors backend `default_theme` until persistence GET returns vendor-specific values.
 */
export const ONBOARDING_DEFAULT_THEME: ThemeSchema = {
  colors: {
    primary: "#4747d1",
    secondary: "#f4f4f5",
    header: "#ffffff",
    footer: "#f4f4f5",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#17171c",
    textDimmed: "#71717a",
    socialLogin: {
      google: "#4285F4",
      microsoft: "#1877f2",
    },
  },
  typography: {
    fontFamily: {
      heading: "Space Grotesk, sans-serif",
      body: "Inter, sans-serif",
    },
    customFontStylesheetUrls: [],
    headingEmphasis: "accent_tail",
  },
  socialLinks: {
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeSocialLinks(
  raw: unknown,
): ThemeSchema["socialLinks"] {
  const fallback = ONBOARDING_DEFAULT_THEME.socialLinks ?? {};
  if (!isRecord(raw)) return { ...fallback };

  return {
    facebook: readString(raw.facebook, fallback.facebook ?? ""),
    twitter: readString(raw.twitter, fallback.twitter ?? ""),
    instagram: readString(raw.instagram, fallback.instagram ?? ""),
    linkedin: readString(raw.linkedin, fallback.linkedin ?? ""),
    youtube: readString(raw.youtube, fallback.youtube ?? ""),
  };
}

function normalizeThemeColors(
  raw: unknown,
): NonNullable<ThemeSchema["colors"]> {
  const fallback = ONBOARDING_DEFAULT_THEME.colors!;
  if (!isRecord(raw)) return { ...fallback };

  const socialRaw = isRecord(raw.socialLogin) ? raw.socialLogin : {};
  return {
    primary: readString(raw.primary, fallback.primary),
    secondary: readString(raw.secondary, fallback.secondary),
    header: readString(raw.header, fallback.header ?? "#ffffff"),
    footer: readString(raw.footer, fallback.footer ?? "#f4f4f5"),
    background: readString(raw.background, fallback.background ?? "#ffffff"),
    surface: readString(raw.surface, fallback.surface ?? "#ffffff"),
    text: readString(raw.text, fallback.text ?? "#17171c"),
    textDimmed: readString(raw.textDimmed, fallback.textDimmed ?? "#71717a"),
    socialLogin: {
      google: readString(
        socialRaw.google,
        fallback.socialLogin?.google ?? "#4285F4",
      ),
      microsoft: readString(
        socialRaw.microsoft,
        fallback.socialLogin?.microsoft ?? "#1877f2",
      ),
    },
  };
}

function normalizeThemeTypography(
  raw: unknown,
): NonNullable<ThemeSchema["typography"]> {
  const fallback = ONBOARDING_DEFAULT_THEME.typography!;
  if (!isRecord(raw)) return { ...fallback };

  const fontFamilyRaw = isRecord(raw.fontFamily) ? raw.fontFamily : {};
  const customUrls = Array.isArray(raw.customFontStylesheetUrls)
    ? raw.customFontStylesheetUrls.filter(
        (url): url is string => typeof url === "string" && url.trim().length > 0,
      )
    : (fallback.customFontStylesheetUrls ?? []);

  return {
    fontFamily: {
      heading: readString(
        fontFamilyRaw.heading,
        fallback.fontFamily?.heading ?? "Space Grotesk, sans-serif",
      ),
      body: readString(
        fontFamilyRaw.body,
        fallback.fontFamily?.body ?? "Inter, sans-serif",
      ),
    },
    customFontStylesheetUrls: customUrls,
    headingEmphasis: normalizeHeadingEmphasis(
      raw.headingEmphasis ?? fallback.headingEmphasis,
    ),
  };
}

/**
 * Build the onboarding right-panel preview theme from persistence GET payload.
 * Uses `default_theme` when present; falls back to {@link ONBOARDING_DEFAULT_THEME}.
 */
export function extractOnboardingPreviewTheme(
  payload: Record<string, unknown> | null | undefined,
): ThemeSchema {
  const rawTheme = payload?.default_theme ?? payload?.defaultTheme;
  const rawSocial = payload?.social_links ?? payload?.socialLinks;

  if (!isRecord(rawTheme)) {
    return {
      ...ONBOARDING_DEFAULT_THEME,
      socialLinks: normalizeSocialLinks(rawSocial),
    };
  }

  return {
    colors: normalizeThemeColors(rawTheme.colors),
    typography: normalizeThemeTypography(rawTheme.typography),
    socialLinks: normalizeSocialLinks(rawSocial),
  };
}
