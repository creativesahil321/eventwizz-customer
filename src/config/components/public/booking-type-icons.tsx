"use client";

import { Ticket, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

export type PublicBookingType = "tickets" | "tables" | "both";

/** Public single-event date availability from `booking_option`. */
export type PublicBookingOption = PublicBookingType;

export function normalizePublicBookingType(
  value: unknown,
): PublicBookingType | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (
    normalized === "tickets" ||
    normalized === "tables" ||
    normalized === "both"
  ) {
    return normalized;
  }
  return null;
}

/**
 * Listing cards: API `booking_type` only — no invented fallback.
 * Single-event Select-a-Date cards should use {@link resolveDateCardBookingOption}.
 */
export function resolvePublicBookingType(
  value: unknown,
): PublicBookingType | null {
  return normalizePublicBookingType(value);
}

/** Guest-facing label for `booking_option` / booking type chips. */
export function bookingOptionLabel(
  option: PublicBookingType | null | undefined,
): string {
  if (option === "tickets") return "Tickets";
  if (option === "tables") return "Tables";
  if (option === "both") return "Tickets & Tables";
  return "";
}

/** @deprecated Prefer {@link bookingOptionLabel}. */
export function bookingTypeAriaLabel(
  bookingType: PublicBookingType | null | undefined,
): string {
  return bookingOptionLabel(bookingType);
}

/**
 * Select-a-Date card icons/labels from the public event detail API.
 *
 * - `sold_out` → no booking label (Sold Out UI wins)
 * - prefer `booking_option` when present
 * - omit icon/label when `booking_option` is missing (API omits when empty inventory)
 * - `booking_type` is a preview/legacy fallback only
 */
export function resolveDateCardBookingOption(input: {
  soldOut?: boolean | null;
  bookingOption?: unknown;
  bookingType?: unknown;
}): PublicBookingType | null {
  if (input.soldOut === true) return null;
  const fromOption = normalizePublicBookingType(input.bookingOption);
  if (fromOption) return fromOption;
  return normalizePublicBookingType(input.bookingType);
}

type BookingTypeIconsProps = {
  bookingType: PublicBookingType | null | undefined;
  size?: number;
  className?: string;
  iconClassName?: string;
  /** Accessible label wrapper — omit for decorative use inside a labelled parent. */
  labelled?: boolean;
};

/**
 * Lovable Option B language: Lucide outline Ticket / UtensilsCrossed.
 * Used in date-card price bars and event-card price chips.
 */
export function BookingTypeIcons({
  bookingType,
  size = 13,
  className,
  iconClassName,
  labelled = false,
}: BookingTypeIconsProps) {
  if (!bookingType) return null;

  const icons =
    bookingType === "tickets"
      ? [Ticket]
      : bookingType === "tables"
        ? [UtensilsCrossed]
        : [Ticket, UtensilsCrossed];

  const label = bookingOptionLabel(bookingType);

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? label : undefined}
      title={labelled ? label : undefined}
    >
      {icons.map((Icon, index) => (
        <Icon
          key={`${bookingType}-${index}`}
          size={size}
          strokeWidth={1.8}
          className={iconClassName}
          aria-hidden
        />
      ))}
    </span>
  );
}
