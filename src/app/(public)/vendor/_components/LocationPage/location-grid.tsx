"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Calendar, Clock, Loader2 } from "lucide-react";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

interface LocationGridProps {
  locations: (VenueLocation | LocationData)[];
  isLoading: boolean;
  onSelect: (slug: string) => void;
}

export default function LocationGrid({
  locations,
  isLoading,
  onSelect,
}: LocationGridProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-8">
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <Card
              key={idx}
              className="overflow-hidden border-0 p-0 gap-0 py-0 rounded-2xl shadow-lg ring-1 ring-white/50"
            >
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="p-5 sm:p-6 space-y-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-[4.5rem] w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-8">
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

          // Get event data directly from location object (from API)
          // Check if location has the API fields (LocationData type)
          const locationData = location as LocationData;
          const totalEvents =
            typeof locationData.total_events === "number"
              ? locationData.total_events
              : 0;

          const upcomingEvent = locationData.latest_upcoming_event
            ? {
                name: locationData.latest_upcoming_event.name,
                date: locationData.latest_upcoming_event.date,
              }
            : null;

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
              whileHover={{
                y: -6,
                transition: { type: "spring", stiffness: 380, damping: 28 },
              }}
              onHoverStart={() => setHoveredCard(locationSlug)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card
                className="overflow-hidden border-0 cursor-pointer group flex flex-col h-full rounded-2xl p-0 gap-0 py-0 bg-white/95 text-card-foreground shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_16px_32px_-12px_rgba(0,0,0,0.22)] ring-1 ring-white/70 hover:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.35)] transition-[box-shadow,transform] duration-300"
                onClick={() => {
                  if (!locationSlug || pendingSlug) return;
                  setPendingSlug(locationSlug);
                  onSelect(locationSlug);
                }}
              >
                {/* Header Image — fixed aspect so grid feels even */}
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl"
                  style={{ background: "var(--color-background)" }}
                >
                  {coverImage && typeof coverImage === "string" ? (
                    <Image
                      src={coverImage}
                      alt={locationName}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-400"
                      aria-hidden
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)]">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 shadow-lg backdrop-blur-md">
                      <MapPin
                        size={14}
                        className="shrink-0 text-white/95"
                        aria-hidden
                      />
                      <h3 className="text-sm font-semibold tracking-tight text-white drop-shadow-sm">
                        {locationName}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex flex-1 flex-col gap-4">
                    {/* Event Count */}
                    <div className="flex items-baseline gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[color:var(--color-primary)]">
                        <Calendar size={16} strokeWidth={2} aria-hidden />
                      </span>
                      <div className="leading-tight">
                        <span className="text-2xl font-bold tabular-nums text-gray-900">
                          {totalEvents}
                        </span>
                        <span className="ml-1.5 text-sm font-medium text-gray-500">
                          {totalEvents === 1 ? "event" : "events"}
                        </span>
                      </div>
                    </div>

                    {/* Upcoming Event */}
                    {upcomingEvent ? (
                      <div className="flex gap-3 rounded-xl border border-gray-200/80 bg-gradient-to-br from-gray-50 to-gray-100/80 p-4 shadow-inner ring-1 ring-black/[0.03]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
                          <Clock
                            size={18}
                            className="text-[color:var(--color-primary)]"
                            aria-hidden
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                            Next up
                          </p>
                          <div className="mt-0.5 text-base font-semibold leading-snug text-gray-900 line-clamp-2">
                            {upcomingEvent.name}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {upcomingEvent.date}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-center">
                        <p className="text-sm text-gray-500">
                          {totalEvents > 0
                            ? "No upcoming events scheduled"
                            : "Check back soon for new events"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-lg shadow-black/15 transition-all duration-200 hover:brightness-110 hover:shadow-xl hover:shadow-black/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!locationSlug || pendingSlug) return;
                      setPendingSlug(locationSlug);
                      onSelect(locationSlug);
                    }}
                    disabled={pendingSlug === locationSlug}
                  >
                    {pendingSlug === locationSlug ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <span>Explore Events</span>
                        <motion.span
                          className="inline-flex"
                          animate={{ x: isHovered ? 5 : 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <ArrowRight size={17} strokeWidth={2.25} aria-hidden />
                        </motion.span>
                      </>
                    )}
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
