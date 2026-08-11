"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import type {
  BannerHeadingAlign,
  BannerHeadingValign,
} from "@/lib/banner-heading-align";
import type { GalleryImage, LocationData } from "@/services/common/events/type";
import type { ThemeSchema } from "@/types/theme.types";
import type { VenueContactOverride } from "@/lib/resolve-venue-contact";
import CommonHeader from "@/components/shared/common-header";
import { LocationMarketingBody } from "@/components/public/location-marketing-sections";
import HeroBanner from "../EventListPage/hero-banner";
import ExperienceSection from "../EventListPage/experience";
import FooterSection from "../EventListPage/footer";
import { LocationEventSearchResults } from "./location-event-search-results";
import { PublicSearchResults } from "./public-search-results";
import {
  LocationPageHeroSearch,
  useLocationPageSearch,
} from "./location-page-hero-search";

type LocationPageViewProps = {
  locationData: LocationData;
  locationSlug: string;
  /** Optional theme fields for single-location home / footer */
  settings?: Pick<
    ThemeSchema,
    | "name"
    | "copyright"
    | "logo"
    | "banner_heading_accent"
    | "banner_heading_align"
    | "banner_heading_valign"
    | "typography"
  > | null;
  headerVariant?: "default" | "preview";
  /** Override logo (Site Essentials / onboarding draft). */
  headerLogo?: string | File | null;
  headerPhone?: string | null;
  /** Onboarding preview scroll root for sticky header. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  experience?: ReactNode;
  /** Extra class/style for marketing body (preview gradients). */
  marketingClassName?: string;
  marketingStyle?: CSSProperties;
  galleryImages?: GalleryImage[];
  /** Force client search (editor drafts) — skip public search API. */
  forcePreviewSearch?: boolean;
  footerContactOverride?: VenueContactOverride | null;
  footerContactTheme?: Pick<ThemeSchema, "contactDetails" | "locations"> | null;
  footerSocialLinksOverride?: Partial<
    Record<"facebook" | "twitter" | "instagram" | "linkedin" | "youtube", string>
  > | null;
};

/**
 * Shared single-location / `/{slug}` page shell.
 * Live + Site Essentials + onboarding location previews all use this.
 */
export function LocationPageView({
  locationData,
  locationSlug,
  settings = null,
  headerVariant = "default",
  headerLogo,
  headerPhone,
  scrollContainerRef,
  experience,
  marketingClassName = "bg-[var(--color-background)] text-[var(--color-text)]",
  marketingStyle,
  galleryImages,
  forcePreviewSearch = false,
  footerContactOverride,
  footerContactTheme,
  footerSocialLinksOverride,
}: LocationPageViewProps) {
  const latestEvents = locationData.latest_events || [];
  const upcomingEvents = locationData.upcoming_events || [];
  const {
    filters,
    setFilters,
    isSearchMode,
    searchData,
    isSearchLoading,
    isSearchError,
    searchResults,
    filteredLatest,
    filteredUpcoming,
    scrollToEvents,
    clearSearch,
    useApi,
  } = useLocationPageSearch({
    locationSlug,
    latestEvents,
    upcomingEvents,
    lockedCity: locationData.city ?? null,
    previewMode: forcePreviewSearch,
  });

  const cityLabel = locationData.city || settings?.name || "";
  const searchBar = (
    <LocationPageHeroSearch
      cityLabel={locationData.city || cityLabel || null}
      locationSlug={locationSlug}
      filters={filters}
      onFiltersChange={setFilters}
      onSearch={() => {
        if (!filters.query.trim() && !filters.date) return;
        scrollToEvents();
      }}
      enableAvailability={useApi}
    />
  );

  const experienceNode =
    experience ?? (
      <ExperienceSection
        aboutTitle={locationData.about_title}
        aboutDescription={locationData.about_description}
      />
    );

  return (
    <>
      <CommonHeader
        variant={headerVariant}
        locationSlug={locationSlug}
        logo={headerLogo === undefined ? undefined : headerLogo}
        contact_number={headerPhone ?? undefined}
        scrollContainerRef={scrollContainerRef}
        previewBackButtonOffset={headerVariant === "preview" ? false : undefined}
      />

      {isSearchMode ? (
        <div className="min-h-screen bg-[var(--color-background)] pt-[4.5rem]">
          <div className="sticky top-[4.5rem] z-30 border-b border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-background)]/95 px-2.5 py-2 backdrop-blur-md sm:px-4 sm:py-3">
            <div className="mx-auto w-full max-w-3xl">{searchBar}</div>
          </div>
          {useApi ? (
            <PublicSearchResults
              filters={filters}
              data={searchData}
              isLoading={isSearchLoading}
              isError={isSearchError}
              onClear={clearSearch}
            />
          ) : (
            <LocationEventSearchResults
              events={searchResults}
              locationSlug={locationSlug}
              locationLabel={locationData.city ?? cityLabel ?? null}
              filters={filters}
              onClear={clearSearch}
            />
          )}
        </div>
      ) : (
        <>
          <HeroBanner
            locationName={cityLabel}
            coverImage={locationData.cover_image}
            coverVideo={locationData.cover_video}
            bannerHeading={locationData.banner_heading}
            bannerSubHeading={locationData.banner_sub_heading}
            bannerHeadingAccent={settings?.banner_heading_accent}
            headingEmphasis={
              settings?.typography?.headingEmphasis as
                | HeadingEmphasis
                | undefined
            }
            bannerHeadingAlign={
              settings?.banner_heading_align as BannerHeadingAlign | null | undefined
            }
            bannerHeadingValign={
              settings?.banner_heading_valign as BannerHeadingValign | null | undefined
            }
            heroFooter={searchBar}
          />
          <LocationMarketingBody
            className={marketingClassName}
            style={marketingStyle}
            experience={experienceNode}
            latestEvents={filteredLatest}
            upcomingEvents={filteredUpcoming}
            popularSectionTitle={locationData.event_title_1 || "Popular Events"}
            upcomingSectionTitle={
              locationData.event_title_2 || "Upcoming Events"
            }
            galleryTitle={
              locationData.event_gallery_title || "Recent Events Glimpse"
            }
            galleryImages={galleryImages ?? locationData.event_gallery ?? []}
            locationSlug={locationSlug}
            locationLabel={locationData.city ?? cityLabel ?? null}
          />
        </>
      )}

      <FooterSection
        copyright={settings?.copyright}
        logo={typeof headerLogo === "string" ? headerLogo : settings?.logo}
        locationSlug={locationSlug}
        contactOverride={footerContactOverride}
        contactTheme={footerContactTheme}
        socialLinksOverride={footerSocialLinksOverride}
      />
    </>
  );
}
