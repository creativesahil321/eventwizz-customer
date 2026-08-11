/** DOM id for a checkout date accordion (safe for room composite keys). */
export function checkoutDateDomId(dateKey: string): string {
  return `checkout-date-${dateKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

const FOCUS_EVENT = "checkout:focus-date";

export type CheckoutFocusDateDetail = {
  dateKey: string;
};

/** Ask CartManager to expand + scroll to a date (Offers panel click). */
export function focusCheckoutDate(dateKey: string): void {
  if (typeof window === "undefined" || !dateKey) return;
  window.dispatchEvent(
    new CustomEvent<CheckoutFocusDateDetail>(FOCUS_EVENT, {
      detail: { dateKey },
    }),
  );
}

export function subscribeCheckoutDateFocus(
  handler: (dateKey: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<CheckoutFocusDateDetail>).detail;
    const dateKey = detail?.dateKey?.trim();
    if (dateKey) handler(dateKey);
  };

  window.addEventListener(FOCUS_EVENT, listener);
  return () => window.removeEventListener(FOCUS_EVENT, listener);
}
