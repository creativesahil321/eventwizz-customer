import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { ONBOARDING_DEFAULT_THEME } from "@/app/(on-boarding)/on-boarding/_lib/onboarding-default-theme";
import type { ThemePresetsCatalog } from "@/services/common/theme/theme-presets.type";
import type { SiteEssentialsFormValues } from "./schema";
import { type SiteThemePresetId } from "./site-theme-presets";
import { buildTryThemeCatalogView } from "./theme-preset-catalog";

/** Last-resort id if the catalog request has not loaded yet. */
export const SITE_ESSENTIALS_DEFAULT_PRESET_ID: SiteThemePresetId =
  "gallery-neutral";

export function resolveCatalogDefaultPresetId(
  catalog?: ThemePresetsCatalog | null,
): SiteThemePresetId {
  const fromCatalog = catalog?.defaultPresetId?.trim();
  return fromCatalog || SITE_ESSENTIALS_DEFAULT_PRESET_ID;
}

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
          typography.fontFamily?.heading ?? "Archivo, sans-serif",
        body: typography.fontFamily?.body ?? "Inter, sans-serif",
      },
      customFontStylesheetUrls: typography.customFontStylesheetUrls ?? [],
      headingEmphasis: typography.headingEmphasis ?? "uniform",
    },
  };
}

/**
 * Pure merge — returns a new values object with platform-default colors/typography.
 * Prefers GET /theme/presets (`default_preset_id` + recipe tokens). Logo, copy,
 * images, and SEO are left untouched.
 */
export function mergeSiteEssentialsDefaultTheme(
  values: SiteEssentialsFormValues,
  catalog?: ThemePresetsCatalog | null,
): SiteEssentialsFormValues {
  const defaults = getSiteEssentialsDefaultThemeFields();
  const view = buildTryThemeCatalogView(catalog);
  const defaultId = resolveCatalogDefaultPresetId(catalog);
  const preset = view.recipesById.get(defaultId);

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
        preset?.headingEmphasis ??
        defaults.typography.headingEmphasis ??
        values.typography?.headingEmphasis,
    },
    theme_preset_id: defaultId,
  };
}

/** Resets colors + typography to platform defaults; copy, images, and SEO stay unchanged. */
export function applySiteEssentialsDefaultTheme(
  setValue: UseFormSetValue<SiteEssentialsFormValues>,
  getValues: UseFormGetValues<SiteEssentialsFormValues>,
  catalog?: ThemePresetsCatalog | null,
): SiteThemePresetId {
  const next = mergeSiteEssentialsDefaultTheme(getValues(), catalog);
  const opts = { shouldDirty: true, shouldTouch: true } as const;

  setValue("colors", next.colors, opts);
  setValue("typography", next.typography, opts);
  setValue("theme_preset_id", next.theme_preset_id ?? null, opts);

  return next.theme_preset_id ?? SITE_ESSENTIALS_DEFAULT_PRESET_ID;
}
