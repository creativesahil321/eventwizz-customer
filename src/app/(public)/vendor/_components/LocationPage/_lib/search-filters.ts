import { format, isValid, parseISO } from "date-fns";

export type NearMeCoords = { lat: number; lng: number };

export type LocationSearchFilters = {
  query: string;
  city: string | null;
  date: Date | null;
  /**
   * User opted into browser geolocation. Coords are filled after permission;
   * backend nearby search can consume them later. Until then the UI matches
   * the reverse-geocoded city against vendor cities.
   */
  nearMe: boolean;
  nearMeCoords: NearMeCoords | null;
};

export const EMPTY_SEARCH_FILTERS: LocationSearchFilters = {
  query: "",
  city: null,
  date: null,
  nearMe: false,
  nearMeCoords: null,
};

export function isSearchActive(filters: LocationSearchFilters): boolean {
  return Boolean(
    filters.query.trim() ||
      filters.city ||
      filters.date ||
      filters.nearMe,
  );
}

/** API `date` query — always `YYYY-MM-DD`. */
export function toSearchDateParam(date: Date | null): string | undefined {
  if (!date || !isValid(date)) return undefined;
  return format(date, "yyyy-MM-dd");
}

export function parseSearchDateParam(
  value: string | null | undefined,
): Date | null {
  if (!value?.trim()) return null;
  const parsed = parseISO(value.trim());
  return isValid(parsed) ? parsed : null;
}

export function resolveLocationSlugForCity(
  city: string | null,
  locations: Array<{ city?: string | null; slug?: string | null }>,
): string | undefined {
  if (!city?.trim()) return undefined;
  const matches = locations.filter((loc) => loc.city === city && loc.slug);
  if (matches.length === 1) return matches[0].slug ?? undefined;
  return undefined;
}

/**
 * Pick the vendor city that best matches a reverse-geocoded place name.
 * Exact (case-insensitive) first, then substring either way.
 */
export function matchVendorCityToPlace(
  placeName: string | null | undefined,
  cities: string[],
): string | null {
  const needle = (placeName ?? "").trim().toLowerCase();
  if (!needle || cities.length === 0) return null;

  const exact = cities.find((c) => c.trim().toLowerCase() === needle);
  if (exact) return exact;

  const contains = cities.find((c) => {
    const hay = c.trim().toLowerCase();
    return hay.includes(needle) || needle.includes(hay);
  });
  return contains ?? null;
}

export const MULTI_LOCATION_SEARCH_PLACEHOLDER = "Search location events";
export const SINGLE_LOCATION_SEARCH_PLACEHOLDER = "Search events";
export const MULTI_CITY_HOME_SEARCH_PLACEHOLDER = "Search event and category";

/** True when the vendor has 2+ venues (location-page copy vs single-venue home). */
export function resolveVendorHasMultipleLocations(
  locationsCount: number | null | undefined,
  explicit?: boolean,
): boolean {
  if (typeof explicit === "boolean") return explicit;
  return (locationsCount ?? 0) > 1;
}

/** Hero search field copy: location pages vs brand home vs single-venue home. */
export function locationSearchQueryPlaceholder(options: {
  hideCity: boolean;
  hasMultipleLocations: boolean;
}): string {
  if (!options.hideCity) return MULTI_CITY_HOME_SEARCH_PLACEHOLDER;
  return options.hasMultipleLocations
    ? MULTI_LOCATION_SEARCH_PLACEHOLDER
    : SINGLE_LOCATION_SEARCH_PLACEHOLDER;
}
