/**
 * Remembers which venue location the customer is checking out with, so the
 * payment result pages (success / failed / cancelled — reached after the
 * gateway redirect, whose receipt has no location slug) can show that
 * location's own contact details, like the event page footer does.
 *
 * sessionStorage: survives the same-tab round trip to Stripe / PayPal and
 * never leaks into another tab's booking. Storage can be unavailable (private
 * mode, blocked site data) — callers then fall back to venue-wide contact.
 */
const CHECKOUT_LOCATION_KEY = "eventwizz:checkout-location-slug";

export function rememberCheckoutLocation(slug: string | null | undefined): void {
  const value = slug?.trim();
  if (!value || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHECKOUT_LOCATION_KEY, value);
  } catch {
    // Storage blocked — payment pages use venue-wide contact instead.
  }
}

export function recallCheckoutLocation(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(CHECKOUT_LOCATION_KEY);
  } catch {
    return null;
  }
}
