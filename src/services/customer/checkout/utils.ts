/**
 * Checkout Utility Functions
 *
 * Reusable utility functions for checkout operations
 * to maintain DRY principles and improve code organization.
 */

import { toast } from "sonner";

/**
 * Handle checkout errors with user-friendly messages
 * 
 * Note: API errors (401, 403, 422, 500, Network errors) are automatically
 * handled by the API client interceptor. This function only handles
 * client-side validation errors that occur before API calls.
 */
export const handleCheckoutError = (error: Error): void => {
  console.error("❌ Checkout error:", error.message);

  // Only show toast for client-side validation errors
  // API errors are already handled by the API client interceptor
  if (error.message.includes("Validation failed")) {
    toast.error("Please check your booking details", {
      description: error.message.replace("Validation failed: ", ""),
    });
  }
  // All other errors (Network, 401, 403, 422, 500, etc.) are handled
  // automatically by the API client interceptor, so we don't show duplicate toasts
};

/**
 * Log checkout success with consistent format
 */
export const logCheckoutSuccess = (data: {
  bookingNumber: string;
  amount: number;
  gateway?: string;
  eventSlug: string;
}): void => {
  console.log("✅ Checkout ready:", {
    bookingNumber: data.bookingNumber,
    amount: data.amount,
    gateway: data.gateway,
    eventSlug: data.eventSlug,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log checkout mutation start with consistent format
 */
export const logCheckoutStart = (data: {
  eventSlug: string;
  vendorEventId: number;
  total: number;
}): void => {
  console.log("🔄 Checkout mutation started:", {
    eventSlug: data.eventSlug,
    vendorEventId: data.vendorEventId,
    total: data.total,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Calculate deposit amount based on type (amount or percentage)
 * @param totalAmount - Full amount for the item(s)
 * @param depositType - "amount" or "percentage"
 * @param depositValue - The deposit value (e.g., 5 for £5 or 5%)
 * @param guestCount - Number of guests (for per-person calculations)
 * @returns The calculated deposit amount
 */
export const calculateDepositAmount = (
  totalAmount: number,
  depositType: "amount" | "percentage",
  depositValue: number,
  guestCount: number = 1
): number => {
  if (depositType === "percentage") {
    // Calculate percentage of total amount
    return (totalAmount * depositValue) / 100;
  } else {
    // Amount type: deposit per guest
    return depositValue * guestCount;
  }
};
