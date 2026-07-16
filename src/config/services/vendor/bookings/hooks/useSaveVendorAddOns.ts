/**
 * React Query Mutation Hook for Saving Vendor Add-ons
 * Toast notifications are handled automatically by API client interceptor
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
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
      const id = response.data?.booking_id || bookingId;

      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-history", "detail", id],
        });
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-addons"],
        });
      }
    },
    onError: (error: Error, variables: FormData) => {
      const status = (error as AxiosError)?.response?.status;
      if (status !== 409) return;

      const rawId = variables.get("booking_id");
      const parsedId =
        typeof rawId === "string" ? Number.parseInt(rawId, 10) : Number.NaN;
      const id =
        !Number.isNaN(parsedId) && parsedId > 0 ? parsedId : bookingId;

      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["vendor-booking-history", "detail", id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["vendor-booking-addons"],
      });
    },
  });
};
