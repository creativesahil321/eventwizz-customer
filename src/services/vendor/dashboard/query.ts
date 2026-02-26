/**
 * Vendor Dashboard Query Hooks
 * - Bookings: GET /vendor/dashboard?booking_period=<period>
 * - Commissions: GET /vendor/dashboard?comission_period=<period>
 */

import { useQuery } from "@tanstack/react-query";
import { vendorDashboardService } from "./dashboard.service";
import type {
  VendorDashboardResponse,
  VendorDashboardPeriod,
  VendorDashboardLastEventSortBy,
  VendorDashboardLastEventSortOrder,
} from "./type";

export const vendorDashboardKeys = {
  all: ["vendor", "dashboard"] as const,
  bookings: (
    period: VendorDashboardPeriod,
    lastEventSort?: {
      sortBy: VendorDashboardLastEventSortBy;
      sortOrder: VendorDashboardLastEventSortOrder;
    }
  ) =>
    [
      ...vendorDashboardKeys.all,
      "bookings",
      period,
      ...(lastEventSort ? [lastEventSort.sortBy, lastEventSort.sortOrder] : []),
    ] as const,
  commissions: (period: VendorDashboardPeriod) =>
    [...vendorDashboardKeys.all, "commissions", period] as const,
};

export interface UseVendorDashboardBookingsOptions {
  last_event_sort_by?: VendorDashboardLastEventSortBy;
  last_event_sort_order?: VendorDashboardLastEventSortOrder;
}

export function useVendorDashboardBookings(
  period: VendorDashboardPeriod = "today",
  options?: UseVendorDashboardBookingsOptions
) {
  const lastEventSort =
    options?.last_event_sort_by && options?.last_event_sort_order
      ? {
          sortBy: options.last_event_sort_by,
          sortOrder: options.last_event_sort_order,
        }
      : undefined;

  return useQuery<VendorDashboardResponse>({
    queryKey: vendorDashboardKeys.bookings(period, lastEventSort),
    queryFn: () =>
      vendorDashboardService.getBookingsStatistics({
        period,
        last_event_sort_by: options?.last_event_sort_by,
        last_event_sort_order: options?.last_event_sort_order,
      }),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useVendorDashboardCommissions(
  period: VendorDashboardPeriod = "today",
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false;
  return useQuery<VendorDashboardResponse>({
    queryKey: vendorDashboardKeys.commissions(period),
    queryFn: () => vendorDashboardService.getCommissionsStatistics(period),
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
