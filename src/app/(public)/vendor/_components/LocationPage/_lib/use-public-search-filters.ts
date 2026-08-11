"use client";

import { useCallback, useMemo, useState } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import {
  EMPTY_SEARCH_FILTERS,
  isSearchActive,
  parseSearchDateParam,
  toSearchDateParam,
  type LocationSearchFilters,
} from "./search-filters";

type UsePublicSearchFiltersOptions = {
  /** Sync q/city/date to the URL (live pages). Off for Site Essentials previews. */
  syncUrl?: boolean;
  /**
   * Location pages: city is shown as a locked chip only.
   * Must NOT count as an active search filter (or browse mode never shows).
   */
  lockedCity?: string | null;
};

/**
 * Search filter state with optional URL sync (`?q=&city=&date=`).
 * Debounces free-text for API calls (~300ms).
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
    },
    { history: "replace", shallow: true },
  );

  const [localFilters, setLocalFilters] =
    useState<LocationSearchFilters>(EMPTY_SEARCH_FILTERS);

  const filters: LocationSearchFilters = useMemo(() => {
    if (!syncUrl) {
      return {
        ...localFilters,
        // Locked city is UI chrome only — keep filter city null so search mode
        // activates on query/date, not merely opening a location page.
        city: cityIsLocked ? null : localFilters.city,
      };
    }
    return {
      query: urlState.q ?? "",
      city: cityIsLocked ? null : urlState.city,
      date: parseSearchDateParam(urlState.date),
    };
  }, [syncUrl, localFilters, urlState, cityIsLocked]);

  const setFilters = useCallback(
    (next: LocationSearchFilters) => {
      const normalized: LocationSearchFilters = {
        query: next.query,
        city: cityIsLocked ? null : next.city,
        date: next.date,
      };

      if (!syncUrl) {
        setLocalFilters(normalized);
        return;
      }

      void setUrlState({
        q: normalized.query.trim() ? normalized.query : null,
        city: cityIsLocked ? null : normalized.city,
        date: toSearchDateParam(normalized.date) ?? null,
      });
    },
    [cityIsLocked, setUrlState, syncUrl],
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_SEARCH_FILTERS);
  }, [setFilters]);

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
