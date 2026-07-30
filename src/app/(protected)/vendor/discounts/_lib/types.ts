/**
 * Discount Management — Frontend types + API contract reference
 * ---------------------------------------------------------------
 * Backend: mirror these shapes when building Laravel endpoints.
 *
 * Suggested endpoints:
 *   GET    /api/vendor/discounts?category=&status=&event_id=&search=&page=
 *   POST   /api/vendor/discounts
 *   GET    /api/vendor/discounts/{id}
 *   PUT    /api/vendor/discounts/{id}
 *   PATCH  /api/vendor/discounts/{id}/status   { status: "active" | "inactive" }
 *   DELETE /api/vendor/discounts/{id}
 *
 * Lookup helpers (already exist or similar):
 *   GET locations / events / rooms for cascading selects
 */

export type DiscountCategory =
  | "event_specific"
  | "date_wise"
  | "coupon_code";

export type DiscountValueType = "percentage" | "flat";

/** Only used when DiscountValueType === "flat" */
export type FlatDiscountMode = "flat_on_total" | "flat_per_person";

export type DiscountStatus = "active" | "inactive" | "expired";

export interface Discount {
  id: number;
  /** Optional display name for list/review */
  name: string | null;
  category: DiscountCategory;

  /** Scope */
  location_id: number;
  location_name: string;
  event_id: number;
  event_name: string;
  /** Required for date_wise */
  room_id: number | null;
  room_name: string | null;
  /** Specific dates (YYYY-MM-DD) for date_wise */
  applicable_dates: string[];

  /** Coupon — unique per vendor, case-insensitive */
  coupon_code: string | null;

  /** Value */
  value_type: DiscountValueType;
  /** Percentage 1–100 OR flat amount in vendor currency */
  discount_value: number;
  flat_mode: FlatDiscountMode | null;
  /** Required when flat_mode === flat_per_person */
  min_people: number | null;

  /** Validity of the discount itself (not the booked event dates) */
  valid_from: string | null;
  expires_at: string;

  status: DiscountStatus;
  created_at: string;
  updated_at: string;
}

/** Payload for create / update — backend DTO reference */
export interface DiscountFormPayload {
  name?: string | null;
  category: DiscountCategory;
  location_id: number;
  event_id: number;
  room_id?: number | null;
  applicable_dates?: string[];
  coupon_code?: string | null;
  value_type: DiscountValueType;
  discount_value: number;
  flat_mode?: FlatDiscountMode | null;
  min_people?: number | null;
  valid_from?: string | null;
  expires_at: string;
  status: "active" | "inactive";
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

export const DISCOUNT_CATEGORY_LABELS: Record<DiscountCategory, string> = {
  event_specific: "Event Specific",
  date_wise: "Date Wise",
  coupon_code: "Coupon Code",
};

export const DISCOUNT_VALUE_TYPE_LABELS: Record<DiscountValueType, string> = {
  percentage: "Percentage",
  flat: "Flat",
};

export const FLAT_MODE_LABELS: Record<FlatDiscountMode, string> = {
  flat_on_total: "Flat on total",
  flat_per_person: "Flat per person",
};

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  expired: "Expired",
};
