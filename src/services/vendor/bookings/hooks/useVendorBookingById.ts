import { useQuery } from "@tanstack/react-query";
import { vendorBookingsService } from "../bookings.service";
import type { VendorBookingDetailResponse } from "../bookings.service";
import { FRESHNESS } from "@/lib/query-freshness";

/**
 * Hook to fetch a specific vendor booking by ID
 * @param id - Booking ID
 * @returns Query result with booking details
 */
export const useVendorBookingById = (id: number | string) => {
  return useQuery<VendorBookingDetailResponse>({
    queryKey: ["vendor-booking-history", "detail", id],
    queryFn: () => vendorBookingsService.getBookingById(id),
    enabled: !!id,
    ...FRESHNESS.operational,
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
