"use client";

import type { LocationEventCardModel } from "./location-event-card";
import { LocationEventHeroCard } from "./location-event-hero-card";
import { singleEventShowcaseSlideClass } from "./event-carousel-classes";
import { EventSectionHeader } from "./event-section-header";
import { PUBLIC_SECTION_CONTAINER_CLASS } from "@/lib/public-rhythm";
type SingleEventShowcaseProps = {
  sectionId: string;
  sectionLabel: string;
  sectionTitle: string;
  event: LocationEventCardModel;
  locationSlug: string;
  locationLabel?: string | null;
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
  locationLabel,
  isPending,
  onNavigateStart,
  imageFallback,
  footnote,
}: SingleEventShowcaseProps) {
  return (
    <section
      id={sectionId}
      className="w-full bg-transparent py-16 text-[var(--color-text)] md:py-28"
    >
      <div className={PUBLIC_SECTION_CONTAINER_CLASS}>
        <EventSectionHeader
          sectionLabel={sectionLabel}
          sectionTitle={sectionTitle}
        />

        <div className="mx-auto w-full">
          <div className={singleEventShowcaseSlideClass}>
            <LocationEventHeroCard
              event={event}
              locationSlug={locationSlug}
              locationLabel={locationLabel}
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
