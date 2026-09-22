"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { SearchX } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import type { Event } from "@/services/common/events/type";
import type { LocationSearchFilters } from "./_lib/search-filters";
import { toLocationEventCardModel } from "../EventListPage/event-card-utils";
import { LocationEventCard } from "../EventListPage/location-event-card";
import { LOCATION_EVENTS_ANCHOR_ID } from "./location-page-hero-search";

const FALLBACK_IMAGE =
  "/assets/images/events/dummyEvents/concert-event.jpg";

type LocationEventSearchResultsProps = {
  events: Event[];
  locationSlug: string;
  locationLabel?: string | null;
  filters: LocationSearchFilters;
  onClear: () => void;
};

function buildSummary(filters: LocationSearchFilters): string {
  const parts: string[] = [];
  const q = filters.query.trim();
  if (q) parts.push(`“${q}”`);
  if (filters.date) parts.push(format(filters.date, "d MMM yyyy"));
  if (parts.length === 0) return "Matching events";
  return `Results for ${parts.join(" · ")}`;
}

/**
 * Search-mode results grid. Client-filtered for now; swap `events` for API data later.
 */
export function LocationEventSearchResults({
  events,
  locationSlug,
  locationLabel,
  filters,
  onClear,
}: LocationEventSearchResultsProps) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const currencySym = useCurrencySymbol();

  const cards = useMemo(
    () =>
      events.map((event) =>
        toLocationEventCardModel(event, currencySym, FALLBACK_IMAGE),
      ),
    [events, currencySym],
  );

  const count = cards.length;

  return (
    <section
      id={LOCATION_EVENTS_ANCHOR_ID}
      className="scroll-mt-28 bg-[var(--color-background)] pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-4 sm:pt-6 md:pb-20 md:pt-8"
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-6">
          <div className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-primary)] sm:mb-1 sm:text-[11px]">
              Search results
            </span>
            <SiteHeading
              level={2}
              title={buildSummary(filters)}
              variant="onSurface"
              align="left"
              className="!text-[1.25rem] !font-black !leading-tight break-words sm:!text-3xl"
            />
            <p className="mt-0.5 text-xs text-[var(--color-text-dimmed)] sm:mt-1 sm:text-sm">
              {count === 0
                ? "No events match your search"
                : `${count} event${count === 1 ? "" : "s"} found`}
              {locationLabel ? ` in ${locationLabel}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="mt-0.5 inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_14%,transparent)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] sm:mt-1 sm:h-10 sm:px-4 sm:text-sm"
          >
            Clear
          </button>
        </div>

        {count === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-5 py-10 text-center sm:px-6 sm:py-12">
            <SearchX
              className="h-8 w-8 text-[var(--color-text-dimmed)]"
              aria-hidden
            />
            <p className="text-base font-semibold text-[var(--color-text)]">
              No events match your search
            </p>
            <p className="text-sm text-[var(--color-text-dimmed)]">
              Try another keyword or date, or clear search to browse all events.
            </p>
            <button
              type="button"
              onClick={onClear}
              className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-foreground)] transition-opacity hover:opacity-95 sm:h-10 sm:w-auto"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {cards.map((event) => (
              <div key={event.slug || event.title} className="min-w-0">
                <LocationEventCard
                  event={event}
                  locationSlug={locationSlug}
                  locationLabel={locationLabel}
                  isPending={pendingSlug === event.slug}
                  onNavigateStart={() => setPendingSlug(event.slug)}
                  imageFallback={FALLBACK_IMAGE}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
