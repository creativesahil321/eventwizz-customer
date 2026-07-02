import type { BookingRescheduleRequest } from "@/services/customer/bookings/type";

export interface RescheduleEligibleDate {
  can_reschedule?: boolean;
  has_unbooked_event_dates?: boolean;
  reschedule_requests?: BookingRescheduleRequest[];
  paymentStatus?: string;
  paymentStatusLabel?: string;
}

function isCancelledOrRefunded(date: RescheduleEligibleDate): boolean {
  if (date.paymentStatus === "cancelled" || date.paymentStatus === "refunded") {
    return true;
  }
  const label = (date.paymentStatusLabel ?? "").trim().toLowerCase();
  return label.includes("cancelled") || label.includes("refunded");
}

/** Show API-driven Reschedule CTA — do not reimplement server rules. */
export function canShowRescheduleButton(date: RescheduleEligibleDate): boolean {
  if (typeof date.can_reschedule === "boolean") {
    return date.can_reschedule;
  }

  if (date.has_unbooked_event_dates !== true) return false;
  if ((date.reschedule_requests?.length ?? 0) > 0) return false;
  if (isCancelledOrRefunded(date)) return false;
  return true;
}

export function hasPendingReschedulePayment(date: RescheduleEligibleDate): boolean {
  return (date.reschedule_requests?.length ?? 0) > 0;
}
