/**
 * Optional per-date public offer shown on Select-a-Date cards.
 * Until the event API returns real discounts, callers may attach demo data.
 */
export type DateCardOffer = {
  /** When false, offer applies at checkout only — card shows list price. */
  show_on_page?: boolean;
  value_type: "percentage" | "flat";
  discount_value: number;
  flat_mode?: "total" | "per_person" | null;
};

export type DateWithOptionalOffer = {
  event_date: string;
  price: number;
  sold_out?: boolean;
  offer?: DateCardOffer | null;
};

/** Compact badge, e.g. `20% OFF` / `£10 OFF`. */
export function formatDateCardOfferBadge(offer: DateCardOffer): string {
  if (!(offer.discount_value > 0)) return "";
  if (offer.value_type === "percentage") {
    return `${offer.discount_value}% OFF`;
  }
  const amount = Number.isInteger(offer.discount_value)
    ? String(offer.discount_value)
    : offer.discount_value.toFixed(2);
  if (offer.flat_mode === "per_person") {
    return `£${amount} / PERSON`;
  }
  return `£${amount} OFF`;
}

export function isDateCardOfferVisible(
  offer: DateCardOffer | null | undefined,
): offer is DateCardOffer {
  return (
    offer != null &&
    offer.show_on_page !== false &&
    offer.discount_value > 0
  );
}

/**
 * Demo offers for customer-facing date cards until API wiring lands.
 * First bookable date gets 20% off; second gets a flat £10 off when priced.
 */
export function attachDemoDateOffers<T extends DateWithOptionalOffer>(
  dates: T[],
): T[] {
  let bookableIndex = 0;
  return dates.map((date) => {
    if (date.sold_out || !(date.price > 0) || date.offer) return date;
    const slot = bookableIndex;
    bookableIndex += 1;
    if (slot === 0) {
      return {
        ...date,
        offer: {
          show_on_page: true,
          value_type: "percentage",
          discount_value: 20,
        },
      };
    }
    if (slot === 1 && date.price > 10) {
      return {
        ...date,
        offer: {
          show_on_page: true,
          value_type: "flat",
          discount_value: 10,
          flat_mode: "total",
        },
      };
    }
    return date;
  });
}

/** Placeholder list price used in the vendor discount wizard preview. */
export const DISCOUNT_WIZARD_PREVIEW_BASE_PRICE = 50;
