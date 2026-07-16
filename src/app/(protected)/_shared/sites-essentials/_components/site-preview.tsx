"use client";

import { SiteEssentialsFormValues } from "../_lib/schema";
// // ThemeSchema import removed - no longer needed

import CommonHeader from "@/components/shared/common-header";
import HeroBanner from "@/app/(public)/vendor/_components/EventListPage/hero-banner";
import ExperienceSection from "@/app/(public)/vendor/_components/EventListPage/experience";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { LocationMarketingBody } from "@/components/public/location-marketing-sections";
import { siteEssentialsToPreviewRootStyle } from "../_lib/preview-root-style";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import { pickPreviewEventsFromSiteEssentials } from "../_lib/site-essentials-preview-events";
// ServerContext removed - already provided at layout level

interface SitePreviewProps {
  formValues: SiteEssentialsFormValues;
}

export function SitePreview({ formValues }: Readonly<SitePreviewProps>) {
  const previewStyles = siteEssentialsToPreviewRootStyle(formValues);

  // Helper function to convert File objects to blob URLs for preview
  const getPreviewUrl = (
    value: string | File | null | undefined,
  ): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (value instanceof File) return URL.createObjectURL(value);
    return undefined;
  };

  // ServerContext already provided at layout level - no need to create context value

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

  return (
    <div
      style={previewStyles}
      className="w-full min-w-0 text-[color:var(--color-text)] font-body"
    >
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-site-preview"
        headingStack={formValues.typography?.fontFamily?.heading}
        bodyStack={formValues.typography?.fontFamily?.body}
        customStylesheetUrls={formValues.typography?.customFontStylesheetUrls}
      />
      {/* ServerContext already provided at layout level - no need to wrap again */}
      <CommonHeader
        logo={getPreviewUrl(formValues.logo) || null}
        contact_number={""}
        variant="preview"
      />
      <HeroBanner
        locationName={formValues.name}
        coverImage={getPreviewUrl(formValues.cover_image) || null}
        coverVideo={getPreviewUrl(formValues.cover_video) || null}
        bannerHeading={formValues.banner_heading}
        bannerSubHeading={formValues.banner_sub_heading}
        bannerHeadingAccent={formValues.banner_heading_accent}
        headingEmphasis={formValues.typography?.headingEmphasis}
        bannerHeadingAlign={formValues.banner_heading_align}
        bannerHeadingValign={formValues.banner_heading_valign}
      />
      <LocationMarketingBody
        className={mainBandClass}
        style={mainBandStyle}
        experience={
          <ExperienceSection
            aboutTitle={formValues.about_title || null}
            aboutDescription={formValues.about_description || null}
          />
        }
        latestEvents={latestEvents}
        upcomingEvents={upcomingEvents}
        popularSectionTitle={formValues.event_title_1 || "Popular Events"}
        upcomingSectionTitle={formValues.event_title_2 || "Upcoming Events"}
        galleryTitle={
          formValues.event_gallery_title || "Recent Events Glimpse"
        }
        galleryImages={galleryImages}
        locationSlug={locationSlug}
        locationLabel={formValues.name?.trim() || null}
      />
      <FooterSection
        copyright={formValues.copyright}
        logo={getPreviewUrl(formValues.logo) || null}
      />
    </div>
  );
}
