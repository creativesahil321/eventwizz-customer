import type { Discount, FlatDiscountMode } from "../_lib/types";
import {
  DISCOUNT_CATEGORY_LABELS,
  FLAT_MODE_LABELS,
} from "../_lib/types";
import { normalizeFlatMode } from "../_lib/build-store-payload";

export function formatDiscountValue(discount: Discount): string {
  if (discount.value_label?.trim()) return discount.value_label;

  if (discount.discount_type === "percentage") {
    return `${discount.amount}% off`;
  }
  const amount = `£${discount.amount}`;
  const mode = normalizeFlatMode(discount.flat_mode);
  if (mode === "per_person") {
    return `${amount} / person (min ${discount.min_people ?? 0})`;
  }
  return `${amount} off total`;
}

export function formatDiscountScope(discount: Discount): string {
  if (discount.summary?.trim()) {
    const location = discount.location?.name;
    const event = discount.event?.name;
    if (location && event) {
      let base = `${location} · ${event}`;
      if (discount.date) {
        base = `${base} · ${discount.date}`;
      }
      if (discount.room?.name) {
        base = `${base} · ${discount.room.name}`;
      }
      if (discount.category === "coupon_code" && discount.coupon_code) {
        return `${base} · Code: ${discount.coupon_code}`;
      }
      return base;
    }
    return discount.summary;
  }

  const location = discount.location?.name ?? "—";
  const event = discount.event?.name ?? "—";
  let base = `${location} · ${event}`;
  if (discount.date) {
    base = `${base} · ${discount.date}`;
  }
  if (discount.room?.name) {
    base = `${base} · ${discount.room.name}`;
  }
  if (discount.category === "coupon_code" && discount.coupon_code) {
    return `${base} · Code: ${discount.coupon_code}`;
  }
  return base;
}

export function formatDiscountCategoryLabel(discount: Discount): string {
  return DISCOUNT_CATEGORY_LABELS[discount.category];
}

export function formatFlatModeLabel(
  mode: Discount["flat_mode"]
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
