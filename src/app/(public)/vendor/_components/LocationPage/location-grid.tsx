"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Loader2, Calendar } from "lucide-react";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import { SiteHeading } from "@/components/public/site-heading";
import { cn } from "@/lib/utils";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";

interface LocationGridProps {
  locations: (VenueLocation | LocationData)[];
  isLoading: boolean;
  /** Return false if navigation did not start (clears "Opening…" state). */
  onSelect: (slug: string) => void | boolean;
}

function locationInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function LocationGrid({
  locations,
  isLoading,
  onSelect,
}: LocationGridProps) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const narrowPreview = usePreviewNarrowLayout();

  if (isLoading) {
    return (
      <div
        className={cn(
          "mx-auto grid max-w-[920px] grid-cols-1 gap-5",
          !narrowPreview && "md:grid-cols-3 md:gap-6",
        )}
      >
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <div
              key={idx}
              className="relative aspect-[5/6] overflow-hidden rounded-[20px] bg-[var(--color-surface)]"
            >
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            </div>
          ))}
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="flex w-full justify-center py-16">
        <div className="w-full max-w-md rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-12 text-center text-[var(--color-on-surface)] shadow-sm">
          <MapPin
            size={48}
            className="mx-auto mb-4 opacity-40 text-[color:var(--color-primary)]"
            aria-hidden
          />
          <SiteHeading
            level={3}
            title="No locations yet"
            variant="onSurface"
            className="mb-2 !text-2xl !font-semibold tracking-tight"
          />
          <p className="text-[var(--color-text-dimmed)]">
            There are no event locations available at the moment. Check back
            soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto grid max-w-[920px] gap-5 md:gap-6",
        locations.length === 1 && "max-w-sm grid-cols-1 justify-items-center",
        locations.length === 2 &&
          cn(
            "max-w-3xl grid-cols-1",
            !narrowPreview && "md:grid-cols-2",
          ),
        locations.length >= 3 &&
          cn("grid-cols-1", !narrowPreview && "md:grid-cols-3"),
      )}
    >
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

          const coverImage =
            "cover_image" in location && location.cover_image
              ? location.cover_image
              : null;

          const locationAddress =
            typeof locationData.address === "string"
              ? locationData.address.trim()
              : "";

          const upcomingEvent = locationData.latest_upcoming_event
            ? {
                name: locationData.latest_upcoming_event.name,
                date: locationData.latest_upcoming_event.date,
              }
            : null;

          const initials = locationInitials(locationName);

          const handleCardClick = () => {
            if (!locationSlug || pendingSlug) return;
            setPendingSlug(locationSlug);
            const handled = onSelect(locationSlug);
            if (handled === false) {
              setPendingSlug(null);
            }
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
                className="group relative aspect-[5/6] cursor-pointer overflow-hidden rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_22px_48px_-24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                onClick={handleCardClick}
              >
                {coverImage && typeof coverImage === "string" ? (
                  <Image
                    src={coverImage}
                    alt={locationName}
                    fill
                    priority={idx < 2}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    unoptimized={!shouldUseNextImageOptimization(coverImage)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--color-primary)_42%,transparent),transparent_55%),linear-gradient(160deg,color-mix(in_srgb,var(--color-primary)_28%,var(--color-background)),var(--color-background))]"
                    aria-hidden
                  >
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] text-2xl font-semibold tracking-[0.08em] text-[var(--color-text-dimmed)]">
                      {initials}
                    </span>
                  </div>
                )}

                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10"
                  aria-hidden
                />

                <div className="absolute left-3 top-3 z-[1] sm:left-4 sm:top-4">
                  <span className="inline-flex rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-foreground)] shadow-sm">
                    {totalEvents} event{totalEvents !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-[1] p-5 sm:p-6">
                  <h3
                    className="mb-2 font-heading text-[1.65rem] font-normal leading-tight tracking-tight text-white sm:text-[1.85rem]"
                    style={{ fontFamily: "var(--font-heading, inherit)" }}
                  >
                    {locationName}
                  </h3>

                  {locationAddress ? (
                    <p className="mb-3 flex items-start gap-1.5 text-sm text-white/70">
                      <MapPin
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-90"
                        aria-hidden
                      />
                      <span className="line-clamp-1">{locationAddress}</span>
                    </p>
                  ) : null}

                  {upcomingEvent ? (
                    <div
                      className="mb-3 grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out md:grid-rows-[0fr] md:group-hover:grid-rows-[1fr] md:group-focus-within:grid-rows-[1fr] motion-reduce:md:grid-rows-[1fr]"
                      aria-live="polite"
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="space-y-1 border-l-2 border-white/25 pl-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
                            Next up
                          </p>
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base">
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

                  <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-3.5">
                    {isPending ? (
                      <span className="inline-flex items-center gap-2 text-sm text-white/80">
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin"
                          aria-hidden
                        />
                        Opening…
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-white/80 transition-colors duration-200 group-hover:text-white">
                        Explore events
                      </span>
                    )}
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
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
