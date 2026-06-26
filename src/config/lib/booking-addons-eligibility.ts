/**
 * Add-ons (customer + vendor): only paid / pending / partial dates may load or save extras.
 * Uses raw API `payment_status` strings per event date.
 */

export type BookingDatePaymentStatus =
  | "paid"
  | "pending"
  | "partial"
  | "refunded"
  | "cancelled"
  | "rescheduled"
  | "unknown";

export function normalizePaymentStatusForAddOnsDate(
  status: string | undefined | null,
): BookingDatePaymentStatus {
  const s = (status ?? "").toLowerCase().trim();
  if (!s) return "unknown";
  if (s === "paid") return "paid";
  if (s === "refunded") return "refunded";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "partial payment" || s === "partial") return "partial";
  if (s === "pending" || s === "unpaid") return "pending";
  if (s.includes("reschedule")) return "rescheduled";
  return "unknown";
}

export function isBookingDateEligibleForAddOns(
  status?: BookingDatePaymentStatus,
): boolean {
  if (status === undefined) return true;
  return status === "paid" || status === "pending" || status === "partial";
}
