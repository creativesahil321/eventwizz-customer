import type { OnboardingFormData } from "../_components/form-provider/schema";
import type { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { siteEssentialsToPreviewRootStyle } from "@/app/(protected)/_shared/sites-essentials/_lib/preview-root-style";
import type { ThemeSchema } from "@/types/theme.types";
import { ONBOARDING_DEFAULT_THEME } from "./onboarding-default-theme";

export { siteEssentialsToPreviewRootStyle };

function themeColorsToFormColors(
  theme: ThemeSchema | null | undefined,
): SiteEssentialsFormValues["colors"] {
  const c = theme?.colors;
  const d = ONBOARDING_DEFAULT_THEME.colors!;
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
          ONBOARDING_DEFAULT_THEME.typography?.fontFamily?.heading ??
          "Space Grotesk, sans-serif",
        body:
          theme?.typography?.fontFamily?.body ??
          ONBOARDING_DEFAULT_THEME.typography?.fontFamily?.body ??
          "Inter, sans-serif",
      },
      customFontStylesheetUrls:
        theme?.typography?.customFontStylesheetUrls ?? [],
      headingEmphasis:
        theme?.typography?.headingEmphasis ??
        ONBOARDING_DEFAULT_THEME.typography?.headingEmphasis ??
        "accent_tail",
    },
    socialLinks: {
      facebook: theme?.socialLinks?.facebook ?? "",
      twitter: theme?.socialLinks?.twitter ?? "",
      instagram: theme?.socialLinks?.instagram ?? "",
      linkedin: theme?.socialLinks?.linkedin ?? "",
      youtube: theme?.socialLinks?.youtube ?? "",
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

