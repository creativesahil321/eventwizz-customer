import { useMutation } from "@tanstack/react-query";
import { checkoutService } from "./checkout.service";
import { CheckoutRequest, CheckoutResponse } from "./type";
import {
  logCheckoutSuccess,
  logCheckoutStart,
} from "./utils";

/**
 * Processes checkout — returns API response for the caller to open Stripe modal
 * or redirect to legacy gateway URLs.
 *
 * Do NOT invalidate cart here — backend keeps cart until payment succeeds.
 */
export const useProcessCheckout = () => {
  return useMutation({
    mutationFn: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
      logCheckoutStart({
        eventSlug: data.event_slug,
        vendorEventId: data.vendor_event_id,
        total: data.total,
      });

      const validation = checkoutService.validateCheckoutData(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      const { calculatedSubTotal, calculatedTotal, calculatedPartial } =
        checkoutService.calculateTotals(data);

      if (Math.abs(calculatedSubTotal - data.sub_total) > 0.01) {
        console.warn(
          `Subtotal mismatch: calculated ${calculatedSubTotal}, provided ${data.sub_total}`,
        );
      }

      if (Math.abs(calculatedTotal - data.total) > 0.01) {
        console.warn(
          `Total mismatch: calculated ${calculatedTotal}, provided ${data.total}`,
        );
      }

      if (
        data.partial_payment != null &&
        calculatedPartial != null &&
        Math.abs(calculatedPartial - data.partial_payment) > 0.01
      ) {
        console.warn(
          `Partial payment mismatch: calculated ${calculatedPartial}, provided ${data.partial_payment}`,
        );
      }

      const response = await checkoutService.processCheckout(data);

      if (response.status && response.data) {
        logCheckoutSuccess({
          bookingNumber: response.data.booking_number,
          amount: response.data.amount,
          gateway: response.data.payment?.gateway ?? response.data.gateway,
          eventSlug: data.event_slug,
        });
      }

      return response;
    },
    retry: false,
  });
};

export const useValidateCheckout = () => {
  return {
    validateCheckoutData: checkoutService.validateCheckoutData,
    calculateTotals: checkoutService.calculateTotals,
  };
};

export const useResumeCheckout = () => {
  return useMutation({
    mutationFn: (bookingNumber: string) =>
      checkoutService.resumeCheckout({ booking_number: bookingNumber }),
    retry: false,
  });
};
