"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Loader2, MapPin, Navigation } from "lucide-react";
import { addCacheBusting, shouldUseNextImageOptimization } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import {
  useIsPreviewMode,
  usePreviewEventSelect,
} from "@/contexts/preview-context";
import { formatEventCardFromPrice } from "./event-card-utils";
import {
  PUBLIC_CARD_HOVER_LIFT_CLASS,
  PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS,
  PUBLIC_LOADING_OVERLAY_CLASS,
  PUBLIC_CARD_TITLE_CLASS,
  PUBLIC_METADATA_TEXT_CLASS,
  PUBLIC_PRICE_TEXT_CLASS,
} from "@/lib/public-rhythm";
import {
  BookingTypeIcons,
  type PublicBookingType,
} from "@/components/public/booking-type-icons";

export type LocationEventCardModel = {
  title: string;
  slug: string;
  image: string;
  price: string | null;
  dateLabel: string | null;
  timeLabel?: string | null;
  category?: string | null;
  /** Near Me distance from customer to event pin (km). */
  distanceKm?: number | null;
  /**
   * From location API `booking_option` — icons + accessible label near price.
   * Missing when next available date has no remaining tickets/tables.
   */
  bookingType?: PublicBookingType | null;
  /** Event pin from listing/search — preferred over parent city. */
  eventAddress?: string | null;
};

type LocationEventCardProps = {
  event: LocationEventCardModel;
  locationSlug: string;
  /** City / venue label — shown when `showLocationChip` is true (cross-location search). */
  locationLabel?: string | null;
  /** Prefer event pin address over city bucket when available. */
  eventAddress?: string | null;
  /** Cross-location search results need a small location chip on the card. */
  showLocationChip?: boolean;
  isPending: boolean;
  onNavigateStart: () => void;
  imageFallback: string;
};

function formatDistanceKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * Public event card: photo, category pill, date/time, from-price, View CTA.
 */
