/**
 * Vendor Discounts — types aligned with GET/POST /api/v1/vendor/discounts
 */

/** Create/list API categories. Legacy values may still appear in older rows. */
export type DiscountCategory =
  | "discount"
  | "coupon_code"
  | "event_specific"
  | "date_wise";

export type DiscountType = "percentage" | "flat";

/** Store API: `per_person` | `total` */
export type FlatDiscountMode = "total" | "per_person";

export type DiscountStatus = "active" | "inactive" | "expired";

export type CustomerAudience = "all_active" | "selected";

export interface DiscountRelation {
  id: number;
  name: string;
}

export interface DiscountCustomer {
  id: number;
  full_name: string;
  email: string;
  status: string;
}

/** One offer row inside a multi-date Discount (`offers[]` from API). */
export interface DiscountDateEntry {
  id?: number;
  date_id: number;
  /** Event calendar date `YYYY-MM-DD` (for labels + expiry validation). */
  date?: string | null;
  room_id?: number | null;
  room?: DiscountRelation | null;
  discount_type: DiscountType;
  flat_mode?: FlatDiscountMode | string | null;
  amount: number;
  min_people?: number | null;
  valid_from?: string | null;
  expires_at: string;
  value_label?: string | null;
  /** Show badge on public event date picker. */
  show_on_event_page?: boolean | null;
  /** Legacy alias — form still uses `show_on_banner`; mapped in build-store-payload. */
  show_on_banner?: boolean | null;
  /** Offer live status (`active` | `inactive`). */
  status?: DiscountStatus | string | null;
  stored_status?: DiscountStatus | string | null;
  /** Legacy alias — form still uses `is_live`; mapped to `status` on save. */
  is_live?: boolean | null;
  sort_order?: number | null;
}

export interface Discount {
  id: number;
  category: DiscountCategory;
  name: string | null;
  coupon_code: string | null;
  /** Coupon banner on the public event page. */
  show_on_event_page?: boolean | null;
  /** Coupon usable at checkout. */
  show_on_checkout?: boolean | null;
  /** Legacy alias — form still uses `show_on_banner`; mapped in build-store-payload. */
  show_on_banner?: boolean | null;
  /** Small eyebrow on the coupon strip (e.g. "Limited time offer"). */
  banner_heading?: string | null;
  /** Main promo line on the coupon strip. */
  banner_subheading?: string | null;
  /** Legacy alias — form still uses `dynamic_text`; mapped to `banner_subheading`. */
  dynamic_text?: string | null;
  discount_type: DiscountType;
  flat_mode: FlatDiscountMode | string | null;
  amount: number;
  min_people: number | null;
  customer_audience: CustomerAudience | string | null;
  status: DiscountStatus;
  stored_status: DiscountStatus | string;
  value_label: string;
  summary: string;
  vendor_location_id: number;
  vendor_event_id: number;
  /** Legacy single-date fields — prefer `offers[]` when present. */
  date_id: number | null;
  date: string | null;
  room_id: number | null;
  location: DiscountRelation | null;
  event: DiscountRelation | null;
  room: DiscountRelation | null;
  /** Multi-date Discount offer rows. */
  offers?: DiscountDateEntry[] | null;
  /** Legacy alias — hydrate prefers `offers`, falls back to `dates`. */
  dates?: DiscountDateEntry[] | null;
  customers?: DiscountCustomer[];
  valid_from: string | null;
  expires_at: string | null;
  redemption_count: number;
  emails_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountsQueryParams {
  category?: DiscountCategory | "all";
  status?: DiscountStatus | "all";
  search?: string;
  page?: number | string;
  per_page?: number | string;
  vendor_event_id?: number | string;
}

export interface DiscountsPaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface DiscountsPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path?: string;
  links?: Array<{
    url: string | null;
    label: string;
    page: number | null;
    active: boolean;
  }>;
}

export interface DiscountsPaginatedData {
  data: Discount[];
  links: DiscountsPaginationLinks;
  meta: DiscountsPaginationMeta;
}

export interface DiscountsListResponse {
  status: boolean;
  message: string;
  data: DiscountsPaginatedData;
  errors: unknown[];
}

/** One offer in POST /vendor/discounts/store for category `discount`. */
export interface DiscountOfferPayload {
  date_id: number;
  room_id?: number | null;
  discount_type: DiscountType;
  amount: number;
  flat_mode?: FlatDiscountMode | null;
  min_people?: number | null;
  valid_from?: string | null;
  expires_at: string;
  /** Show offer badge on the public event date picker. */
  show_on_event_page: boolean;
  /** Immediately live at checkout. */
  status: "active" | "inactive";
}

