/**
 * React Query Hook for Vendor Add-ons
 */

import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { vendorAddOnsService } from "../add-ons.service";

export const useVendorAddOns = (
  bookingId: string | number,
  date: string,
  enabled: boolean = true,
  roomId?: number | null,
) => {
  const resolvedRoomId =
    roomId != null && Number(roomId) > 0 ? Number(roomId) : undefined;

  return useQuery({
    queryKey: [
      "vendor-booking-addons",
      bookingId,
      resolvedRoomId ?? "flat",
      date,
    ],
    queryFn: () =>
      vendorAddOnsService.getAddOns(bookingId, date, resolvedRoomId),
    enabled: enabled && !!bookingId && !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      const status = (error as AxiosError)?.response?.status;
      if (status != null && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
};
