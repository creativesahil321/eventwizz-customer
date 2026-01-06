/**
 * React Query Mutation Hook for Saving Vendor Add-ons
 * Toast notifications are handled automatically by API client interceptor
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  vendorAddOnsService,
  VendorAddOnsSaveResponse,
} from "../add-ons.service";

export const useSaveVendorAddOns = (bookingId?: string | number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      vendorAddOnsService.saveAddOns(formData),
    onSuccess: (response: VendorAddOnsSaveResponse) => {
      // Get bookingId from response or parameter
      const id = response.data?.booking_id || bookingId;

      // Invalidate booking details to refresh the data
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-history", "detail", id],
        });
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-addons"],
        });
      }
    },
    // Error toast notification handled automatically by API client interceptor
  });
};
