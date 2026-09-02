/**
 * Custom hook for saving add-ons
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { bookingsService } from "../bookings.service";
import { bookingsKeys } from "../query";
import { SaveAddOnsPayload, SaveAddOnsResponse } from "../type";

export function useSaveAddOns() {
  const queryClient = useQueryClient();

  return useMutation<SaveAddOnsResponse, Error, SaveAddOnsPayload | FormData>({
    mutationFn: (payload: SaveAddOnsPayload | FormData) =>
      bookingsService.saveAddOns(payload),
    onSuccess: () => {
      const invalidatePromises = [
        queryClient.invalidateQueries({
          queryKey: ["add-ons-details"],
        }),
        queryClient.invalidateQueries({
          queryKey: bookingsKeys.bookingDetails(),
        }),
        queryClient.refetchQueries({
          queryKey: bookingsKeys.bookingDetails(),
          type: "active",
        }),
      ];

      void Promise.all(invalidatePromises);
    },
    onError: (error: Error) => {
      const status = (error as AxiosError)?.response?.status;
      if (status !== 409) return;

      queryClient.invalidateQueries({
        queryKey: bookingsKeys.bookingDetails(),
      });
      queryClient.invalidateQueries({
        queryKey: ["add-ons-details"],
      });
    },
  });
}
