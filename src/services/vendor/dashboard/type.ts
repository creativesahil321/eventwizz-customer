/**
 * Vendor Dashboard API types for GET /vendor/dashboard
 *
 * BACKEND CONTRACT (for backend devs):
 * - Bookings: GET /vendor/dashboard?booking_period=today|weekly|monthly|yearly
 *   Optional for Last Event Performing Overview sort:
 *   - last_event_sort_by=name|amount
 *   - last_event_sort_order=asc|desc
 *   Returns: summary, bookings_stats, recent_bookings, last_event_performing_overview.
 * - Commissions: GET /vendor/dashboard?comission_period=today|weekly|monthly|yearly
 *   Returns: data.commissions_stats (optional). If missing, frontend shows zeros.
 */

/** Sort options for last_event_performing_overview (optional API params) */
export type VendorDashboardLastEventSortBy = "name" | "amount";
export type VendorDashboardLastEventSortOrder = "asc" | "desc";

export type VendorDashboardPeriod = "today" | "weekly" | "monthly" | "yearly";

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
  period: string;
  period_start: string;
  period_end: string;
  recent_bookings: VendorDashboardRecentBooking[];
  last_event_performing_overview: VendorDashboardLastEventItem[];
}

export interface VendorDashboardResponse {
  status: boolean;
  message: string;
  data: VendorDashboardData;
  errors: string[];
}
