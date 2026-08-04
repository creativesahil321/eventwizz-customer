/**
 * Vendor Discounts — types aligned with GET/POST /api/v1/vendor/discounts
 */

export type DiscountCategory =
  | "event_specific"
  | "date_wise"
  | "coupon_code";

export type DiscountType = "percentage" | "flat";

/** Store API: `per_person` | `on_total` */
export type FlatDiscountMode = "on_total" | "per_person";

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
  room_id: number | null;
  location: DiscountRelation | null;
  event: DiscountRelation | null;
  room: DiscountRelation | null;
  applicable_dates?: string[];
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

export interface DiscountFormPayload {
  category: DiscountCategory;
  vendor_location_ids: number[];
  vendor_event_ids: number[];
  discount_type: DiscountType;
  amount: number;
  name?: string | null;
  valid_from?: string | null;
  expires_at: string;
  status: "active" | "inactive";
  room_ids?: number[];
  /** Preferred: unique ids from locations-with-events room.dates[].id */
  applicable_date_ids?: number[];
  /** Legacy / display: YYYY-MM-DD strings derived from selected date ids */
  applicable_dates?: string[];
  coupon_code?: string | null;
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

export interface DiscountLocationOption {
  id: number;
  name: string;
}

export interface DiscountEventOption {
  id: number;
  location_id: number;
  name: string;
}

export interface DiscountRoomOption {
  id: number;
  event_id: number;
  name: string;
}

/** GET /vendor/discounts/locations-with-events */
export interface DiscountLocationDateItem {
  id: number;
  date: string;
}

export interface DiscountLocationRoomItem {
  id: number;
  name: string;
  dates?: DiscountLocationDateItem[];
}

export interface DiscountLocationEventItem {
  id: number;
  name: string;
  rooms?: DiscountLocationRoomItem[];
}

export interface DiscountLocationWithEvents {
  id: number;
  city: string;
  events: DiscountLocationEventItem[];
}

export interface DiscountLocationsWithEventsResponse {
  status: boolean;
  message: string;
  data: DiscountLocationWithEvents[];
  errors: unknown[];
}

export const DISCOUNT_CATEGORY_LABELS: Record<DiscountCategory, string> = {
  event_specific: "Event Specific",
  date_wise: "Date Wise",
  coupon_code: "Coupon Code",
};

export const DISCOUNT_VALUE_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Percentage",
  flat: "Flat",
};

export const FLAT_MODE_LABELS: Record<FlatDiscountMode, string> = {
  on_total: "Flat on total",
  per_person: "Flat per person",
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
