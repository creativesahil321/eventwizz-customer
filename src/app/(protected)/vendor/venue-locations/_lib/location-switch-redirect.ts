/**
 * Vendor detail routes that are bound to a specific venue record.
 * After switching location, leave these pages so the UI cannot keep showing
 * another venue's event / discount / booking.
 */
export function getLocationSwitchRedirectPath(pathname: string): string | null {
  if (!pathname.startsWith("/vendor/")) return null;

  // /vendor/events/123 or /vendor/events/123/overview
  if (/^\/vendor\/events\/\d+(\/|$)/.test(pathname)) {
    return "/vendor/events";
  }

  // /vendor/discounts/123/edit
  if (/^\/vendor\/discounts\/\d+(\/|$)/.test(pathname)) {
    return "/vendor/discounts";
  }

  // /vendor/booking-history/123
  if (/^\/vendor\/booking-history\/\d+(\/|$)/.test(pathname)) {
    return "/vendor/booking-history";
  }

  // /vendor/menu-choices/[bookingId]
  if (/^\/vendor\/menu-choices\/[^/]+(\/|$)/.test(pathname)) {
    return "/vendor/menu-choices";
  }

  return null;
}
