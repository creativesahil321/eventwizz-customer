/**
 * Normalize coupon / date-discount fields from customer booking APIs
 * into a small read-only view model for My Bookings.
 */

export type BookingAppliedOfferSource = {
  coupon_code?: string | null;
  discount_code?: string | null;
  value_label?: string | null;
  discount_label?: string | null;
  label?: string | null;
  discount_amount?: number | string | null;
  amount?: number | string | null;
  discount_type?: string | null;
  kind?: string | null;
  category?: string | null;
};

export type ResolvedBookingAppliedOffer = {
  /** Coupon code when present (e.g. XZCEG). */
  code: string | null;
  /** Human label (e.g. 21% OFF / £10.00 OFF). */
  label: string | null;
  /** Absolute savings when the API provides it. */
  amount: number | null;
  kind: "coupon" | "discount";
};

function parseOfferAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.abs(n);
}

function normalizeOneOffer(
  source: BookingAppliedOfferSource | null | undefined,
): ResolvedBookingAppliedOffer | null {
  if (!source || typeof source !== "object") return null;

  const code =
    source.coupon_code?.trim().toUpperCase() ||
    source.discount_code?.trim().toUpperCase() ||
    null;
  const label =
    source.value_label?.trim() ||
    source.discount_label?.trim() ||
    source.label?.trim() ||
    null;
  const amount =
    parseOfferAmount(source.discount_amount) ?? parseOfferAmount(source.amount);

  if (!code && !label && amount == null) return null;

  const rawKind = (
    source.kind ||
    source.category ||
    source.discount_type ||
    ""
  )
    .toString()
    .toLowerCase();
  const kind: "coupon" | "discount" =
    code || rawKind.includes("coupon") ? "coupon" : "discount";

  return { code, label, amount, kind };
}

type BookingOfferContainer = {
  coupon_code?: string | null;
  discount_code?: string | null;
  value_label?: string | null;
  discount_label?: string | null;
  discount_amount?: number | string | null;
  discount?: BookingAppliedOfferSource | null;
  applied_offer?: BookingAppliedOfferSource | null;
  coupon?: BookingAppliedOfferSource | null;
  offers?: BookingAppliedOfferSource[] | null;
  applied_offers?: BookingAppliedOfferSource[] | null;
};

/**
 * Collect applied offers from a booking list item, detail payload,
 * or payment_summary object. Safe when the API omits discount fields.
 */
export function resolveBookingAppliedOffers(
  source: BookingOfferContainer | null | undefined,
): ResolvedBookingAppliedOffer[] {
  if (!source) return [];

  const collected: ResolvedBookingAppliedOffer[] = [];
  const seen = new Set<string>();

  const push = (offer: ResolvedBookingAppliedOffer | null) => {
    if (!offer) return;
    const key = `${offer.kind}|${offer.code ?? ""}|${offer.label ?? ""}|${offer.amount ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(offer);
  };

  push(normalizeOneOffer(source.discount));
  push(normalizeOneOffer(source.applied_offer));
  push(normalizeOneOffer(source.coupon));

  const list = source.offers ?? source.applied_offers;
  if (Array.isArray(list)) {
    for (const row of list) push(normalizeOneOffer(row));
  }

  // Flat fields on the booking / payment_summary root
  push(
    normalizeOneOffer({
      coupon_code: source.coupon_code,
      discount_code: source.discount_code,
      value_label: source.value_label,
      discount_label: source.discount_label,
      discount_amount: source.discount_amount,
      kind: source.coupon_code ? "coupon" : "discount",
    }),
  );

  return collected;
}

export function hasBookingAppliedOffers(
  source: BookingOfferContainer | null | undefined,
): boolean {
  return resolveBookingAppliedOffers(source).length > 0;
}
