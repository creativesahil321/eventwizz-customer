"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Map, LayoutGrid, MapPin, CalendarDays } from "lucide-react";
import LocationSelectionHeader from "./location-selection-header";
import LocationGrid from "./location-grid";
import GoogleLocationMap from "./location-map-google";
import { LocationSearchBar } from "./location-search-bar";
import {
  filterLocations,
  hasHardSearchFilters,
  type LocationSearchFilters,
} from "./_lib/filter-locations";
import SubscribeSection from "../EventListPage/subscribe";
import FooterSection from "../EventListPage/footer";
import { SiteHeading } from "@/components/public/site-heading";
import {
  normalizeHeadingEmphasis,
  type HeadingEmphasis,
} from "@/lib/heading-emphasis";
import {
  heroBandBottomFadeClass,
  heroBandContentPadClass,
  heroBandHeightCompactMobileClass,
  heroBandMediaMaskClass,
  heroBandVerticalClass,
  heroBandVignetteClass,
  heroBandViewToggleOffsetClass,
  heroBannerStackClass,
  vendorHomeSubheroClass,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import type { LocationData } from "@/types/theme.types";
import type { ThemeSchema } from "@/types/theme.types";
import type { VenueContactOverride } from "@/lib/resolve-venue-contact";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { useDebounce } from "@/hooks/data-table/use-debounce";

const EMPTY_SEARCH_FILTERS: LocationSearchFilters = {
  query: "",
  city: null,
  date: null,
};

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
  const [searchFilters, setSearchFilters] =
    useState<LocationSearchFilters>(EMPTY_SEARCH_FILTERS);
  const isPreviewNarrow = usePreviewNarrowLayout();
  /**
   * Map chrome only from xl (1280px)+ — small desktops keep grid and avoid
   * CTA / toggle collisions in the hero fade.
   */
  const hideMapView = isPreviewNarrow || isCompactViewport;

  const debouncedQuery = useDebounce(searchFilters.query, 250);
  const activeFilters = useMemo(
    () => ({ ...searchFilters, query: debouncedQuery }),
    [searchFilters, debouncedQuery],
  );
  const filteredLocations = useMemo(
    () => filterLocations(locations, activeFilters),
    [locations, activeFilters],
  );
  /** Empty state only for city/date — Popular/query stay soft until the API. */
  const showEmptySearchState =
    hasHardSearchFilters(searchFilters) && filteredLocations.length === 0;

  const totalEvents = filteredLocations.reduce(
    (sum, loc) =>
      sum + (typeof loc.total_events === "number" ? loc.total_events : 0),
    0,
  );
  const totalLocations = filteredLocations.length;

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
    setSearchFilters(EMPTY_SEARCH_FILTERS);
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
          "relative mx-auto flex w-full min-w-0 justify-center overflow-hidden",
          heroBandHeightCompactMobileClass,
          heroBandVerticalClass(heroValign),
        )}
      >
        <div className="absolute inset-0" aria-hidden>
          <div className={cn("absolute inset-0", heroBandMediaMaskClass)}>
            <Image
              key={heroImageSrc}
              src={heroImageSrc}
              alt=""
              fill
              className="scale-[1.03] object-cover"
              priority
              sizes="100vw"
              unoptimized={!shouldUseNextImageOptimization(heroImageSrc)}
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] mix-blend-soft-light"
              aria-hidden
            />
          </div>
          <div className={heroBandVignetteClass} aria-hidden />
          <div className={heroBandBottomFadeClass} aria-hidden />
        </div>
        <div
          className={cn(
            "relative z-10 mx-auto w-full min-w-0 max-w-[1180px] overflow-visible px-4 sm:px-6",
            heroBandContentPadClass(heroValign),
            // Room under hero search + Popular chips so the toggle never covers them.
            hideMapView ? "pb-10 sm:pb-16" : "pb-16 sm:pb-28 xl:pb-32",
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
            <span className="mb-3 inline-flex max-w-[min(100%,22rem)] items-center gap-2 truncate rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md sm:mb-4 sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-[0.16em]">
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
              variant="onDark"
              align={heroAlign}
              className="mb-2.5 w-full min-w-0 max-w-full break-words font-bold !text-[1.65rem] !leading-[1.18] sm:mb-4 sm:!text-4xl sm:!leading-[1.12] md:max-w-5xl md:!text-5xl xl:!text-[3.25rem] xl:!leading-[1.05]"
            />

            <p
              className={cn(
                vendorHomeSubheroClass(heroAlign),
                "!mb-5 px-1 text-sm sm:!mb-6 sm:text-base md:text-lg",
              )}
            >
              {heroSubheading}
            </p>

            <LocationSearchBar
              variant="onDark"
              className="w-full max-w-4xl px-0"
              cities={locations.map((location) => location.city)}
              value={searchFilters}
              onChange={setSearchFilters}
              onSearch={scrollToResults}
            />
          </motion.div>
        </div>
      </section>

      {!hideMapView && (
        <section
          className={cn(
            "flex justify-center bg-transparent px-4 pb-6 pt-0 sm:px-6",
            heroBandViewToggleOffsetClass,
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] bg-[var(--color-surface)] p-1 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.45)]"
          >
            <div className="flex" role="tablist" aria-label="Locations view">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "map"}
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 motion-reduce:transition-none ${
                  viewMode === "map"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]"
                }`}
              >
                <Map className="h-4 w-4" aria-hidden />
                Map View
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 motion-reduce:transition-none ${
                  viewMode === "grid"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]"
                }`}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Grid View
              </button>
            </div>
          </motion.div>
        </section>
      )}

      <section
        id={exploreCitiesSectionId}
        className={cn(
          "scroll-mt-20 bg-[var(--color-background)] pb-14 md:pb-20",
          hideMapView ? "pt-8 sm:pt-10" : "pt-2 md:pt-3",
        )}
      >
        <motion.div
          className="mx-auto w-full max-w-[1180px] px-4 sm:px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          <div className="mx-auto mb-6 max-w-2xl text-center md:mb-7">
            <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-primary)] sm:text-xs">
              Explore cities
            </span>
            <SiteHeading
              level={2}
              align="center"
              title={locationsListTitle}
              variant="onSurface"
              className="mb-2.5 !text-[1.75rem] !font-black !leading-tight tracking-tight sm:!text-4xl"
            />
            <p className="mx-auto max-w-xl px-1 text-sm leading-relaxed text-[var(--color-text-dimmed)] sm:text-base">
              {locationsListSubtitle}
            </p>
          </div>

          {locations.length > 0 ? (
            <div
              className="mx-auto mb-7 grid max-w-md grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:mb-8"
              aria-label="Location overview"
            >
              <div className="flex flex-col items-center rounded-[16px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-3 py-3.5 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.45)] sm:rounded-[20px] sm:px-6 sm:py-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[var(--color-primary)]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dimmed)] sm:text-[11px] sm:tracking-[0.16em]">
                    Locations
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--color-text)] sm:text-[1.75rem]">
                  {totalLocations}
                </p>
              </div>
              <div className="flex flex-col items-center rounded-[16px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-3 py-3.5 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.45)] sm:rounded-[20px] sm:px-6 sm:py-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[var(--color-primary)]">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dimmed)] sm:text-[11px] sm:tracking-[0.16em]">
                    Events
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--color-text)] sm:text-[1.75rem]">
                  {totalEvents}
                </p>
              </div>
            </div>
          ) : null}

          {showEmptySearchState ? (
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
