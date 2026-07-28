"use client";

import {
  getEventCardCategoryLabel,
  getEventCardDateLabel,
} from "../event-card-utils";
import { LocationEventCard } from "../location-event-card";
import { useMemo, useContext, useState } from "react";
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
} from "../event-carousel-classes";
import { EventListingHorizontalScroll } from "../event-listing-horizontal-scroll";
import { SingleEventShowcase } from "../single-event-showcase";
import { DualEventShowcase } from "../dual-event-showcase";
import { SiteHeading } from "@/components/public/site-heading";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";

export default function UpcomingEvents({
  events: apiEvents,
  sectionTitle,
  locationSlug,
  locationLabel,
}: EventComponentProps) {
  const [pendingEventSlug, setPendingEventSlug] = useState<string | null>(null);
  const isSitePreview = useIsPreviewMode();
  const narrowPreview = usePreviewNarrowLayout();
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;
  const currencySym = resolveCurrencySymbol(vendorTheme?.currency_symbol);

  const sectionTitleText =
    sectionTitle || vendorTheme?.event_title_2 || "Upcoming Events";

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
      category: getEventCardCategoryLabel(event),
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
          sectionLabel="Upcoming Events"
        />
      );
    }

    return (
      <section className="w-full bg-transparent py-20 md:py-28 text-[var(--color-text)]">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 w-full text-left space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Upcoming Events
            </p>
            <SiteHeading
              level={2}
              title={sectionTitleText}
              variant="onSurface"
              className="!text-3xl !font-black tracking-tight md:!text-4xl"
            />
          </div>

          {/* Professional Coming Soon UI */}
          <div className="text-center py-20">
            {/* Main Message */}
            <div className="mb-12 max-w-3xl mx-auto">
              <SiteHeading
                level={3}
                title="Exciting Events Coming Soon"
                variant="onSurface"
                className="!text-2xl md:!text-3xl !font-semibold mb-6"
              />
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
            <div
              className={cn(
                "mx-auto grid max-w-5xl grid-cols-1 gap-8",
                !narrowPreview && "md:grid-cols-3",
              )}
            >
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
      <SingleEventShowcase
        sectionId="upcoming-events"
        sectionLabel="Upcoming Events"
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
        sectionId="upcoming-events"
        sectionLabel="Upcoming Events"
        sectionTitle={sectionTitleText}
        events={[events[0], events[1]]}
        locationSlug={locationSlug || ""}
        pendingEventSlug={pendingEventSlug}
        onNavigateStart={setPendingEventSlug}
        imageFallbacks={[eventImages[0], eventImages[1]]}
      />
    );
  }

  // 3–4 events: static grid — no slider chrome
  if (events.length > 2 && events.length <= 4) {
    return (
      <section
        id="upcoming-events"
        className="w-full bg-transparent py-20 md:py-28 text-[var(--color-text)]"
      >
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 w-full text-left space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Upcoming Events
            </p>
            <SiteHeading
              level={2}
              title={sectionTitleText}
              variant="onSurface"
              className="!text-3xl !font-black tracking-tight md:!text-4xl"
            />
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-5",
              !narrowPreview && "sm:grid-cols-2",
              !narrowPreview && events.length === 3 && "lg:grid-cols-3",
              !narrowPreview && events.length === 4 && "lg:grid-cols-4",
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

  // 5+ events: horizontal slider — arrows only when content overflows
  return (
    <section
      id="upcoming-events"
      className="w-full bg-transparent py-20 md:py-28 text-[var(--color-text)]"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 w-full text-left space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Upcoming Events
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
              <div
                key={data.slug || index}
                className={eventListingManyScrollItemClass}
              >
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
