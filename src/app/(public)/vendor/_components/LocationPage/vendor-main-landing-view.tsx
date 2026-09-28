"use client";

import { SECTION_EYEBROW_CLASS, SECTION_SUBTITLE_CLASS } from "@/lib/section-type";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { Map, LayoutGrid, MapPin, CalendarDays } from "lucide-react";
import { HeroCoverImage } from "@/components/public/hero-cover-image";
import LocationSelectionHeader from "./location-selection-header";
import LocationGrid from "./location-grid";
import GoogleLocationMap from "./location-map-google";
import { LocationSearchBar } from "./location-search-bar";
import {
  PublicSearchResults,
  isPublicSearchEmpty,
} from "./public-search-results";
import {
  filterLocations,
  resolveLocationSlugForCity,
  toSearchDateParam,
} from "./_lib/filter-locations";
import { usePublicSearchFilters } from "./_lib/use-public-search-filters";
import SubscribeSection from "../EventListPage/subscribe";
import FooterSection, {
  type FooterSocialLinksOverride,
} from "../EventListPage/footer";
import { SiteHeading } from "@/components/public/site-heading";
import { HeadingEmphasisOverrideProvider } from "@/components/public/heading-emphasis-override";
import {
  normalizeHeadingEmphasis,
  type HeadingEmphasis,
} from "@/lib/heading-emphasis";
import {
  heroBandHeightClass,
  heroBandMediaOverlayClass,
  heroHeadingMeasureClass,
  heroHomeHeadingTypeClass,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";
import type { LocationData } from "@/types/theme.types";
import type { ThemeSchema } from "@/types/theme.types";
import type { VenueContactOverride } from "@/lib/resolve-venue-contact";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { usePublicSearch } from "@/services/common/public-search";

export type VendorMainLandingViewProps = {
  brandName: string;
  logo?: string | null;
  heroImageSrc: string;
  heroHeading: string;
  heroSubheading: string;
  heroAccentHint?: string | null;
  heroBadgeLabel?: string;
  headingEmphasis?: HeadingEmphasis | string | null;
  locationsListTitle: string;
  locationsListSubtitle: string;
  locations: LocationData[];
  locationsLoading?: boolean;
  /** Return false if navigation did not start (clears card pending state). */
  onSelectLocation: (slug: string) => void | boolean;
  copyright?: string | null;
  footerLogo?: string | null;
  contactOverride?: VenueContactOverride | null;
  contactTheme?: Pick<ThemeSchema, "contactDetails" | "locations"> | null;
  socialLinksOverride?: FooterSocialLinksOverride;
  brandDescription?: string | null;
  /** Unique section id for Explore cities scroll target. */
  exploreCitiesSectionId?: string;
  style?: CSSProperties;
  className?: string;
  /** Optional slot above the header (e.g. preview font loader). */
  beforeHeader?: ReactNode;
  onEditLogo?: () => void;
  onEditFooter?: () => void;
  onEditEnquiries?: () => void;
};

/**
 * Shared multi-location main home UI.
 * Used by live `VendorSiteHomePage` and Site Essentials / onboarding previews
 * so presentation stays 1:1.
 */
export function VendorMainLandingView({
  brandName,
  logo,
  heroImageSrc,
  heroHeading,
  heroSubheading,
  heroAccentHint = null,
  headingEmphasis,
  locationsListTitle,
  locationsListSubtitle,
  locations,
  locationsLoading = false,
  onSelectLocation,
  copyright,
  footerLogo,
  contactOverride,
  contactTheme,
  socialLinksOverride,
  brandDescription,
  exploreCitiesSectionId = "explore-cities",
  style,
  className,
  beforeHeader,
  onEditLogo,
  onEditFooter,
  onEditEnquiries,
}: VendorMainLandingViewProps) {
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const isPreviewNarrow = usePreviewMobileLayout();
  const isPreviewMode = useIsPreviewMode();
  const { domain } = useDomain();
  const useApi = !isPreviewMode;

  const { filters, apiFilters, setFilters, clearFilters, isSearchMode } =
    usePublicSearchFilters({ syncUrl: useApi });

  const vendorCities = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const location of locations) {
      const city = location.city?.trim();
      if (!city || seen.has(city)) continue;
      seen.add(city);
      list.push(city);
    }
    return list;
  }, [locations]);

  /**
   * Map chrome only from xl (1280px)+ — small desktops keep grid and avoid
   * CTA / toggle collisions in the hero fade.
   */
  const hideMapView = isPreviewNarrow || isCompactViewport;

  // Near Me uses event-pin geo on the API — never city-bucket matching.
  const nearMeActive =
    filters.nearMe &&
    typeof filters.nearMeCoords?.lat === "number" &&
    typeof filters.nearMeCoords?.lng === "number";

  const locationSlugForCity = useMemo(
    () =>
      nearMeActive
        ? undefined
        : resolveLocationSlugForCity(apiFilters.city, locations),
    [nearMeActive, apiFilters.city, locations],
  );

  const searchParams = useMemo(() => {
    const base = {
      q: apiFilters.query.trim() || undefined,
      date: toSearchDateParam(apiFilters.date),
      mode: "auto" as const,
      per_page: 40,
    };

    if (nearMeActive && filters.nearMeCoords) {
      return {
        ...base,
        // Backend ranks by event_details.lat/long — do not send city filters.
        lat: filters.nearMeCoords.lat,
        lng: filters.nearMeCoords.lng,
        radius_km: 50,
        sort: "distance" as const,
      };
    }

    return {
      ...base,
      location_slug: locationSlugForCity,
      city: locationSlugForCity ? undefined : (apiFilters.city ?? undefined),
    };
  }, [
    apiFilters.query,
    apiFilters.date,
    apiFilters.city,
    locationSlugForCity,
    nearMeActive,
    filters.nearMeCoords,
  ]);

  const searchQuery = usePublicSearch(domain, searchParams, {
    enabled: useApi && isSearchMode,
  });

  // Near Me selected but coords not ready yet — don't hang on "searching".
  const waitingForNearMeCoords =
    filters.nearMe &&
    !(
      typeof filters.nearMeCoords?.lat === "number" &&
      typeof filters.nearMeCoords?.lng === "number"
    );

  /** Initial fetch only — never keep skeleton after a settled empty response. */
  const isSearchLoading =
    !waitingForNearMeCoords &&
    searchQuery.isFetching &&
    !searchQuery.isFetched &&
    searchQuery.data === undefined;

  /** Preview / browse: location cards. Live search: API event/date results. */
  const filteredLocations = useMemo(
    () =>
      useApi && isSearchMode
        ? locations
        : filterLocations(locations, apiFilters),
    [useApi, isSearchMode, locations, apiFilters],
  );

  const showApiResults = useApi && isSearchMode;
  const searchEmpty = isPublicSearchEmpty(searchQuery.data, {
    isLoading: isSearchLoading || waitingForNearMeCoords,
    isError: searchQuery.isError,
  });
  const showEmptySearchState =
    !showApiResults && isSearchMode && filteredLocations.length === 0;

  const totalEvents = (showApiResults ? locations : filteredLocations).reduce(
    (sum, loc) =>
      sum + (typeof loc.total_events === "number" ? loc.total_events : 0),
    0,
  );
  const totalLocations = showApiResults
    ? locations.length
    : filteredLocations.length;

  const cityEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const location of locations) {
      const city = location.city?.trim();
      if (!city) continue;
      const next =
        typeof location.total_events === "number" ? location.total_events : 0;
      counts[city] = (counts[city] ?? 0) + next;
    }
    return counts;
  }, [locations]);

  useEffect(() => {
    const checkCompact = () => {
      const compact = window.innerWidth < 1280;
      setIsCompactViewport(compact);
      if (compact) setViewMode("grid");
    };
    checkCompact();
    window.addEventListener("resize", checkCompact);
    return () => window.removeEventListener("resize", checkCompact);
  }, []);

  useEffect(() => {
    if (isPreviewNarrow) setViewMode("grid");
  }, [isPreviewNarrow]);

  const scrollToResults = () => {
    document
      .getElementById(exploreCitiesSectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearSearchFilters = () => {
    clearFilters();
  };

  /**
   * Single emphasis source for every heading on this page (hero + section titles
   * + newsletter). Section headings previously read `useTheme()` independently,
   * which diverged from the hero's prop in preview (accent tail leaked onto the
   * location-list / newsletter titles). Threading one resolved value keeps
   * preview and live 1:1.
   */
  const resolvedHeadingEmphasis = normalizeHeadingEmphasis(headingEmphasis);

  const citiesEyebrow = useMemo(() => {
    if (vendorCities.length === 0) return null;
    const shown = vendorCities.slice(0, 4);
    return shown.length < vendorCities.length
      ? `${shown.join(" · ")} · \u2026`
      : shown.join(" · ");
  }, [vendorCities]);

  return (
    <HeadingEmphasisOverrideProvider value={resolvedHeadingEmphasis}>
    <div
      {...(style ? { "data-preview-theme-root": "" } : {})}
      style={style}
      className={cn(
        "relative flex min-h-screen w-full min-w-0 flex-col bg-[var(--color-background)] font-body text-[var(--color-text)]",
        className,
      )}
    >
      {beforeHeader}
      <LocationSelectionHeader
        name={brandName}
        logo={logo || undefined}
        onEditLogo={onEditLogo}
      />

      <section
        className={cn(
          "relative mx-auto w-full min-w-0 overflow-hidden",
          heroBandHeightClass,
        )}
      >
        <div className="absolute inset-0 overflow-hidden">
          {heroImageSrc ? (
            <HeroCoverImage src={heroImageSrc} className="scale-105" />
          ) : null}
          <div className={cn("absolute inset-0", heroBandMediaOverlayClass)} />
        </div>

        <div
          className={cn(
            PUBLIC_CHROME_CONTAINER_CLASS,
            "absolute inset-0 z-10 flex flex-col items-center justify-center py-16 text-center sm:py-20",
          )}
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "flex w-full min-w-0 max-w-full flex-col items-center gap-2.5 text-center sm:gap-4",
              "@max-md/preview:!gap-2.5",
              heroHeadingMeasureClass,
            )}
          >
            {citiesEyebrow ? (
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
                {citiesEyebrow}
              </p>
            ) : null}

            <SiteHeading
              level={1}
              title={heroHeading}
              accentHint={heroAccentHint}
              emphasis={resolvedHeadingEmphasis}
              variant="onDark"
              align="center"
              className={cn(
                "w-full max-w-5xl font-bold",
                heroHomeHeadingTypeClass,
              )}
            />

            <p className="mx-auto w-full max-w-2xl text-center text-sm leading-relaxed text-white/85 sm:text-base">
              {heroSubheading}
            </p>
          </motion.div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-4 sm:px-4 sm:pb-5 md:pb-6">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            <LocationSearchBar
              className="w-full max-w-3xl px-0"
              cities={vendorCities}
              cityEventCounts={cityEventCounts}
              value={filters}
              onChange={setFilters}
              onSearch={scrollToResults}
              enableNearMe
              availability={{
                domain,
                q: filters.query,
                city: locationSlugForCity
                  ? undefined
                  : nearMeActive
                    ? undefined
                    : apiFilters.city,
                location_slug: locationSlugForCity,
                enabled: useApi && !nearMeActive,
              }}
            />
            {nearMeActive ? (
              <p className="mt-3 text-center text-xs text-white/75 sm:text-sm">
                Showing events nearest to you
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {!hideMapView && !showApiResults ? (
        <section className="relative z-20 flex justify-center bg-[var(--color-background)] px-4 pb-5 pt-4 sm:px-6">
          <div
            className="rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-0.5 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)]"
            role="tablist"
            aria-label="Locations view"
          >
            <div className="flex">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "map"}
                onClick={() => setViewMode("map")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "map"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]",
                )}
              >
                <Map className="h-4 w-4" aria-hidden />
                Map View
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "grid"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]",
                )}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Grid View
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section
        id={exploreCitiesSectionId}
        className={cn(
          "scroll-mt-20 bg-[var(--color-background)] pb-10 md:pb-20",
          hideMapView ? "pt-6 sm:pt-8 md:pt-10" : "pt-3 md:pt-4",
        )}
      >
        <motion.div
          className={PUBLIC_CHROME_CONTAINER_CLASS}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          {!showApiResults ? (
            <div
              className={cn(
                "mx-auto mb-3 max-w-2xl text-center md:mb-7",
                !isPreviewNarrow && "sm:mb-5",
              )}
            >
              <span
                className={cn(
                  "mb-1 block",
                  SECTION_EYEBROW_CLASS,
                  !isPreviewNarrow && "sm:mb-2.5",
                )}
              >
                Explore cities
              </span>
              <SiteHeading
                level={2}
                align="center"
                title={locationsListTitle}
                emphasis={resolvedHeadingEmphasis}
                variant="onSurface"
                className={cn("mb-1", !isPreviewNarrow && "sm:mb-2.5")}
              />
              <p
                className={cn(
                  "mx-auto max-w-xl px-1",
                  SECTION_SUBTITLE_CLASS,
                )}
              >
                {locationsListSubtitle}
              </p>
            </div>
          ) : null}

          {!showApiResults && locations.length > 0 ? (
            <div
              className={cn(
                "mx-auto mb-4 flex max-w-md items-center justify-center gap-2 md:mb-8",
                !isPreviewNarrow &&
                  "sm:mb-6 sm:grid sm:grid-cols-2 sm:items-stretch sm:gap-3",
              )}
              aria-label="Location overview"
            >
              {/* Compact pills on phone / phone preview; cards from sm on desktop */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-3 py-1.5",
                  !isPreviewNarrow && "sm:hidden",
                )}
              >
                <MapPin
                  className="h-3 w-3 text-[var(--color-primary)]"
                  aria-hidden
                />
                <span className="text-xs font-semibold tabular-nums text-[var(--color-text)]">
                  {totalLocations}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-dimmed)]">
                  locations
                </span>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-3 py-1.5",
                  !isPreviewNarrow && "sm:hidden",
                )}
              >
                <CalendarDays
                  className="h-3 w-3 text-[var(--color-primary)]"
                  aria-hidden
                />
                <span className="text-xs font-semibold tabular-nums text-[var(--color-text)]">
                  {totalEvents}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-dimmed)]">
                  events
                </span>
              </div>

              <div
                className={cn(
                  "flex-col items-center rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-6 py-4 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.45)]",
                  isPreviewNarrow ? "hidden" : "hidden sm:flex",
                )}
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-[var(--color-primary)]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-dimmed)]">
                    Locations
                  </span>
                </div>
                <p className="text-[1.75rem] font-bold tabular-nums tracking-tight text-[var(--color-text)]">
                  {totalLocations}
                </p>
              </div>
              <div
                className={cn(
                  "flex-col items-center rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-6 py-4 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.45)]",
                  isPreviewNarrow ? "hidden" : "hidden sm:flex",
                )}
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-[var(--color-primary)]">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-dimmed)]">
                    Events
                  </span>
                </div>
                <p className="text-[1.75rem] font-bold tabular-nums tracking-tight text-[var(--color-text)]">
                  {totalEvents}
                </p>
              </div>
            </div>
          ) : null}

          {showApiResults ? (
            <>
              <PublicSearchResults
                filters={filters}
                data={searchQuery.data}
                isLoading={isSearchLoading || waitingForNearMeCoords}
                isError={searchQuery.isError}
                onClear={clearSearchFilters}
                sectionId={`${exploreCitiesSectionId}-results`}
                className="!px-0 !pt-0"
                emptyHint="Browse cities below to find events another way."
              />
              {searchEmpty && locations.length > 0 ? (
                <div className="mt-10">
                  <div className="mx-auto mb-5 max-w-2xl text-center">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
                      Browse cities
                    </span>
                    <p className="text-sm text-[var(--color-text-dimmed)]">
                      Search did not match an event name. Pick a city to see
                      what is on.
                    </p>
                  </div>
                  <LocationGrid
                    locations={locations}
                    isLoading={locationsLoading}
                    onSelect={onSelectLocation}
                  />
                </div>
              ) : null}
            </>
          ) : showEmptySearchState ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-6 py-10 text-center">
              <p className="text-base font-semibold text-[var(--color-text)]">
                No locations match your search
              </p>
              <p className="text-sm text-[var(--color-text-dimmed)]">
                Try another city or date.
              </p>
              <button
                type="button"
                onClick={clearSearchFilters}
                className="mt-1 inline-flex h-10 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-foreground)] transition-opacity hover:opacity-95"
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === "map" && !hideMapView ? (
            <GoogleLocationMap
              locations={filteredLocations}
              onSelect={onSelectLocation}
              onSwitchToGrid={() => setViewMode("grid")}
            />
          ) : (
            <LocationGrid
              locations={filteredLocations}
              isLoading={locationsLoading}
              onSelect={onSelectLocation}
            />
          )}
        </motion.div>
      </section>

      <SubscribeSection emphasis={resolvedHeadingEmphasis} />

      <FooterSection
        copyright={copyright}
        logo={footerLogo}
        contactOverride={contactOverride}
        contactTheme={contactTheme}
        socialLinksOverride={socialLinksOverride}
        brandDescription={brandDescription}
        onEditFooter={onEditFooter}
        onEditLogo={onEditLogo}
        onEditEnquiries={onEditEnquiries}
      />
    </div>
    </HeadingEmphasisOverrideProvider>
  );
}
