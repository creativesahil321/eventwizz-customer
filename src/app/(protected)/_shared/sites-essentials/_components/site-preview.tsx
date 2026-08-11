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
import {
  buildSiteEssentialsContactTheme,
  resolveSiteEssentialsPreviewContact,
} from "../_lib/preview-contact";
import {
  LocationPageHeroSearch,
  useLocationPageSearch,
} from "@/app/(public)/vendor/_components/LocationPage/location-page-hero-search";
import { LocationEventSearchResults } from "@/app/(public)/vendor/_components/LocationPage/location-event-search-results";
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

  const {
    filters,
    setFilters,
    isSearchMode,
    searchResults,
    filteredLatest,
    filteredUpcoming,
    scrollToEvents,
    clearSearch,
  } = useLocationPageSearch({
    locationSlug: locationSlug || "preview",
    latestEvents,
    upcomingEvents,
    lockedCity: formValues.name?.trim() || null,
    previewMode: true,
  });

  const contactOverride = resolveSiteEssentialsPreviewContact(
    formValues,
    locationSlug,
  );
  const contactTheme = buildSiteEssentialsContactTheme(formValues);
  const headerPhone =
    contactOverride?.phone?.trim() ||
    formValues.company_phone?.trim() ||
    undefined;

  const cityLabel = formValues.name?.trim() || null;
  const searchBar = (
    <LocationPageHeroSearch
      cityLabel={cityLabel}
      locationSlug={locationSlug}
      filters={filters}
      onFiltersChange={setFilters}
      onSearch={scrollToEvents}
      enableAvailability={false}
    />
  );

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
      {/* ServerContext already provided at layout level - no need to wrap again */}
      <CommonHeader
        logo={getPreviewUrl(formValues.logo) || null}
        contact_number={headerPhone}
        variant="preview"
        locationSlug={locationSlug || undefined}
      />

      {isSearchMode ? (
        <>
          <div className="sticky top-0 z-30 border-b border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-background)]/95 px-2.5 py-2 backdrop-blur-md sm:px-4 sm:py-3">
            <div className="mx-auto w-full max-w-3xl">{searchBar}</div>
          </div>
          <LocationEventSearchResults
            events={searchResults}
            locationSlug={locationSlug}
            locationLabel={cityLabel}
            filters={filters}
            onClear={clearSearch}
          />
        </>
      ) : (
        <>
          <HeroBanner
            locationName={formValues.name}
            // Pass `null` for explicit Remove so HeroBanner does not fall back to
            // the live theme cover video/image during Preview.
            coverImage={
              formValues.cover_image === null
                ? null
                : getPreviewUrl(formValues.cover_image) ?? undefined
            }
            coverVideo={
              formValues.cover_video === null
                ? null
                : getPreviewUrl(formValues.cover_video) ?? undefined
            }
            bannerHeading={formValues.banner_heading}
            bannerSubHeading={formValues.banner_sub_heading}
            bannerHeadingAccent={formValues.banner_heading_accent}
            headingEmphasis={formValues.typography?.headingEmphasis}
            bannerHeadingAlign={formValues.banner_heading_align}
            bannerHeadingValign={formValues.banner_heading_valign}
            heroFooter={searchBar}
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
            latestEvents={filteredLatest}
            upcomingEvents={filteredUpcoming}
            popularSectionTitle={formValues.event_title_1 || "Popular Events"}
            upcomingSectionTitle={formValues.event_title_2 || "Upcoming Events"}
            galleryTitle={
              formValues.event_gallery_title || "Recent Events Glimpse"
            }
            galleryImages={galleryImages}
            locationSlug={locationSlug}
            locationLabel={cityLabel}
          />
        </>
      )}

      <FooterSection
        copyright={formValues.copyright}
        logo={getPreviewUrl(formValues.logo) || null}
        locationSlug={locationSlug || undefined}
        contactTheme={contactTheme}
        socialLinksOverride={formValues.socialLinks}
      />
    </div>
  );
}
