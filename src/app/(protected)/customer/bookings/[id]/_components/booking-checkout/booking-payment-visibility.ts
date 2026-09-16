export interface BookingPayAllVisibilityInput {
  canPayNow: boolean;
  bookingOutstanding: number;
  payableDateCount: number;
}

export interface BookingPayAllVisibility {
  /** User may pay any outstanding balance on this booking. */
  canPayOutstanding: boolean;
  /**
   * Sticky footer "Pay Now" when exactly one date is unpaid
   * (single-date bookings + multi-date with one remaining).
   */
  showSinglePayButton: boolean;
  /** Footer CTA to pay every unpaid date at once. Date cards still have Pay Now. */
  showPayAllButton: boolean;
  /** Show helper text listing how many dates are payable. */
  showPayableDatesHint: boolean;
  /** Gateway selector + pay CTA in the sticky footer. */
  showFooterPaymentControls: boolean;
}

/**
 * Footer pay CTA:
 * - 1 unpaid date → "Pay Now" (same date as the card button)
 * - 2+ unpaid dates → "Pay All" (optional; each date card also has Pay Now)
 */
export function resolveBookingPayAllVisibility(
  input: BookingPayAllVisibilityInput,
): BookingPayAllVisibility {
  const canPayOutstanding =
    input.canPayNow &&
    input.bookingOutstanding > 0 &&
    input.payableDateCount > 0;

  const multipleUnpaidDates = input.payableDateCount > 1;
  const showPayAllButton = canPayOutstanding && multipleUnpaidDates;
  const showSinglePayButton = canPayOutstanding && !multipleUnpaidDates;

  return {
    canPayOutstanding,
    showSinglePayButton,
    showPayAllButton,
    showPayableDatesHint: showPayAllButton,
    showFooterPaymentControls: showPayAllButton || showSinglePayButton,
  };
}
