"use client";

import Link from "next/link";
import { Calendar, Clock, Loader2, MapPin } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import {
  useIsPreviewMode,
  usePreviewEventSelect,
} from "@/contexts/preview-context";
import type { LocationEventCardModel } from "./location-event-card";
import { formatEventCardFromPrice } from "./event-card-utils";
import { SiteHeading } from "@/components/public/site-heading";
import {
  PUBLIC_CARD_HOVER_LIFT_CLASS,
  PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS,
} from "@/lib/public-rhythm";
import { BookingTypeIcons } from "@/components/public/booking-type-icons";

type LocationEventHeroCardProps = {
  event: LocationEventCardModel;
  locationSlug: string;
  locationLabel?: string | null;
  isPending: boolean;
  onNavigateStart: () => void;
  imageFallback: string;
};

/**
 * Wide hero event card for single-event sections: full-bleed image, title on image,
 * price pill top-right — no footer bar (matches carousel-slide prominence).
 */
export function LocationEventHeroCard({
  event,
  locationSlug,
  locationLabel = null,
  isPending,
  onNavigateStart,
  imageFallback,
}: LocationEventHeroCardProps) {
  const isPreview = useIsPreviewMode();
  const onPreviewEventSelect = usePreviewEventSelect();
  const isInteractivePreview = isPreview && Boolean(onPreviewEventSelect);
  const href = `/${locationSlug}/events/${event.slug}`;
  const fromPrice = formatEventCardFromPrice(event.price);
  const placeLabel =
    event.eventAddress?.trim() || locationLabel?.trim() || "";

  // Visual hover is decoupled from click interactivity so the Site Essentials
  // preview matches the live site. Only the loading state blocks pointer events.
  const cardClassName = cn(
    "group relative block w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 outline-none md:rounded-3xl",
    "shadow-md",
    PUBLIC_CARD_HOVER_LIFT_CLASS,
    !isPending &&
      "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-[color:var(--color-primary)] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-xl [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-black/30",
    !isPending &&
      "[@media(hover:hover)_and_(pointer:fine)]:hover:ring-2 [@media(hover:hover)_and_(pointer:fine)]:hover:ring-[color:var(--color-primary)] [@media(hover:hover)_and_(pointer:fine)]:hover:ring-offset-0",
    (!isPreview || isInteractivePreview) &&
      "focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
    isPending && "pointer-events-none",
  );

  const cardBody = (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-900 sm:aspect-[16/9]">
      <img
        src={addCacheBusting(event.image)}
        alt={event.title}
        className={cn("h-full w-full object-cover", PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS)}
        onError={(e) => {
          const target = e.currentTarget;
          if (target.dataset.fallbackApplied === "true") return;
          target.dataset.fallbackApplied = "true";
          target.src = imageFallback;
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5"
        aria-hidden
      />

      {fromPrice ? (
        <div className="absolute right-3 top-3 z-[1] inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold tabular-nums leading-none text-[var(--color-primary-foreground)] shadow-md md:right-4 md:top-4 md:px-3.5 md:py-2 md:text-sm">
          <BookingTypeIcons
            bookingType={event.bookingType}
            size={12}
            className="text-[color:var(--color-primary-foreground)]"
            labelled
          />
          {fromPrice}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-[1] p-4 sm:p-5 md:p-6">
        {event.category ? (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)] sm:text-[11px]">
            {event.category}
          </p>
        ) : null}
        <SiteHeading
          level={3}
          title={event.title}
          variant="onDark"
          className={cn(
            "!text-left !text-xl !font-semibold leading-tight drop-shadow-sm sm:!text-2xl md:!text-3xl",
            "transition-colors duration-300 group-hover:!text-[color:var(--color-primary)]",
          )}
        />
        {event.dateLabel || event.timeLabel ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-white/90 sm:text-sm">
            {event.dateLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                {event.dateLabel}
              </span>
            ) : null}
            {event.timeLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                {event.timeLabel}
              </span>
            ) : null}
            {placeLabel ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2">{placeLabel}</span>
              </span>
            ) : null}
          </div>
        ) : null}
        {!event.dateLabel && !event.timeLabel && placeLabel ? (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-white/90 sm:text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
            <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2">{placeLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="relative w-full">
      {isInteractivePreview ? (
        <button
          type="button"
          onClick={() => onPreviewEventSelect?.(event.slug)}
          aria-label={`${event.title} — preview event`}
          className={cn(cardClassName, "cursor-pointer text-left")}
        >
          {cardBody}
        </button>
      ) : isPreview ? (
        <article aria-label={`${event.title} — preview`} className={cardClassName}>
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
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-[2px] md:rounded-3xl"
          aria-hidden
        >
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--color-primary)]" />
        </div>
      ) : null}
    </div>
  );
}
