"use client";

import type { LocationEventCardModel } from "./location-event-card";
import { LocationEventCard } from "./location-event-card";
import { dualEventShowcaseFrameClass } from "./event-carousel-classes";
import { SiteHeading } from "@/components/public/site-heading";
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
 * Two-event layout: same carousel frame as single-event showcase, two standard
 * cards side-by-side (not a full-width 50/50 grid).
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

        <div className={dualEventShowcaseFrameClass}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
            {events.map((event, index) => (
              <LocationEventCard
                key={event.slug || index}
                event={event}
                locationSlug={locationSlug}
                isPending={pendingEventSlug === event.slug}
                onNavigateStart={() => onNavigateStart(event.slug)}
                imageFallback={imageFallbacks[index]}
              />
            ))}
          </div>
        </div>

        {footnote ? (
          <p className="mx-auto mt-5 max-w-lg text-center text-xs leading-relaxed text-[var(--color-text-dimmed)] sm:text-sm">
            {footnote}
          </p>
        ) : null}
      </div>
    </section>
  );
}
