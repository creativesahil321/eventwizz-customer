"use client";

import { useMemo } from "react";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { usePublicLocationSearch } from "@/services/common/public-search";
import type { Event } from "@/services/common/events/type";
import { LocationSearchBar } from "./location-search-bar";
import {
  filterLocationEvents,
  mergeLocationEvents,
} from "./_lib/filter-location-events";
import {
  toSearchDateParam,
  type LocationSearchFilters,
} from "./_lib/search-filters";
import { usePublicSearchFilters } from "./_lib/use-public-search-filters";

export const LOCATION_EVENTS_ANCHOR_ID = "location-events";

type UseLocationPageSearchOptions = {
  locationSlug: string;
  latestEvents: Event[];
  upcomingEvents: Event[];
  lockedCity?: string | null;
  /** Force client-side filter (Site Essentials preview). */
  previewMode?: boolean;
};

/**
 * Location-page search: live uses scoped public search API;
 * preview falls back to client filter over already-loaded events.
 */
export function useLocationPageSearch({
  locationSlug,
  latestEvents,
  upcomingEvents,
  lockedCity = null,
  previewMode,
}: UseLocationPageSearchOptions) {
  const { domain } = useDomain();
  const isPreviewContext = useIsPreviewMode();
  const useApi = !(previewMode ?? isPreviewContext);

  const { filters, apiFilters, setFilters, clearFilters, isSearchMode } =
    usePublicSearchFilters({
      syncUrl: useApi,
      lockedCity,
    });

  const searchParams = useMemo(
    () => ({
      q: apiFilters.query.trim() || undefined,
      date: toSearchDateParam(apiFilters.date),
      mode: "auto" as const,
      per_page: 40,
    }),
    [apiFilters.query, apiFilters.date],
  );

  const searchQuery = usePublicLocationSearch(
    domain,
    locationSlug,
    searchParams,
    { enabled: useApi && isSearchMode },
  );

  /** Never leave skeleton up after the current query key has settled (incl. total=0). */
  const isSearchLoading =
    searchQuery.isFetching &&
    !searchQuery.isFetched &&
    searchQuery.data === undefined;

  const allEvents = useMemo(
    () => mergeLocationEvents(latestEvents, upcomingEvents),
    [latestEvents, upcomingEvents],
  );

  /** Preview / offline fallback when API is off. */
  const clientSearchResults = useMemo(
    () =>
      filterLocationEvents(allEvents, apiFilters, { softQuery: false }),
    [allEvents, apiFilters],
  );

  const filteredLatest = useMemo(
    () =>
      useApi
        ? latestEvents
        : filterLocationEvents(latestEvents, apiFilters, { softQuery: true }),
    [useApi, latestEvents, apiFilters],
  );
  const filteredUpcoming = useMemo(
    () =>
      useApi
        ? upcomingEvents
        : filterLocationEvents(upcomingEvents, apiFilters, {
            softQuery: true,
          }),
    [useApi, upcomingEvents, apiFilters],
  );

  const scrollToEvents = () => {
    document
      .getElementById(LOCATION_EVENTS_ANCHOR_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearSearch = () => {
    clearFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    filters,
    setFilters,
    isSearchMode,
    searchData: searchQuery.data,
    isSearchLoading,
    isSearchError: searchQuery.isError,
    /** @deprecated Prefer `searchData` on live pages */
    searchResults: clientSearchResults,
    filteredLatest,
    filteredUpcoming,
    scrollToEvents,
    clearSearch,
    useApi,
  };
}

type LocationPageHeroSearchProps = {
  cityLabel?: string | null;
  locationSlug?: string | null;
  filters: LocationSearchFilters;
  onFiltersChange: (value: LocationSearchFilters) => void;
  onSearch: () => void;
  className?: string;
  /** Wire `/availability` so the date picker only enables bookable days. */
  enableAvailability?: boolean;
  hasMultipleLocations?: boolean;
};

/** Search dock for location heroes — city is locked (no city field); bar stays bottom-fixed in HeroBanner. */
export function LocationPageHeroSearch({
  cityLabel,
  locationSlug,
  filters,
  onFiltersChange,
  onSearch,
  className,
  enableAvailability = true,
  hasMultipleLocations = false,
}: LocationPageHeroSearchProps) {
  const { domain } = useDomain();
  const isPreview = useIsPreviewMode();

  return (
    <LocationSearchBar
      className={className}
      hideCity
      hasMultipleLocations={hasMultipleLocations}
      lockedCityLabel={cityLabel}
      value={filters}
      onChange={onFiltersChange}
      onSearch={onSearch}
      availability={{
        domain,
        q: filters.query,
        location_slug: locationSlug,
        enabled: enableAvailability && !isPreview,
      }}
    />
  );
}

/** Self-contained dock for previews that only need the chrome (no event lists). */
export function LocationPageHeroSearchPreview({
  cityLabel,
  hasMultipleLocations = false,
}: {
  cityLabel?: string | null;
  hasMultipleLocations?: boolean;
}) {
  const { filters, setFilters, scrollToEvents } = useLocationPageSearch({
    locationSlug: "",
    latestEvents: [],
    upcomingEvents: [],
    lockedCity: cityLabel,
    previewMode: true,
  });
  return (
    <LocationPageHeroSearch
      cityLabel={cityLabel}
      filters={filters}
      onFiltersChange={setFilters}
      onSearch={scrollToEvents}
      enableAvailability={false}
      hasMultipleLocations={hasMultipleLocations}
    />
  );
}
