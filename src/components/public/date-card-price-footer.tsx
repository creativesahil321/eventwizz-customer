"use client";

import { cn } from "@/lib/utils";
import {
  formatDateCardOfferBadge,
  isDateCardOfferVisible,
  type DateCardOffer,
} from "@/components/public/date-card-offer";
import {
  BookingTypeIcons,
  type PublicBookingType,
} from "@/components/public/booking-type-icons";

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
  /**
   * Lovable Option B — outline icons left of the price in the gradient footer.
   */
  bookingType?: PublicBookingType | null;
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
  bookingType = null,
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

  const priceRow = (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold tracking-wider text-white",
        compact ? "text-sm leading-none" : "text-base leading-none sm:text-lg",
      )}
    >
      <BookingTypeIcons
        bookingType={bookingType}
        size={compact ? 11 : 13}
        className="shrink-0 text-white"
      />
      <span className="tabular-nums">{priceLabel}</span>
    </span>
  );

  if (!badge) {
    return (
      <span
        className={cn(
          "flex w-full items-center justify-center px-1",
          compact ? "py-1" : "py-1 sm:py-1.5",
          className,
        )}
      >
        {priceRow}
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
          compact
            ? "text-[8px] leading-none"
            : "text-[9px] leading-none sm:text-[10px]",
        )}
      >
        {badge}
      </span>
      {priceRow}
    </span>
  );
}
