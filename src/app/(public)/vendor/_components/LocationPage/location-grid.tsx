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

function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-8">
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <Card
              key={idx}
              className="overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[var(--color-surface)] p-0 shadow-sm"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="mx-auto h-4 w-2/3" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            </Card>
          ))}
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="py-16 text-center">
        <div
          className="mx-auto max-w-md rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-12 text-[var(--color-on-surface)] shadow-sm"
        >
          <MapPin
            size={48}
            className="mx-auto mb-4 opacity-40 text-[color:var(--color-primary)]"
            aria-hidden
          />
          <h3 className="mb-2 text-2xl font-semibold tracking-tight">
            No locations yet
          </h3>
          <p className="text-[var(--color-text-dimmed)]">
            There are no event locations available at the moment. Check back
            soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-8">
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

          const handleCardClick = () => {
            if (!locationSlug || pendingSlug) return;
            setPendingSlug(locationSlug);
            onSelect(locationSlug);
          };

          return (
            <motion.div
              key={locationId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: 0.35,
                delay: idx * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{
                y: -4,
                transition: { type: "spring", stiffness: 400, damping: 30 },
              }}
              onHoverStart={() => setHoveredCard(locationSlug)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[var(--color-surface)] p-0 text-[var(--color-on-surface)] shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-black/10"
                onClick={handleCardClick}
              >
                {/* Image region — Lovable-style tall hero on card */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-background)]">
                  {coverImage && typeof coverImage === "string" ? (
                    <Image
                      src={coverImage}
                      alt={locationName}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      unoptimized={isRemoteImage(coverImage)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_25%,var(--color-background))] to-[var(--color-background)]"
                      aria-hidden
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                  {/* Event count pill — top right */}
                  <div className="absolute right-3 top-3 md:right-4 md:top-4">
                    <div className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--color-primary-foreground)] shadow-lg backdrop-blur-sm">
                      {totalEvents}{" "}
                      {totalEvents === 1 ? "event" : "events"}
                    </div>
                  </div>

                  {/* Location pin + title on image */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    <div className="mb-2 inline-flex items-center gap-1.5 text-white/90">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/75">
                        Location
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white drop-shadow-md md:text-3xl">
                      {locationName}
                    </h3>
                  </div>
                </div>

                {/* Lower panel — next event + CTA */}
                <div className="flex flex-1 flex-col gap-4 p-5">
                  {upcomingEvent ? (
                    <div className="flex gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[color:color-mix(in_srgb,var(--color-text)_4%,var(--color-surface))] p-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[color:var(--color-primary)]">
                        <Clock className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dimmed)]">
                          Next up
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-on-surface)]">
                          {upcomingEvent.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-dimmed)]">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          {upcomingEvent.date}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] bg-[color:color-mix(in_srgb,var(--color-text)_3%,transparent)] px-4 py-3 text-center text-sm text-[var(--color-text-dimmed)]">
                      {totalEvents > 0
                        ? "No upcoming events scheduled"
                        : "New events coming soon"}
                    </p>
                  )}

                  <button
                    type="button"
                    className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] transition-all duration-200 hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:opacity-70"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                    disabled={pendingSlug === locationSlug}
                  >
                    {pendingSlug === locationSlug ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Opening…</span>
                      </>
                    ) : (
                      <>
                        <span>Browse events</span>
                        <motion.span
                          className="inline-flex"
                          animate={{ x: isHovered ? 4 : 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden />
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
