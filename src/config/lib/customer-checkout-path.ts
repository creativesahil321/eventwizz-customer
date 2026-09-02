/** Customer-facing checkout path (not staff /vendor UI). */
export const CUSTOMER_CHECKOUT_PATH = "/checkout";

/** Legacy alias kept for bookmarks, emails, and in-flight callbacks. */
export const LEGACY_VENDOR_CHECKOUT_PATH = "/vendor/checkout";

export function isCustomerCheckoutPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === CUSTOMER_CHECKOUT_PATH ||
    pathname.startsWith(`${CUSTOMER_CHECKOUT_PATH}?`) ||
    pathname === LEGACY_VENDOR_CHECKOUT_PATH ||
    pathname.startsWith(`${LEGACY_VENDOR_CHECKOUT_PATH}?`) ||
    pathname.startsWith(`${CUSTOMER_CHECKOUT_PATH}/`) ||
    pathname.startsWith(`${LEGACY_VENDOR_CHECKOUT_PATH}/`)
  );
}
