"use client";

import Link from "next/link";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import {
  useIsPreviewMode,
  usePreviewEventSelect,
} from "@/contexts/preview-context";
import type { LocationEventCardModel } from "./location-event-card";
import { SiteHeading } from "@/components/public/site-heading";

type LocationEventHeroCardProps = {
  event: LocationEventCardModel;
  locationSlug: string;
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
  isPending,
  onNavigateStart,
  imageFallback,
}: LocationEventHeroCardProps) {
  const isPreview = useIsPreviewMode();
  const onPreviewEventSelect = usePreviewEventSelect();
  const isInteractivePreview = isPreview && Boolean(onPreviewEventSelect);
  const href = `/${locationSlug}/events/${event.slug}`;

  // Visual hover is decoupled from click interactivity so the Site Essentials
  // preview matches the live site. Only the loading state blocks pointer events.
  const cardClassName = cn(
    "group relative block w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 outline-none md:rounded-3xl",
    "shadow-md transition-all duration-300 ease-out",
    !isPending &&
      "hover:-translate-y-0.5 hover:border-[color:var(--color-primary)] hover:shadow-xl hover:shadow-black/30",
    !isPending &&
      "hover:ring-2 hover:ring-[color:var(--color-primary)] hover:ring-offset-0",
    (!isPreview || isInteractivePreview) &&
      "focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
    isPending && "pointer-events-none",
  );

  const cardBody = (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-900 sm:aspect-[16/9]">
      <img
        src={addCacheBusting(event.image)}
        alt={event.title}
        className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03]"
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

      {event.price ? (
        <div className="absolute right-3 top-3 z-[1] rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold tabular-nums leading-none text-[var(--color-primary-foreground)] shadow-md md:right-4 md:top-4 md:px-3.5 md:py-2 md:text-sm">
          {event.price}
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
