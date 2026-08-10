import type { Discount, FlatDiscountMode } from "../_lib/types";
import {
  DISCOUNT_CATEGORY_LABELS,
  FLAT_MODE_LABELS,
} from "../_lib/types";
import { normalizeFlatMode } from "../_lib/build-store-payload";
import { formatGuideDate } from "../_lib/schema";

function formatAmountLabel(
  discountType: Discount["discount_type"] | undefined,
  amount: number,
  flatMode: string | null | undefined,
  minPeople?: number | null,
): string {
  if (discountType !== "flat") {
    return `${amount}% off`;
  }
  const mode = normalizeFlatMode(flatMode);
  if (mode === "per_person") {
    return `£${amount} / person${minPeople ? ` (min ${minPeople})` : ""}`;
  }
  return `£${amount} off total`;
}

function discountOfferRows(discount: Discount) {
  if (Array.isArray(discount.offers) && discount.offers.length > 0) {
    return discount.offers;
  }
  if (Array.isArray(discount.dates) && discount.dates.length > 0) {
    return discount.dates;
  }
  return [];
}

export function formatDiscountValue(discount: Discount): string {
  if (discount.value_label?.trim()) return discount.value_label;

  const offers = discountOfferRows(discount);
  if (offers.length > 1) {
    const labels = offers.map((d) =>
      formatAmountLabel(
        d.discount_type,
        d.amount,
        d.flat_mode,
        d.min_people,
      ),
    );
    const unique = Array.from(new Set(labels));
    if (unique.length === 1) return unique[0];
    return `${offers.length} offers · ${unique.slice(0, 2).join(" / ")}${
      unique.length > 2 ? "…" : ""
    }`;
  }

  if (offers.length === 1) {
    const d = offers[0];
    return (
      d.value_label?.trim() ||
      formatAmountLabel(d.discount_type, d.amount, d.flat_mode, d.min_people)
    );
  }

  return formatAmountLabel(
    discount.discount_type,
    discount.amount,
    discount.flat_mode,
    discount.min_people,
  );
}

/**
 * Scope line for the discounts list.
 * Location is omitted — the page is already scoped to the header venue.
 */
export function formatDiscountScope(discount: Discount): string {
  const parts: string[] = [];

  if (discount.event?.name?.trim()) {
    parts.push(discount.event.name.trim());
  }

  const offers = discountOfferRows(discount);
  if (offers.length > 1) {
    parts.push(`${offers.length} dates`);
    const first = offers[0]?.date;
    if (first) {
      parts.push(`from ${formatGuideDate(first)}`);
    }
  } else if (offers.length === 1) {
    const d = offers[0];
    if (d.date) parts.push(formatGuideDate(d.date));
    if (d.room?.name?.trim()) parts.push(d.room.name.trim());
  } else {
    if (discount.date) {
      parts.push(formatGuideDate(discount.date) || discount.date);
    }
    if (discount.room?.name?.trim()) {
      parts.push(discount.room.name.trim());
    }
  }

  if (discount.category === "coupon_code" && discount.coupon_code?.trim()) {
    parts.push(`Code: ${discount.coupon_code.trim()}`);
  }

  return parts.join(" · ");
}

function formatExpiryPart(discount: Discount): string {
  const offers = discountOfferRows(discount);
  if (offers.length > 1) {
    const expiries = offers
      .map((d) => d.expires_at)
      .filter(Boolean)
      .sort();
    if (!expiries.length) return "";
    const last = expiries[expiries.length - 1];
    return `Expires from ${formatGuideDate(expiries[0])}–${formatGuideDate(last)}`;
  }
  if (offers.length === 1 && offers[0].expires_at) {
    return `Expires ${formatGuideDate(offers[0].expires_at)}`;
  }
  if (discount.expires_at) {
    return `Expires ${formatGuideDate(discount.expires_at) || discount.expires_at}`;
  }
  return "";
}

/** Full secondary line under the value (category · scope · expiry). */
export function formatDiscountMetaLine(discount: Discount): string {
  const parts = [
    DISCOUNT_CATEGORY_LABELS[discount.category],
    formatDiscountScope(discount),
    formatExpiryPart(discount),
  ].filter(Boolean);

  return parts.join(" · ");
}

export function formatDiscountCategoryLabel(discount: Discount): string {
  return DISCOUNT_CATEGORY_LABELS[discount.category];
}

export function formatFlatModeLabel(
  mode: Discount["flat_mode"],
): string | null {
  const normalized = normalizeFlatMode(mode);
  if (!normalized) return null;
  return FLAT_MODE_LABELS[normalized as FlatDiscountMode];
}

export function getDiscountDisplayName(discount: Discount): string {
  if (discount.name?.trim()) return discount.name;
  if (discount.coupon_code) return discount.coupon_code;
  return formatDiscountCategoryLabel(discount);
}
