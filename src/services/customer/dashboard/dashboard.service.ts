/**
 * Customer Dashboard Service
 *
 * Fetches dashboard statistics (upcoming events, recent bookings) from the API.
 */

import { api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import type {
  CustomerDashboardResponse,
  NearbyEventsParams,
  NearbyEventsResponse,
} from "./type";

export const dashboardService = {
  /**
   * Get customer dashboard statistics (upcoming events + recent bookings)
   */
  getStatistics: async (): Promise<CustomerDashboardResponse> => {
    return api.get<CustomerDashboardResponse>(
      API_ENDPOINTS.CUSTOMER.DASHBOARD.STATISTICS,
      { returnFullResponse: true }
    );
  },

  /**
   * Get nearby events based on user's coordinates.
   * Backend uses Haversine formula and returns events sorted by distance.
   */
  getNearbyEvents: async (
    params: NearbyEventsParams
  ): Promise<NearbyEventsResponse> => {
    return api.get<NearbyEventsResponse>(
      API_ENDPOINTS.CUSTOMER.DASHBOARD.NEARBY_EVENTS,
      { params, returnFullResponse: true }
    );
  },
};
