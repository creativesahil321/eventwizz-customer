import { COUPON_STRIP_DEFAULT_HEADING } from "@/lib/coupon-strip-props";
import type {
  Discount,
  DiscountDateEntry,
  DiscountFormPayload,
  DiscountOfferPayload,
  FlatDiscountMode,
} from "./types";
import {
  defaultDiscountDateEntry,
  isDiscountDateOfferBlank,
  type DiscountDateFormEntry,
  type DiscountFormValues,
} from "./schema";

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

function toOfferStatus(isLive: boolean | undefined): "active" | "inactive" {
  return isLive === false ? "inactive" : "active";
}

function mapDateEntryToOffer(entry: DiscountDateFormEntry): DiscountOfferPayload {
  const payload: DiscountOfferPayload = {
    date_id: Number(entry.date_id) || 0,
    discount_type: entry.value_type,
    amount: Number(entry.discount_value),
    valid_from: entry.valid_from?.trim() ? entry.valid_from : null,
    expires_at: entry.expires_at,
    show_on_event_page: entry.show_on_banner !== false,
    status: toOfferStatus(entry.is_live),
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

function offerShowOnEventPage(
  entry: DiscountDateEntry,
  fallback = true,
): boolean {
  if (typeof entry.show_on_event_page === "boolean") {
    return entry.show_on_event_page;
  }
  if (typeof entry.show_on_banner === "boolean") {
    return entry.show_on_banner;
  }
  return fallback;
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
  if (entry.stored_status != null) {
    const s = String(entry.stored_status).toLowerCase();
    if (s === "inactive" || s === "paused" || s === "expired") return false;
    if (s === "active") return true;
  }
  return fallbackLive;
}

function apiOfferToFormEntry(
  entry: DiscountDateEntry,
  fallbackShowOnEventPage = true,
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
    show_on_banner: offerShowOnEventPage(entry, fallbackShowOnEventPage),
    is_live: resolveDateIsLive(entry, fallbackLive),
  };
}

function discountOfferRows(discount: Discount): DiscountDateEntry[] {
  if (Array.isArray(discount.offers) && discount.offers.length > 0) {
    return discount.offers;
  }
  if (Array.isArray(discount.dates) && discount.dates.length > 0) {
    return discount.dates;
  }
  return [];
}

function couponShowOnEventPage(discount: Discount): boolean {
  if (typeof discount.show_on_event_page === "boolean") {
    return discount.show_on_event_page;
  }
  if (typeof discount.show_on_banner === "boolean") {
    return discount.show_on_banner;
  }
  return true;
}

function couponBannerSubheading(discount: Discount): string {
  return discount.banner_subheading ?? discount.dynamic_text ?? "";
}

/** Map API discount → form values (supports `offers[]`, legacy `dates[]`, or single date). */
export function discountToFormValues(discount: Discount): DiscountFormValues {
  const audience =
    discount.customer_audience === "selected" ? "selected" : "all_active";
  const isCoupon = discount.category === "coupon_code";

  const legacyLive =
    discount.status !== "inactive" && discount.status !== "expired";
  const legacyShowOnEventPage = couponShowOnEventPage(discount);

  let dates: DiscountDateFormEntry[] = [];
  if (!isCoupon) {
    const offerRows = discountOfferRows(discount);
    if (offerRows.length > 0) {
      dates = offerRows.map((d) =>
        apiOfferToFormEntry(d, legacyShowOnEventPage, legacyLive),
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
          show_on_banner: legacyShowOnEventPage,
          is_live: legacyLive,
        },
      ];
    }
  }

  const flatMode = normalizeFlatMode(discount.flat_mode);
  // Coupons only support percentage or flat off total.
  const couponFlatMode =
    isCoupon && flatMode === "per_person" ? "total" : flatMode;

  return {
    name: discount.name ?? "",
    category: isCoupon ? "coupon_code" : "discount",
    location_id: discount.vendor_location_id || discount.location?.id || 0,
    event_id: discount.vendor_event_id ?? 0,
    dates,
    coupon_code: discount.coupon_code ?? "",
    show_on_banner: legacyShowOnEventPage,
    banner_heading:
      discount.banner_heading?.trim() || COUPON_STRIP_DEFAULT_HEADING,
    dynamic_text: couponBannerSubheading(discount),
    customer_audience: audience,
    customer_ids: discount.customers?.map((c) => c.id) ?? [],
    value_type: discount.discount_type === "flat" ? "flat" : "percentage",
    discount_value: Number(discount.amount) || 0,
    flat_mode: couponFlatMode,
    min_people: isCoupon ? null : discount.min_people,
    valid_from: discount.valid_from ?? "",
    original_valid_from: discount.valid_from ?? "",
    expires_at: discount.expires_at ?? "",
    status: discount.status === "expired" ? "inactive" : discount.status,
  };
}

/**
 * Map wizard form values → POST /vendor/discounts/store|update body.
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
    const offers = (data.dates ?? [])
      .filter((entry) => !isDiscountDateOfferBlank(entry))
      .map(mapDateEntryToOffer);

    return {
      category: "discount",
      vendor_event_id: eventId,
      name,
      offers,
    };
  }

  const showOnEventPage = data.show_on_banner !== false;

  const payload: DiscountFormPayload = {
    category: "coupon_code",
    vendor_event_id: eventId,
    discount_type: data.value_type,
    amount: Number(data.discount_value),
    name,
    valid_from: data.valid_from?.trim() ? data.valid_from : null,
    expires_at: data.expires_at?.trim() ? data.expires_at : null,
    status: data.status,
    coupon_code: data.coupon_code?.trim() ?? "",
    customer_audience: data.customer_audience,
    show_on_event_page: showOnEventPage,
    show_on_checkout: true,
    banner_heading: showOnEventPage
      ? data.banner_heading?.trim() || null
      : null,
    banner_subheading: showOnEventPage
      ? data.dynamic_text?.trim() || null
      : null,
  };

  if (data.value_type === "flat") {
    // Coupons: flat off total only (ignore legacy per_person).
    payload.flat_mode =
      data.flat_mode === "per_person" ? "total" : data.flat_mode ?? "total";
  }

  if (data.customer_audience === "selected") {
    payload.customer_ids = data.customer_ids ?? [];
  }

  return payload;
}
