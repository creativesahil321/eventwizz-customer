import { format, isValid, parseISO } from "date-fns";

export type LocationSearchFilters = {
  query: string;
  city: string | null;
  date: Date | null;
};

export const EMPTY_SEARCH_FILTERS: LocationSearchFilters = {
  query: "",
  city: null,
  date: null,
};

export function isSearchActive(filters: LocationSearchFilters): boolean {
  return Boolean(filters.query.trim() || filters.city || filters.date);
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
