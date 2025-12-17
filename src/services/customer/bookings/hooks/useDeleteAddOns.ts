/**
 * Custom hook for deleting add-ons
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsService } from "../bookings.service";
import { bookingsKeys } from "../query";
// Toast notifications are handled automatically by API client interceptor

interface DeleteAddOnsParams {
  bookingId: number;
  date: string;
  keyword: string | number;
  type: "tables" | "drinks" | "tickets";
}

export function useDeleteAddOns() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string },
    Error,
    DeleteAddOnsParams
  >({
    mutationFn: (params: DeleteAddOnsParams) =>
      bookingsService.deleteAddOns(
        params.bookingId,
        params.date,
        params.keyword,
        params.type
      ),
    onSuccess: (response, variables) => {
      const invalidatePromises = [
        queryClient.invalidateQueries({
          queryKey: ["add-ons-details"],
        }),
        queryClient.invalidateQueries({
          queryKey: bookingsKeys.lists(),
        }),
      ];

      const bookingDetailKey = bookingsKeys.bookingDetail(variables.bookingId);
      invalidatePromises.push(
        queryClient.invalidateQueries({
          queryKey: bookingDetailKey,
        }),
        queryClient.refetchQueries({
          queryKey: bookingDetailKey,
          type: "active",
        })
      );

      void Promise.all(invalidatePromises);

      // Toast notification handled automatically by API client interceptor
    },
    onError: () => {
      // Error toast notification handled automatically by API client interceptor
    },
  });
}
