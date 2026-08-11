import { isSameDay, isValid, parseISO } from "date-fns";
import type { LocationData } from "@/types/theme.types";
import type { LocationSearchFilters } from "./search-filters";

export type { LocationSearchFilters } from "./search-filters";
export {
  EMPTY_SEARCH_FILTERS,
  isSearchActive,
  toSearchDateParam,
  parseSearchDateParam,
  resolveLocationSlugForCity,
} from "./search-filters";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function parseEventDate(raw: string | null | undefined): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = parseISO(trimmed);
  if (isValid(iso)) return iso;

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

function matchesQuery(location: LocationData, query: string): boolean {
  const haystacks = [
    location.city,
    location.slug,
    location.address,
    location.latest_upcoming_event?.name,
  ];
  return haystacks.some((value) => normalize(value).includes(query));
}

/**
 * Client-side location filter — preview / offline fallback only.
 * Live multi-location home uses `GET /domain/{domain}/search`.
 */
export function filterLocations(
  locations: LocationData[],
  filters: LocationSearchFilters,
): LocationData[] {
  const query = normalize(filters.query);
  const city = filters.city?.trim() || null;

  const byCityAndDate = locations.filter((location) => {
    if (city && location.city !== city) return false;

    if (filters.date) {
      const eventDate = parseEventDate(location.latest_upcoming_event?.date);
      if (!eventDate || !isSameDay(eventDate, filters.date)) return false;
    }

    return true;
  });

  if (!query) return byCityAndDate;

  const byQuery = byCityAndDate.filter((location) =>
    matchesQuery(location, query),
  );

  return byQuery.length > 0 ? byQuery : byCityAndDate;
}

/** @deprecated Prefer `isSearchActive` — kept for older call sites. */
export function hasHardSearchFilters(filters: LocationSearchFilters): boolean {
  return Boolean(filters.city || filters.date);
}
