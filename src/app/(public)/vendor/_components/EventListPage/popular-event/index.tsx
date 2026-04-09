"use client";

import { getEventCardDateLabel } from "../event-card-utils";
import { LocationEventCard } from "../location-event-card";
import { useContext, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { Event } from "@/services/common/events/type";

// Sample event data - using local image assets
const eventImages = [
  "/assets/images/events/dummyEvents/concert-event.jpg",
  "/assets/images/events/dummyEvents/theater-event.jpg",
  "/assets/images/events/dummyEvents/music-event.jpg",
  "/assets/images/events/dummyEvents/workshop-event.jpg",
];

import { EventComponentProps } from "../event-types";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { SitePreviewDummyEventSection } from "../site-preview-dummy-events";
import {
  formatMoneyCompact,
  resolveCurrencySymbol,
} from "@/lib/currency-format";
import {
  eventCarouselNavButtonClass,
  eventListingManyScrollItemClass,
  mobileEventRowPeekScrollItemClass,
} from "../event-carousel-classes";
import { EventListingHorizontalScroll } from "../event-listing-horizontal-scroll";

export default function PopularEvents({
  events: apiEvents,
  sectionTitle,
  locationSlug,
  locationLabel,
}: EventComponentProps) {
  const [pendingEventSlug, setPendingEventSlug] = useState<string | null>(null);
  const isSitePreview = useIsPreviewMode();
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;
  const currencySym = resolveCurrencySymbol(vendorTheme?.currency_symbol);

  const sectionTitleText =
    sectionTitle || vendorTheme?.event_title_1 || "Popular Events";

  // Use API events - no more dummy data
  const events = mapApiEventsToUI(apiEvents || []);

  // Helper function to map API event format to UI format
  function mapApiEventsToUI(apiEvents: Event[]) {
    return apiEvents.map((event) => ({
      title: event.name || "",
      price:
        event.lowest_price != null && !Number.isNaN(Number(event.lowest_price))
          ? formatMoneyCompact(Number(event.lowest_price), currencySym)
          : null,
      dateLabel: getEventCardDateLabel(event),
      image: event.banner_image || eventImages[0],
      slug: event.slug || "",
    }));
  }

  const scrollWatchKey = useMemo(
    () => events.map((e) => e.slug).join("|"),
    [events],
  );

  // Empty state: Site Essentials preview shows labeled dummy cards; live site keeps coming soon
  if (events.length === 0) {
    if (isSitePreview) {
      return (
        <SitePreviewDummyEventSection
          sectionTitle={sectionTitleText}
          band="background"
        />
      );
    }

    return (
      <section className="w-full py-16 bg-transparent text-[var(--color-text)]">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 w-full text-left">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              {sectionTitleText}
            </h2>
          </div>

          {/* Professional Coming Soon UI */}
          <div className="text-center py-20">
            {/* Main Message */}
            <div className="mb-12 max-w-3xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-semibold text-[var(--color-text)] mb-6">
                Exciting Events Coming Soon
              </h3>
              <p className="text-lg text-[var(--color-text-dimmed)] leading-relaxed">
                We&apos;re preparing something amazing for you. Stay tuned for
                exclusive events, special performances, and unforgettable
                experiences. Be the first to know when tickets go live!
              </p>
            </div>

            {/* Professional Coming Soon Badge */}
            <div className="relative mb-16">
              <div className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xl md:text-2xl font-bold text-white tracking-wider">
                    COMING SOON
                  </span>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Professional Event Placeholders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="group relative">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 h-80 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    {/* Blurred Image Placeholder */}
                    <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    </div>

                    {/* Blurred Content Placeholders */}
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded-full w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded-full w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
                      <div className="h-8 bg-gray-200 rounded-lg w-full mt-4"></div>
                    </div>

                    {/* Subtle Overlay */}
                    <div className="absolute inset-0 bg-white/5 rounded-xl pointer-events-none"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Call to Action */}
            <div className="mt-12">
              <p className="text-sm text-gray-500 mb-4">
                Want to be notified first? Contact us at{" "}
                <a
                  href="mailto:info@eventwizz.com"
                  className="text-purple-600 hover:text-purple-700 font-medium underline"
                >
                  info@eventwizz.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 1) {
    const event = events[0];
    return (
      <section
        id="latest-events"
        className="w-full bg-transparent py-16 text-[var(--color-text)]"
      >
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 w-full text-left">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Featured right now
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
              {sectionTitleText}
            </h2>
          </div>
          <div className="mx-auto max-w-[16rem] sm:max-w-[18rem]">
            <LocationEventCard
              event={event}
              locationSlug={locationSlug || ""}
              locationLabel={locationLabel}
              isPending={pendingEventSlug === event.slug}
              onNavigateStart={() => setPendingEventSlug(event.slug)}
              imageFallback={eventImages[0]}
            />
          </div>
        </div>
      </section>
    );
  }

  // 2–4 events: horizontal carousel on small screens; grid from md breakpoint up
  if (events.length > 1 && events.length <= 4) {
    return (
      <section
        id="latest-events"
        className="w-full bg-transparent py-16 text-[var(--color-text)]"
      >
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 w-full text-left">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Featured right now
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
              {sectionTitleText}
            </h2>
          </div>

          <div className="relative w-full md:hidden">
            <EventListingHorizontalScroll
              watchKey={scrollWatchKey}
              leftButtonClassName={eventCarouselNavButtonClass(
                "absolute left-0 top-1/2 -translate-y-1/2 sm:left-0",
              )}
              rightButtonClassName={eventCarouselNavButtonClass(
                "absolute right-0 top-1/2 -translate-y-1/2 sm:right-0",
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

          <div
            className={cn(
              "hidden gap-5 md:grid",
              events.length === 2 && "md:grid-cols-2",
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
        </div>
      </section>
    );
  }

  return (
    <section
      id="latest-events"
      className="w-full bg-transparent py-16 text-[var(--color-text)]"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 w-full text-left">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Featured right now
          </span>
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
            {sectionTitleText}
          </h2>
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
