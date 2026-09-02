/**
 * Utility functions for bookings module
 */

import { parseAsString } from "@/types";
import { getStatusColorClass } from "@/lib/status-theme";
import type { BookingDate } from "./types";

/**
 * Customer booking detail path — always use booking_number (e.g. EV-080), never numeric booking_id.
 */
export function getCustomerBookingDetailPath(bookingNumber: string): string {
  return `/customer/bookings/${encodeURIComponent(bookingNumber)}`;
}

/**
 * Stable React key for booking date rows.
 * Same calendar day can appear once per room — prefer room_name when present.
 */
export function getBookingDateRowKey(
  date: Pick<BookingDate, "date_key" | "room_name">,
  index: number,
): string {
  const room = date.room_name?.trim();
  if (room) {
    return `${date.date_key}:${room}`;
  }
  return `${date.date_key}-${index}`;
}

/** Display label for a booking date row (date + optional room). */
export function formatBookingDateLabel(
  date: Pick<BookingDate, "date" | "room_name">,
): string {
  const room = date.room_name?.trim();
  return room ? `${date.date} · ${room}` : date.date;
}

/**
 * Safely converts search param value to string
 * Uses the centralized utility from @/types
 */
export function getStringValue(
  value: string | string[] | number | undefined
): string {
  return parseAsString(value, "");
}

/**
 * Formats booking status for display
 * Handles both booking status (confirmed/pending) and payment status (paid/pending)
 */
export function formatBookingStatus(status: string): {
  label: string;
  isConfirmed: boolean;
  className: string;
} {
  const statusLower = status.toLowerCase();
  // Check for confirmed or paid status (both should be green)
  const isConfirmed = statusLower === "confirmed" || statusLower === "paid";

  // Format label - capitalize first letter
  const label =
    statusLower === "paid"
      ? "Paid"
      : statusLower.charAt(0).toUpperCase() + statusLower.slice(1);

  return {
    label,
    isConfirmed,
    className: getStatusColorClass(statusLower),
  };
}
