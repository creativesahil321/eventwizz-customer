/**
 * Vendor Dashboard Service
 * Fetches dashboard statistics from GET /vendor/dashboard
 * - Bookings: ?booking_period=today|weekly|monthly|yearly
 * - Commissions: ?comission_period=today|weekly|monthly|yearly
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  VendorDashboardResponse,
  VendorDashboardPeriod,
  VendorDashboardLastEventSortBy,
  VendorDashboardLastEventSortOrder,
} from "./type";

export interface GetBookingsStatisticsParams {
  period: VendorDashboardPeriod;
  /** Optional: backend can sort last_event_performing_overview by name or amount */
  last_event_sort_by?: VendorDashboardLastEventSortBy;
  /** Optional: asc or desc */
  last_event_sort_order?: VendorDashboardLastEventSortOrder;
}

export const vendorDashboardService = {
  /**
   * Get dashboard data for the Bookings tab.
   * Request: GET /vendor/dashboard?booking_period=<period>&last_event_sort_by=&last_event_sort_order=
   */
  getBookingsStatistics: async (
    params: GetBookingsStatisticsParams | VendorDashboardPeriod
  ): Promise<VendorDashboardResponse> => {
    const resolved =
      typeof params === "string"
        ? { period: params }
        : params;
    const { period, last_event_sort_by, last_event_sort_order } = resolved;
    const queryParams: Record<string, string> = {
      booking_period: period,
    };
    if (last_event_sort_by)
      queryParams.last_event_sort_by = last_event_sort_by;
    if (last_event_sort_order)
      queryParams.last_event_sort_order = last_event_sort_order;
    return api.get<VendorDashboardResponse>(
      API_ENDPOINTS.VENDOR.DASHBOARD.STATISTICS,
      { params: queryParams, returnFullResponse: true }
    );
  },

  /**
   * Get dashboard data for the Commissions tab.
   * Request: GET /vendor/dashboard?comission_period=<period>
   */
  getCommissionsStatistics: async (
    period: VendorDashboardPeriod = "today"
  ): Promise<VendorDashboardResponse> => {
    return api.get<VendorDashboardResponse>(
      API_ENDPOINTS.VENDOR.DASHBOARD.STATISTICS,
      { params: { comission_period: period }, returnFullResponse: true }
    );
  },
};
