"use client";

import { useMemo, useState, useRef } from "react";
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
  ChevronUp,
  ChevronDown,
  Check,
  Lock,
  Zap,
  BadgeCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useGetCartData } from "@/services/customer/cart/query";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { useStoreEventBooking } from "@/services/customer/cart/query";
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
import { useCurrencyFormat } from "@/hooks/use-currency-format";

type BookingSummaryProps = Record<string, never>;

export default function BookingSummary({}: BookingSummaryProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const isPreviewMode = useIsPreviewMode();
  const { isPending } = useStoreEventBooking();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDateBreakdown, setShowDateBreakdown] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const isCheckoutInProgressRef = useRef(false);

  const { selectedGateway, setSelectedGateway } = usePaymentGatewaySelection();
  const processCheckoutMutation = useProcessCheckout();

  const {
    data: apiCartData,
    isLoading: isLoadingCartData,
    isFetching: isFetchingCartData,
  } = useGetCartData(!isPreviewMode);

  const {
    getDateData,
    editingData,
    hasUnsavedChanges,
    validateDateRequirements,
  } = useCartEditStore();

  const { currentEventSlug, currentEventApiData } = useMemo(() => {
    const { currentEventSlug, currentEventApiData } =
      extractCurrentEventData(apiCartData);
    return { currentEventSlug, currentEventApiData };
  }, [apiCartData]);

  const { getTotalPaymentBreakdown, updatePaymentType, getPaymentAmounts } =
    useCartEditStore();

  const { totalItems, totalToday, totalLater } = useMemo(() => {
    if (
      !currentEventApiData ||
      !currentEventSlug ||
      !editingData[currentEventSlug]
    ) {
      return { totalItems: 0, totalToday: 0, totalLater: 0 };
    }

    const availableDates = getAvailableDates(currentEventApiData);
    const paymentBreakdown = getTotalPaymentBreakdown(currentEventSlug);

    return {
      totalItems: availableDates.length,
      totalToday: paymentBreakdown.totalToday,
      totalLater: paymentBreakdown.totalLater,
    };
  }, [
    currentEventApiData,
    currentEventSlug,
    editingData,
    getTotalPaymentBreakdown,
  ]);

  const availableDates = useMemo(() => {
    if (!currentEventApiData) return [];
    return getAvailableDates(currentEventApiData);
  }, [currentEventApiData]);

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
          if (hasUnsavedChanges(currentEventSlug, date)) {
            hasUnsaved = true;
          }
          const validation = validateDateRequirements(currentEventSlug, date);
          if (!validation.isValid) {
            hasValidationErrors = true;
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
      editingData,
      getDateData,
      hasUnsavedChanges,
      validateDateRequirements,
    ]);

  // Checkout handler
  const handleProceedToPayment = async () => {
    if (
      isProcessing ||
      processCheckoutMutation.isPending ||
      isCheckoutInProgressRef.current
    ) {
      return;
    }

    isCheckoutInProgressRef.current = true;
    setIsProcessing(true);

    try {
      if (!currentEventApiData) {
        throw new Error(
          "Event data not available. Please refresh the page and try again.",
        );
      }
      if (availableDates.length === 0) {
        throw new Error(
          "No dates selected. Please add items to your cart first.",
        );
      }
      if (!currentEventSlug) {
        throw new Error(
          "No event selected. Please add items to your cart first.",
        );
      }
      if (!selectedGateway) {
        return;
      }

      const validation = validateCheckoutRequirements(
        currentEventSlug,
        editingData,
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      const checkoutData = transformCartToCheckout(
        currentEventSlug,
        editingData,
        apiCartData,
        selectedGateway,
      );
      if (!checkoutData) {
        throw new Error("Failed to prepare checkout data. Please try again.");
      }

      const summary = calculateCheckoutSummary(
        currentEventSlug,
        editingData,
        apiCartData,
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
      await processCheckoutMutation.mutateAsync(checkoutData);
    } catch (error) {
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

  const initializedPaymentTypes = useMemo(() => {
    if (!currentEventApiData) return {};
    const availableDates = getAvailableDates(currentEventApiData);
    const newPaymentTypes: Record<string, "full" | "deposit"> = {};
    availableDates.forEach((date) => {
      newPaymentTypes[date] = "full";
    });
    return newPaymentTypes;
  }, [currentEventApiData]);

  useMemo(() => {
    return calculatePaymentAmounts(
      currentEventApiData,
      initializedPaymentTypes,
      currentEventSlug ?? undefined,
      getDateData,
    );
  }, [
    currentEventApiData,
    initializedPaymentTypes,
    currentEventSlug,
    getDateData,
  ]);

  // Count total items for mobile bar — MUST be before early returns (Rules of Hooks)
  const totalItemCount = useMemo(() => {
    let count = 0;
    availableDates.forEach((date) => {
      const dateData = currentEventSlug ? getDateData(currentEventSlug, date) : null;
      if (dateData) {
        count += dateData.tables.filter(t => t.quantity > 0).reduce((s, t) => s + t.quantity, 0);
        count += dateData.tickets.filter(t => t.quantity > 0).reduce((s, t) => s + t.quantity, 0);
        count += dateData.drinks.filter(d => d.quantity > 0).reduce((s, d) => s + d.quantity, 0);
      }
    });
    return count;
  }, [availableDates, currentEventSlug, editingData, getDateData]);

  // Show skeleton only on initial load
  const isInitialLoad = isLoadingCartData && !apiCartData;
  if (isInitialLoad) {
    return <BookingSummarySkeleton />;
  }

  // Empty cart state
  if (!isFetchingCartData && (!currentEventApiData || totalItems === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="w-12 h-12 mx-auto bg-gray-50 rounded-xl flex items-center justify-center mb-3">
          <CreditCard className="w-5 h-5 text-gray-300" />
        </div>
        <h3 className="font-medium text-sm text-gray-700 mb-1">
          Order Summary
        </h3>
        <p className="text-xs text-gray-400">
          Add items to see your order total
        </p>
      </div>
    );
  }

  const finalTotal = totalToday;
  const bookingGrandTotal = totalToday + totalLater;
  const hasPayableTotal = bookingGrandTotal > 0;

  // Platform fee
  const platformFeeMeta = (currentEventApiData as unknown as {
    vendor_platform_fee?: { mode: "flat" | "percentage"; value: number };
  })?.vendor_platform_fee;
  const platformFeeRaw =
    hasPayableTotal && platformFeeMeta
      ? platformFeeMeta.mode === "flat"
        ? Number(platformFeeMeta.value || 0)
        : (bookingGrandTotal * Number(platformFeeMeta.value || 0)) / 100
      : 0;
  const platformFee =
    Number.isFinite(platformFeeRaw) && platformFeeRaw > 0
      ? Number(platformFeeRaw.toFixed(2))
      : 0;

  const bookingGrandTotalWithFee = bookingGrandTotal + platformFee;
  const finalTotalWithFee = finalTotal + platformFee;

  if (!currentEventApiData) {
    return null;
  }

  // Helper: Format date
  const fmtDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // CTA button state — NEVER show "Saving Changes..."
  // Auto-save runs silently; we queue checkout if save is in progress
  const isCtaLoading =
    isProcessing || isPending || processCheckoutMutation.isPending;
  const isCtaDisabled =
    isCtaLoading || (hasValidationErrors && isPaymentBlocked) || !selectedGateway;
  
  // Dynamic CTA label with exact amount
  const ctaLabel = isCtaLoading
    ? "Processing..."
    : hasValidationErrors
      ? "Complete Selections"
      : !selectedGateway
        ? "Select Payment Method"
        : hasPayableTotal
          ? `Pay ${formatMoney(finalTotalWithFee)} Now`
          : "Continue to Payment";

  // totalItemCount is computed above (before early returns) to comply with Rules of Hooks

  // ──────────────────────────────────────────────
  // RENDER: ORDER SUMMARY CARD
  // ──────────────────────────────────────────────
  const OrderSummaryContent = () => (
    <div className="space-y-4">
      {/* ── Per-Date Breakdown ── */}
      {availableDates.length > 0 && (
        <div>
          {/* Collapsible date details */}
          {availableDates.length > 1 && (
            <button
              onClick={() => setShowDateBreakdown(!showDateBreakdown)}
              className="flex items-center justify-between w-full text-left mb-2 py-1"
            >
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {totalItems} date{totalItems !== 1 ? "s" : ""} selected
              </span>
              {showDateBreakdown ? (
                <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
          )}

          <AnimatePresence>
            {(availableDates.length === 1 || showDateBreakdown) && (
              <motion.div
                initial={availableDates.length > 1 ? { opacity: 0, height: 0 } : false}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {availableDates.map((date) => {
                  const dateData = currentEventSlug
                    ? getDateData(currentEventSlug, date)
                    : null;
                  if (!dateData) return null;

                  const paymentAmounts = currentEventSlug
                    ? getPaymentAmounts(currentEventSlug, date)
                    : { todayAmount: 0, laterAmount: 0 };

                  const fullDateAmount =
                    dateData.tables
                      .filter((t) => t.quantity > 0)
                      .reduce((sum, t) => {
                        const pricePerPerson = t.pricePerPerson || t.price;
                        if (t.allocation && t.allocation.length > 0) {
                          const totalGuests = t.allocation.reduce(
                            (sum, guests) => sum + guests,
                            0,
                          );
                          if (totalGuests > 0) {
                            return sum + pricePerPerson * totalGuests;
                          }
                          return sum;
                        }
                        return sum;
                      }, 0) +
                    dateData.tickets
                      .filter((t) => t.quantity > 0)
                      .reduce((sum, t) => sum + t.price * t.quantity, 0) +
                    dateData.drinks
                      .filter((d) => d.quantity > 0)
                      .reduce((sum, d) => sum + d.price * d.quantity, 0);

                  if (fullDateAmount === 0) return null;

                  const totalTables = dateData.tables
                    .filter((t) => t.quantity > 0)
                    .reduce((sum, t) => sum + t.quantity, 0);
                  const totalTickets = dateData.tickets
                    .filter((t) => t.quantity > 0)
                    .reduce((sum, t) => sum + t.quantity, 0);
                  const totalDrinks = dateData.drinks
                    .filter((d) => d.quantity > 0)
                    .reduce((sum, d) => sum + d.quantity, 0);

                  return (
                    <div
                      key={date}
                      className="rounded-xl bg-gray-50 border border-gray-100 p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-700">
                            {fmtDate(date)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatMoney(fullDateAmount)}
                        </span>
                      </div>

                      {/* Item summary pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {totalTables > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            <UtensilsCrossed className="h-2.5 w-2.5" />
                            {totalTables} table{totalTables > 1 ? "s" : ""}
                          </span>
                        )}
                        {totalTickets > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <Ticket className="h-2.5 w-2.5" />
                            {totalTickets} ticket{totalTickets > 1 ? "s" : ""}
                          </span>
                        )}
                        {totalDrinks > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            <Wine className="h-2.5 w-2.5" />
                            {totalDrinks} drink{totalDrinks > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Payment type toggle for this date */}
                      {dateData.tables.some((t) => t.quantity > 0) &&
                        dateData.isDepositEnabled && (
                          <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                            <div className="flex rounded-lg bg-white border border-gray-200 p-0.5">
                              <button
                                onClick={() =>
                                  updatePaymentType(
                                    currentEventSlug!,
                                    date,
                                    "full",
                                  )
                                }
                                className={`flex-1 text-center py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-200 ${
                                  (dateData.paymentType || "full") === "full"
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Pay in Full
                              </button>
                              <button
                                onClick={() =>
                                  updatePaymentType(
                                    currentEventSlug!,
                                    date,
                                    "deposit",
                                  )
                                }
                                className={`flex-1 text-center py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-200 ${
                                  (dateData.paymentType || "full") === "deposit"
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Pay Deposit
                              </button>
                            </div>

                            {dateData.paymentType === "deposit" && (
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-blue-600">Due today</span>
                                  <span className="font-medium text-blue-600">
                                    {formatMoney(paymentAmounts.todayAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-400">Due later</span>
                                  <span className="font-medium text-gray-400">
                                    {formatMoney(paymentAmounts.laterAmount)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  Deposit:{" "}
                                  {dateData.depositType === "percentage"
                                    ? `${dateData.depositValue}%`
                                    : `${formatMoney(Number(dateData.depositValue))} per person`}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Separator className="bg-gray-100" />

      {/* ── Pricing Summary ── */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Subtotal</span>
          {hasPayableTotal ? (
            <span className="text-sm font-medium text-gray-900 tabular-nums">
              {formatMoney(bookingGrandTotal)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>

        {hasPayableTotal && platformFee > 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {platformFeeMeta?.mode === "percentage"
                ? `Service fee (${platformFeeMeta.value}%)`
                : "Service fee"}
            </span>
            <span className="tabular-nums">{formatMoney(platformFee)}</span>
          </div>
        )}

        {hasPayableTotal && totalLater > 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Due later</span>
            <span className="tabular-nums">−{formatMoney(totalLater)}</span>
          </div>
        )}

        <Separator className="bg-gray-100" />

        <div className="flex justify-between items-center pt-1">
          <span className="text-sm font-semibold text-gray-900">
            {totalLater > 0 ? "Due Today" : "Total"}
          </span>
          {hasPayableTotal ? (
            <span className="text-xl font-bold text-gray-900 tabular-nums">
              {formatMoney(finalTotalWithFee)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">
              Add items to calculate
            </span>
          )}
        </div>

        {hasPayableTotal && totalLater > 0 && (
          <p className="text-xs text-gray-400">
            + {formatMoney(totalLater)} due before event
          </p>
        )}
      </div>

      <Separator className="bg-gray-100" />

      {/* ── Payment Method ── */}
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
            <Separator className="bg-gray-100" />
          </>
        )}

      {/* ── CTA Button ── Dynamic label with exact amount */}
      {availableDates.length > 0 && (
        <div className="space-y-3">
          <Button
            size="lg"
            onClick={(e) => {
              if (
                isProcessing ||
                processCheckoutMutation.isPending ||
                isCheckoutInProgressRef.current
              ) {
                e.preventDefault();
                return;
              }
              if (hasValidationErrors) {
                e.preventDefault();
                toast.error(
                  validationErrorMessage ||
                    "Please select at least one table or ticket for each date",
                );
                return;
              }
              handleProceedToPayment();
            }}
            disabled={isCtaDisabled}
            className={`w-full rounded-xl h-12 text-sm font-semibold shadow-sm transition-all duration-200 ${
              isCtaDisabled
                ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:scale-[0.98] shadow-blue-200"
            }`}
          >
            {isCtaLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {!isCtaDisabled && <Lock className="h-4 w-4" />}
                <span>{ctaLabel}</span>
              </div>
            )}
          </Button>

          {/* Trust signals — enhanced with more recognizable badges */}
          {hasPayableTotal && !hasValidationErrors && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Instant Confirmation</span>
                </div>
              </div>
            </div>
          )}

          {/* Status messages */}
          {!hasValidationErrors && !isProcessing && !isPending && (
            <div className="text-center">
              {hasPayableTotal ? (
                <p className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                  <Check className="h-3 w-3" />
                  Ready for payment
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  Add items to your cart to continue
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP: Sticky Sidebar ── */}
      <motion.div
        className="hidden lg:block"
        {...ANIMATION_VARIANTS.FADE_IN_UP}
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-16 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-blue-600" />
            Order Summary
          </h2>
          <OrderSummaryContent />
        </div>
      </motion.div>

      {/* ── MOBILE: Fixed Bottom Bar + Expandable Drawer ── */}
      <div className="lg:hidden">
        {/* Spacer to prevent content from hiding behind fixed bar */}
        <div className="h-20" />

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          {/* Expandable Drawer */}
          <AnimatePresence>
            {showMobileDrawer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden border-b border-gray-100"
              >
                <div className="max-h-[60vh] overflow-y-auto p-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">
                    Order Summary
                  </h2>
                  <OrderSummaryContent />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Bar — shows item count + total + CTA */}
          <div className="flex items-center justify-between px-4 py-3 safe-area-padding">
            <button
              onClick={() => setShowMobileDrawer(!showMobileDrawer)}
              className="flex items-center gap-2"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-gray-500">
                    {totalItemCount > 0 ? (
                      <span>{totalItemCount} item{totalItemCount !== 1 ? "s" : ""} · </span>
                    ) : null}
                    {totalLater > 0 ? "Due Today" : "Total"}
                  </p>
                </div>
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {hasPayableTotal ? formatMoney(finalTotalWithFee) : "—"}
                </p>
              </div>
              {showMobileDrawer ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              )}
            </button>

            <Button
              onClick={(e) => {
                if (isCtaLoading || isCheckoutInProgressRef.current) {
                  e.preventDefault();
                  return;
                }
                if (hasValidationErrors) {
                  e.preventDefault();
                  toast.error(
                    validationErrorMessage ||
                      "Please select at least one table or ticket",
                  );
                  return;
                }
                handleProceedToPayment();
              }}
              disabled={isCtaDisabled}
              className={`rounded-xl h-11 px-6 text-sm font-semibold transition-all duration-200 ${
                isCtaDisabled
                  ? "bg-gray-100 text-gray-400"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] shadow-sm shadow-blue-200"
              }`}
            >
              {isCtaLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {!isCtaDisabled && <Lock className="h-3.5 w-3.5" />}
                  <span>
                    {isCtaDisabled
                      ? (hasValidationErrors ? "Complete Selections" : "Select items")
                      : hasPayableTotal
                        ? `Pay ${formatMoney(finalTotalWithFee)}`
                        : "Checkout"}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
