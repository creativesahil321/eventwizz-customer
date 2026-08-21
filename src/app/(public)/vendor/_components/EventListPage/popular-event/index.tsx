"use client";

import { toLocationEventCardModel } from "../event-card-utils";
import { LocationEventCard } from "../location-event-card";
import { useContext, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { Event } from "@/services/common/events/type";

const eventImages = [
  "/assets/images/events/dummyEvents/concert-event.jpg",
  "/assets/images/events/dummyEvents/theater-event.jpg",
  "/assets/images/events/dummyEvents/music-event.jpg",
  "/assets/images/events/dummyEvents/workshop-event.jpg",
];

import { EventComponentProps } from "../event-types";
import { resolveCurrencySymbol } from "@/lib/currency-format";
import {
  eventCarouselNavButtonClass,
  eventListingManyScrollItemClass,
  mobileEventRowPeekScrollItemClass,
} from "../event-carousel-classes";
import { EventListingHorizontalScroll } from "../event-listing-horizontal-scroll";
import { SingleEventShowcase } from "../single-event-showcase";
import { DualEventShowcase } from "../dual-event-showcase";
import { SiteHeading } from "@/components/public/site-heading";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";

export default function PopularEvents({
  events: apiEvents,
  sectionTitle,
  locationSlug,
  locationLabel,
}: EventComponentProps) {
  const [pendingEventSlug, setPendingEventSlug] = useState<string | null>(null);
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;
  const currencySym = resolveCurrencySymbol(vendorTheme?.currency_symbol);
  const narrowPreview = usePreviewNarrowLayout();

  const sectionTitleText =
    sectionTitle || vendorTheme?.event_title_1 || "Popular Events";

  // Use API events - no more dummy data
  const events = mapApiEventsToUI(apiEvents || []);

  function mapApiEventsToUI(apiEvents: Event[]) {
    return apiEvents.map((event) =>
      toLocationEventCardModel(event, currencySym, eventImages[0]),
    );
  }

  const scrollWatchKey = useMemo(
    () => events.map((e) => e.slug).join("|"),
    [events],
  );

  if (events.length === 0) {
    return null;
  }

  if (events.length === 1) {
    const event = events[0];
    return (
      <SingleEventShowcase
        sectionId="latest-events"
        sectionLabel="Popular Events"
        sectionTitle={sectionTitleText}
        event={event}
        locationSlug={locationSlug || ""}
        isPending={pendingEventSlug === event.slug}
        onNavigateStart={() => setPendingEventSlug(event.slug)}
        imageFallback={eventImages[0]}
      />
    );
  }

  if (events.length === 2) {
    return (
      <DualEventShowcase
        sectionId="latest-events"
        sectionLabel="Popular Events"
        sectionTitle={sectionTitleText}
        events={[events[0], events[1]]}
        locationSlug={locationSlug || ""}
        pendingEventSlug={pendingEventSlug}
        onNavigateStart={setPendingEventSlug}
        imageFallbacks={[eventImages[0], eventImages[1]]}
      />
    );
  }

  // 3–4 events: horizontal peek on mobile; grid from md up
  if (events.length > 2 && events.length <= 4) {
    return (
      <section
        id="latest-events"
        className="w-full bg-transparent py-20 md:py-28 text-[var(--color-text)]"
      >
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 w-full text-left space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Popular Events
            </p>
            <SiteHeading
              level={2}
              title={sectionTitleText}
              variant="onSurface"
              className="!text-3xl !font-black tracking-tight md:!text-4xl"
            />
          </div>

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
                  key={event.slug || index}
                  className={mobileEventRowPeekScrollItemClass}
                >
                  <div className="h-full w-full pb-1 pt-0.5">
                    <LocationEventCard
                      event={event}
                      locationSlug={locationSlug || ""}
                      locationLabel={locationLabel}
                      isPending={pendingEventSlug === event.slug}
                      onNavigateStart={() => setPendingEventSlug(event.slug)}
                      imageFallback={eventImages[index % eventImages.length]}
                    />
                  </div>
                </div>
              ))}
            </EventListingHorizontalScroll>
          </div>

          {!narrowPreview ? (
            <div
              className={cn(
                "hidden gap-5 md:grid",
                events.length === 3 && "md:grid-cols-2 lg:grid-cols-3",
                events.length === 4 && "md:grid-cols-2 lg:grid-cols-4",
              )}
            >
              {events.map((event, index) => (
                <LocationEventCard
                  key={event.slug || index}
                  event={event}
                  locationSlug={locationSlug || ""}
                  locationLabel={locationLabel}
                  isPending={pendingEventSlug === event.slug}
                  onNavigateStart={() => setPendingEventSlug(event.slug)}
                  imageFallback={eventImages[index % eventImages.length]}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  // 5+ events: horizontal slider — arrows only when content overflows
  return (
    <section
      id="latest-events"
      className="w-full bg-transparent py-20 md:py-28 text-[var(--color-text)]"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 w-full text-left space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Popular Events
          </p>
          <SiteHeading
            level={2}
            title={sectionTitleText}
            variant="onSurface"
            className="!text-3xl !font-black tracking-tight md:!text-4xl"
          />
        </div>
        <div className="relative w-full">
          <EventListingHorizontalScroll
            watchKey={scrollWatchKey}
            leftButtonClassName={eventCarouselNavButtonClass(
              "absolute left-0 top-1/2 -translate-y-1/2 md:-left-1 lg:-left-2",
            )}
            rightButtonClassName={eventCarouselNavButtonClass(
              "absolute right-0 top-1/2 -translate-y-1/2 md:-right-1 lg:-right-2",
            )}
          >
            {events.map((data, index) => (
              <div key={data.slug || index} className={eventListingManyScrollItemClass}>
                <div className="h-full w-full pb-1 pt-0.5">
                  <LocationEventCard
                    event={data}
                    locationSlug={locationSlug || ""}
                    locationLabel={locationLabel}
                    isPending={pendingEventSlug === data.slug}
                    onNavigateStart={() => setPendingEventSlug(data.slug)}
                    imageFallback={eventImages[index % eventImages.length]}
                  />
                </div>
              </div>
            ))}
          </EventListingHorizontalScroll>
        </div>
      </div>
    </section>
  );
}
