/**
 * Customer Dashboard Module
 */

export { dashboardService } from "./dashboard.service";
export { useCustomerDashboard, useNearbyEvents, dashboardKeys } from "./query";
export type {
  CustomerDashboardResponse,
  CustomerDashboardData,
  CustomerDashboardRecentBooking,
  CustomerDashboardUpcomingEvent,
  NearbyEvent,
  NearbyEventsResponse,
  NearbyEventsParams,
  CachedLocation,
} from "./type";
