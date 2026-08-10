"use client";

import { cn } from "@/lib/utils";
import {
  formatDateCardOfferBadge,
  isDateCardOfferVisible,
  type DateCardOffer,
} from "@/components/public/date-card-offer";

type DateCardOfferBadgeProps = {
  offer?: DateCardOffer | null;
  /** Precomputed label — skips offer parsing when provided. */
  label?: string;
  /** Narrow wizard / preview panes. */
  compact?: boolean;
  className?: string;
};

/**
 * Compact offer label for non-card contexts.
 * Prefer `DateCardPriceFooter`’s built-in offer line on date cards.
 */
export function DateCardOfferBadge({
  offer,
  label,
  compact = false,
  className,
}: DateCardOfferBadgeProps) {
  const badge =
    label?.trim() ||
    (isDateCardOfferVisible(offer) ? formatDateCardOfferBadge(offer) : "");
  if (!badge) return null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center justify-center font-semibold uppercase tracking-[0.12em] text-white/90",
        compact ? "text-[8px]" : "text-[9px] sm:text-[10px]",
        className,
      )}
    >
      <span className="truncate">{badge}</span>
    </span>
  );
}
