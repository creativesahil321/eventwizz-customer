/**
 * Customer Dashboard Query Hooks
 *
 * TanStack Query hooks for customer dashboard statistics.
 */

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "./dashboard.service";
import type { CustomerDashboardResponse, NearbyEventsResponse } from "./type";
import { FRESHNESS } from "@/lib/query-freshness";

export const dashboardKeys = {
  all: ["customer", "dashboard"] as const,
  statistics: () => [...dashboardKeys.all, "statistics"] as const,
  nearbyEvents: (lat: number, lng: number, city?: string, country?: string) =>
    [...dashboardKeys.all, "nearby-events", lat, lng, city ?? "", country ?? ""] as const,
};

/**
 * Fetches customer dashboard data (upcoming_events, recent_bookings)
 */
export const useCustomerDashboard = () => {
  return useQuery<CustomerDashboardResponse>({
    queryKey: dashboardKeys.statistics(),
    queryFn: () => dashboardService.getStatistics(),
    ...FRESHNESS.operational,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Fetches nearby events based on user coordinates and optional city/country.
 * Only enabled when lat/lng are available.
 * Sends city/country to backend when available (from reverse geocode) so backend can filter by nearest city.
 */
export const useNearbyEvents = (
  lat: number | null,
  lng: number | null,
  city?: string | null,
  country?: string | null
) => {
  return useQuery<NearbyEventsResponse>({
    queryKey: dashboardKeys.nearbyEvents(
      lat ?? 0,
      lng ?? 0,
      city ?? undefined,
      country ?? undefined
    ),
    queryFn: () =>
      dashboardService.getNearbyEvents({
        lat: lat!,
        lng: lng!,
        ...(city && { city }),
        ...(country && { country }),
      }),
    enabled: lat !== null && lng !== null,
    ...FRESHNESS.publicView,
    gcTime: 15 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};
