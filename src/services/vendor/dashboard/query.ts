/**
 * Vendor Dashboard Query Hooks
 * - Bookings: GET /vendor/dashboard?booking_from_date=&booking_to_date=
 * - Commissions: GET /vendor/dashboard?comission_from_date=&comission_to_date=
 */

import { useQuery } from "@tanstack/react-query";
import { vendorDashboardService } from "./dashboard.service";
import type { VendorDashboardResponse } from "./type";
import type { DashboardDateRangeParams } from "./type";
import { FRESHNESS } from "@/lib/query-freshness";

export const vendorDashboardKeys = {
  all: ["vendor", "dashboard"] as const,
  bookings: (dateRange: DashboardDateRangeParams) =>
    [
      ...vendorDashboardKeys.all,
      "bookings",
      dateRange.from_date,
      dateRange.to_date,
    ] as const,
  commissions: (dateRange: DashboardDateRangeParams) =>
    [
      ...vendorDashboardKeys.all,
      "commissions",
      dateRange.from_date,
      dateRange.to_date,
    ] as const,
};

export function useVendorDashboardBookings(
  dateRange: DashboardDateRangeParams,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  return useQuery<VendorDashboardResponse>({
    queryKey: vendorDashboardKeys.bookings(dateRange),
    queryFn: () =>
      vendorDashboardService.getBookingsStatistics({
        dateRange,
      }),
    enabled,
    ...FRESHNESS.operational,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useVendorDashboardCommissions(
  dateRange: DashboardDateRangeParams,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false;
  return useQuery<VendorDashboardResponse>({
    queryKey: vendorDashboardKeys.commissions(dateRange),
    queryFn: () => vendorDashboardService.getCommissionsStatistics(dateRange),
    enabled,
    ...FRESHNESS.operational,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
