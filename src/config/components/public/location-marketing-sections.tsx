"use client";

import type { CSSProperties, ReactNode } from "react";
import PopularEvents from "@/app/(public)/vendor/_components/EventListPage/popular-event";
import UpcomingEvents from "@/app/(public)/vendor/_components/EventListPage/upcoming-event";
import RecentEventsGlimpse from "@/app/(public)/vendor/_components/EventListPage/recent-event";
import type { Event, GalleryImage } from "@/services/common/events/type";

export interface LocationMarketingBodyProps {
  /** Outer band: background + text color (plain or gradient preview) */
  className: string;
  style?: CSSProperties;
  /** About / experience block — caller supplies `ExperienceSection` (optionally wrapped for onboarding highlights) */
  experience?: ReactNode;
  latestEvents: Event[];
  upcomingEvents: Event[];
  popularSectionTitle: string;
  upcomingSectionTitle: string;
  galleryTitle: string;
  galleryImages: GalleryImage[];
  locationSlug: string;
  locationLabel: string | null;
  /** Anchor for hero search scroll target */
  eventsSectionId?: string;
}

/**
 * Shared location landing content: about + event lists + gallery strip.
 * Used on `/[locationSlug]` and onboarding step 2 preview.
 */
export function LocationMarketingBody({
  className,
  style,
  experience,
  latestEvents,
  upcomingEvents,
  popularSectionTitle,
  upcomingSectionTitle,
  galleryTitle,
  galleryImages,
  locationSlug,
  locationLabel,
  eventsSectionId = "location-events",
}: LocationMarketingBodyProps) {
  return (
    <div className={className} style={style}>
      {experience}
      <div id={eventsSectionId} className="scroll-mt-24">
        <PopularEvents
          events={latestEvents}
          sectionTitle={popularSectionTitle}
          locationSlug={locationSlug}
          locationLabel={locationLabel}
        />
        <UpcomingEvents
          events={upcomingEvents}
          sectionTitle={upcomingSectionTitle}
          locationSlug={locationSlug}
          locationLabel={locationLabel}
        />
      </div>
      <RecentEventsGlimpse
        galleryImages={galleryImages}
        galleryTitle={galleryTitle}
      />
    </div>
  );
}
