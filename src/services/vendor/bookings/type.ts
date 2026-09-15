/**
 * Vendor Bookings Type Definitions
 * Vendor-specific types for booking management
 */

/**
 * Payment gateway for vendor reschedule
 */
export interface VendorReschedulePaymentGateway {
  id: number;
  slug: string;
}

/**
 * Table details for reschedule (allocated_seat is an array)
 */
export interface VendorRescheduleTableDetail {
  event_date_table_id: number;
  allocated_seat: number[]; // Array of seat allocations per table
  table_size: number;
  price_per_person: number;
  total: number;
}

/**
 * Missing table details for dates that need table additions
 */
export interface VendorMissingTableDetail {
  min_persons: number;
  max_persons: number;
  price_per_person: string;
  quantity: number;
  total_size: number;
  reason: "no_table_exists" | "insufficient_capacity" | "sold_out";
  event_date_table_id: number | null;
  current_total: number | null;
  sold_tables: number | null;
}

/**
 * Available date for direct rescheduling
 */
export interface VendorAvailableRescheduleDate {
  id: number;
  /** Preferred id for `new_booking_date_id` on store */
  event_date_id?: number;
  dateKey?: string;
  date_key?: string;
  date: string;
  date_label?: string;
  price: number;
  /** Server-computed upgrade amount — prefer over client price math */
  additional_payment_required?: number;
  unpaid_amount?: number;
  requires_payment?: boolean;
  people: number;
  tables: number;
  drinks: number;
  table_details: VendorRescheduleTableDetail[];
  requires_table_addition: false;
}

/**
 * Date that requires table additions before rescheduling
 */
export interface VendorNeedsTablesRescheduleDate {
  id: number;
  dateKey: string;
  date: string;
  people: number;
  tables: number;
  drinks: number;
  requires_table_addition: true;
  missing_tables: VendorMissingTableDetail[];
}

/**
 * Current date details for vendor reschedule
 */
export interface VendorRescheduleCurrentDate {
  dateKey?: string;
  date_key?: string;
  date: string;
  date_label?: string;
  price: string | number;
  /** Amount already paid toward the current booking date */
  paid_amount?: number | string;
  people: number;
  tables: number;
  tickets: number;
  drinks: number;
  room_id?: number;
  room_name?: string;
}

/**
 * Available dates structure for vendor reschedule
 * Separates dates that can be directly booked from dates that need table additions
 */
export interface VendorAvailableDates {
  available: VendorAvailableRescheduleDate[];
  needs_tables: VendorNeedsTablesRescheduleDate[];
}

/**
 * Vendor reschedule data response
 * Different from customer response - has separate arrays for available dates and dates needing tables
 */
export interface VendorRescheduleDataResponse {
  status: boolean;
  message: string;
  data: {
    current: VendorRescheduleCurrentDate;
    availableDates: VendorAvailableDates;
    available_dates?: VendorAvailableDates;
    payment_gateways?: VendorReschedulePaymentGateway[];
    is_room_system?: boolean;
    is_room_scoped?: boolean;
    room_id?: number;
    room_name?: string;
  };
  errors: string[];
}

/**
 * Table detail for vendor reschedule booking payload
 * allocated_seat is an array of seat allocations per table
 */
export interface VendorRescheduleTableDetailPayload {
  event_date_table_id: number;
  allocated_seat: number[]; // Array of seat allocations per table
  table_size: number;
  price_per_person: number;
  total: number;
}

/**
 * Payload for vendor reschedule booking API
 */
export interface VendorRescheduleBookingPayload {
  booking_id: number;
  booking_date_id: number;
  new_booking_date_id: number;
  new_date: string; // Date string like "2025-09-20"
  total_amount: number;
  unpaid_amount: number;
  payment_gateway: string; // Payment gateway slug like "stripe"
  payment_method: "online" | "offline"; // Payment method: online or offline
  table_details: VendorRescheduleTableDetailPayload[];
}

/**
 * Payload for updating booking status
 */
export interface VendorUpdateBookingStatusPayload {
  booking_id: number;
  booking_date_id: number;
  payment_status: number;
}

/**
 * Response for updating booking status
 */
export interface VendorUpdateBookingStatusResponse {
  status: boolean;
  message: string;
  data: {
    booking_date_id: number;
    payment_status: number;
  };
  errors: string[];
}

export type DoorEntryErrorCode =
  | "already_admitted"
  | "not_paid"
  | "cancelled"
  | "refunded"
  | "invalid_token"
  | "wrong_venue"
  | "permission_denied";

export interface DoorEntryDateRow {
  booking_date_id: number;
  booking_date: string;
  room_name?: string | null;
  entry_status?: string | null;
  entry_label: string;
  can_check_in: boolean;
  checked_in_at?: string | null;
}

export interface DoorEntryScanData {
  booking_id: number;
  booking_number: string;
  guest_name: string;
  event_name: string;
  suggested_booking_date_id: number | null;
  dates: DoorEntryDateRow[];
}

export interface DoorEntryScanResponse {
  status: boolean;
  message: string;
  data: DoorEntryScanData;
  errors?: string[];
  code?: string;
}

export interface DoorEntryCheckInPayload {
  token: string;
  booking_date_id: number;
}

export interface DoorEntryCheckInResponse {
  status: boolean;
  message: string;
  data?: unknown;
  errors?: string[];
  code?: string;
}
