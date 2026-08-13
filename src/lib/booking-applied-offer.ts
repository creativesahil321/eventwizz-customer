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

/**
 * Temporary preview until list/detail booking APIs return discount pricing.
 * Flip to `false` once backend ships the keys documented on
 * {@link BookingDiscountPricingSource}.
 */
export const BOOKING_DISCOUNT_UI_USE_DUMMY = true;

/**
 * Preferred API keys for discounted booking totals (list + detail).
 *
 * - `total` / `total_amount` — final amount after discount (what customer pays)
 * - `original_total` | `original_amount` | `subtotal_before_discount` |
 *   `total_before_discount` — pre-discount amount (strikethrough in UI)
 * - `discount_amount` — absolute savings
 * - offer fields — see {@link BookingAppliedOfferSource} /
 *   `coupon_code`, `value_label`, `discount`, `offers`, etc.
 */
export type BookingDiscountPricingSource = BookingOfferContainer & {
  total?: number | string | null;
  total_amount?: number | string | null;
  original_total?: number | string | null;
  original_amount?: number | string | null;
  subtotal_before_discount?: number | string | null;
  total_before_discount?: number | string | null;
  sub_total_amount?: number | string | null;
};

export type BookingDiscountPricing = {
  /** Final payable / displayed total after discount. */
  total: number;
  /** Pre-discount total when known (or dummy). */
  originalTotal: number | null;
  discountAmount: number | null;
  hasDiscount: boolean;
  /** True when values were invented for UI preview. */
  isDummy: boolean;
  offers: ResolvedBookingAppliedOffer[];
};

function parseMoneyAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function buildDummyOffers(discountAmount: number): ResolvedBookingAppliedOffer[] {
  return [
    {
      kind: "coupon",
      code: "SAVE10",
      label: "10% OFF",
      amount: discountAmount,
    },
  ];
}

/**
 * Resolve final vs original totals + applied offers for My Bookings UI.
 * When the API omits discount keys and `useDummyFallback` is on, invents
 * a 10% coupon preview so design/backend can see the layout.
 */
export function resolveBookingDiscountPricing(
  source: BookingDiscountPricingSource | null | undefined,
  options?: { useDummyFallback?: boolean },
): BookingDiscountPricing {
  const useDummyFallback =
    options?.useDummyFallback ?? BOOKING_DISCOUNT_UI_USE_DUMMY;

  const total =
    parseMoneyAmount(source?.total) ??
    parseMoneyAmount(source?.total_amount) ??
    0;

  const originalFromApi =
    parseMoneyAmount(source?.original_total) ??
    parseMoneyAmount(source?.original_amount) ??
    parseMoneyAmount(source?.subtotal_before_discount) ??
    parseMoneyAmount(source?.total_before_discount) ??
    null;

  // Prefer an explicit pre-discount subtotal when it is higher than total.
  const subTotal = parseMoneyAmount(source?.sub_total_amount);
  const originalTotalCandidate =
    originalFromApi ??
    (subTotal != null && subTotal > total + 0.009 ? subTotal : null);

  const discountFromApi =
    parseOfferAmount(source?.discount_amount) ??
    (originalTotalCandidate != null
      ? Math.max(0, originalTotalCandidate - total)
      : null);

  let offers = resolveBookingAppliedOffers(source);
  let originalTotal = originalTotalCandidate;
  let discountAmount =
    discountFromApi && discountFromApi > 0 ? discountFromApi : null;

  if (originalTotal == null && discountAmount != null && total > 0) {
    originalTotal = total + discountAmount;
  }

  let hasDiscount =
    (originalTotal != null && originalTotal > total + 0.009) ||
    discountAmount != null ||
    offers.length > 0;

  let isDummy = false;

  if (!hasDiscount && useDummyFallback && total > 0) {
    isDummy = true;
    discountAmount = Math.max(1, Math.round(total * 0.1 * 100) / 100);
    originalTotal = Math.round((total + discountAmount) * 100) / 100;
    offers = buildDummyOffers(discountAmount);
    hasDiscount = true;
  } else if (hasDiscount && offers.length === 0 && discountAmount != null) {
    // Ensure payment rows have something to render when only amounts exist.
    offers = [
      {
        kind: "discount",
        code: null,
        label: "Discount applied",
        amount: discountAmount,
      },
    ];
  }

  return {
    total,
    originalTotal: hasDiscount ? originalTotal : null,
    discountAmount: hasDiscount ? discountAmount : null,
    hasDiscount,
    isDummy,
    offers,
  };
}

export type DateDiscountAllocation = {
  /** Final date total (after discount). */
  total: number;
  /** Pre-discount date total for strikethrough UI. */
  originalTotal: number | null;
  discountAmount: number | null;
  offers: ResolvedBookingAppliedOffer[];
  /** True when original came from booking-level split, not date keys. */
  fromBookingLevel: boolean;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resolve per-date discounted totals for multi-date bookings.
 *
 * Priority:
 * 1. Date-level keys (`original_total`, `discount_amount`, `discount`, …)
 * 2. Else split a booking-level discount across dates by share of date totals
 *    (so multi-date cards / breakdown headers can show strikethrough too)
 */
export function resolveDateDiscountAllocations(
  dateSources: BookingDiscountPricingSource[],
  bookingPricing: BookingDiscountPricing,
): DateDiscountAllocation[] {
  const datePricings = dateSources.map((source) =>
    resolveBookingDiscountPricing(source, { useDummyFallback: false }),
  );

  const anyDateLevel = datePricings.some((pricing) => pricing.hasDiscount);

  if (anyDateLevel) {
    return datePricings.map((pricing) => ({
      total: pricing.total,
      originalTotal: pricing.hasDiscount ? pricing.originalTotal : null,
      discountAmount: pricing.hasDiscount ? pricing.discountAmount : null,
      offers: pricing.offers,
      fromBookingLevel: false,
    }));
  }

  const bookingTotal = bookingPricing.total;
  const bookingOriginal = bookingPricing.originalTotal;
  if (
    !bookingPricing.hasDiscount ||
    bookingOriginal == null ||
    bookingTotal <= 0
  ) {
    return datePricings.map((pricing) => ({
      total: pricing.total,
      originalTotal: null,
      discountAmount: null,
      offers: [],
      fromBookingLevel: false,
    }));
  }

  const scale = bookingOriginal / bookingTotal;
  const bookingDiscount = bookingPricing.discountAmount ?? bookingOriginal - bookingTotal;
  const dateTotals = datePricings.map((pricing) => pricing.total);
  const datesSum = dateTotals.reduce((sum, value) => sum + value, 0);
  const weightBase = datesSum > 0 ? datesSum : bookingTotal;

  let allocatedOriginal = 0;
  let allocatedDiscount = 0;

  return datePricings.map((pricing, index) => {
    const isLast = index === datePricings.length - 1;
    const weight = pricing.total / weightBase;

    const originalTotal = isLast
      ? roundMoney(bookingOriginal - allocatedOriginal)
      : roundMoney(pricing.total * scale);
    const discountAmount = isLast
      ? roundMoney(bookingDiscount - allocatedDiscount)
      : roundMoney(bookingDiscount * weight);

    if (!isLast) {
      allocatedOriginal += originalTotal;
      allocatedDiscount += discountAmount;
    }

    return {
      total: pricing.total,
      originalTotal:
        originalTotal > pricing.total + 0.009 ? originalTotal : null,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      offers: [],
      fromBookingLevel: true,
    };
  });
}
