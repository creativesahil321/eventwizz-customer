/**
 * Custom hook for saving add-ons
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsService } from "../bookings.service";
import { bookingsKeys } from "../query";
import { SaveAddOnsPayload, SaveAddOnsResponse } from "../type";

export function useSaveAddOns() {
  const queryClient = useQueryClient();

  return useMutation<SaveAddOnsResponse, Error, SaveAddOnsPayload | FormData>({
    mutationFn: (payload: SaveAddOnsPayload | FormData) =>
      bookingsService.saveAddOns(payload),
    onSuccess: (_data, variables) => {
      const invalidatePromises = [
        queryClient.invalidateQueries({
          queryKey: ["add-ons-details"],
        }),
      ];

      let bookingIdToInvalidate: number | null = null;

      if (variables instanceof FormData) {
        const rawId = variables.get("booking_id");
        if (typeof rawId === "string") {
          const parsed = parseInt(rawId, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            bookingIdToInvalidate = parsed;
          }
        }
      } else if (
        variables &&
        typeof (variables as SaveAddOnsPayload).booking_id === "number"
      ) {
        const parsed = (variables as SaveAddOnsPayload).booking_id;
        if (!Number.isNaN(parsed) && parsed > 0) {
          bookingIdToInvalidate = parsed;
        }
      }

      if (bookingIdToInvalidate) {
        const bookingDetailKey = bookingsKeys.bookingDetail(
          bookingIdToInvalidate
        );
        invalidatePromises.push(
          queryClient.invalidateQueries({
            queryKey: bookingDetailKey,
          }),
          queryClient.refetchQueries({
            queryKey: bookingDetailKey,
            type: "active",
          })
        );
      }

      void Promise.all(invalidatePromises);
    },
  });
}
