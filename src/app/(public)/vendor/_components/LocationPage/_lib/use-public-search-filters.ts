"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { requestUserLocation } from "@/lib/request-user-location";
import {
  EMPTY_SEARCH_FILTERS,
  isSearchActive,
  parseSearchDateParam,
  toSearchDateParam,
  type LocationSearchFilters,
} from "./search-filters";

type UsePublicSearchFiltersOptions = {
  /** Sync q/city/date/near to the URL (live pages). Off for Site Essentials previews. */
  syncUrl?: boolean;
  /**
   * Location pages: city is shown as a locked chip only.
   * Must NOT count as an active search filter (or browse mode never shows).
   */
  lockedCity?: string | null;
};

const nearParser = parseAsStringEnum(["1"] as const);

/**
 * Search filter state with optional URL sync (`?q=&city=&date=&near=1`).
 * Debounces free-text for API calls (~300ms).
 * Near Me coords stay in memory (not URL) — restored from geolocation cache when `near=1`.
 */
export function usePublicSearchFilters(
  options: UsePublicSearchFiltersOptions = {},
) {
  const { syncUrl = false, lockedCity = null } = options;
  const cityIsLocked = Boolean(lockedCity);

  const [urlState, setUrlState] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      city: parseAsString,
      date: parseAsString,
      near: nearParser,
    },
    { history: "replace", shallow: true },
  );

  const [localFilters, setLocalFilters] =
    useState<LocationSearchFilters>(EMPTY_SEARCH_FILTERS);

  /** Coords for Near Me — never put lat/lng in the URL. */
  const [nearMeCoords, setNearMeCoords] = useState<
    LocationSearchFilters["nearMeCoords"]
  >(null);

  const filters: LocationSearchFilters = useMemo(() => {
    if (!syncUrl) {
      return {
        ...localFilters,
        city: cityIsLocked ? null : localFilters.city,
      };
    }
    return {
      query: urlState.q ?? "",
      city: cityIsLocked ? null : urlState.city,
      date: parseSearchDateParam(urlState.date),
      nearMe: urlState.near === "1",
      nearMeCoords,
    };
  }, [syncUrl, localFilters, urlState, cityIsLocked, nearMeCoords]);

  const setFilters = useCallback(
    (next: LocationSearchFilters) => {
      const normalized: LocationSearchFilters = {
        query: next.query,
        city: cityIsLocked ? null : next.nearMe ? null : next.city,
        date: next.date,
        nearMe: cityIsLocked ? false : next.nearMe,
        nearMeCoords: cityIsLocked ? null : next.nearMe ? next.nearMeCoords : null,
      };

      setNearMeCoords(normalized.nearMeCoords);

      if (!syncUrl) {
        setLocalFilters(normalized);
        return;
      }

      void setUrlState({
        q: normalized.query.trim() ? normalized.query : null,
        city: cityIsLocked || normalized.nearMe ? null : normalized.city,
        date: toSearchDateParam(normalized.date) ?? null,
        near: normalized.nearMe ? "1" : null,
      });
    },
    [cityIsLocked, setUrlState, syncUrl],
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_SEARCH_FILTERS);
  }, [setFilters]);

  // Restore coords from cache when landing with `?near=1` (no lat/lng in URL).
  useEffect(() => {
    if (!syncUrl || urlState.near !== "1" || nearMeCoords) return;
    let cancelled = false;
    void requestUserLocation().then((result) => {
      if (cancelled || !result.ok) return;
      setNearMeCoords(result.coords);
    });
    return () => {
      cancelled = true;
    };
  }, [syncUrl, urlState.near, nearMeCoords]);

  const debouncedQuery = useDebounce(filters.query, 300);
  const apiFilters = useMemo(
    () => ({ ...filters, query: debouncedQuery }),
    [filters, debouncedQuery],
  );

  return {
    filters,
    apiFilters,
    setFilters,
    clearFilters,
    isSearchMode: isSearchActive(filters),
  };
}
