export const VENDOR_PAYMENT_SUCCESS_PATH = "/vendor/payment/success";

export function vendorPaymentSuccessHref(bookingNumber: string): string {
  const params = new URLSearchParams({ booking_number: bookingNumber });
  return `${VENDOR_PAYMENT_SUCCESS_PATH}?${params.toString()}`;
}

/** Drop amount / verified / intent ids from the address bar without remounting. */
export function stripVendorPaymentSuccessQuery(bookingNumber: string): void {
  if (typeof window === "undefined") return;
  const next = vendorPaymentSuccessHref(bookingNumber);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  window.history.replaceState(window.history.state, "", next);
}
