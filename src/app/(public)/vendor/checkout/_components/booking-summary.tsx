"use client";

import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import BookingSummarySkeleton from "./booking-summary-skeleton-loader";
import {
  Calendar,
  CreditCard,
  Shield,
  Clock,
  UtensilsCrossed,
  Ticket,
  Wine,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useGetCartData } from "@/services/customer/cart/query";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { useStoreEventBooking } from "@/services/customer/cart/query";
// Types are imported through cart-calculations utility
import { ANIMATION_VARIANTS } from "../_lib/constants";
import {
  getAvailableDates,
  calculatePaymentAmounts,
  extractCurrentEventData,
} from "../_lib/cart-calculations";
import {
  transformCartToCheckout,
  validateCheckoutRequirements,
  calculateCheckoutSummary,
} from "../_lib/checkout-utils";
import { useProcessCheckout } from "@/services/customer/checkout";
import { handleCheckoutError } from "@/services/customer/checkout/utils";
import { useCartEditStore } from "@/store/cart-edit.store";
import { usePaymentGatewaySelection } from "@/store/payment-gateway-selection.store";
import PaymentGatewaySelector from "./payment-gateway-selector";
import { addCacheBusting } from "@/lib/image-utils";
// PaymentInfo import removed as it's not used in this component

type BookingSummaryProps = Record<string, never>;

