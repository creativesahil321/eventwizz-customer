import { isSameDay, isValid, parseISO } from "date-fns";
import type { Event } from "@/services/common/events/type";
import type { LocationSearchFilters } from "./search-filters";

export type { LocationSearchFilters } from "./search-filters";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function eventDateRaw(event: Event): string | null {
  const candidates = [
    event.event_date,
    event.formatted_date,
    event.date,
    event.start_date,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseEventDate(raw: string | null): Date | null {
  if (!raw) return null;
  const iso = parseISO(raw);
  if (isValid(iso)) return iso;
  const fallback = new Date(raw);
  return isValid(fallback) ? fallback : null;
}

function categoryLabel(event: Event): string {
  if (typeof event.event_category_name === "string") {
    return event.event_category_name;
  }
  if (typeof event.event_category === "string") return event.event_category;
  if (
    event.event_category &&
    typeof event.event_category === "object" &&
    typeof event.event_category.name === "string"
  ) {
    return event.event_category.name;
  }
  return "";
}

export type FilterLocationEventsOptions = {
  /**
   * Soft (default false for search mode): if query matches nothing, keep the
   * date-filtered list. Hard: return empty when query has no hits.
   * Client-side only — replace with server search later.
   */
  softQuery?: boolean;
};

/**
 * Client-side event filter — preview / offline fallback only.
 * Live location pages use `GET /domain/{domain}/locations/{slug}/search`.
 */
export function filterLocationEvents(
  events: Event[],
  filters: Pick<LocationSearchFilters, "query" | "date">,
  options?: FilterLocationEventsOptions,
): Event[] {
  const query = normalize(filters.query);
  const softQuery = Boolean(options?.softQuery);

  const byDate = filters.date
    ? events.filter((event) => {
        const parsed = parseEventDate(eventDateRaw(event));
        if (!parsed) return false;
        return isSameDay(parsed, filters.date as Date);
      })
    : events;

  if (!query) return byDate;

  const byQuery = byDate.filter((event) => {
    const haystacks = [event.name, event.slug, categoryLabel(event)];
    return haystacks.some((value) => normalize(value).includes(query));
  });

  if (softQuery && byQuery.length === 0) return byDate;
  return byQuery;
}

/** Merge popular + upcoming, prefer first occurrence of each slug. */
export function mergeLocationEvents(
  latest: Event[],
  upcoming: Event[],
): Event[] {
  const seen = new Set<string>();
  const merged: Event[] = [];
  for (const event of [...latest, ...upcoming]) {
    const key = (event.slug || event.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }
  return merged;
}
