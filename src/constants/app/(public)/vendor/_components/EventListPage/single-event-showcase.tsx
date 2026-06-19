"use client";

import type { LocationEventCardModel } from "./location-event-card";
import { LocationEventHeroCard } from "./location-event-hero-card";
import { singleEventShowcaseSlideClass } from "./event-carousel-classes";
import { SiteHeading } from "@/components/public/site-heading";
type SingleEventShowcaseProps = {
  sectionId: string;
  sectionLabel: string;
  sectionTitle: string;
  event: LocationEventCardModel;
  locationSlug: string;
  isPending: boolean;
  onNavigateStart: () => void;
  imageFallback: string;
  /** Optional note under the slide (e.g. site preview sample copy). */
  footnote?: string;
};

/**
 * Single-event layout: centered hero card so one event does not look orphaned.
 */
export function SingleEventShowcase({
  sectionId,
  sectionLabel,
  sectionTitle,
  event,
  locationSlug,
  isPending,
  onNavigateStart,
  imageFallback,
  footnote,
}: SingleEventShowcaseProps) {
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

        <div className="mx-auto w-full">
          <div className={singleEventShowcaseSlideClass}>
            <LocationEventHeroCard
              event={event}
              locationSlug={locationSlug}
              isPending={isPending}
              onNavigateStart={onNavigateStart}
              imageFallback={imageFallback}
            />
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
