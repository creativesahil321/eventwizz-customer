import type {
  DiscountFormPayload,
  FlatDiscountMode,
} from "./types";
import type { DiscountFormValues } from "./schema";
import { parseRoomKey } from "./room-key";

/** Normalize API / legacy flat_mode into store contract values */
export function normalizeFlatMode(
  mode: string | null | undefined
): FlatDiscountMode | null {
  if (!mode) return null;
  if (mode === "per_person" || mode === "flat_per_person") return "per_person";
  if (
    mode === "on_total" ||
    mode === "flat_on_total" ||
    mode === "total"
  ) {
    return "on_total";
  }
  return null;
}

/**
 * Map wizard form values → POST /vendor/discounts/store body
 */
export function buildDiscountStorePayload(
  data: DiscountFormValues
): DiscountFormPayload {
  const name =
    data.name?.trim() ||
    (data.category === "coupon_code"
      ? data.coupon_code?.trim() || null
      : null);

  const payload: DiscountFormPayload = {
    category: data.category,
    vendor_location_ids: (data.location_ids ?? []).map(Number),
    vendor_event_ids: (data.event_ids ?? []).map(Number),
    discount_type: data.value_type,
    amount: Number(data.discount_value),
    name,
    valid_from: data.valid_from?.trim() ? data.valid_from : null,
    expires_at: data.expires_at,
    status: data.status,
  };

  if (data.value_type === "flat" && data.flat_mode) {
    payload.flat_mode = data.flat_mode;
    if (data.flat_mode === "per_person") {
      payload.min_people = Number(data.min_people);
    }
  }

  if (data.category === "date_wise") {
    const roomIds = (data.room_keys ?? [])
      .map((key) => parseRoomKey(key)?.roomId)
      .filter((id): id is number => typeof id === "number");
    payload.room_ids = [...new Set(roomIds)];
    payload.applicable_date_ids = (data.applicable_date_ids ?? []).map(Number);
  }

  if (data.category === "coupon_code") {
    payload.coupon_code = data.coupon_code?.trim() ?? "";
    payload.customer_audience = data.customer_audience;
    if (data.customer_audience === "selected") {
      payload.customer_ids = data.customer_ids ?? [];
    }
  }

  return payload;
}
