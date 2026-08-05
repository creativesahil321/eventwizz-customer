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

export interface Discount {
  id: number;
  category: DiscountCategory;
  name: string | null;
  coupon_code: string | null;
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
  date_id: number | null;
  date: string | null;
  room_id: number | null;
  location: DiscountRelation | null;
  event: DiscountRelation | null;
  room: DiscountRelation | null;
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

/**
 * POST /vendor/discounts/store
 * Location comes from header `x-venue-location-id` (not body).
 */
export interface DiscountFormPayload {
  category: "discount" | "coupon_code";
  vendor_event_id: number;
  discount_type: DiscountType;
  amount: number;
  name?: string | null;
  valid_from?: string | null;
  expires_at: string;
  status: "active" | "inactive";
  /** Required for category `discount` */
  date_id?: number;
  room_id?: number;
  coupon_code?: string | null;
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
      "Applies to a chosen event date (and room, if any) at the location selected in the header.",
  },
  {
    value: "coupon_code",
    label: "Coupon Code",
    description:
      "Guests enter a code at checkout. When active, it can be emailed to your customers.",
  },
];

export const DISCOUNT_VALUE_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Percentage",
  flat: "Fixed amount",
};

export const FLAT_MODE_LABELS: Record<FlatDiscountMode, string> = {
  total: "Off the total",
  per_person: "Per person",
};

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  expired: "Expired",
};

export const CUSTOMER_AUDIENCE_LABELS: Record<CustomerAudience, string> = {
  all_active: "All active customers",
  selected: "Selected customers",
};
