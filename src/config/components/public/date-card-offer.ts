/**
 * Optional per-date public offer shown on Select-a-Date cards.
 * Mapped from domain event API `dates[].discount` / `rooms.*.dates[].discount`.
 */
export type DateCardOffer = {
  /** When false, offer applies at checkout only — card shows list price. */
  show_on_page?: boolean;
  value_type: "percentage" | "flat";
  discount_value: number;
  flat_mode?: "total" | "per_person" | null;
};

/** Raw per-date discount from GET /domain/{domain}/events/{slug}. */
export type PublicEventDateDiscount = {
  id?: number;
  discount_id?: number;
  discount_type?: "percentage" | "flat" | string | null;
  flat_mode?: "total" | "per_person" | string | null;
  amount?: number | null;
  /** Required guest count for `flat_mode: "per_person"` offers. */
  min_people?: number | null;
  value_label?: string | null;
  show_on_event_page?: boolean | null;
  expires_at?: string | null;
};

export type DateWithOptionalOffer = {
  event_date: string;
  price: number | null;
  sold_out?: boolean;
  /** Remaining bookable inventory — omitted when sold out / empty. */
  booking_option?: "tickets" | "tables" | "both";
  offer?: DateCardOffer | null;
  /** API field — mapped to `offer` for the date cards. */
  discount?: PublicEventDateDiscount | null;
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

/** Map API `discount` → date-card `offer`. */
export function mapApiDiscountToDateCardOffer(
  discount: PublicEventDateDiscount | null | undefined,
): DateCardOffer | null {
  if (!discount) return null;
  const type = discount.discount_type;
  if (type !== "percentage" && type !== "flat") return null;
  const amount = Number(discount.amount);
  if (!Number.isFinite(amount) || !(amount > 0)) return null;

  // Flat off total removed — only percentage and flat per person show on cards.
  if (type === "flat" && discount.flat_mode !== "per_person") {
    return null;
  }

  return {
    show_on_page: discount.show_on_event_page !== false,
    value_type: type,
    discount_value: amount,
    flat_mode: type === "flat" ? "per_person" : null,
  };
}

/** Attach `offer` from API `discount` (keeps an existing `offer` if already set). */
export function withDateCardOffersFromApi<T extends DateWithOptionalOffer>(
  dates: T[] | null | undefined,
): T[] | undefined {
  if (!dates) return undefined;
  return dates.map((date) => ({
    ...date,
    offer: date.offer ?? mapApiDiscountToDateCardOffer(date.discount),
  }));
}

/** Placeholder list price used in the vendor discount wizard preview. */
export const DISCOUNT_WIZARD_PREVIEW_BASE_PRICE = 50;
