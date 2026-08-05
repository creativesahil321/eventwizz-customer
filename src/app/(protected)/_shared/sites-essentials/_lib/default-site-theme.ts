import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { ONBOARDING_DEFAULT_THEME } from "@/app/(on-boarding)/on-boarding/_lib/onboarding-default-theme";
import type { SiteEssentialsFormValues } from "./schema";
import {
  SITE_THEME_PRESETS,
  type SiteThemePresetId,
} from "./site-theme-presets";

/** Platform default — matches backend `default_theme` / Clean White preset. */
export const SITE_ESSENTIALS_DEFAULT_PRESET_ID: SiteThemePresetId =
  "lovable-clean-white";

export function getSiteEssentialsDefaultThemeFields(): Pick<
  SiteEssentialsFormValues,
  "colors" | "typography"
> {
  const colors = ONBOARDING_DEFAULT_THEME.colors!;
  const typography = ONBOARDING_DEFAULT_THEME.typography!;

  return {
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      header: colors.header ?? "#ffffff",
      footer: colors.footer ?? "#f4f4f5",
      background: colors.background ?? "#ffffff",
      surface: colors.surface ?? "#ffffff",
      text: colors.text ?? "#17171c",
      textDimmed: colors.textDimmed ?? "#71717a",
      socialLogin: {
        google: colors.socialLogin?.google ?? "#4285F4",
        microsoft: colors.socialLogin?.microsoft ?? "#1877f2",
      },
    },
    typography: {
      fontFamily: {
        heading:
          typography.fontFamily?.heading ?? "Space Grotesk, sans-serif",
        body: typography.fontFamily?.body ?? "Inter, sans-serif",
      },
      customFontStylesheetUrls: typography.customFontStylesheetUrls ?? [],
      headingEmphasis: typography.headingEmphasis ?? "accent_tail",
    },
  };
}

/**
 * Pure merge — returns a new values object with platform-default colors/typography.
 * Logo, copy, images, and SEO are left untouched. Use from preview store or any
 * non-RHF host; RHF callers can still use `applySiteEssentialsDefaultTheme`.
 */
export function mergeSiteEssentialsDefaultTheme(
  values: SiteEssentialsFormValues,
): SiteEssentialsFormValues {
  const defaults = getSiteEssentialsDefaultThemeFields();
  const preset = SITE_THEME_PRESETS.find(
    (item) => item.id === SITE_ESSENTIALS_DEFAULT_PRESET_ID,
  );

  return {
    ...values,
    colors: { ...(preset?.colors ?? defaults.colors) },
    typography: {
      ...values.typography,
      fontFamily: {
        ...(preset?.typography.fontFamily ?? defaults.typography.fontFamily),
      },
      customFontStylesheetUrls: [
        ...(preset?.typography.customFontStylesheetUrls ??
          defaults.typography.customFontStylesheetUrls ??
          []),
      ],
      headingEmphasis:
        defaults.typography.headingEmphasis ??
        values.typography?.headingEmphasis,
    },
  };
}

/** Resets colors + typography to platform defaults; copy, images, and SEO stay unchanged. */
export function applySiteEssentialsDefaultTheme(
  setValue: UseFormSetValue<SiteEssentialsFormValues>,
  getValues: UseFormGetValues<SiteEssentialsFormValues>,
): SiteThemePresetId {
  const next = mergeSiteEssentialsDefaultTheme(getValues());
  const opts = { shouldDirty: true, shouldTouch: true } as const;

  setValue("colors", next.colors, opts);
  setValue("typography", next.typography, opts);

  return SITE_ESSENTIALS_DEFAULT_PRESET_ID;
}
