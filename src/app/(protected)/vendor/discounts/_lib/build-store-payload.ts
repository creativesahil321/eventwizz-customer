import type {
  DiscountFormPayload,
  FlatDiscountMode,
} from "./types";
import type { DiscountFormValues } from "./schema";

/** Normalize API / legacy flat_mode into store contract values */
export function normalizeFlatMode(
  mode: string | null | undefined
): FlatDiscountMode | null {
  if (!mode) return null;
  if (mode === "per_person" || mode === "flat_per_person") return "per_person";
  if (
    mode === "total" ||
    mode === "on_total" ||
    mode === "flat_on_total"
  ) {
    return "total";
  }
  return null;
}

/**
 * Map wizard form values → POST /vendor/discounts/store body.
 * Location is sent via header `x-venue-location-id` (axios interceptor).
 */
export function buildDiscountStorePayload(
  data: DiscountFormValues
): DiscountFormPayload {
  const isCoupon = data.category === "coupon_code";
  const name =
    data.name?.trim() ||
    (isCoupon ? data.coupon_code?.trim() || null : null);

  const eventId = Number(data.event_id) || 0;
  const roomId = Number(data.room_id) || 0;
  const dateId = Number(data.date_id) || 0;

  const payload: DiscountFormPayload = {
    category: isCoupon ? "coupon_code" : "discount",
    vendor_event_id: eventId,
    discount_type: data.value_type,
    amount: Number(data.discount_value),
    name,
    valid_from: data.valid_from?.trim() ? data.valid_from : null,
    expires_at: data.expires_at,
    status: data.status,
  };

  if (!isCoupon) {
    if (dateId > 0) payload.date_id = dateId;
    if (roomId > 0) payload.room_id = roomId;
  }

  if (data.value_type === "flat" && data.flat_mode) {
    payload.flat_mode = data.flat_mode;
    if (data.flat_mode === "per_person") {
      payload.min_people = Number(data.min_people);
    }
  }

  if (isCoupon) {
    payload.coupon_code = data.coupon_code?.trim() ?? "";
    payload.customer_audience = data.customer_audience;
    if (data.customer_audience === "selected") {
      payload.customer_ids = data.customer_ids ?? [];
    }
  }

  return payload;
}
