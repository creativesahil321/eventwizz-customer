"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Calendar, Clock } from "lucide-react";
import { VenueLocation } from "@/types/api.types";
import { LatestUpcomingEvent, LocationData } from "@/types/theme.types";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

interface LocationGridProps {
  locations: (VenueLocation | LocationData)[];
  isLoading: boolean;
  onSelect: (slug: string) => void;
  locationStats?: Record<
    string,
    {
      eventsCount: number;
      venuesCount: number;
      liveEventsCount: number;
      upcomingEvent?: { date: string; name: string };
      categories?: string[];
      startingPrice?: number;
      isNew?: boolean;
    }
  >;
}

export default function LocationGrid({
  locations,
  isLoading,
  onSelect,
  locationStats = {},
}: LocationGridProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <Card
              key={idx}
              className="overflow-hidden border border-gray-200"
            >
              <div className="h-48 bg-gray-100" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-white border border-gray-200 rounded-lg p-12 max-w-md mx-auto">
          <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            No Locations Found
          </h3>
          <p className="text-gray-600">
            There are no event locations available at the moment. Check back
            soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {locations.map((location, idx) => {
          const locationName =
            "city" in location && location.city
              ? location.city
              : "name" in location && location.name
              ? location.name
              : "Unknown Location";

          const locationSlug =
            "slug" in location && location.slug ? location.slug : "";
          const locationId =
            "id" in location && location.id ? location.id : idx;
          const isHovered = hoveredCard === locationSlug;

          const totalEvents =
            "total_events" in location &&
            typeof location.total_events === "number"
              ? location.total_events
              : locationStats[locationSlug]?.eventsCount || 0;

          const upcomingEvent =
            "latest_upcoming_event" in location &&
            location.latest_upcoming_event
              ? {
                  name: (location.latest_upcoming_event as LatestUpcomingEvent)
                    .name,
                  date: (location.latest_upcoming_event as LatestUpcomingEvent)
                    .date,
                }
              : locationStats[locationSlug]?.upcomingEvent;

          const coverImage =
            "cover_image" in location && location.cover_image
              ? location.cover_image
              : null;

          return (
            <motion.div
              key={locationId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.05,
              }}
              onHoverStart={() => setHoveredCard(locationSlug)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card
                className="overflow-hidden border border-gray-200 cursor-pointer group hover:shadow-lg hover:border-gray-300 transition-all duration-200 flex flex-col h-full"
                onClick={() => onSelect(locationSlug)}
              >
                {/* Header Image */}
                <div
                  className="relative h-40 overflow-hidden"
                  style={{ background: "var(--color-background)" }}
                >
                  {coverImage && typeof coverImage === "string" ? (
                    <Image
                      src={coverImage}
                      alt={locationName}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: "var(--color-background)" }}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-white" />
                      <h3 className="text-lg font-semibold text-white">
                        {locationName}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    {/* Event Count */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar
                        size={16}
                        className="text-[color:var(--color-primary)]"
                      />
                      <span className="font-medium text-gray-900">
                        {totalEvents}
                      </span>
                      <span className="text-gray-500">
                        {totalEvents === 1 ? "Event" : "Events"}
                      </span>
                    </div>

                    {/* Upcoming Event */}
                    {upcomingEvent ? (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <Clock
                          size={16}
                          className="text-[color:var(--color-primary)] mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {upcomingEvent.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {upcomingEvent.date}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-400">
                          {totalEvents > 0
                            ? "No upcoming events scheduled"
                            : "Check back soon for new events"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    className="w-full mt-6 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/90 text-white py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(locationSlug);
                    }}
                  >
                    <span>Explore Events</span>
                    <motion.div
                      animate={{ x: isHovered ? 4 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
