import type { Discount } from "../_lib/types";
import {
  DISCOUNT_CATEGORY_LABELS,
  FLAT_MODE_LABELS,
} from "../_lib/types";

export function formatDiscountValue(discount: Discount): string {
  if (discount.value_type === "percentage") {
    return `${discount.discount_value}% off`;
  }
  const amount = `£${discount.discount_value}`;
  if (discount.flat_mode === "flat_per_person") {
    return `${amount} / person (min ${discount.min_people ?? 0})`;
  }
  return `${amount} off total`;
}

export function formatDiscountScope(discount: Discount): string {
  const base = `${discount.location_name} · ${discount.event_name}`;
  if (discount.category === "date_wise" && discount.room_name) {
    return `${base} · ${discount.room_name}`;
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
  if (!mode) return null;
  return FLAT_MODE_LABELS[mode];
}

export function getDiscountDisplayName(discount: Discount): string {
  if (discount.name?.trim()) return discount.name;
  if (discount.coupon_code) return discount.coupon_code;
  return formatDiscountCategoryLabel(discount);
}
