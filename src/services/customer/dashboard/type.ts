/**
 * Customer Dashboard API types for /customer/dashboard
 */

/** Single item in recent_bookings from the API */
export interface CustomerDashboardRecentBooking {
  booking_id: number;
  booking_number: string;
  booking_ref: string;
  event_name: string;
  event_slug: string;
  status: string;
  payment_status: string;
  /** Full booking amount (sub_total), not pay-now / deposit. */
  total: number;
  total_formatted: string;
  /** Present only when > 0; omitted when no promo savings. */
  saved_amount?: number;
  created_at: string;
  created_ago: string;
}

/** Upcoming event item when API returns non-empty upcoming_events */
export interface CustomerDashboardUpcomingEvent {
  id?: string | number;
  booking_id?: number;
  booking_date_id?: number;
  title?: string;
  event_name?: string;
  date?: string;
  date_key?: string;
  time?: string;
  location?: string;
  ticket_type?: string;
  ticketType?: string;
  event_slug?: string;
  /** Location slug for building event URL e.g. bristol-1 */
  location_slug?: string;
  [key: string]: unknown;
}

/** Payload under data from /customer/dashboard */
export interface CustomerDashboardData {
  upcoming_events: CustomerDashboardUpcomingEvent[];
  recent_bookings: CustomerDashboardRecentBooking[];
}

/** Full API response for /customer/dashboard */
export interface CustomerDashboardResponse {
  status: boolean;
  message: string;
  data: CustomerDashboardData;
  errors: string[];
}

// --------------- Nearby Events ---------------

/** Params sent to GET /customer/events/nearby */
export interface NearbyEventsParams {
  lat: number;
  lng: number;
  /** Nearest city from reverse geocode (sent so backend can filter/suggest by city) */
  city?: string;
  /** Country code or name from reverse geocode */
  country?: string;
}

/** Single nearby event returned by the API */
export interface NearbyEvent {
  id: number | string;
  event_name: string;
  event_slug: string;
  date?: string;
  time?: string;
  location?: string;
  distance_km: number;
  ticket_type?: string;
  image?: string;
  [key: string]: unknown;
}

/** Full API response for /customer/events/nearby */
export interface NearbyEventsResponse {
  status: boolean;
  message: string;
  data: NearbyEvent[];
  errors: string[];
}

/** Cached location shape stored in localStorage */
export interface CachedLocation {
  lat: number;
  lng: number;
  cachedAt: number;
}
