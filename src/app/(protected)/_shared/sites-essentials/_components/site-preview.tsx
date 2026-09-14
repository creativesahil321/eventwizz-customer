"use client";

import type { RefObject } from "react";
import {
  LocationPageView,
  type LocationPagePreviewEdit,
} from "@/app/(public)/vendor/_components/LocationPage/location-page-view";
import type { LocationData } from "@/services/common/events/type";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import { SiteEssentialsFormValues } from "../_lib/schema";
import { siteEssentialsToPreviewRootStyle } from "../_lib/preview-root-style";
import { pickPreviewEventsFromSiteEssentials } from "../_lib/site-essentials-preview-events";
import {
  buildSiteEssentialsContactTheme,
  resolveSiteEssentialsPreviewContact,
} from "../_lib/preview-contact";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";

interface SitePreviewProps {
  formValues: SiteEssentialsFormValues;
  /** Onboarding preview scroll root for sticky header parity. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  previewEdit?: LocationPagePreviewEdit;
}

function getPreviewUrl(value: string | File | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof File) return URL.createObjectURL(value);
  return null;
}

function resolvePreviewCity(
  formValues: SiteEssentialsFormValues,
  locationSlug: string,
): string | undefined {
  const locations = formValues.locations ?? [];
  const match = locations.find(
    (loc) => typeof loc?.slug === "string" && loc.slug === locationSlug,
  );
  if (typeof match?.city === "string" && match.city.trim()) {
    return match.city.trim();
  }
  if (typeof formValues.city === "string" && formValues.city.trim()) {
    return formValues.city.trim();
  }
  return undefined;
}

/**
 * Location homepage preview for Site Essentials + onboarding.
 * Uses the same `LocationPageView` shell as the live `/{locationSlug}` page.
 */
export function SitePreview({
  formValues,
  scrollContainerRef,
  previewEdit,
}: Readonly<SitePreviewProps>) {
  const previewStyles = siteEssentialsToPreviewRootStyle(formValues);

  const useGradientBg =
    formValues.colors?.background?.includes("linear-gradient");

  const mainBandStyle = useGradientBg
    ? ({
        ...previewStyles,
        background: formValues.colors?.background,
      } as React.CSSProperties)
    : previewStyles;

  const mainBandClass = useGradientBg
    ? "bg-none text-[color:var(--color-text)] font-body"
    : "bg-[color:var(--color-background)] text-[color:var(--color-text)] font-body";

  const { latestEvents, upcomingEvents, galleryImages, locationSlug } =
    pickPreviewEventsFromSiteEssentials(formValues);

  const slug = locationSlug || "preview";
  const city = resolvePreviewCity(formValues, slug);
  const logoUrl = getPreviewUrl(formValues.logo);
  const coverImage =
    formValues.cover_image === null
      ? null
      : getPreviewUrl(formValues.cover_image);
  const coverVideo =
    formValues.cover_video === null
      ? null
      : getPreviewUrl(formValues.cover_video);

  const contactOverride = resolveSiteEssentialsPreviewContact(formValues, slug);
  const contactTheme = buildSiteEssentialsContactTheme(formValues);

  const locationData: LocationData = {
    latitude: "",
    longitude: "",
    address: contactOverride?.address ?? "",
    email: contactOverride?.email ?? null,
    phone: contactOverride?.phone ?? null,
    phone_number: contactOverride?.phone ?? null,
    slug,
    city,
    cover_image: coverImage,
    cover_video: coverVideo,
    banner_heading: formValues.banner_heading ?? null,
    banner_sub_heading: formValues.banner_sub_heading ?? null,
    banner_heading_align: formValues.banner_heading_align ?? null,
    banner_heading_valign: formValues.banner_heading_valign ?? null,
    about_title: formValues.about_title ?? null,
    about_cta_link: null,
    about_description: formValues.about_description ?? null,
    footer_brand_description: formValues.footer_brand_description ?? null,
    about_link_title: null,
    event_title_1: formValues.event_title_1 ?? "Popular Events",
    latest_events: latestEvents,
    event_title_2: formValues.event_title_2 ?? "Upcoming Events",
    upcoming_events: upcomingEvents,
    event_gallery_title:
      formValues.event_gallery_title ?? "Recent Events Glimpse",
    event_gallery: galleryImages,
  };

  const headerPhone =
    contactOverride?.phone?.trim() ||
    formValues.company_phone?.trim() ||
    undefined;

  return (
    <div
      data-preview-theme-root=""
      style={previewStyles}
      className="w-full min-w-0 text-[color:var(--color-text)] font-body"
    >
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-site-preview"
        headingStack={formValues.typography?.fontFamily?.heading}
        bodyStack={formValues.typography?.fontFamily?.body}
        customStylesheetUrls={formValues.typography?.customFontStylesheetUrls}
      />
      <LocationPageView
        locationData={locationData}
        locationSlug={slug}
        settings={{
          name: formValues.name,
          copyright: formValues.copyright,
          logo: logoUrl,
          banner_heading_accent: formValues.banner_heading_accent,
          banner_heading_align: formValues.banner_heading_align,
          banner_heading_valign: formValues.banner_heading_valign,
          typography: formValues.typography,
          footer_brand_description: formValues.footer_brand_description,
        }}
        headerVariant="preview"
        headerLogo={logoUrl}
        headerPhone={headerPhone}
        scrollContainerRef={scrollContainerRef}
        forcePreviewSearch
        marketingClassName={mainBandClass}
        marketingStyle={mainBandStyle}
        galleryImages={galleryImages}
        footerContactOverride={contactOverride}
        footerContactTheme={contactTheme}
        footerSocialLinksOverride={formValues.socialLinks}
        footerBrandDescription={
          firstFooterBrandDescription(
            formValues.footer_brand_description,
            formValues.about_description,
            formValues.seo?.description,
          )
        }
        previewEdit={previewEdit}
      />
    </div>
  );
}
