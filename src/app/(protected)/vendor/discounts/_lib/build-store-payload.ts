import type {
  Discount,
  DiscountDateEntry,
  DiscountDatePayload,
  DiscountFormPayload,
  FlatDiscountMode,
} from "./types";
import {
  defaultDiscountDateEntry,
  isDiscountDateOfferBlank,
  type DiscountDateFormEntry,
  type DiscountFormValues,
} from "./schema";
import { COUPON_STRIP_DEFAULT_HEADING } from "@/lib/coupon-strip-props";

/** Normalize API / legacy flat_mode into store contract values */
export function normalizeFlatMode(
  mode: string | null | undefined,
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

function mapDateEntryToPayload(entry: DiscountDateFormEntry): DiscountDatePayload {
  const payload: DiscountDatePayload = {
    date_id: Number(entry.date_id) || 0,
    discount_type: entry.value_type,
    amount: Number(entry.discount_value),
    valid_from: entry.valid_from?.trim() ? entry.valid_from : null,
    expires_at: entry.expires_at,
    show_on_banner: entry.show_on_banner !== false,
    is_live: entry.is_live !== false,
  };

  const roomId = Number(entry.room_id) || 0;
  if (roomId > 0) payload.room_id = roomId;

  if (entry.value_type === "flat" && entry.flat_mode) {
    payload.flat_mode = entry.flat_mode;
    if (entry.flat_mode === "per_person") {
      payload.min_people = Number(entry.min_people);
    }
  }

  return payload;
}

function resolveDateIsLive(
  entry: DiscountDateEntry,
  fallbackLive: boolean,
): boolean {
  if (entry.is_live != null) return entry.is_live !== false;
  if (entry.status != null) {
    const s = String(entry.status).toLowerCase();
    if (s === "inactive" || s === "paused" || s === "expired") return false;
    if (s === "active") return true;
  }
  return fallbackLive;
}

function apiDateToFormEntry(
  entry: DiscountDateEntry,
  fallbackShowOnBanner = true,
  fallbackLive = true,
): DiscountDateFormEntry {
  const flatMode = normalizeFlatMode(entry.flat_mode);
  return {
    date_id: entry.date_id ?? 0,
    event_date: entry.date ?? "",
    room_id: entry.room_id ?? entry.room?.id ?? 0,
    value_type: entry.discount_type === "flat" ? "flat" : "percentage",
    discount_value: Number(entry.amount) || 0,
    flat_mode: flatMode,
    min_people: entry.min_people ?? null,
    valid_from: entry.valid_from ?? "",
    original_valid_from: entry.valid_from ?? "",
    expires_at: entry.expires_at ?? "",
    show_on_banner:
      entry.show_on_banner != null
        ? entry.show_on_banner !== false
        : fallbackShowOnBanner,
    is_live: resolveDateIsLive(entry, fallbackLive),
  };
}

/** Map API discount → form values (supports `dates[]` or legacy single date). */
export function discountToFormValues(discount: Discount): DiscountFormValues {
  const audience =
    discount.customer_audience === "selected" ? "selected" : "all_active";
  const isCoupon = discount.category === "coupon_code";

  const legacyShowOnBanner = discount.show_on_banner !== false;
  const legacyLive = discount.status !== "inactive" && discount.status !== "expired";

  let dates: DiscountDateFormEntry[] = [];
  if (!isCoupon) {
    if (Array.isArray(discount.dates) && discount.dates.length > 0) {
      dates = discount.dates.map((d) =>
        apiDateToFormEntry(d, legacyShowOnBanner, legacyLive),
      );
    } else if (discount.date_id) {
      dates = [
        {
          ...defaultDiscountDateEntry(),
          date_id: discount.date_id,
          event_date: discount.date ?? "",
          room_id: discount.room_id ?? discount.room?.id ?? 0,
          value_type:
            discount.discount_type === "flat" ? "flat" : "percentage",
          discount_value: Number(discount.amount) || 0,
          flat_mode: normalizeFlatMode(discount.flat_mode),
          min_people: discount.min_people,
          valid_from: discount.valid_from ?? "",
          original_valid_from: discount.valid_from ?? "",
          expires_at: discount.expires_at ?? "",
          show_on_banner: legacyShowOnBanner,
          is_live: legacyLive,
        },
      ];
    }
  }

  return {
    name: discount.name ?? "",
    category: isCoupon ? "coupon_code" : "discount",
    location_id: discount.vendor_location_id || discount.location?.id || 0,
    event_id: discount.vendor_event_id ?? 0,
    dates,
    coupon_code: discount.coupon_code ?? "",
    show_on_banner: discount.show_on_banner !== false,
    banner_heading:
      discount.banner_heading?.trim() || COUPON_STRIP_DEFAULT_HEADING,
    dynamic_text: discount.dynamic_text ?? "",
    customer_audience: audience,
    customer_ids: discount.customers?.map((c) => c.id) ?? [],
    value_type: discount.discount_type === "flat" ? "flat" : "percentage",
    discount_value: Number(discount.amount) || 0,
    flat_mode: normalizeFlatMode(discount.flat_mode),
    min_people: discount.min_people,
    valid_from: discount.valid_from ?? "",
    original_valid_from: discount.valid_from ?? "",
    expires_at: discount.expires_at ?? "",
    status: discount.status === "expired" ? "inactive" : discount.status,
  };
}

/**
 * Map wizard form values → POST /vendor/discounts/store body.
 * Location is sent via header `x-venue-location-id` (axios interceptor).
 */
export function buildDiscountStorePayload(
  data: DiscountFormValues,
): DiscountFormPayload {
  const isCoupon = data.category === "coupon_code";
  const name =
    data.name?.trim() ||
    (isCoupon ? data.coupon_code?.trim() || null : null);

  const eventId = Number(data.event_id) || 0;

  if (!isCoupon) {
    const dateRows = (data.dates ?? [])
      .filter((entry) => !isDiscountDateOfferBlank(entry))
      .map(mapDateEntryToPayload);
    return {
      category: "discount",
      vendor_event_id: eventId,
      name,
      // Live if any date is immediately live (legacy top-level flag).
      status: dateRows.some((d) => d.is_live !== false)
        ? "active"
        : "inactive",
      // True if any date shows a public badge (legacy top-level flag).
      show_on_banner: dateRows.some((d) => d.show_on_banner !== false),
      dates: dateRows,
    };
  }

  const payload: DiscountFormPayload = {
    category: "coupon_code",
    vendor_event_id: eventId,
    discount_type: data.value_type,
    amount: Number(data.discount_value),
    name,
    valid_from: data.valid_from?.trim() ? data.valid_from : null,
    expires_at: data.expires_at,
    status: data.status,
    coupon_code: data.coupon_code?.trim() ?? "",
    show_on_banner: data.show_on_banner !== false,
    banner_heading: data.banner_heading?.trim() || null,
    dynamic_text: data.dynamic_text?.trim() || null,
    customer_audience: data.customer_audience,
  };

  if (data.value_type === "flat" && data.flat_mode) {
    payload.flat_mode = data.flat_mode;
    if (data.flat_mode === "per_person") {
      payload.min_people = Number(data.min_people);
    }
  }

  if (data.customer_audience === "selected") {
    payload.customer_ids = data.customer_ids ?? [];
  }

  return payload;
}
