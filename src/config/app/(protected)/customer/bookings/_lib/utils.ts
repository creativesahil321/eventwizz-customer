/**
 * Utility functions for bookings module
 */

import { parseAsString } from "@/types";
import { getStatusColorClass } from "@/lib/status-theme";
import type { BookingDate } from "./types";

/**
 * Stable React key for booking date rows (room bookings can share date_key).
 */
export function getBookingDateRowKey(
  date: Pick<BookingDate, "date_key"> & { room_id?: number | null },
  index: number,
): string {
  if (date.room_id != null && date.room_id > 0) {
    return `${date.room_id}:${date.date_key}`;
  }
  return `${date.date_key}-${index}`;
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
