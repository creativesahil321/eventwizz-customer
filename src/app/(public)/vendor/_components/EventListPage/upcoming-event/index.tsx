"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

import { getEventCardDateLabel } from "../event-card-utils";
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
import { eventCarouselNavButtonClass } from "../event-carousel-classes";

export default function UpcomingEvents({
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
      image: event.banner_image || eventImages[0],
      slug: event.slug || "",
    }));
  }

  // Calculate responsive layout based on event count
  const { itemsPerView, showNavigationDesktop } = useMemo(() => {
    const count = events.length;

    let config = {
      itemsPerView:
        "shrink-0 basis-[min(100%,11rem)] pl-4 sm:basis-[47%] md:basis-[31%] lg:basis-[22.5%]",
      showNavigationDesktop: true,
    };

    if (count === 1) {
      config = {
        itemsPerView: "basis-full pl-4",
        showNavigationDesktop: false,
      };
    } else if (count === 2) {
      config = {
        itemsPerView: "shrink-0 basis-full pl-4 sm:basis-[48%]",
        showNavigationDesktop: false,
      };
    } else if (count === 3) {
      config = {
        itemsPerView:
          "shrink-0 basis-full pl-4 sm:basis-[48%] md:basis-[31%]",
        showNavigationDesktop: false,
      };
    } else if (count === 4) {
      config = {
        itemsPerView:
          "shrink-0 basis-[min(100%,11rem)] pl-4 sm:basis-[48%] lg:basis-1/4",
        showNavigationDesktop: false,
      };
    }

    return config;
  }, [events.length]);

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
      <section className="w-full bg-transparent py-20 text-[var(--color-text)]">
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
        id="upcoming-events"
        className="w-full bg-transparent py-20 text-[var(--color-text)]"
      >
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 w-full text-left">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Plan ahead
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
              {sectionTitleText}
            </h2>
          </div>
          <div className="max-w-[13rem] sm:max-w-[14rem]">
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

  return (
    <section
      id="upcoming-events"
      className="w-full bg-transparent py-20 text-[var(--color-text)]"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 w-full text-left">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Plan ahead
          </span>
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
            {sectionTitleText}
          </h2>
        </div>
        <div className="relative w-full">
          <Carousel
            opts={{ align: "start", loop: false }}
            className="relative w-full"
          >
            <CarouselPrevious
              className={eventCarouselNavButtonClass(
                cn(
                  "absolute top-1/2 z-10 -translate-y-1/2",
                  events.length === 2 ? "-left-1 md:-left-2" : "",
                  events.length === 3 ? "-left-1 md:-left-2" : "",
                  events.length >= 4 && "-left-1 md:-left-3",
                  !showNavigationDesktop && "md:hidden",
                ),
              )}
            />
            <CarouselContent className="-ml-4 flex">
              {events.map((data, index) => (
                <CarouselItem
                  className={cn(itemsPerView)}
                  key={index}
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
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext
              className={eventCarouselNavButtonClass(
                cn(
                  "absolute top-1/2 z-10 -translate-y-1/2",
                  events.length === 2 ? "-right-1 md:-right-2" : "",
                  events.length === 3 ? "-right-1 md:-right-2" : "",
                  events.length >= 4 && "-right-1 md:-right-3",
                  !showNavigationDesktop && "md:hidden",
                ),
              )}
            />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