/**
 * POST /vendor/discounts/store
 * Location comes from header `x-venue-location-id` (not body).
 */
export interface DiscountFormPayload {
  category: "discount" | "coupon_code";
  vendor_event_id: number;
  name?: string | null;
  /** Discount: per-offer rows (replaces whole set on update). */
  offers?: DiscountOfferPayload[];
  /** Coupon live toggle (discounts use `offers[].status`). */
  status?: "active" | "inactive";
  discount_type?: DiscountType;
  amount?: number;
  valid_from?: string | null;
  expires_at?: string | null;
  coupon_code?: string | null;
  /** Coupon event-page banner. */
  show_on_event_page?: boolean;
  /** Coupon usable at checkout. */
  show_on_checkout?: boolean;
  banner_heading?: string | null;
  banner_subheading?: string | null;
  /** API: `total` | `per_person` (discounts / coupon flat total). */
  flat_mode?: FlatDiscountMode | null;
  min_people?: number | null;
  customer_audience?: CustomerAudience;
  customer_ids?: number[];
}

export interface DiscountStoreResponse {
  status: boolean;
  message: string;
  data: Discount;
  errors: unknown[];
}

/**
 * GET /vendor/discounts/events-with-dates
 * Events for the current header location.
 *
 * Non-room events: event → dates[]
 * Room-based events (`is_rooms`): event → rooms[] → dates[]
 *   Rooms with no upcoming dates still appear with `dates: []`.
 * Legacy (pre room-first): event → dates[] → rooms[]
 */
export interface DiscountEventDateRoom {
  id: number;
  name: string;
}

export interface DiscountEventDateItem {
  date: string;
  date_id: number;
  /** Legacy date→rooms nesting (pre room-first API). */
  rooms?: DiscountEventDateRoom[];
}

/** Room-first catalog date (no nested rooms). */
export interface DiscountEventRoomDate {
  date: string;
  date_id: number;
}

/** Room-first catalog room; keep even when `dates` is empty. */
export interface DiscountEventRoom {
  id: number;
  name: string;
  dates?: DiscountEventRoomDate[];
}

export interface DiscountEventWithDates {
  id: number;
  name: string;
  /** Non-room events, or legacy room nesting under each date. */
  dates?: DiscountEventDateItem[];
  /** Room-based events: room → dates (current API). */
  rooms?: DiscountEventRoom[];
}

export interface DiscountEventsWithDatesResponse {
  status: boolean;
  message: string;
  data: DiscountEventWithDates[];
  errors: unknown[];
}

export const DISCOUNT_CATEGORY_LABELS: Record<DiscountCategory, string> = {
  discount: "Discount",
  coupon_code: "Coupon Code",
  event_specific: "Discount",
  date_wise: "Discount",
};

/** Categories shown on create wizard (location comes from header) */
export const DISCOUNT_CREATE_CATEGORIES: {
  value: Extract<DiscountCategory, "discount" | "coupon_code">;
  label: string;
  description: string;
}[] = [
  {
    value: "discount",
    label: "Discount",
    description:
      "Automatic off on selected event dates — each date/room can have its own amount and expiry.",
  },
  {
    value: "coupon_code",
    label: "Coupon Code",
    description:
      "A typed checkout code for one event. Email it, or show it on the event page banner.",
  },
];

export const DISCOUNT_VALUE_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Percentage",
  flat: "Fixed amount",
};

/** Offer type choices for date discounts (no flat-off-total). */
export const DISCOUNT_OFFER_KIND_LABELS = {
  percentage: "Percentage",
  flat_per_person: "Flat per person",
} as const;

export type DiscountOfferKind = keyof typeof DISCOUNT_OFFER_KIND_LABELS;

export const FLAT_MODE_LABELS: Record<FlatDiscountMode, string> = {
  total: "Off the total",
  per_person: "Per person",
};

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  active: "Live",
  inactive: "Paused",
  expired: "Expired",
};

export const CUSTOMER_AUDIENCE_LABELS: Record<CustomerAudience, string> = {
  all_active: "Everyone",
  selected: "Selected customers",
};

export const CUSTOMER_AUDIENCE_DESCRIPTIONS: Record<CustomerAudience, string> = {
  all_active:
    "Anyone can use this code — registered customers and guest checkouts.",
  selected: "Only the customers you pick can use this code.",
};
