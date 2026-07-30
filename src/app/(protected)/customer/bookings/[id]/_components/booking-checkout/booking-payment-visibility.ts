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
   * Critical for mobile — always visible without scrolling.
   */
  showSinglePayButton: boolean;
  /** Global footer CTA when multiple dates still have a balance. */
  showPayAllButton: boolean;
  /** Show helper text listing how many dates are payable. */
  showPayableDatesHint: boolean;
  /** Gateway selector + pay CTA in the sticky footer. */
  showFooterPaymentControls: boolean;
}

/**
 * Sticky Payment Summary footer owns the primary pay CTA (mobile-first):
 * - 1 unpaid date → "Pay Now"
 * - 2+ unpaid dates → "Pay All"
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
