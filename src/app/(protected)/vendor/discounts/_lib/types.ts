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

/** One date row inside a multi-date Discount (API + form). */
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
  /** When false, hide this date’s badge on the public event page. */
  show_on_banner?: boolean | null;
  /** When false, this date’s offer is saved but not live at checkout. */
  is_live?: boolean | null;
  /** Alternate API field — prefer `is_live` when both exist. */
  status?: DiscountStatus | string | null;
}

export interface Discount {
  id: number;
  category: DiscountCategory;
  name: string | null;
  coupon_code: string | null;
  /** When false, hide from the public event page (coupon strip / discount badges). */
  show_on_banner?: boolean | null;
  /** Small eyebrow on the coupon strip (e.g. "Limited time offer"). */
  banner_heading?: string | null;
  /** Main promo line on the event page coupon strip. */
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
  /** Legacy single-date fields — prefer `dates[]` when present. */
  date_id: number | null;
  date: string | null;
  room_id: number | null;
  location: DiscountRelation | null;
  event: DiscountRelation | null;
  room: DiscountRelation | null;
  /** Multi-date Discount rows (guide model). */
  dates?: DiscountDateEntry[] | null;
  customers?: DiscountCustomer[];
  valid_from: string | null;
  expires_at: string;
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

/** One date row in POST /vendor/discounts/store for category `discount`. */
export interface DiscountDatePayload {
  date_id: number;
  room_id?: number | null;
  discount_type: DiscountType;
  amount: number;
  flat_mode?: FlatDiscountMode | null;
  min_people?: number | null;
  valid_from?: string | null;
  expires_at: string;
  /** Show offer badge on the public event date picker for this date. */
  show_on_banner?: boolean;
  /** Live for checkout immediately when true; paused when false. */
  is_live?: boolean;
}

/**
 * POST /vendor/discounts/store
 * Location comes from header `x-venue-location-id` (not body).
 */
export interface DiscountFormPayload {
  category: "discount" | "coupon_code";
  vendor_event_id: number;
  name?: string | null;
  status: "active" | "inactive";
  /** Multi-date Discount rows */
  dates?: DiscountDatePayload[];
  /** Coupon (and legacy single-date) value fields */
  discount_type?: DiscountType;
  amount?: number;
  valid_from?: string | null;
  expires_at?: string;
  date_id?: number;
  room_id?: number;
  coupon_code?: string | null;
  /** Promote on the public event page (coupon strip or discount display). */
  show_on_banner?: boolean;
  /** Small eyebrow on the coupon strip. */
  banner_heading?: string | null;
  /** Main promo line on the event page coupon strip. */
  dynamic_text?: string | null;
  /** API: `total` | `per_person` */
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
 * GET /vendor/discounts/locations-with-events
 * Events for the current header location.
 *
 * Shape: event → dates (`date_id`) → optional rooms.
 */
export interface DiscountEventDateRoom {
  id: number;
  name: string;
}

export interface DiscountEventDateItem {
  date: string;
  date_id: number;
  rooms?: DiscountEventDateRoom[];
}

export interface DiscountEventWithDates {
  id: number;
  name: string;
  dates: DiscountEventDateItem[];
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

/** Offer type choices matching the guide (flat splits into total vs per person). */
export const DISCOUNT_OFFER_KIND_LABELS = {
  percentage: "Percentage",
  flat_total: "Flat off total",
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
