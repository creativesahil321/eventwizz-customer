"use client";

import Link from "next/link";
import { Calendar, Loader2 } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { useIsPreviewMode } from "@/contexts/preview-context";

export type LocationEventCardModel = {
  title: string;
  slug: string;
  image: string;
  price: string | null;
  dateLabel: string | null;
  category?: string | null;
};

type LocationEventCardProps = {
  event: LocationEventCardModel;
  locationSlug: string;
  /** Kept for API compatibility; public cards omit location row in the UI */
  locationLabel?: string | null;
  isPending: boolean;
  onNavigateStart: () => void;
  imageFallback: string;
};

/**
 * Public event card: ~4/3 image, price pill top-right, date bottom-left on image,
 * dark footer with title; hover = primary ring + title shifts to primary (image slight zoom).
 */
export function LocationEventCard({
  event,
  locationSlug,
  isPending,
  onNavigateStart,
  imageFallback,
}: LocationEventCardProps) {
  const isPreview = useIsPreviewMode();
  const href = `/${locationSlug}/events/${event.slug}`;

  const cardClassName = cn(
    "group relative block h-full w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 outline-none",
    "shadow-sm transition-all duration-300 ease-out",
    !isPreview &&
      "hover:-translate-y-1 hover:border-[color:var(--color-primary)] hover:shadow-lg hover:shadow-black/50",
    !isPreview &&
      "hover:ring-2 hover:ring-[color:var(--color-primary)] hover:ring-offset-0",
    !isPreview &&
      "focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
    (isPending || isPreview) && "pointer-events-none",
  );

  const cardBody = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
        <img
          src={addCacheBusting(event.image)}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-105"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.dataset.fallbackApplied === "true") return;
            target.dataset.fallbackApplied = "true";
            target.src = imageFallback;
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
          aria-hidden
        />

        {event.price ? (
          <div className="absolute right-2.5 top-2.5 z-[1] rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold tabular-nums leading-none text-[var(--color-primary-foreground)] shadow-md">
            {event.price}
          </div>
        ) : null}

        {event.dateLabel ? (
          <div className="absolute bottom-2.5 left-2.5 z-[1] flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow-md">
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
            <span>{event.dateLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/[0.06] bg-zinc-950 px-3 py-2.5">
        {event.category ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            {event.category}
          </p>
        ) : null}
        <h3
          className={cn(
            "line-clamp-2 text-left text-sm font-bold leading-snug text-white transition-colors duration-300",
            "group-hover:text-[color:var(--color-primary)]",
          )}
        >
          {event.title}
        </h3>
      </div>
    </>
  );

  return (
    <div className="relative h-full w-full">
      {isPreview ? (
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
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[2px]"
          aria-hidden
        >
          <Loader2 className="h-7 w-7 animate-spin text-[color:var(--color-primary)]" />
        </div>
      ) : null}
    </div>
  );
}
