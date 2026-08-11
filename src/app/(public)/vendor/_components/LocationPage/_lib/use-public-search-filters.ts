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
  /** When set, city is locked and never written to the URL. */
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
      return lockedCity
        ? { ...localFilters, city: lockedCity }
        : localFilters;
    }
    return {
      query: urlState.q ?? "",
      city: lockedCity ?? urlState.city,
      date: parseSearchDateParam(urlState.date),
    };
  }, [syncUrl, localFilters, urlState, lockedCity]);

  const setFilters = useCallback(
    (next: LocationSearchFilters) => {
      const normalized: LocationSearchFilters = {
        query: next.query,
        city: lockedCity ?? next.city,
        date: next.date,
      };

      if (!syncUrl) {
        setLocalFilters(normalized);
        return;
      }

      void setUrlState({
        q: normalized.query.trim() ? normalized.query : null,
        city: lockedCity ? null : normalized.city,
        date: toSearchDateParam(normalized.date) ?? null,
      });
    },
    [lockedCity, setUrlState, syncUrl],
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
