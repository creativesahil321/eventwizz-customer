"use client";

import { VendorMainLandingView } from "@/app/(public)/vendor/_components/LocationPage/vendor-main-landing-view";
import { addCacheBusting } from "@/lib/image-utils";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { SiteEssentialsFormValues } from "../_lib/schema";
import { siteEssentialsToPreviewRootStyle } from "../_lib/preview-root-style";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import {
  buildSiteEssentialsContactTheme,
  resolveSiteEssentialsPreviewContact,
} from "../_lib/preview-contact";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";
import type { LocationData } from "@/types/theme.types";
import type { LocationPagePreviewEdit } from "@/app/(public)/vendor/_components/LocationPage/location-page-view";

interface MainLandingSitePreviewProps {
  formValues: SiteEssentialsFormValues;
  /** Preview only: jump to that location in the review flow. */
  onLocationSelect?: (slug: string) => void | boolean;
  previewEdit?: Pick<
    LocationPagePreviewEdit,
    "onEditLogo" | "onEditFooter" | "onEditEnquiries"
  >;
}

function getPreviewUrl(
  value: string | File | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof File) return URL.createObjectURL(value);
  return undefined;
}

/**
 * Multi-location main home for Site Essentials + onboarding previews.
 * Renders the same `VendorMainLandingView` as the live vendor home.
 */
export function MainLandingSitePreview({
  formValues,
  onLocationSelect,
  previewEdit,
}: Readonly<MainLandingSitePreviewProps>) {
  const previewStyles = siteEssentialsToPreviewRootStyle(formValues);
  const { mediaVersion } = useTheme();

  const heroImageRaw =
    getPreviewUrl(formValues.main_landing_cover_image) ||
    getPreviewUrl(formValues.cover_image) ||
    "/assets/images/Homepage/Homepage-Banner.png";
  // Blob/data previews stay as-is; remote CMS URLs get ?v= when theme media updates.
  const heroImageSrc = addCacheBusting(heroImageRaw, mediaVersion);

  const heroHeading =
    formValues.main_landing_banner_heading?.trim() ||
    formValues.banner_heading?.trim() ||
    "Find Events Near You";

  const heroSubheading =
    formValues.main_landing_banner_sub_heading?.trim() ||
    formValues.banner_sub_heading?.trim() ||
    "Discover verified venues and curated events in your area. Browse by location to find the perfect experience.";

  const locationsTitle =
    formValues.main_landing_locations_list_title?.trim() || "Choose Your City";

  const locationsSubtitle =
    formValues.main_landing_locations_list_subtitle?.trim() ||
    "Tap a city to see all upcoming events";

  const heroAccentHint = formValues.banner_heading_accent?.trim() || null;
  const locations = (formValues.locations ?? []) as LocationData[];
  const brandName = formValues.name?.trim() || "EventWizz";
  const logoUrl = getPreviewUrl(formValues.logo);
  const heroBadgeLabel =
    typeof formValues.company_legal_name === "string" &&
    formValues.company_legal_name.trim().length > 0
      ? formValues.company_legal_name.trim()
      : brandName;

  return (
    <VendorMainLandingView
      style={previewStyles}
      beforeHeader={
        <SiteEssentialsGoogleFontsLoader
          linkId="site-essentials-google-fonts-main-landing-preview"
          headingStack={formValues.typography?.fontFamily?.heading}
          bodyStack={formValues.typography?.fontFamily?.body}
          customStylesheetUrls={formValues.typography?.customFontStylesheetUrls}
        />
      }
      brandName={brandName}
      logo={logoUrl}
      heroImageSrc={heroImageSrc}
      heroHeading={heroHeading}
      heroSubheading={heroSubheading}
      heroAccentHint={heroAccentHint}
      heroBadgeLabel={heroBadgeLabel}
      headingEmphasis={formValues.typography?.headingEmphasis}
      locationsListTitle={locationsTitle}
      locationsListSubtitle={locationsSubtitle}
      locations={locations}
      locationsLoading={false}
      onSelectLocation={(slug) => {
        if (onLocationSelect) {
          return onLocationSelect(slug);
        }
        return false;
      }}
      copyright={formValues.copyright}
      footerLogo={logoUrl || null}
      contactOverride={resolveSiteEssentialsPreviewContact(formValues)}
      contactTheme={buildSiteEssentialsContactTheme(formValues)}
      socialLinksOverride={formValues.socialLinks}
      brandDescription={
        firstFooterBrandDescription(
          formValues.footer_brand_description,
          formValues.about_description,
          formValues.seo?.description,
        )
      }
      exploreCitiesSectionId="explore-cities-preview"
      onEditLogo={previewEdit?.onEditLogo}
      onEditFooter={previewEdit?.onEditFooter}
      onEditEnquiries={previewEdit?.onEditEnquiries}
    />
  );
}
