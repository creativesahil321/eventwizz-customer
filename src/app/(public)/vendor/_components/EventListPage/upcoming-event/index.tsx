"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { Event } from "@/services/common/events/type";
import { addCacheBusting } from "@/lib/image-utils";

// Sample event data - using local image assets
const eventImages = [
  "/assets/images/events/dummyEvents/concert-event.jpg",
  "/assets/images/events/dummyEvents/theater-event.jpg",
  "/assets/images/events/dummyEvents/music-event.jpg",
  "/assets/images/events/dummyEvents/workshop-event.jpg",
];

import { EventComponentProps } from "../event-types";

export default function UpcomingEvents({
  events: apiEvents,
  sectionTitle,
  locationSlug,
}: EventComponentProps) {
  const [pendingEventSlug, setPendingEventSlug] = useState<string | null>(null);
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;

  const sectionTitleText =
    sectionTitle || vendorTheme?.event_title_2 || "Upcoming Events";

  // Use API events - no more dummy data
  const events = mapApiEventsToUI(apiEvents || []);

  // Helper function to map API event format to UI format
  function mapApiEventsToUI(apiEvents: Event[]) {
    return apiEvents.map((event) => ({
      title: event.name || "",
      price: event.lowest_price ? `£${event.lowest_price}` : null,
      buttonText: "View Event",
      image: event.banner_image || eventImages[0],
      slug: event.slug || "",
    }));
  }

  // Calculate responsive layout based on event count
  const { itemsPerView, itemWidth, showNavigationDesktop } = useMemo(() => {
    const count = events.length;

    // Default configuration for 5+ events
    let config = {
      itemsPerView: "md:basis-1/2 lg:basis-1/4",
      itemWidth: "w-full",
      showNavigationDesktop: true,
    };

    if (count === 1) {
      config = {
        itemsPerView: "basis-full",
        itemWidth: "max-w-md mx-auto w-full",
        showNavigationDesktop: false,
      };
    } else if (count === 2) {
      config = {
        itemsPerView: "md:basis-1/2",
        itemWidth: "w-full max-w-md mx-auto",
        showNavigationDesktop: false, // Hide navigation for 2 events on desktop
      };
    } else if (count === 3) {
      config = {
        itemsPerView: "md:basis-1/3",
        itemWidth: "w-full max-w-sm mx-auto",
        showNavigationDesktop: false, // Hide navigation for 3 events on desktop
      };
    } else if (count === 4) {
      config = {
        itemsPerView: "md:basis-1/2 lg:basis-1/4",
        itemWidth: "w-full",
        showNavigationDesktop: false, // Hide navigation for 4 events on desktop
      };
    }

    return config;
  }, [events.length]);

  // Empty state rendering when no events
  if (events.length === 0) {
    return (
      <section className="w-full py-12">
        <div className="container mx-auto px-4">
          <div className="w-full text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              {sectionTitleText}
            </h2>
          </div>

          {/* Professional Coming Soon UI */}
          <div className="text-center py-20">
            {/* Main Message */}
            <div className="mb-12 max-w-3xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
                Exciting Events Coming Soon
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
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

  // Special horizontal layout for single event
  if (events.length === 1) {
    const event = events[0];
    return (
      <section className="w-full py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {sectionTitleText}
            </h2>
            <div className="w-full flex justify-end">
              <a
                href="#"
                className="text-sm font-medium flex items-center text-[var(--color-text)] hover:text-[var(--color-primary)]"
              >
                View all events <ChevronRight className="h-4 w-4 ml-1" />
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Image section - takes 40% on desktop */}
              <div className="md:w-2/5 relative">
                <div className="aspect-[4/3] md:aspect-auto md:h-full w-full">
                  <img
                    src={addCacheBusting(event.image)}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 border border-white/20 shadow-lg md:w-3/5">
                <h3 className="text-3xl font-bold text-gray-900">
                  {event.title}
                </h3>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)] text-2xl font-extrabold mt-2">
                  {event.price === null ? "Price revealed soon" : event.price}
                </p>
                <p className="text-gray-700 mt-4">
                  Join us for this amazing event! Experience the excitement and
                  fun with friends and family. Don&apos;t miss out on this
                  opportunity to create lasting memories.
                </p>
                <Link href={`/${locationSlug}/events/${event.slug}`} passHref>
                  <Button
                    variant="event-outline"
                    className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)] text-white font-semibold hover:text-white shadow-lg hover:shadow-[var(--color-primary)]/50 transition-all duration-300"
                  >
                    {event.buttonText}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-12">
      <div
        className={cn(
          "container mx-auto px-4",
          events.length === 2 && "max-w-5xl", // Constrain container width for 2 cards
          events.length === 3 && "max-w-6xl", // Constrain container width for 3 cards
        )}
      >
        <div className="w-full text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">{sectionTitleText}</h2>
        </div>
        <div
          className={cn(
            "w-full relative",
            events.length === 2 ? "max-w-4xl mx-auto px-4" : "",
            events.length === 3 ? "max-w-5xl mx-auto px-2" : "",
            events.length === 1 && "max-w-lg mx-auto",
          )}
        >
          <Carousel className="relative">
            <CarouselPrevious
              className={cn(
                "absolute top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full border-2 border-gray-300 flex items-center justify-center",
                events.length === 2 ? "-left-3 md:-left-6" : "",
                events.length === 3 ? "-left-3 md:-left-5" : "",
                events.length >= 4 && "-left-5 md:-left-10",
                // Always show on mobile, conditionally hide on desktop based on event count
                !showNavigationDesktop && "md:hidden",
              )}
            />
            <CarouselContent
              className={cn(
                "-ml-4",
                events.length === 2 ? "md:pl-2 md:pr-2" : "",
                events.length === 3
                  ? "md:pl-1 md:pr-1 flex justify-between"
                  : "",
              )}
            >
              {events.map((data, index) => (
                <CarouselItem
                  className={cn(
                    "pl-4",
                    itemsPerView,
                    events.length === 2 ? "md:basis-1/2 px-1 md:px-3" : "",
                    events.length === 3 ? "md:basis-1/3 px-1 md:px-2" : "",
                  )}
                  key={index}
                >
                  <div className={cn("p-2 h-full", itemWidth)}>
                    <div className="overflow-hidden bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                      <div className="relative aspect-[3/4] w-full overflow-hidden flex-shrink-0">
                        <img
                          src={addCacheBusting(data.image)}
                          alt={data.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.dataset.fallbackApplied === "true")
                              return;
                            target.dataset.fallbackApplied = "true";
                            target.src =
                              eventImages[index % eventImages.length];
                          }}
                        />
                      </div>
                      <div className="p-4 relative text-black flex-1 flex flex-col">
                        <h3 className="pb-2 text-base font-bold line-clamp-2 min-h-[2.5rem]">
                          {data.title}
                        </h3>
                        <p className="font-medium mb-3 text-sm min-h-[1.25rem]">
                          {data.price}
                        </p>
                        <div className="mt-auto">
                          <Link
                            href={`/${locationSlug}/events/${data.slug}`}
                            passHref
                            onClick={() => setPendingEventSlug(data.slug)}
                          >
                            <Button
                              variant="event-outline"
                              className="w-full"
                              disabled={pendingEventSlug === data.slug}
                            >
                              {pendingEventSlug === data.slug ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Opening...
                                </>
                              ) : (
                                data.buttonText
                              )}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext
              className={cn(
                "absolute top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full border-2 border-gray-300 flex items-center justify-center",
                events.length === 2 ? "-right-3 md:-right-6" : "",
                events.length === 3 ? "-right-3 md:-right-5" : "",
                events.length >= 4 && "-right-5 md:-right-10",
                // Always show on mobile, conditionally hide on desktop based on event count
                !showNavigationDesktop && "md:hidden",
              )}
            />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
