/**
 * React Query Hook for Vendor Add-ons
 */

import { useQuery } from "@tanstack/react-query";
import { vendorAddOnsService } from "../add-ons.service";

export const useVendorAddOns = (
  bookingId: string | number,
  date: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["vendor-booking-addons", bookingId, date],
    queryFn: () => vendorAddOnsService.getAddOns(bookingId, date),
    enabled: enabled && !!bookingId && !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};
