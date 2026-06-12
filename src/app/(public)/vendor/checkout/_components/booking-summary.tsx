"use client";

import { useMemo, useState, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import BookingSummarySkeleton from "./booking-summary-skeleton-loader";
import {
  CreditCard,
  Shield,
  Clock,
  ChevronUp,
  ChevronDown,
  Check,
  Lock,
  Zap,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useGetCartData } from "@/services/customer/cart/query";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { useStoreEventBooking } from "@/services/customer/cart/query";
import {
  getAvailableDates,
  calculatePaymentAmounts,
  extractCurrentEventData,
  isRoomBasedCart,
  getCartRooms,
  getAllRoomDateKeys,
  getApiCartDateKeys,
  parseRoomDateKey,
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
import OrderViewBreakdown from "./order-view-breakdown";
import { cn } from "@/lib/utils";

const checkoutPayButtonClass = (disabled: boolean) =>
  cn(
    "rounded-xl font-bold shadow-lg transition-all duration-200",
    disabled
      ? "cursor-not-allowed border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)] text-[color:var(--checkout-muted-foreground)] hover:bg-[color:var(--checkout-muted)] hover:text-[color:var(--checkout-muted-foreground)]"
      : "bg-[color:var(--checkout-brand-primary)] text-white shadow-[color:var(--checkout-brand-primary)]/20 hover:!bg-[color:var(--checkout-brand-primary)] hover:!text-white hover:brightness-110 active:scale-[0.98]",
  );

type BookingSummaryProps = Record<string, never>;

export default function BookingSummary({}: BookingSummaryProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const isPreviewMode = useIsPreviewMode();
  const { isPending } = useStoreEventBooking();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showViewBreakdown, setShowViewBreakdown] = useState(false);
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

  const { getTotalPaymentBreakdown, getPaymentAmounts } = useCartEditStore();

  const { totalItems, totalToday, totalLater } = useMemo(() => {
    if (
      !currentEventApiData ||
      !currentEventSlug ||
      !editingData[currentEventSlug]
    ) {
      return { totalItems: 0, totalToday: 0, totalLater: 0 };
    }

    const paymentBreakdown = getTotalPaymentBreakdown(currentEventSlug);

    return {
      totalItems: getApiCartDateKeys(currentEventApiData).length,
      totalToday: paymentBreakdown.totalToday,
      totalLater: paymentBreakdown.totalLater,
    };
  }, [
    currentEventApiData,
    currentEventSlug,
    editingData,
    getTotalPaymentBreakdown,
  ]);

  const roomMode = useMemo(
    () => isRoomBasedCart(currentEventApiData),
    [currentEventApiData],
  );
  const rooms = useMemo(
    () => getCartRooms(currentEventApiData),
    [currentEventApiData],
  );

  const availableDates = useMemo(() => {
    if (!currentEventApiData) return [];
    if (roomMode) return getAllRoomDateKeys(currentEventApiData);
    return getAvailableDates(currentEventApiData);
  }, [currentEventApiData, roomMode]);

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
    const newPaymentTypes: Record<string, "full" | "deposit"> = {};
    getApiCartDateKeys(currentEventApiData).forEach((date) => {
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

  const totalGuests = useMemo(() => {
    if (!currentEventSlug) return 0;
    return availableDates.reduce((sum, dateKey) => {
      const dateData = getDateData(currentEventSlug, dateKey);
      if (!dateData) return sum;
      const fromPeople = dateData.peopleCount ?? 0;
      if (fromPeople > 0) return sum + fromPeople;
      return (
        sum +
        dateData.tables
          .filter((t) => t.quantity > 0)
          .reduce((tableSum, table) => {
            if (table.allocation?.length) {
              return (
                tableSum +
                table.allocation.reduce((guestSum, g) => guestSum + g, 0)
              );
            }
            return tableSum + (table.minPersons || 1) * table.quantity;
          }, 0)
      );
    }, 0);
  }, [availableDates, currentEventSlug, editingData, getDateData]);

  const summaryMetaLine = useMemo(() => {
    if (roomMode && rooms.length > 0) {
      return `${rooms.length} room${rooms.length > 1 ? "s" : ""} · ${totalItems} date${totalItems !== 1 ? "s" : ""} · ${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`;
    }
    return `${totalItems} date${totalItems !== 1 ? "s" : ""}${totalGuests > 0 ? ` · ${totalGuests} guest${totalGuests !== 1 ? "s" : ""}` : ""}`;
  }, [roomMode, rooms.length, totalItems, totalGuests]);

  const itineraryDates = useMemo(() => {
    if (!currentEventSlug) return [];
    return availableDates
      .map((dateKey) => {
        const dateData = getDateData(currentEventSlug, dateKey);
        if (!dateData) return null;

        const paymentAmounts = getPaymentAmounts(currentEventSlug, dateKey);
        const fullAmount =
          dateData.tables
            .filter((t) => t.quantity > 0)
            .reduce((sum, t) => {
              const pricePerPerson = t.pricePerPerson || t.price;
              if (t.allocation?.length) {
                const guests = t.allocation.reduce((s, g) => s + g, 0);
                return guests > 0 ? sum + pricePerPerson * guests : sum;
              }
              return sum;
            }, 0) +
          dateData.tickets
            .filter((t) => t.quantity > 0)
            .reduce((sum, t) => sum + t.price * t.quantity, 0) +
          dateData.drinks
            .filter((d) => d.quantity > 0)
            .reduce((sum, d) => sum + d.price * d.quantity, 0);

        return {
          key: dateKey,
          dateData,
          todayAmount: paymentAmounts.todayAmount,
          laterAmount: paymentAmounts.laterAmount,
          fullAmount,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  }, [
    availableDates,
    currentEventSlug,
    editingData,
    getDateData,
    getPaymentAmounts,
  ]);

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
  const platformFeeMeta = (
    currentEventApiData as unknown as {
      vendor_platform_fee?: { mode: "flat" | "percentage"; value: number };
    }
  )?.vendor_platform_fee;
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

  // Helper: Format date (handles composite "roomId:date" keys)
  const fmtDate = (dateString: string) => {
    try {
      const { date: actualDate } = parseRoomDateKey(dateString);
      return new Date(actualDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Helper: Get room name for a composite key
  const getRoomNameForKey = (key: string): string | null => {
    const { roomId } = parseRoomDateKey(key);
    if (roomId == null) return null;
    return rooms.find((r) => r.room_id === roomId)?.room_name ?? null;
  };

  // CTA button state — NEVER show "Saving Changes..."
  // Auto-save runs silently; we queue checkout if save is in progress
  const isCtaLoading =
    isProcessing || isPending || processCheckoutMutation.isPending;
  const isCtaDisabled =
    isCtaLoading ||
    (hasValidationErrors && isPaymentBlocked) ||
    !selectedGateway;

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

  // ──────────────────────────────────────────────
  // RENDER: ORDER SUMMARY CARD
  // ──────────────────────────────────────────────
  const OrderSummaryContent = () => (
    <div className="space-y-4">
      {availableDates.length > 0 && hasPayableTotal && (
        <OrderViewBreakdown
          isOpen={showViewBreakdown}
          onToggle={() => setShowViewBreakdown((open) => !open)}
          formatMoney={formatMoney}
          formatDate={fmtDate}
          getRoomName={roomMode ? getRoomNameForKey : undefined}
          rooms={roomMode ? rooms : undefined}
          dates={itineraryDates}
          totals={{
            subtotal: bookingGrandTotal,
            platformFee,
            dueToday: finalTotalWithFee,
            dueLater: totalLater,
            grandTotal: bookingGrandTotalWithFee,
          }}
        />
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
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              Deposit payment
            </p>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Due today</span>
              <span className="font-semibold tabular-nums text-gray-900">
                {formatMoney(finalTotalWithFee)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-blue-700">
              <span>Due later</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(totalLater)}
              </span>
            </div>
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
          <p className="text-xs text-gray-500">
            Full booking value {formatMoney(bookingGrandTotalWithFee)} — balance
            of {formatMoney(totalLater)} due before your event
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
              showError={!selectedGateway && !isPaymentBlocked && !isProcessing}
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
            className={cn(
              "h-12 w-full text-sm",
              checkoutPayButtonClass(isCtaDisabled),
            )}
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
            <div className="grid grid-cols-3 gap-1.5">
              <span className="checkout-trust-badge">SSL Encrypted</span>
              <span className="checkout-trust-badge">Secure Payment</span>
              <span className="checkout-trust-badge">Instant Confirm</span>
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
      {/* ── DESKTOP: Sticky floating sidebar (Lovable) ── */}
      <div className="hidden lg:block">
        <div className="sticky top-[var(--checkout-header-offset)] z-30 w-full space-y-4 self-start">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--checkout-border)] bg-white shadow-sm">
            <div className="border-b border-[color:var(--checkout-border)] px-6 py-5">
              <h2 className="text-sm font-bold tracking-tight text-[color:var(--checkout-brand-primary)]">
                Order Summary
              </h2>
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--checkout-muted-foreground)]">
                  Total
                </p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-[color:var(--checkout-brand-primary)]">
                  {hasPayableTotal ? formatMoney(finalTotalWithFee) : "—"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--checkout-muted-foreground)]">
                  {summaryMetaLine}
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <OrderSummaryContent />
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--checkout-border)] bg-white p-4">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--checkout-brand-accent)]" />
              <div>
                <p className="text-xs font-semibold text-[color:var(--checkout-foreground)]">
                  Need assistance?
                </p>
                <p className="mt-1 text-xs text-[color:var(--checkout-muted-foreground)]">
                  Our concierge team is available 24/7. Contact your venue for
                  booking support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE: Fixed Bottom Bar + Expandable Drawer ── */}
      <div className="lg:hidden">
        {/* Fixed Bottom Bar */}
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--checkout-border)] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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
                <div className="max-h-[min(65vh,560px)] overflow-y-auto overscroll-contain p-4 pb-2 [-webkit-overflow-scrolling:touch]">
                  <h2 className="mb-4 text-base font-semibold text-[color:var(--checkout-brand-primary)]">
                    Order Summary
                  </h2>
                  <OrderSummaryContent />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Bar — total + expandable summary + CTA */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-[max(0.75rem,var(--checkout-mobile-safe-bottom))] sm:gap-3 sm:px-4 sm:pt-3">
            <button
              type="button"
              onClick={() => setShowMobileDrawer(!showMobileDrawer)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-expanded={showMobileDrawer}
              aria-label="Toggle order summary"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[color:var(--checkout-muted-foreground)]">
                  {totalLater > 0 ? "Due Today" : "Total"}
                </p>
                <p className="truncate text-base font-bold tabular-nums text-[color:var(--checkout-brand-primary)] sm:text-lg">
                  {hasPayableTotal ? formatMoney(finalTotalWithFee) : "—"}
                </p>
                {summaryMetaLine ? (
                  <p className="truncate text-[10px] text-[color:var(--checkout-muted-foreground)]">
                    {summaryMetaLine}
                  </p>
                ) : null}
              </div>
              {showMobileDrawer ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--checkout-muted-foreground)]" />
              ) : (
                <ChevronUp className="h-4 w-4 shrink-0 text-[color:var(--checkout-muted-foreground)]" />
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
              className={cn(
                "h-11 max-w-[48%] shrink-0 px-3 text-xs font-semibold min-[400px]:max-w-none min-[400px]:px-4 min-[400px]:text-sm sm:px-6",
                checkoutPayButtonClass(isCtaDisabled),
              )}
            >
              {isCtaLoading ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="hidden min-[360px]:inline">
                    Processing...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {!isCtaDisabled && <Lock className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">
                    {isCtaDisabled ? (
                      hasValidationErrors ? (
                        "Complete"
                      ) : (
                        "Select"
                      )
                    ) : hasPayableTotal ? (
                      <>
                        <span className="min-[400px]:hidden">Pay now</span>
                        <span className="hidden min-[400px]:inline">
                          {`Pay ${formatMoney(finalTotalWithFee)}`}
                        </span>
                      </>
                    ) : (
                      "Checkout"
                    )}
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
