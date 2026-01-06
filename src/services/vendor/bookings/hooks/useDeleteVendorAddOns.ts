/**
 * Custom hook for deleting vendor add-ons
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorBookingsService } from "../bookings.service";
// Toast notifications are handled automatically by API client interceptor

interface DeleteVendorAddOnsParams {
  bookingId: number;
  date: string;
  keyword: string | number;
  type: "tables" | "drinks" | "tickets";
}

export function useDeleteVendorAddOns() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string },
    Error,
    DeleteVendorAddOnsParams
  >({
    mutationFn: (params: DeleteVendorAddOnsParams) =>
      vendorBookingsService.deleteAddOns(
        params.bookingId,
        params.date,
        params.keyword,
        params.type
      ),
    onSuccess: (response, variables) => {
      // Invalidate add-ons query
      queryClient.invalidateQueries({
        queryKey: ["vendor-booking-addons"],
      });

      // Invalidate booking lists
      queryClient.invalidateQueries({
        queryKey: ["vendor-booking-history", "list"],
      });

      // Invalidate and refetch the specific booking detail
      // This matches the query key used by useVendorBookingDetails
      const bookingDetailKey = [
        "vendor-booking-history",
        "detail",
        variables.bookingId,
      ];

      queryClient.invalidateQueries({
        queryKey: bookingDetailKey,
      });

      // Force refetch the booking details to get updated data
      queryClient.refetchQueries({
        queryKey: bookingDetailKey,
        type: "active",
      });

      // Toast notification handled automatically by API client interceptor
    },
    onError: () => {
      // Error toast notification handled automatically by API client interceptor
    },
  });
}
