"use client";

import { useMemo } from "react";
import type { LocationEventCardModel } from "./location-event-card";
import { LocationEventCard } from "./location-event-card";
import {
  dualEventShowcaseFrameClass,
  eventCarouselNavButtonClass,
  mobileEventRowPeekScrollItemClass,
} from "./event-carousel-classes";
import { EventListingHorizontalScroll } from "./event-listing-horizontal-scroll";
import { SiteHeading } from "@/components/public/site-heading";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";

type DualEventShowcaseProps = {
  sectionId: string;
  sectionLabel: string;
  sectionTitle: string;
  events: [LocationEventCardModel, LocationEventCardModel];
  locationSlug: string;
  pendingEventSlug: string | null;
  onNavigateStart: (slug: string) => void;
  imageFallbacks: [string, string];
  footnote?: string;
};

/**
 * Two-event layout: horizontal peek slider on mobile (booking-first),
 * side-by-side cards from md up.
 */
export function DualEventShowcase({
  sectionId,
  sectionLabel,
  sectionTitle,
  events,
  locationSlug,
  pendingEventSlug,
  onNavigateStart,
  imageFallbacks,
  footnote,
}: DualEventShowcaseProps) {
  const narrowPreview = usePreviewNarrowLayout();
  const scrollWatchKey = useMemo(
    () => events.map((e) => e.slug).join("|"),
    [events],
  );

  return (
    <section
      id={sectionId}
      className="w-full bg-transparent py-20 text-[var(--color-text)] md:py-28"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 w-full space-y-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            {sectionLabel}
          </p>
          <SiteHeading
            level={2}
            title={sectionTitle}
            variant="onSurface"
            className="!text-3xl !font-black tracking-tight md:!text-4xl"
          />
        </div>

        {/* Mobile / narrow preview: peek slider */}
        <div className={cn("relative w-full", !narrowPreview && "md:hidden")}>
          <EventListingHorizontalScroll
            watchKey={scrollWatchKey}
            leftButtonClassName={eventCarouselNavButtonClass(
              "absolute left-0 top-1/2 -translate-y-1/2",
            )}
            rightButtonClassName={eventCarouselNavButtonClass(
              "absolute right-0 top-1/2 -translate-y-1/2",
            )}
          >
            {events.map((event, index) => (
              <div
                key={`peek-${event.slug || index}`}
                className={mobileEventRowPeekScrollItemClass}
              >
                <div className="h-full w-full pb-1 pt-0.5">
                  <LocationEventCard
                    event={event}
                    locationSlug={locationSlug}
                    isPending={pendingEventSlug === event.slug}
                    onNavigateStart={() => onNavigateStart(event.slug)}
                    imageFallback={imageFallbacks[index]}
                  />
                </div>
              </div>
            ))}
          </EventListingHorizontalScroll>
        </div>

        {/* Desktop: side-by-side */}
        {!narrowPreview ? (
          <div className={cn(dualEventShowcaseFrameClass, "hidden md:block")}>
            <div className="grid grid-cols-2 gap-4 md:gap-5">
              {events.map((event, index) => (
                <LocationEventCard
                  key={`grid-${event.slug || index}`}
                  event={event}
                  locationSlug={locationSlug}
                  isPending={pendingEventSlug === event.slug}
                  onNavigateStart={() => onNavigateStart(event.slug)}
                  imageFallback={imageFallbacks[index]}
                />
              ))}
            </div>
          </div>
        ) : null}

        {footnote ? (
          <p className="mx-auto mt-5 max-w-lg text-center text-xs leading-relaxed text-[var(--color-text-dimmed)] sm:text-sm">
            {footnote}
          </p>
        ) : null}
      </div>
    </section>
  );
}
