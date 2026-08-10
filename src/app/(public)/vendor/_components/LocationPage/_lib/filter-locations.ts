import { isSameDay, isValid, parseISO } from "date-fns";
import type { LocationData } from "@/types/theme.types";

export type LocationSearchFilters = {
  query: string;
  city: string | null;
  date: Date | null;
};

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
 * Temporary client-side filter until a search API is wired.
 * City + date always apply. Free-text only narrows the list when it matches
 * real location data — otherwise it stays UI-only so unmatched queries don’t
 * wipe the grid.
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

  // Soft match: keep city/date results when the keyword has no local hits yet.
  return byQuery.length > 0 ? byQuery : byCityAndDate;
}

/** True when city/date filters can produce a hard empty state. */
export function hasHardSearchFilters(filters: LocationSearchFilters): boolean {
  return Boolean(filters.city || filters.date);
}
