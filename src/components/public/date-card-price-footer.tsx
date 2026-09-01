"use client";

import { cn } from "@/lib/utils";
import {
  formatDateCardOfferBadge,
  isDateCardOfferVisible,
  type DateCardOffer,
} from "@/components/public/date-card-offer";

type DateCardPriceFooterProps = {
  currencySymbol: string;
  /** List / from price for the date. */
  listPrice: number;
  /** Optional public offer — shown as a slim label above the price. */
  offer?: DateCardOffer | null;
  /** Precomputed offer label (e.g. `12% OFF`). */
  offerLabel?: string;
  /** Compact layout for narrow preview panes. */
  compact?: boolean;
  className?: string;
  /**
   * When set, replaces the price block (sold out, view cart, set offer, etc.).
   */
  fallbackLabel?: string;
};

function formatCompactAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(0);
}

/**
 * Date-card footer: list price, with an optional slim “% OFF” line above it.
 * Keeps the date body identical on every card — no floating badges.
 */
export function DateCardPriceFooter({
  currencySymbol,
  listPrice,
  offer,
  offerLabel,
  compact = false,
  className,
  fallbackLabel,
}: DateCardPriceFooterProps) {
  if (fallbackLabel != null && fallbackLabel !== "") {
    return (
      <span
        className={cn(
          "block px-1 font-semibold tracking-wider text-white",
          compact ? "py-1 text-xs" : "py-1 text-sm sm:py-1.5 sm:text-base",
          className,
        )}
      >
        {fallbackLabel}
      </span>
    );
  }

  const badge =
    offerLabel?.trim() ||
    (isDateCardOfferVisible(offer) ? formatDateCardOfferBadge(offer) : "");
  const priceLabel =
    listPrice > 0
      ? `${currencySymbol}${formatCompactAmount(listPrice)}`
      : "—";

  if (!badge) {
    return (
      <span
        className={cn(
          "block px-1 font-semibold tracking-wider text-white",
          compact ? "py-1 text-base" : "py-1 text-base sm:py-1.5 sm:text-lg",
          className,
        )}
      >
        {priceLabel}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-1 text-white",
        compact ? "py-1" : "py-1 sm:py-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "font-semibold uppercase tracking-[0.12em] text-white/90",
          compact ? "text-[8px] leading-none" : "text-[9px] leading-none sm:text-[10px]",
        )}
      >
        {badge}
      </span>
      <span
        className={cn(
          "font-semibold tabular-nums tracking-wider",
          compact ? "text-sm leading-none" : "text-base leading-none sm:text-lg",
        )}
      >
        {priceLabel}
      </span>
    </span>
  );
}
