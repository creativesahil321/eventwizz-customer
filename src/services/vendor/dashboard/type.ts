/**
 * Vendor Dashboard API types for GET /vendor/dashboard
 *
 * BACKEND CONTRACT (for backend devs):
 * - Bookings: GET /vendor/dashboard?booking_from_date=yyyy-MM-dd&booking_to_date=yyyy-MM-dd
 * - Commissions: GET /vendor/dashboard?comission_from_date=yyyy-MM-dd&comission_to_date=yyyy-MM-dd
 * last_event_performing_overview is sorted client-side; no sort params are sent.
 */

/** Date range for dashboard filters (yyyy-MM-dd strings) */
export interface DashboardDateRangeParams {
  from_date: string;
  to_date: string;
}

/** Client-side sort options for last_event_performing_overview (not sent to API) */
export type VendorDashboardLastEventSortBy = "name" | "amount";
export type VendorDashboardLastEventSortOrder = "asc" | "desc";

export interface VendorDashboardSummary {
  total_events: number;
  active_events: number;
  past_events: number;
  draft_events: number;
}

export interface VendorDashboardBookingsStats {
  total_bookings: number;
  total_payment: number;
  pending_partial_payment: number;
  received_payment: number;
}

/**
 * Commission stats from API. Backend may send either:
 * - total_commission + commission_due, or
 * - same shape as bookings (total_bookings, total_payment, pending_partial_payment, received_payment).
 * Frontend maps both to "Total Commission" and "Commission Due" cards.
 */
export interface VendorDashboardCommissionsStats {
  total_commission?: number;
  commission_due?: number;
  status?: string;
  total_bookings?: number;
  total_payment?: number;
  pending_partial_payment?: number;
  received_payment?: number;
}

export interface VendorDashboardRecentBooking {
  /** Backend: use for navigation to /vendor/booking-history/[booking_id] */
  booking_id: number | string;
  transaction_id: string;
  customer: string;
  event: string;
  order_date: string;
  total: number;
  balance_due: number;
  status: string;
}

export interface VendorDashboardLastEventItem {
  event_id: number;
  event_name: string;
  slug: string;
  amount: number;
}

export interface VendorDashboardData {
  current_location_id: number;
  summary: VendorDashboardSummary;
  bookings_stats: VendorDashboardBookingsStats;
  /** Optional. When present, Commissions tab shows real data; otherwise frontend shows zeros. */
  commissions_stats?: VendorDashboardCommissionsStats;
  /** Legacy period fields */
  period?: string;
  period_start?: string;
  period_end?: string;
  /** Current API period fields for bookings */
  booking_period?: string;
  booking_period_start?: string;
  booking_period_end?: string;
  comission_period?: string;
  comission_period_start?: string;
  comission_period_end?: string;
  recent_bookings: VendorDashboardRecentBooking[];
  last_event_performing_overview: VendorDashboardLastEventItem[];
}

export interface VendorDashboardResponse {
  status: boolean;
  message: string;
  data: VendorDashboardData;
  errors: string[];
}
