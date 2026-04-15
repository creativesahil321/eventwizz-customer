"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Loader2, Calendar } from "lucide-react";
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

/** Gradient hover tints per card (Tailwind must see full class strings). */
const HOVER_GRADIENTS = [
  "from-purple-600 to-pink-600",
  "from-blue-600 to-purple-600",
  "from-pink-600 to-orange-500",
] as const;

function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
}

export default function LocationGrid({
  locations,
  isLoading,
  onSelect,
}: LocationGridProps) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <div
              key={idx}
              className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[var(--color-surface)]"
            >
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            </div>
          ))}
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-12 text-[var(--color-on-surface)] shadow-sm">
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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

          const hoverTint = HOVER_GRADIENTS[idx % HOVER_GRADIENTS.length];

          const handleCardClick = () => {
            if (!locationSlug || pendingSlug) return;
            setPendingSlug(locationSlug);
            onSelect(locationSlug);
          };

          const isPending = pendingSlug === locationSlug;

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
            >
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
                className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-3xl transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
                onClick={handleCardClick}
              >
                {coverImage && typeof coverImage === "string" ? (
                  <Image
                    src={coverImage}
                    alt={locationName}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    unoptimized={isRemoteImage(coverImage)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_35%,var(--color-background))] to-[var(--color-background)]"
                    aria-hidden
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${hoverTint} opacity-0 transition-opacity duration-500 group-hover:opacity-30`}
                  aria-hidden
                />

                <div className="absolute bottom-0 left-0 right-0 z-[1] p-6 sm:p-8">
                  <Badge className="mb-3 border-0 bg-[var(--color-primary)]/80 text-[var(--color-primary-foreground)] backdrop-blur-sm">
                    {totalEvents} event{totalEvents !== 1 ? "s" : ""}
                  </Badge>
                  <h3 className="mb-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {locationName}
                  </h3>

                  {upcomingEvent ? (
                    <div
                      className="mb-3 grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out md:grid-rows-[0fr] md:group-hover:grid-rows-[1fr] md:group-focus-within:grid-rows-[1fr]"
                      aria-live="polite"
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="space-y-1 border-l-2 border-white/25 pl-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
                            Next up
                          </p>
                          <p className="line-clamp-2 text-base font-semibold leading-snug text-white">
                            {upcomingEvent.name}
                          </p>
                          <p className="flex items-center gap-1.5 text-sm text-white/75">
                            <Calendar
                              className="h-3.5 w-3.5 shrink-0 opacity-90"
                              aria-hidden
                            />
                            {upcomingEvent.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 text-sm text-white/70 transition-colors group-hover:text-white">
                    {isPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin"
                          aria-hidden
                        />
                        <span>Opening…</span>
                      </>
                    ) : (
                      <>
                        <span>Explore events</span>
                        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