export default function BookingSummary({}: BookingSummaryProps) {
  // Removed unused selectedPaymentTypes state - payment types are managed in Zustand store
  const isPreviewMode = useIsPreviewMode();
  const { isPending } = useStoreEventBooking();
  const [isProcessing, setIsProcessing] = useState(false);
  const isCheckoutInProgressRef = useRef(false);

  // Payment gateway selection from store
  const { selectedGateway, setSelectedGateway } = usePaymentGatewaySelection();

  // Checkout mutation
  const processCheckoutMutation = useProcessCheckout();

  // Fetch cart data directly from API (same as CartManager) - disable in preview mode
  const {
    data: apiCartData,
    isLoading: isLoadingCartData,
    isFetching: isFetchingCartData,
  } = useGetCartData(!isPreviewMode);

  // Get edit store data for live updates
  const {
    getDateData,
    editingData,
    hasUnsavedChanges,
    validateDateRequirements,
  } = useCartEditStore();

  // Automatically determine current event from API data
  const { currentEventSlug, currentEventApiData } = useMemo(() => {
    const { currentEventSlug, currentEventApiData } =
      extractCurrentEventData(apiCartData);
    return { currentEventSlug, currentEventApiData };
  }, [apiCartData]);

  // Get payment breakdown from edit store
  const { getTotalPaymentBreakdown, updatePaymentType, getPaymentAmounts } =
    useCartEditStore();

  // Calculate totals and payment breakdown
  const { totalItems, totalToday, totalLater } = useMemo(() => {
    if (
      !currentEventApiData ||
      !currentEventSlug ||
      !editingData[currentEventSlug]
    ) {
      return {
        totalItems: 0,
        totalToday: 0,
        totalLater: 0,
      };
    }

    const availableDates = getAvailableDates(currentEventApiData);
    const paymentBreakdown = getTotalPaymentBreakdown(currentEventSlug);

    return {
      totalItems: availableDates.length, // Count dates as items
      totalToday: paymentBreakdown.totalToday,
      totalLater: paymentBreakdown.totalLater,
    };
  }, [
    currentEventApiData,
    currentEventSlug,
    editingData,
    getTotalPaymentBreakdown,
  ]);

  // Get available dates for payment options
  const availableDates = useMemo(() => {
    if (!currentEventApiData) return [];
    return getAvailableDates(currentEventApiData);
  }, [currentEventApiData]);

  // Calculate payment blocking state
  const { isPaymentBlocked, hasValidationErrors, validationErrorMessage } =
    useMemo(() => {
      if (!currentEventSlug) {
        return {
          isPaymentBlocked: false,
          hasValidationErrors: false,
          validationErrorMessage: undefined,
        };
      }

      let hasUnsaved = false;
      let hasValidationErrors = false;
      let validationErrorMessage: string | undefined;

      availableDates.forEach((date) => {
        const dateData = getDateData(currentEventSlug, date);
        if (dateData) {
          if (
            hasUnsavedChanges(currentEventSlug, date) ||
            dateData.hasChanges
          ) {
            hasUnsaved = true;
          }
          const validation = validateDateRequirements(currentEventSlug, date);
          if (!validation.isValid) {
            hasValidationErrors = true;
            // Store the first error message we encounter
            if (!validationErrorMessage && validation.errorMessage) {
              validationErrorMessage = validation.errorMessage;
            }
          }
        }
      });

      return {
        isPaymentBlocked: hasUnsaved || hasValidationErrors,
        hasValidationErrors,
        validationErrorMessage,
      };
    }, [
      currentEventSlug,
      availableDates,
      getDateData,
      hasUnsavedChanges,
      validateDateRequirements,
    ]);

  // Checkout handler
  const handleProceedToPayment = async () => {
    // 🛡️ CRITICAL: Prevent double-click/double-call immediately
    if (
      isProcessing ||
      processCheckoutMutation.isPending ||
      isCheckoutInProgressRef.current
    ) {
      console.log("🚫 Checkout already in progress, ignoring duplicate call");
      return;
    }

    isCheckoutInProgressRef.current = true;
    setIsProcessing(true);

    try {
      // Validate cart data before proceeding
      if (!currentEventApiData) {
        throw new Error(
          "Event data not available. Please refresh the page and try again."
        );
      }

      if (availableDates.length === 0) {
        throw new Error(
          "No dates selected. Please add items to your cart first."
        );
      }

      if (!currentEventSlug) {
        throw new Error(
          "No event selected. Please add items to your cart first."
        );
      }

      // Validate payment gateway selection
      if (!selectedGateway) {
        // Button is disabled, so this should never be reached, but keep as safety check
        return;
      }

      const validation = validateCheckoutRequirements(
        currentEventSlug,
        editingData
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Transform cart data to checkout format with selected payment gateway
      const checkoutData = transformCartToCheckout(
        currentEventSlug,
        editingData,
        apiCartData,
        selectedGateway
      );
      if (!checkoutData) {
        throw new Error("Failed to prepare checkout data. Please try again.");
      }

      const summary = calculateCheckoutSummary(
        currentEventSlug,
        editingData,
        apiCartData
      );

      console.log("🛒 Checkout Summary:", {
        eventSlug: currentEventSlug,
        dates: summary.dateCount,
        items: summary.itemCount,
        subTotal: summary.subTotal,
        payToday: summary.payToday,
        payLater: summary.payLater,
      });

      toast.info("Processing checkout...", { id: "checkout-progress" });

      // Process checkout with the API
      await processCheckoutMutation.mutateAsync(checkoutData);

      // Success - the mutation handles success toast, cleanup, and redirect
    } catch (error) {
      // Use centralized error handling
      if (error instanceof Error) {
        handleCheckoutError(error);
      } else {
        toast.error("Payment failed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsProcessing(false);
      isCheckoutInProgressRef.current = false;
    }
  };

  // Initialize payment types for each date (simplified - payment types managed in Zustand)
  const initializedPaymentTypes = useMemo(() => {
    if (!currentEventApiData) return {};

    const availableDates = getAvailableDates(currentEventApiData);
    const newPaymentTypes: Record<string, "full" | "deposit"> = {};

    availableDates.forEach((date) => {
      // Default to "full" for all dates - actual payment types managed in Zustand store
      newPaymentTypes[date] = "full";
    });

    return newPaymentTypes;
  }, [currentEventApiData]);

  // Calculate payment amounts using per-date logic
  useMemo(() => {
    return calculatePaymentAmounts(
      currentEventApiData,
      initializedPaymentTypes,
      currentEventSlug ?? undefined,
      getDateData
    );
  }, [
    currentEventApiData,
    initializedPaymentTypes,
    currentEventSlug,
    getDateData,
  ]);

  // Professional loading state with skeleton (initial load or refetching)
  if (isLoadingCartData) {
    return <BookingSummarySkeleton />;
  }

  // Empty cart state - show proper empty cart message (only when not refetching)
  if (!isFetchingCartData && (!currentEventApiData || totalItems === 0)) {
    return (
      <Card className="h-fit">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">
              Booking Summary Empty
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Your cart is empty. Add some items to see your booking summary.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const finalTotal = totalToday;

  // Additional safety check for TypeScript
  if (!currentEventApiData) {
    return null;
  }

  return (
    <motion.div {...ANIMATION_VARIANTS.FADE_IN_UP}>
      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <CreditCard className="h-4 w-4 text-gray-600" />
            Your Booking
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2.5">
          {/* Event Details - Minimal Compact */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="relative w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={addCacheBusting(currentEventApiData?.event_image || "")}
                alt={currentEventApiData?.event_name || "Event"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs truncate text-gray-900">
                {currentEventApiData?.event_name}
              </h3>
              <div className="text-xs text-gray-500">
                {totalItems} date{totalItems !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Options Section - Only show when tables are selected */}
          {availableDates.some((date) => {
            const dateData = currentEventSlug
              ? getDateData(currentEventSlug, date)
              : null;
            return (
              dateData &&
              dateData.tables.some((t) => t.quantity > 0) &&
              dateData.isDepositEnabled
            );
          }) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">
                Payment Options
              </h4>

              {/* Scrollable Payment Options List */}
              <div className="max-h-[180px] overflow-y-auto space-y-2 payment-options-scroll">
                {availableDates.map((date) => {
                  const dateData = currentEventSlug
                    ? getDateData(currentEventSlug, date)
                    : null;
                  if (!dateData) return null;

                  const formatDate = (dateString: string) => {
                    try {
                      return new Date(dateString).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      });
                    } catch {
                      return dateString;
                    }
                  };

                  // Get payment amounts for this specific date
                  const paymentAmounts = currentEventSlug
                    ? getPaymentAmounts(currentEventSlug, date)
                    : { todayAmount: 0, laterAmount: 0 };
                  const fullDateAmount =
                    dateData.tables
                      .filter((t) => t.quantity > 0)
                      .reduce((sum, t) => {
                        // For tables: calculate based on actual guest allocation
                        const pricePerPerson = t.pricePerPerson || t.price;

                        if (t.allocation && t.allocation.length > 0) {
                          // Use actual guest allocation
                          const totalGuests = t.allocation.reduce(
                            (sum, guests) => sum + guests,
                            0
                          );
                          // Only charge if guests are actually allocated
                          if (totalGuests > 0) {
                            return sum + pricePerPerson * totalGuests;
                          } else {
                            return sum + 0; // No guests allocated = no cost
                          }
                        } else {
                          // No allocation = no cost (0 guests)
                          return sum + 0;
                        }
                      }, 0) +
                    dateData.tickets
                      .filter((t) => t.quantity > 0)
                      .reduce((sum, t) => sum + t.price * t.quantity, 0) +
                    dateData.drinks
                      .filter((d) => d.quantity > 0)
                      .reduce((sum, d) => sum + d.price * d.quantity, 0);

                  // Hide payment options if total amount is 0
                  if (fullDateAmount === 0) return null;

                  // Calculate item counts for this date
                  const totalTables = dateData.tables
                    .filter((t) => t.quantity > 0)
                    .reduce((sum, t) => sum + t.quantity, 0);
                  const totalTickets = dateData.tickets
                    .filter((t) => t.quantity > 0)
                    .reduce((sum, t) => sum + t.quantity, 0);
                  const totalDrinks = dateData.drinks
                    .filter((d) => d.quantity > 0)
                    .reduce((sum, d) => sum + d.quantity, 0);
                  const hasDrinks = totalDrinks > 0;

                  return (
                    <div
                      key={date}
                      className="border rounded-lg p-2.5 bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-900 truncate">
                            {formatDate(date)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                          £{fullDateAmount.toFixed(2)}
                        </span>
                      </div>

                      {/* Items Summary - Tables, Tickets, Drinks */}
                      <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
                        {totalTables > 0 && (
                          <div className="flex items-center gap-1">
                            <UtensilsCrossed className="h-3 w-3" />
                            <span>
                              {totalTables} table{totalTables !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        {totalTickets > 0 && (
                          <div className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" />
                            <span>
                              {totalTickets} ticket
                              {totalTickets !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        {hasDrinks && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Wine className="h-3 w-3" />
                            <span className="font-medium">Drinks Included</span>
                          </div>
                        )}
                      </div>

                      {/* Payment Type Toggle - Responsive */}
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`payment-${date}`}
                              value="full"
                              checked={
                                (dateData.paymentType || "full") === "full"
                              }
                              onChange={() =>
                                updatePaymentType(
                                  currentEventSlug!,
                                  date,
                                  "full"
                                )
                              }
                              className="text-green-600 flex-shrink-0"
                            />
                            <span className="text-xs font-medium text-green-700 whitespace-nowrap">
                              Pay in Full
                            </span>
                            <span className="text-xs text-gray-600 hidden sm:inline">
                              {dateData.tables.some((t) => t.quantity > 0) &&
                              dateData.isDepositEnabled
                                ? "Simple"
                                : "Only Option"}
                            </span>
                          </label>
                        </div>
                        {dateData.tables.some((t) => t.quantity > 0) &&
                          dateData.isDepositEnabled && (
                            <div className="flex-1 min-w-0">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`payment-${date}`}
                                  value="deposit"
                                  checked={
                                    (dateData.paymentType || "full") ===
                                    "deposit"
                                  }
                                  onChange={() =>
                                    updatePaymentType(
                                      currentEventSlug!,
                                      date,
                                      "deposit"
                                    )
                                  }
                                  className="text-blue-600 flex-shrink-0"
                                />
                                <span className="text-xs font-medium text-blue-700 whitespace-nowrap">
                                  Pay Deposit
                                </span>
                                <span className="text-xs text-gray-600 hidden sm:inline">
                                  Flexible
                                </span>
                              </label>
                            </div>
                          )}
                      </div>

                      {/* Payment Amount Display */}
                      {dateData.paymentType === "deposit" &&
                      dateData.tables.some((t) => t.quantity > 0) &&
                      dateData.isDepositEnabled ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-600">Today:</span>
                            <span className="font-medium text-blue-600">
                              £{paymentAmounts.todayAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-orange-600">Later:</span>
                            <span className="font-medium text-orange-600">
                              £{paymentAmounts.laterAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Deposit:{" "}
                            {dateData.depositType === "percentage"
                              ? `${dateData.depositValue}%`
                              : `£${dateData.depositValue} per person`}
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between text-xs">
                          <span className="text-green-600">Today:</span>
                          <span className="font-medium text-green-600">
                            £{paymentAmounts.todayAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Booking Summary - No Duplication */}
          <div className="space-y-2">
            {/* Total Booking Amount - Simple Display */}
            <div className="flex justify-between items-center py-1.5">
              <span className="text-sm font-medium text-gray-700">
                Booking Total
              </span>
              <span className="text-lg font-bold text-gray-900">
                £{(totalToday + totalLater).toFixed(2)}
              </span>
            </div>

            {/* Show payment split info only if deposit selected */}
            {totalLater > 0 && (
              <div className="text-xs text-gray-500">
                Split payment: £{totalToday.toFixed(2)} today + £
                {totalLater.toFixed(2)} later
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Gateway Selection */}
          {currentEventApiData?.payment_gateways &&
            Array.isArray(currentEventApiData.payment_gateways) &&
            currentEventApiData.payment_gateways.length > 0 && (
              <>
                <PaymentGatewaySelector
                  availableGateways={
                    currentEventApiData.payment_gateways as Array<{
                      id: number;
                      slug: string;
                    }>
                  }
                  selectedGateway={selectedGateway}
                  onGatewaySelect={setSelectedGateway}
                  disabled={false}
                  showError={
                    !selectedGateway && !isPaymentBlocked && !isProcessing
                  }
                />
              </>
            )}

          <Separator />

          {/* Amount to Pay Today - Clear and Actionable */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-900">
                Amount to Pay Today
              </span>
              <span className="text-2xl font-bold text-blue-600">
                £{finalTotal.toFixed(2)}
              </span>
            </div>

            {totalLater > 0 && (
              <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-blue-200">
                Balance of £{totalLater.toFixed(2)} due before event date
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-green-700 mt-2">
              <Shield className="h-3 w-3" />
              <span>Secure SSL encrypted</span>
            </div>
          </div>

          <Separator />

          {/* Secure Checkout Button */}
          {availableDates.length > 0 && (
            <div className="space-y-3">
              <Button
                size="lg"
                variant="event-primary"
                onClick={(e) => {
                  // 🛡️ CRITICAL: Prevent double-click immediately
                  if (
                    isProcessing ||
                    processCheckoutMutation.isPending ||
                    isCheckoutInProgressRef.current
                  ) {
                    e.preventDefault();
                    console.log(
                      "🚫 Button click ignored - checkout already in progress"
                    );
                    return;
                  }

                  // Additional safety check before allowing payment
                  if (isPaymentBlocked) {
                    e.preventDefault();
                    if (hasValidationErrors) {
                      toast.error(
                        validationErrorMessage ||
                          "Please select at least one table or ticket for each date"
                      );
                    } else {
                      toast.error("Please save all changes first");
                    }
                    return;
                  }
                  handleProceedToPayment();
                }}
                disabled={
                  isProcessing ||
                  isPending ||
                  isPaymentBlocked ||
                  processCheckoutMutation.isPending ||
                  !selectedGateway
                }
                className="w-full py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ||
                isPending ||
                processCheckoutMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {processCheckoutMutation.isPending
                      ? "Processing Checkout..."
                      : "Processing Payment..."}
                  </>
                ) : isPaymentBlocked ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    {hasValidationErrors
                      ? "Validation Required"
                      : "Auto-saving... Please wait"}
                  </>
                ) : !selectedGateway ? (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Select Payment Method
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔒</span>
                    Secure Checkout
                  </>
                )}
              </Button>

              {/* Auto-Save Notice */}
              {isPaymentBlocked && !hasValidationErrors && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                    <span className="font-medium">
                      ⏳ Auto-saving your changes:
                    </span>{" "}
                    Your selections will be saved automatically in a few seconds
                  </p>
                </div>
              )}

              {/* Security Note */}
              {!isPaymentBlocked && !isProcessing && !isPending && (
                <div className="text-center">
                  <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                    <span className="font-medium">✓ Ready for Payment:</span>{" "}
                    All changes saved and validated
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
