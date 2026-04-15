import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkoutService } from "./checkout.service";
import { CheckoutRequest, CheckoutResponse } from "./type";
// Toast notifications are handled automatically by API client interceptor
import { useCartEditStore } from "@/store/cart-edit.store";
import {
  logCheckoutSuccess,
  logCheckoutStart,
} from "./utils";

/**
 * Hook for processing checkout
 * Handles the complete checkout flow with validation and error handling
 */
export const useProcessCheckout = () => {
  const queryClient = useQueryClient();
  const { clearAllCarts } = useCartEditStore();

  return useMutation({
    mutationFn: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
      logCheckoutStart({
        eventSlug: data.event_slug,
        vendorEventId: data.vendor_event_id,
        total: data.total,
      });

      // Client-side validation before API call
      const validation = checkoutService.validateCheckoutData(data);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(", ");
        throw new Error(`Validation failed: ${errorMessage}`);
      }

      // Verify totals match (with tolerance for floating point precision)
      const { calculatedSubTotal } = checkoutService.calculateTotals(data);

      if (Math.abs(calculatedSubTotal - data.sub_total) > 0.01) {
        console.warn(
          `Subtotal mismatch: calculated ${calculatedSubTotal}, provided ${data.sub_total}`
        );
      }

      // `data.total` includes vendor platform fee for the customer; do not compare to line-item sum.
      if (data.total + 0.001 < data.sub_total) {
        console.warn(
          `Total is below subtotal: sub_total ${data.sub_total}, total ${data.total}`
        );
      }

      return checkoutService.processCheckout(data);
    },
    retry: false, // 🛡️ Disable retries to prevent duplicate calls
    onSuccess: (response, variables) => {
      if (response.status) {
        // Clear cart data after successful checkout
        queryClient.invalidateQueries({ queryKey: ["cart-data"] });
        queryClient.removeQueries({ queryKey: ["cart-data"] });
        clearAllCarts();

        // Success toast notification handled automatically by API client interceptor

        // Log success with consistent format
        logCheckoutSuccess({
          bookingId: response.data.booking_id,
          total: response.data.total,
          paymentStatus: response.data.payment_status,
          eventSlug: variables.event_slug,
        });

        // Redirect directly to payment gateway URL from backend
        if (response.data.redirect_url) {
          console.log("🔄 Redirecting to payment gateway:", {
            gateway: response.data.gateway,
            bookingId: response.data.booking_id,
            redirectUrl: response.data.redirect_url,
          });

          // Redirect to the payment gateway URL provided by backend
          window.location.href = response.data.redirect_url;
        } else {
          // Error toast notification handled automatically by API client interceptor
          // The API will return status: false with this message
        }
      } else {
        throw new Error(response.message || "Checkout failed");
      }
    },
    onError: () => {
      // Error toast notification handled automatically by API client interceptor
    },
  });
};

/**
 * Hook for validating checkout data without processing
 * Useful for real-time validation in the UI
 */
export const useValidateCheckout = () => {
  return {
    validateCheckoutData: checkoutService.validateCheckoutData,
    calculateTotals: checkoutService.calculateTotals,
  };
};
