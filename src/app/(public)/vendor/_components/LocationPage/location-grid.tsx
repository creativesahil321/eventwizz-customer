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
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import {
  PUBLIC_CARD_HOVER_LIFT_CLASS,
  PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS,
  PUBLIC_LOADING_OVERLAY_CLASS,
} from "@/lib/public-rhythm";

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
  const narrowPreview = usePreviewMobileLayout();

  if (isLoading) {
    return (
      <div
        className={cn(
          "mx-auto grid max-w-[920px] grid-cols-1 gap-4",
          !narrowPreview &&
            "sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 @max-5xl/preview:!grid-cols-2 @max-5xl/preview:!gap-5",
        )}
      >
        {Array(6)
          .fill(0)
          .map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "relative overflow-hidden bg-[var(--color-surface)]",
                narrowPreview
                  ? "min-h-[5.5rem] rounded-xl"
                  : "min-h-[5.5rem] rounded-xl md:h-auto md:min-h-0 md:aspect-[5/6] md:rounded-[20px]",
              )}
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
            There are no locations available at the moment. Check back
            soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto grid max-w-[920px] gap-4 md:gap-6",
        locations.length === 1 && "max-w-sm grid-cols-1 justify-items-center",
        locations.length === 2 &&
          cn(
            "max-w-3xl grid-cols-1",
            !narrowPreview && "md:grid-cols-2",
          ),
        locations.length >= 3 &&
          cn(
            "grid-cols-1",
            !narrowPreview &&
              "sm:grid-cols-2 lg:grid-cols-3 @max-5xl/preview:!grid-cols-2",
          ),
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
                className={cn(
                  "group relative cursor-pointer border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]",
                  PUBLIC_CARD_HOVER_LIFT_CLASS,
                  // Compact list — min-height (not fixed) so heading glyphs aren't clipped
                  narrowPreview
                    ? "flex min-h-[5.75rem] items-stretch overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-sm"
                    : cn(
                        "flex min-h-[5.75rem] items-stretch overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-sm md:block md:aspect-[5/6] md:h-auto md:min-h-0 md:rounded-[20px] md:shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)]",
                        "[@media(hover:hover)_and_(pointer:fine)]:md:hover:-translate-y-1.5 [@media(hover:hover)_and_(pointer:fine)]:md:hover:shadow-[0_22px_48px_-24px_rgba(0,0,0,0.55)]",
                      ),
                )}
                onClick={handleCardClick}
              >
                <div
                  className={cn(
                    "relative w-[5.75rem] shrink-0 self-stretch overflow-hidden",
                    !narrowPreview && "md:absolute md:inset-0 md:w-full md:self-auto",
                  )}
                >
                  {coverImage && typeof coverImage === "string" ? (
                    <Image
                      src={coverImage}
                      alt={locationName}
                      fill
                      priority={idx < 2}
                      sizes="(max-width: 768px) 96px, (max-width: 1200px) 50vw, 33vw"
                      className={cn(
                        "object-cover",
                        PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS,
                      )}
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
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] text-sm font-semibold tracking-[0.08em] text-[var(--color-text-dimmed)]",
                          !narrowPreview && "md:h-20 md:w-20 md:text-2xl",
                        )}
                      >
                        {initials}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10",
                    narrowPreview ? "hidden" : "hidden md:block",
                  )}
                  aria-hidden
                />

                <span
                  className={cn(
                    "absolute left-2 top-2 z-[1] inline-flex rounded-full bg-[var(--color-secondary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-secondary-foreground)] shadow-sm",
                    !narrowPreview &&
                      "md:left-4 md:top-4 md:px-2.5 md:py-1 md:text-xs",
                  )}
                >
                  {totalEvents} event{totalEvents !== 1 ? "s" : ""}
                </span>

                <div
                  className={cn(
                    "relative z-[1] flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5",
                    !narrowPreview &&
                      "md:absolute md:bottom-0 md:left-0 md:right-0 md:justify-end md:gap-0 md:p-6",
                  )}
                >
                  <h3
                    className={cn(
                      // Compact cards: body font + normal leading so ascenders
                      // aren't clipped by overflow-hidden + tight display fonts.
                      "line-clamp-2 text-[15px] font-semibold leading-normal tracking-tight text-[var(--color-text)]",
                      !narrowPreview &&
                        "md:mb-2 md:text-[1.85rem] md:font-normal md:leading-[1.2] md:text-white md:[font-family:var(--font-heading,inherit)]",
                    )}
                  >
                    {locationName}
                  </h3>

                  {upcomingEvent ? (
                    <>
                      <p
                        className={cn(
                          "flex min-w-0 items-center gap-1 text-xs text-[var(--color-text-dimmed)]",
                          !narrowPreview && "md:hidden",
                        )}
                      >
                        <Calendar
                          className="h-3 w-3 shrink-0 opacity-90"
                          aria-hidden
                        />
                        <span className="min-w-0 font-medium text-[var(--color-text)] line-clamp-1">
                          {upcomingEvent.name}
                        </span>
                        <span className="shrink-0 opacity-50">·</span>
                        <span className="shrink-0">{upcomingEvent.date}</span>
                      </p>

                      {!narrowPreview ? (
                        <div
                          className="mb-3 hidden grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out md:grid md:group-hover:grid-rows-[1fr] md:group-focus-within:grid-rows-[1fr] motion-reduce:md:grid-rows-[1fr]"
                          aria-live="polite"
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="space-y-1 border-l-2 border-white/25 pl-3">
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/55">
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
                    </>
                  ) : null}

                  <div
                    className={cn(
                      "mt-0.5 flex items-center justify-between gap-2",
                      !narrowPreview &&
                        "md:mt-0 md:border-t md:border-white/15 md:pt-3.5",
                    )}
                  >
                    {isPending ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-dimmed)] opacity-100",
                          PUBLIC_LOADING_OVERLAY_CLASS,
                          !narrowPreview && "md:gap-2 md:text-sm md:text-white/80",
                        )}
                      >
                        <Loader2
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none",
                            !narrowPreview && "md:h-4 md:w-4",
                          )}
                          aria-hidden
                        />
                        Opening…
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-[11px] font-medium text-[var(--color-primary)] transition-colors duration-200",
                          !narrowPreview &&
                            "md:text-sm md:text-white/80 md:group-hover:text-white",
                        )}
                      >
                        Explore events
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0",
                        !narrowPreview && "md:h-8 md:w-8 md:bg-white md:text-black",
                      )}
                    >
                      <ArrowRight
                        className={cn(
                          "h-3 w-3",
                          !narrowPreview && "md:h-4 md:w-4",
                        )}
                        aria-hidden
                      />
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
