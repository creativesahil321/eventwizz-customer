"use client";

import type { LocationEventCardModel } from "./location-event-card";
import { LocationEventCard } from "./location-event-card";
import { LocationEventHeroCard } from "./location-event-hero-card";
import { singleEventShowcaseSlideClass } from "./event-carousel-classes";
import { EventSectionHeader } from "./event-section-header";
import {
  PUBLIC_EVENT_LIST_PY_CLASS,
  PUBLIC_SECTION_CONTAINER_CLASS,
} from "@/lib/public-rhythm";
import {
  previewBlockFromMd,
  previewBlockOnlyUntilMd,
} from "@/lib/preview-container-layout";
import { cn } from "@/lib/utils";

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
 * Single-event layout: listing card on phone (and onboarding Mobile frame),
 * wide hero on tablet/desktop so one event does not look orphaned.
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
  const listingCard = (
    <LocationEventCard
      event={event}
      locationSlug={locationSlug}
      locationLabel={locationLabel}
      isPending={isPending}
      onNavigateStart={onNavigateStart}
      imageFallback={imageFallback}
    />
  );

  return (
    <section
      id={sectionId}
      className={cn(
        "w-full bg-transparent text-[var(--color-text)]",
        PUBLIC_EVENT_LIST_PY_CLASS,
      )}
    >
      <div className={PUBLIC_SECTION_CONTAINER_CLASS}>
        <EventSectionHeader
          sectionLabel={sectionLabel}
          sectionTitle={sectionTitle}
        />

        {/* Live phone + 390px Mobile frame: listing card (viewport md: is ignored). */}
        <div className={cn("w-full", previewBlockOnlyUntilMd)}>
          {listingCard}
        </div>

        <div
          className={cn(singleEventShowcaseSlideClass, previewBlockFromMd)}
        >
          <LocationEventHeroCard
            event={event}
            locationSlug={locationSlug}
            locationLabel={locationLabel}
            isPending={isPending}
            onNavigateStart={onNavigateStart}
            imageFallback={imageFallback}
          />
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
