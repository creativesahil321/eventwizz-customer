"use client";

import {
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import {
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
} from "@/lib/banner-heading-align";
import type { GalleryImage, LocationData } from "@/services/common/events/type";
import type { ThemeSchema } from "@/types/theme.types";
import {
  resolvePublicPageContact,
  type VenueContactOverride,
} from "@/lib/resolve-venue-contact";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";
import { locationDisplayName } from "@/lib/slug-short-label";
import { ServerContext } from "@/lib/server-context";
import {
  useIsPreviewMode,
  usePreviewLocationNavigation,
} from "@/contexts/preview-context";
import CommonHeader from "@/components/shared/common-header";
import { LocationMarketingBody } from "@/components/public/location-marketing-sections";
import { PreviewEditRegion } from "@/components/preview/preview-edit-hint";
import HeroBanner from "../EventListPage/hero-banner";
import ExperienceSection from "../EventListPage/experience";
import FooterSection, {
  type FooterSocialLinksOverride,
} from "../EventListPage/footer";
import SubscribeSection from "../EventListPage/subscribe";
import { LocationEventSearchResults } from "./location-event-search-results";
import {
  PublicSearchResults,
  isPublicSearchEmpty,
} from "./public-search-results";
import {
  LocationPageHeroSearch,
  useLocationPageSearch,
} from "./location-page-hero-search";
import { resolveVendorHasMultipleLocations } from "./_lib/search-filters";

export type LocationPagePreviewEdit = {
  onEditCover?: () => void;
  onEditBanner?: () => void;
  onEditAbout?: () => void;
  onEditFooter?: () => void;
  /** Header / footer brand mark — logo upload on step 2. */
  onEditLogo?: () => void;
  /** Footer Enquiries (phone / email / address) — venue contact, not branding. */
  onEditEnquiries?: () => void;
};

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
    | "footer_brand_description"
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
  footerSocialLinksOverride?: FooterSocialLinksOverride;
  footerBrandDescription?: string | null;
  /** Onboarding / editor preview: click a region to jump to the matching form. */
  previewEdit?: LocationPagePreviewEdit;
  /**
   * When set, drives the hero search placeholder. Omit on live pages to
   * derive from listed venues (`theme.locations` / preview location list).
   * Do not pass onboarding `has_multiple_locations` — that flag is brand mode,
   * not “this vendor already has 2+ venues”.
   */
  hasMultipleLocations?: boolean;
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
  footerBrandDescription,
  previewEdit,
  hasMultipleLocations,
}: LocationPageViewProps) {
  const { theme } = useContext(ServerContext) || { theme: null };
  const isPreviewMode = useIsPreviewMode();
  const { previewLocations } = usePreviewLocationNavigation();
  const liveTheme = theme as ThemeSchema | null;
  const latestEvents = locationData.latest_events || [];
  const upcomingEvents = locationData.upcoming_events || [];
  const heroContact = useMemo(
    () =>
      resolvePublicPageContact({
        theme: footerContactTheme ?? theme,
        locationSlug,
        override: footerContactOverride ?? {
          address: locationData.address,
          phone: locationData.phone,
          phone_number: locationData.phone_number,
          email: locationData.email,
        },
      }),
    [
      theme,
      footerContactTheme,
      footerContactOverride,
      locationSlug,
      locationData.address,
      locationData.phone,
      locationData.phone_number,
      locationData.email,
    ],
  );
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

  const cityLabel = locationDisplayName(locationData.city, locationSlug);
  const brandName = settings?.name?.trim() || "";
  const headingEyebrow =
    locationData.city?.trim() &&
    (!brandName ||
      locationData.city.trim().toLowerCase() !== brandName.toLowerCase())
      ? cityLabel
      : null;
  const headingEmphasis =
    settings?.typography?.headingEmphasis != null
      ? normalizeHeadingEmphasis(settings.typography.headingEmphasis)
      : undefined;
  const searchEmpty = isPublicSearchEmpty(searchData, {
    isLoading: isSearchLoading,
    isError: isSearchError,
  });
  const listedLocationCount = useMemo(() => {
    if (previewLocations && previewLocations.length > 0) {
      return previewLocations.length;
    }
    // Previews must not inherit the host/vendor theme location list.
    if (forcePreviewSearch || isPreviewMode) {
      return footerContactTheme?.locations?.length ?? 0;
    }
    return (
      liveTheme?.locations?.length ?? footerContactTheme?.locations?.length ?? 0
    );
  }, [
    previewLocations,
    forcePreviewSearch,
    isPreviewMode,
    footerContactTheme?.locations?.length,
    liveTheme?.locations?.length,
  ]);
  const isMultiLocationVendor = resolveVendorHasMultipleLocations(
    listedLocationCount,
    hasMultipleLocations,
  );

  const searchBar = (
    <LocationPageHeroSearch
      cityLabel={cityLabel || null}
      locationSlug={locationSlug}
      filters={filters}
      onFiltersChange={setFilters}
      onSearch={() => {
        if (!filters.query.trim() && !filters.date) return;
        scrollToEvents();
      }}
      enableAvailability={useApi}
      hasMultipleLocations={isMultiLocationVendor}
    />
  );

  const experienceNode = experience ?? (
    <ExperienceSection
      aboutTitle={locationData.about_title}
      aboutDescription={locationData.about_description}
    />
  );
  const aboutNode = previewEdit?.onEditAbout ? (
    <PreviewEditRegion label="About" onEdit={previewEdit.onEditAbout}>
      {experienceNode}
    </PreviewEditRegion>
  ) : (
    experienceNode
  );
  const footerNode = (
    <FooterSection
      copyright={settings?.copyright}
      logo={typeof headerLogo === "string" ? headerLogo : settings?.logo}
      locationSlug={locationSlug}
      contactOverride={
        footerContactOverride ?? {
          address: locationData.address,
          phone: locationData.phone,
          phone_number: locationData.phone_number,
          email: locationData.email,
        }
      }
      contactTheme={footerContactTheme}
      socialLinksOverride={footerSocialLinksOverride}
      brandDescription={
        firstFooterBrandDescription(
          footerBrandDescription,
          settings?.footer_brand_description,
          locationData.footer_brand_description,
          isPreviewMode ? null : liveTheme?.footer_brand_description,
        )
      }
      onEditFooter={previewEdit?.onEditFooter}
      onEditLogo={previewEdit?.onEditLogo}
      onEditEnquiries={previewEdit?.onEditEnquiries}
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
        previewBackButtonOffset={
          headerVariant === "preview" ? false : undefined
        }
        solidBar={isSearchMode}
        overlayHero={headerVariant === "preview" && !isSearchMode}
        onEditLogo={previewEdit?.onEditLogo}
      />

      <div
        className={
          isSearchMode
            ? "min-h-screen bg-[var(--color-background)] pt-[4.5rem]"
            : undefined
        }
      >
        <HeroBanner
          collapsed={isSearchMode}
          locationName={cityLabel}
          coverImage={locationData.cover_image}
          coverVideo={locationData.cover_video}
          bannerHeading={locationData.banner_heading}
          bannerSubHeading={locationData.banner_sub_heading}
          bannerHeadingAccent={settings?.banner_heading_accent}
          headingEmphasis={headingEmphasis}
          bannerHeadingAlign={normalizeBannerHeadingAlign(
            locationData.banner_heading_align ??
              settings?.banner_heading_align,
          )}
          bannerHeadingValign={normalizeBannerHeadingValign(
            locationData.banner_heading_valign ??
              settings?.banner_heading_valign,
          )}
          eyebrow={headingEyebrow}
          heroContact={{
            address: heroContact.address,
            email: heroContact.email,
            phone: heroContact.phone,
          }}
          heroFooter={searchBar}
          onEditCover={previewEdit?.onEditCover}
          onEditBanner={previewEdit?.onEditBanner}
        />
        {isSearchMode ? (
          <>
            {useApi ? (
              <PublicSearchResults
                filters={filters}
                data={searchData}
                isLoading={isSearchLoading}
                isError={isSearchError}
                onClear={clearSearch}
                emptyHint="Browse this venue’s events below."
              />
            ) : (
              <LocationEventSearchResults
                events={searchResults}
                locationSlug={locationSlug}
                locationLabel={cityLabel || null}
                filters={filters}
                onClear={clearSearch}
              />
            )}
            {(useApi ? searchEmpty : searchResults.length === 0) ? (
              <LocationMarketingBody
                className={marketingClassName}
                style={marketingStyle}
                latestEvents={latestEvents}
                upcomingEvents={upcomingEvents}
                popularSectionTitle={
                  locationData.event_title_1 || "Popular Events"
                }
                upcomingSectionTitle={
                  locationData.event_title_2 || "Upcoming Events"
                }
                galleryTitle={
                  locationData.event_gallery_title || "Recent Events Glimpse"
                }
                galleryImages={
                  galleryImages ?? locationData.event_gallery ?? []
                }
                locationSlug={locationSlug}
                locationLabel={cityLabel || null}
              />
            ) : null}
          </>
        ) : (
          <LocationMarketingBody
            className={marketingClassName}
            style={marketingStyle}
            experience={aboutNode}
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
            locationLabel={cityLabel || null}
          />
        )}
      </div>

      <SubscribeSection emphasis={headingEmphasis} />

      {footerNode}
    </>
  );
}
