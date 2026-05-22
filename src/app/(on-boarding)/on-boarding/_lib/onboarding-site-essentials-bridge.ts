import type { CSSProperties } from "react";
import type { OnboardingFormData } from "../_components/form-provider/schema";
import type { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import type { ThemeSchema } from "@/types/theme.types";
import { defaultThemeConstants } from "@/services/common/theme/constants/theme";
import { pickReadableForeground } from "@/lib/color-contrast";

function themeColorsToFormColors(
  theme: ThemeSchema | null | undefined,
): SiteEssentialsFormValues["colors"] {
  const c = theme?.colors;
  const d = defaultThemeConstants.colors;
  return {
    primary: c?.primary ?? d.primary,
    secondary: c?.secondary ?? d.secondary,
    header: c?.header ?? d.header,
    footer: c?.footer ?? d.footer,
    background: c?.background ?? d.background,
    surface: c?.surface ?? d.surface,
    text: c?.text ?? d.text,
    textDimmed: c?.textDimmed ?? d.textDimmed,
    socialLogin: {
      google: c?.socialLogin?.google ?? d.socialLogin?.google ?? "",
      microsoft: c?.socialLogin?.microsoft ?? d.socialLogin?.microsoft ?? "",
    },
  };
}

/**
 * Maps onboarding step 1–2 + tenant theme into Site Essentials shape so the same
 * Try theme UI and CSS variable bundle as Site Essentials / preview can run here.
 */
export function buildOnboardingStepTwoSiteEssentialsValues(
  form: OnboardingFormData,
  theme: ThemeSchema | null | undefined,
): SiteEssentialsFormValues {
  const s1 = form.stepOne;
  const s2 = form.stepTwo;
  const year = new Date().getFullYear();
  const venueName = (s1?.name ?? "").trim();

  return {
    colors: themeColorsToFormColors(theme),
    typography: {
      fontFamily: {
        heading:
          theme?.typography?.fontFamily?.heading ??
          defaultThemeConstants.typography.fontFamily.heading,
        body:
          theme?.typography?.fontFamily?.body ??
          defaultThemeConstants.typography.fontFamily.body,
      },
      customFontStylesheetUrls:
        theme?.typography?.customFontStylesheetUrls ?? [],
      headingEmphasis: theme?.typography?.headingEmphasis ?? "uniform",
    },
    socialLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
      youtube: "",
    },
    seo: {
      title: "",
      description: "",
      keywords: "",
    },
    name: venueName,
    copyright:
      theme?.copyright?.trim() ||
      (venueName ? `© ${year} ${venueName}` : `© ${year}`),
    logo: s2?.logo ?? null,
    favicon: null,
    banner_heading: s2?.banner_heading ?? "",
    banner_heading_accent: theme?.banner_heading_accent ?? "",
    banner_heading_align: theme?.banner_heading_align ?? "center",
    banner_heading_valign: theme?.banner_heading_valign ?? "center",
    banner_sub_heading: s2?.banner_sub_heading ?? "",
    cover_image: s2?.cover_image ?? null,
    cover_video: null,
    about_title: s2?.about_title ?? "",
    about_description: s2?.about_description ?? "",
    about_link_title: "",
    about_cta_link: "",
    event_title_1: "",
    event_title_2: "",
    event_gallery_title: "",
    domain: null,
    website_role: undefined,
    theme_animations: undefined,
  };
}

/** Same variable bundle as `SitePreview` so onboarding preview picks up Try theme. */
export function siteEssentialsToPreviewRootStyle(
  formValues: SiteEssentialsFormValues,
): CSSProperties {
  const primary = formValues.colors?.primary || "#0F172A";
  const secondary = formValues.colors?.secondary || "#64748B";
  const header = formValues.colors?.header || "#FFFFFF";
  const footer = formValues.colors?.footer || "#0F172A";
  const background = formValues.colors?.background || "#F8FAFC";
  const surface = formValues.colors?.surface || "#FFFFFF";
  const text = formValues.colors?.text || "#0F172A";
  const textDimmed = formValues.colors?.textDimmed || "#64748B";

  return {
    "--color-primary": primary,
    "--color-secondary": secondary,
    "--color-header": header,
    "--color-footer": footer,
    "--color-background": background,
    "--color-text": text,
    "--color-text-dimmed": textDimmed,
    "--color-surface": surface,
    /** Subtle dividers in package cards etc. (matches public pages using `--color-border`). */
    "--color-border": `color-mix(in srgb, ${text} 18%, transparent)`,
    "--color-primary-foreground": pickReadableForeground(primary),
    "--color-secondary-foreground": pickReadableForeground(secondary),
    "--color-on-header": pickReadableForeground(header),
    "--color-on-footer": pickReadableForeground(footer),
    "--color-on-surface": pickReadableForeground(surface),
    "--color-on-background": pickReadableForeground(background),
    "--font-heading":
      formValues.typography?.fontFamily?.heading || "'Inter', sans-serif",
    "--font-body":
      formValues.typography?.fontFamily?.body || "'Inter', sans-serif",
    fontFamily: "var(--font-body)",
  } as CSSProperties;
}