export function LocationEventCard({
  event,
  locationSlug,
  locationLabel = null,
  eventAddress = null,
  showLocationChip = false,
  isPending,
  onNavigateStart,
  imageFallback,
}: LocationEventCardProps) {
  const isPreview = useIsPreviewMode();
  const onPreviewEventSelect = usePreviewEventSelect();
  const isInteractivePreview = isPreview && Boolean(onPreviewEventSelect);
  const href = `/${locationSlug}/events/${event.slug}`;
  const eventPin =
    event.eventAddress?.trim() || eventAddress?.trim() || "";
  const cityLabel = locationLabel?.trim() || "";
  const placeLabel = eventPin || cityLabel || null;
  const showPlace = Boolean(placeLabel);
  const hasDistance =
    typeof event.distanceKm === "number" && Number.isFinite(event.distanceKm);
  // Split so the `from` prefix can sit on the same line at a smaller size —
  // as one string it wrapped onto two lines in a 152px column.
  const fromPrice = formatEventCardFromPrice(event.price);
  const priceAmount = fromPrice
    ? fromPrice.replace(/^from\s+/i, "").trim()
    : null;

  const [imageSrc, setImageSrc] = useState(() => addCacheBusting(event.image));
  useEffect(() => {
    setImageSrc(addCacheBusting(event.image));
  }, [event.image]);

  const cardClassName = cn(
    "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] text-left outline-none",
    "shadow-[0_12px_28px_-24px_rgba(0,0,0,0.4)]",
    PUBLIC_CARD_HOVER_LIFT_CLASS,
    !isPending &&
      "[@media(hover:hover)_and_(pointer:fine)]:hover:border-[color:color-mix(in_srgb,var(--color-primary)_45%,transparent)] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_22px_40px_-24px_rgba(0,0,0,0.35)]",
    (!isPreview || isInteractivePreview) &&
      "focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
    isPending && "pointer-events-none",
  );

  const cardBody = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color:color-mix(in_srgb,var(--color-text)_8%,var(--color-surface))]">
        <Image
          src={imageSrc || imageFallback}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
          className={cn("object-cover", PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS)}
          unoptimized={!shouldUseNextImageOptimization(imageSrc || imageFallback)}
          onError={() => {
            if (imageSrc !== imageFallback) {
              setImageSrc(imageFallback);
            }
          }}
        />

        {event.category ? (
          <div className="absolute left-2.5 top-2.5 z-[1] rounded-full bg-black/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            {event.category}
          </div>
        ) : null}

        {hasDistance ? (
          <div
            className={cn(
              "absolute z-[1] flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm",
              event.category ? "right-2.5 top-2.5" : "left-2.5 top-2.5",
            )}
          >
            <Navigation className="h-2.5 w-2.5 shrink-0" aria-hidden />
            {formatDistanceKm(event.distanceKm!)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4 md:p-5 @max-md/preview:!p-3">
        <h3
          className={cn(
            PUBLIC_CARD_TITLE_CLASS,
            "text-left text-sm text-[var(--color-text)] transition-colors duration-300 group-hover:text-[color:var(--color-primary)] md:text-[15px] @max-md/preview:!text-sm",
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {event.title}
        </h3>

        {event.dateLabel || event.timeLabel ? (
          <div
            className={cn(
              "mt-1.5 space-y-0.5 sm:mt-2 sm:space-y-1",
              PUBLIC_METADATA_TEXT_CLASS,
              // Two cards per row leaves ~120px of text: at `text-sm` the date and
              // the time range each wrapped to two lines, adding ~60px per card.
              "text-xs sm:text-sm @max-md/preview:!text-xs",
            )}
          >
            {event.dateLabel ? (
              <p className="flex min-w-0 items-center gap-1.5">
                <Calendar
                  className="h-3 w-3 shrink-0 opacity-80 sm:h-3.5 sm:w-3.5 @max-md/preview:!h-3 @max-md/preview:!w-3"
                  aria-hidden
                />
                <span className="truncate">{event.dateLabel}</span>
              </p>
            ) : null}
            {event.timeLabel ? (
              <p className="flex min-w-0 items-center gap-1.5">
                <Clock
                  className="h-3 w-3 shrink-0 opacity-80 sm:h-3.5 sm:w-3.5 @max-md/preview:!h-3 @max-md/preview:!w-3"
                  aria-hidden
                />
                <span className="truncate">{event.timeLabel}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {showPlace && placeLabel ? (
          <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-[var(--color-text-dimmed)]">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-1 sm:line-clamp-2 @max-md/preview:!line-clamp-1">
              {placeLabel}
            </span>
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 sm:pt-4">
          {priceAmount ? (
            <span className="inline-flex min-w-0 items-baseline gap-1">
              <BookingTypeIcons
                bookingType={event.bookingType}
                size={14}
                className="shrink-0 self-center text-[color:var(--color-primary)]"
                labelled
              />
              <span className="shrink-0 text-[11px] font-medium text-[var(--color-text-dimmed)] sm:text-xs">
                from
              </span>
              <span
                className={cn(
                  PUBLIC_PRICE_TEXT_CLASS,
                  "min-w-0 truncate !text-base sm:!text-lg @max-md/preview:!text-base",
                )}
              >
                {priceAmount}
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex h-8 shrink-0 items-center rounded-lg bg-[var(--color-primary)] px-2.5 text-[11px] font-semibold text-[var(--color-primary-foreground)] sm:px-3 sm:text-xs">
            View
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative h-full w-full">
      {isInteractivePreview ? (
        <button
          type="button"
          onClick={() => onPreviewEventSelect?.(event.slug)}
          aria-label={`${event.title} — preview event`}
          className={cn(cardClassName, "cursor-pointer")}
        >
          {cardBody}
        </button>
      ) : isPreview ? (
        <article
          aria-label={`${event.title} — preview`}
          className={cardClassName}
        >
          {cardBody}
        </article>
      ) : (
        <Link
          href={href}
          onClick={() => onNavigateStart()}
          aria-label={`${event.title} — view event`}
          className={cardClassName}
          aria-busy={isPending}
        >
          {cardBody}
        </Link>
      )}

      {isPending ? (
        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[var(--color-surface)]/55 opacity-100 backdrop-blur-[2px]",
            PUBLIC_LOADING_OVERLAY_CLASS,
          )}
          aria-hidden
        >
          <Loader2 className="h-7 w-7 animate-spin text-[color:var(--color-primary)] motion-reduce:animate-none" />
        </div>
      ) : null}
    </div>
  );
}
