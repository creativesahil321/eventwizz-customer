export interface BookingPayAllVisibilityInput {
  canPayNow: boolean;
  bookingOutstanding: number;
  payableDateCount: number;
  hasMultipleDates: boolean;
}

export interface BookingPayAllVisibility {
  /** User may pay any outstanding balance on this booking. */
  canPayOutstanding: boolean;
  /** Show the footer "Pay All" button (multi-date bookings). */
  showPayAllButton: boolean;
  /** Show helper text listing how many dates are payable. */
  showPayableDatesHint: boolean;
}

export function resolveBookingPayAllVisibility(
  input: BookingPayAllVisibilityInput,
): BookingPayAllVisibility {
  const canPayOutstanding =
    input.canPayNow &&
    input.bookingOutstanding > 0 &&
    input.payableDateCount > 0;

  return {
    canPayOutstanding,
    showPayAllButton: canPayOutstanding && input.hasMultipleDates,
    showPayableDatesHint:
      canPayOutstanding && input.payableDateCount > 1,
  };
}
