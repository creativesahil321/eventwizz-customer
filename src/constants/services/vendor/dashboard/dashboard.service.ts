/**
 * Vendor Dashboard Service
 * Fetches dashboard statistics from GET /vendor/dashboard
 * - Bookings: ?booking_from_date=yyyy-MM-dd&booking_to_date=yyyy-MM-dd (date range)
 * - Commissions: ?comission_from_date=yyyy-MM-dd&comission_to_date=yyyy-MM-dd (date range)
 * Sort for last_event_performing_overview is handled client-side; no sort params sent to API.
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  VendorDashboardResponse,
  DashboardDateRangeParams,
} from "./type";

export type { DashboardDateRangeParams } from "./type";

export interface GetBookingsStatisticsParams {
  dateRange: DashboardDateRangeParams;
}

export const vendorDashboardService = {
  /**
   * Get dashboard data for the Bookings tab.
   * Request: GET /vendor/dashboard?booking_from_date=&booking_to_date=
   */
  getBookingsStatistics: async (
    params: GetBookingsStatisticsParams
  ): Promise<VendorDashboardResponse> => {
    const { dateRange } = params;
    const queryParams: Record<string, string> = {
      booking_from_date: dateRange.from_date,
      booking_to_date: dateRange.to_date,
    };
    return api.get<VendorDashboardResponse>(
      API_ENDPOINTS.VENDOR.DASHBOARD.STATISTICS,
      { params: queryParams, returnFullResponse: true }
    );
  },

  /**
   * Get dashboard data for the Commissions tab.
   * Request: GET /vendor/dashboard?comission_from_date=&comission_to_date=
   */
  getCommissionsStatistics: async (
    dateRange: DashboardDateRangeParams
  ): Promise<VendorDashboardResponse> => {
    return api.get<VendorDashboardResponse>(
      API_ENDPOINTS.VENDOR.DASHBOARD.STATISTICS,
      {
        params: {
          comission_from_date: dateRange.from_date,
          comission_to_date: dateRange.to_date,
        },
        returnFullResponse: true,
      }
    );
  },
};
