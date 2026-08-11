"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { Map, LayoutGrid, MapPin, CalendarDays } from "lucide-react";
import LocationSelectionHeader from "./location-selection-header";
import LocationGrid from "./location-grid";
import GoogleLocationMap from "./location-map-google";
import { LocationSearchBar } from "./location-search-bar";
import { PublicSearchResults } from "./public-search-results";
import {
  filterLocations,
  resolveLocationSlugForCity,
  toSearchDateParam,
} from "./_lib/filter-locations";
import { usePublicSearchFilters } from "./_lib/use-public-search-filters";
import SubscribeSection from "../EventListPage/subscribe";
import FooterSection from "../EventListPage/footer";
import { SiteHeading } from "@/components/public/site-heading";
import {
  normalizeHeadingEmphasis,
  type HeadingEmphasis,
} from "@/lib/heading-emphasis";
import {
  heroBandContentPadClass,
  heroBandHeightCompactMobileClass,
  heroBandVerticalClass,
  heroBandViewToggleOffsetClass,
  heroBannerStackClass,
  vendorHomeSubheroClass,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import type { LocationData } from "@/types/theme.types";
import type { ThemeSchema } from "@/types/theme.types";
import type { VenueContactOverride } from "@/lib/resolve-venue-contact";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
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
  heroBadgeLabel: string;
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
  socialLinksOverride?: Partial<
    Record<"facebook" | "twitter" | "instagram" | "linkedin" | "youtube", string>
  > | null;
  /** Unique section id for Explore cities scroll target. */
  exploreCitiesSectionId?: string;
  style?: CSSProperties;
  className?: string;
  /** Optional slot above the header (e.g. preview font loader). */
  beforeHeader?: ReactNode;
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
  heroBadgeLabel,
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
  exploreCitiesSectionId = "explore-cities",
  style,
  className,
  beforeHeader,
}: VendorMainLandingViewProps) {
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const isPreviewNarrow = usePreviewNarrowLayout();
  const isPreviewMode = useIsPreviewMode();
  const { domain } = useDomain();
  const useApi = !isPreviewMode;

  const { filters, apiFilters, setFilters, clearFilters, isSearchMode } =
    usePublicSearchFilters({ syncUrl: useApi });

  /**
   * Map chrome only from xl (1280px)+ — small desktops keep grid and avoid
   * CTA / toggle collisions in the hero fade.
   */
  const hideMapView = isPreviewNarrow || isCompactViewport;

  const locationSlugForCity = useMemo(
    () => resolveLocationSlugForCity(apiFilters.city, locations),
    [apiFilters.city, locations],
  );

  const searchParams = useMemo(
    () => ({
      q: apiFilters.query.trim() || undefined,
      // Prefer slug when unique; otherwise exact city label for the API.
      location_slug: locationSlugForCity,
      city: locationSlugForCity ? undefined : apiFilters.city ?? undefined,
      date: toSearchDateParam(apiFilters.date),
      mode: "auto" as const,
      per_page: 40,
    }),
    [apiFilters.query, apiFilters.city, apiFilters.date, locationSlugForCity],
  );

  const searchQuery = usePublicSearch(domain, searchParams, {
    enabled: useApi && isSearchMode,
  });

  /** Preview / browse: location cards. Live search: API event/date results. */
  const filteredLocations = useMemo(
    () =>
      useApi && isSearchMode
        ? locations
        : filterLocations(locations, apiFilters),
    [useApi, isSearchMode, locations, apiFilters],
  );

  const showApiResults = useApi && isSearchMode;
  const showEmptySearchState =
    !showApiResults &&
    isSearchMode &&
    filteredLocations.length === 0;

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

  const heroAlign = "center" as const;
  const heroValign = "center" as const;

  return (
    <div
      {...(style ? { "data-preview-theme-root": "" } : {})}
      style={style}
      className={cn(
        "relative flex min-h-screen w-full min-w-0 flex-col bg-[var(--color-background)] font-body text-[var(--color-text)]",
        className,
      )}
    >
      {beforeHeader}
      <LocationSelectionHeader name={brandName} logo={logo || undefined} />

      <section
        className={cn(
          "relative mx-auto flex w-full min-w-0 justify-center overflow-hidden bg-[var(--color-background)]",
          heroBandHeightCompactMobileClass,
          heroBandVerticalClass(heroValign),
        )}
      >
        {/*
          Soft hero image band — no CSS blur:
          absolute top band · opacity-50 · mask-image: linear-gradient(#000 50%, #00000057 98%)
          User-uploaded cover: native <img> + cache busting (see CACHE_BUSTING_CHANGES.md).
          Preload + fetchPriority so LCP is not delayed like a late CSS background-image.
        */}
        {heroImageSrc ? (
          <link
            rel="preload"
            as="image"
            href={heroImageSrc}
            fetchPriority="high"
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-50 sm:h-[580px]"
          style={{
            WebkitMaskImage:
              "linear-gradient(#000000 50%, #00000057 98%)",
            maskImage: "linear-gradient(#000000 50%, #00000057 98%)",
          }}
        >
          {heroImageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded; cache-bust via ?v=
            <img
              src={heroImageSrc}
              alt=""
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : null}
        </div>

        <div
          className={cn(
            "relative z-10 mx-auto w-full min-w-0 max-w-[1180px] overflow-visible px-4 sm:px-6",
            heroBandContentPadClass(heroValign),
            "pt-24 sm:pt-28 md:pt-32",
            hideMapView ? "pb-12 sm:pb-16" : "pb-16 sm:pb-20 xl:pb-24",
          )}
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              heroBannerStackClass(heroAlign),
              "w-full min-w-0 overflow-visible",
            )}
          >
            <span className="mb-3 inline-flex max-w-[min(100%,22rem)] items-center gap-2 truncate rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)] sm:mb-4 sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-[0.16em]">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                aria-hidden
              />
              <span className="min-w-0 truncate">{heroBadgeLabel}</span>
            </span>

            <SiteHeading
              level={1}
              title={heroHeading}
              accentHint={heroAccentHint}
              emphasis={normalizeHeadingEmphasis(headingEmphasis)}
              variant="onSurface"
              align={heroAlign}
              className="mb-2.5 w-full min-w-0 max-w-full break-words font-bold !text-[1.65rem] !leading-[1.18] sm:mb-4 sm:!text-4xl sm:!leading-[1.12] md:max-w-5xl md:!text-5xl xl:!text-[3.25rem] xl:!leading-[1.05]"
            />

            <p
              className={cn(
                vendorHomeSubheroClass(heroAlign),
                "!mb-8 !text-[var(--color-text-dimmed)] px-1 text-sm sm:!mb-10 sm:text-base md:text-lg",
              )}
            >
              {heroSubheading}
            </p>

            <LocationSearchBar
              className="w-full max-w-3xl px-0"
              cities={locations.map((location) => location.city)}
              cityEventCounts={cityEventCounts}
              value={filters}
              onChange={setFilters}
              onSearch={scrollToResults}
              availability={{
                domain,
                q: filters.query,
                city: locationSlugForCity ? undefined : filters.city,
                location_slug: locationSlugForCity,
                enabled: useApi,
              }}
            />
          </motion.div>
        </div>
      </section>

      {!hideMapView && !showApiResults ? (
        <section
          className={cn(
            "relative z-20 flex justify-center bg-transparent px-4 pb-5 pt-0 sm:px-6",
            heroBandViewToggleOffsetClass,
          )}
        >
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
          className="mx-auto w-full max-w-[1180px] px-4 sm:px-6"
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
                "mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-primary)]",
                !isPreviewNarrow &&
                  "sm:mb-2.5 sm:text-xs sm:tracking-[0.2em]",
              )}
            >
              Explore cities
            </span>
            <SiteHeading
              level={2}
              align="center"
              title={locationsListTitle}
              variant="onSurface"
              className={cn(
                "mb-1 !text-xl !font-black !leading-snug tracking-tight",
                !isPreviewNarrow &&
                  "sm:mb-2.5 sm:!text-4xl sm:!leading-tight",
              )}
            />
            <p
              className={cn(
                "mx-auto max-w-xl px-1 text-xs leading-snug text-[var(--color-text-dimmed)]",
                !isPreviewNarrow && "sm:text-base sm:leading-relaxed",
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
            <PublicSearchResults
              filters={filters}
              data={searchQuery.data}
              isLoading={searchQuery.isFetching}
              isError={searchQuery.isError}
              onClear={clearSearchFilters}
              sectionId={`${exploreCitiesSectionId}-results`}
              className="!px-0 !pt-0"
            />
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

      <SubscribeSection />

      <FooterSection
        copyright={copyright}
        logo={footerLogo}
        contactOverride={contactOverride}
        contactTheme={contactTheme}
        socialLinksOverride={socialLinksOverride}
      />
    </div>
  );
}
