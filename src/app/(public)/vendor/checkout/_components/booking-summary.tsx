"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import BookingSummarySkeleton from "./booking-summary-skeleton-loader";
import {
  CreditCard,
  ChevronUp,
  ChevronDown,
  Lock,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useGetCartData } from "@/services/customer/cart/query";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { useStoreEventBooking } from "@/services/customer/cart/query";
import {
  getAvailableDates,
  extractCurrentEventData,
  isRoomBasedCart,
  getCartRooms,
  getAllRoomDateKeys,
  getApiCartDateKeys,
  getApiDateData,
  parseRoomDateKey,
  calculateEditableDateTotal,
  calculateEditableCartDiscountableTotal,
  calculateEditableDateDrinksTotal,
  isDepositChoiceAvailable,
  hasUnconfirmedTableSeating,
  calculateUnconfirmedTablesTotal,
  getDateGuestCount,
  resolveCartDateDiscounts,
} from "../_lib/cart-calculations";
import {
  transformCartToCheckout,
  validateCheckoutRequirements,
  calculateCheckoutSummary,
  applyDiscountThenSplitPayment,
  checkoutMoneyEquals,
} from "../_lib/checkout-utils";
import {
  useProcessCheckout,
  useResumeCheckout,
  resolveCheckoutPaymentAction,
} from "@/services/customer/checkout";
import type { CheckoutStripePaymentSession } from "@/services/customer/checkout";
import { invalidateCustomerBookingsList } from "@/services/customer/bookings/query";
import { buildCheckoutStripeSession, mergeStripePaymentSession } from "@/services/customer/checkout/checkout-payment";
import { getStripePromise } from "@/lib/stripe/stripe-loader";
import { handleCheckoutError } from "@/services/customer/checkout/utils";
import { useCheckoutPaymentUiStore } from "@/store/checkout-payment-ui.store";
import { useCheckoutPromoStore } from "@/store/checkout-promo.store";
import { useCartEditStore } from "@/store/cart-edit.store";
import { usePaymentGatewaySelection } from "@/store/payment-gateway-selection.store";
import PaymentGatewaySelector, {
  formatCheckoutGatewayContinuePrompt,
} from "./payment-gateway-selector";
import CheckoutStripePaymentModal from "./checkout-stripe-payment-modal";
import { PaymentSessionCountdownPill } from "./payment-session-countdown-pill";
import { usePaymentSessionCountdown, formatPaymentTimeRemainingVerbose } from "../_lib/use-payment-session-countdown";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import OrderViewBreakdown from "./order-view-breakdown";
import PerDatePaymentSelection from "./per-date-payment-selection";
import {
  CheckoutPromoPanel,
  resolveCartEventCoupon,
  resolveCheckoutPromoTotals,
  type CheckoutPromoApplied,
} from "./checkout-promo-panel";
import { focusCheckoutDate } from "../_lib/checkout-date-focus";
import { cn } from "@/lib/utils";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCheckoutMobileChromeHeight } from "@/hooks/use-preview-review-chrome-height";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  assessCheckoutDatesReadiness,
  countCheckoutDateStatuses,
  findFirstIncompleteCheckoutDate,
  formatCheckoutBookingMetaLine,
  resolveCheckoutCtaState,
} from "../_lib/checkout-readiness";

const checkoutPayButtonClass = (disabled: boolean) =>
  cn(
    "rounded-xl font-bold shadow-lg transition-all duration-200 disabled:opacity-100",
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
  const isMobileViewport = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    if (!isMobileViewport) setShowMobileDrawer(false);
  }, [isMobileViewport]);
  const couponCode = useCheckoutPromoStore((s) => s.couponCode);
  const setCouponCode = useCheckoutPromoStore((s) => s.setCouponCode);
  const checkoutPromo: CheckoutPromoApplied = {
    couponCode,
  };
  const setCheckoutPromo = (promo: CheckoutPromoApplied) => {
    setCouponCode(promo.couponCode);
  };
  const [isStripePaymentOpen, setIsStripePaymentOpen] = useState(false);
  const [justExpiredBookingNumber, setJustExpiredBookingNumber] = useState<
    string | null
  >(null);
  const isCheckoutInProgressRef = useRef(false);
  const stripePaymentCompletedRef = useRef(false);
  const expireHandledRef = useRef(false);
  const hasLoadedCartRef = useRef(false);

  // Session persisted in sessionStorage — survives page refresh
  const {
    stripePaymentSession,
    setStripePaymentSession,
    clearPaymentSession,
    completePaymentSession,
    markPendingPaymentExpired,
    clearExpiredPaymentNotice,
    expiredPendingBookingNumbers,
  } = useCheckoutPaymentUiStore();

  // On mount — warm up Stripe.js if we already have a session (page refresh restore
  // via Zustand sessionStorage persist). This avoids an extra round-trip when the
  // payment modal is opened.
  useEffect(() => {
    if (stripePaymentSession?.publishableKey) {
      void getStripePromise(stripePaymentSession.publishableKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { selectedGateway, setSelectedGateway } = usePaymentGatewaySelection();
  const processCheckoutMutation = useProcessCheckout();
  const resumeCheckoutMutation = useResumeCheckout();
  const queryClient = useQueryClient();

  const {
    data: apiCartData,
    isLoading: isLoadingCartData,
    isFetching: isFetchingCartData,
  } = useGetCartData(!isPreviewMode);

  useEffect(() => {
    if (apiCartData) {
      hasLoadedCartRef.current = true;
    }
  }, [apiCartData]);

  const {
    getDateData,
    editingData,
    hasUnsavedChanges,
    validateDateRequirements,
    updatePaymentType,
    clearAllCarts,
  } = useCartEditStore();

  const { clearDrinksForNewEvent } = useDrinkSelectionStore();

  const expireSession = useCallback(() => {
    if (expireHandledRef.current) return;

    const bookingNumber =
      useCheckoutPaymentUiStore.getState().stripePaymentSession?.bookingNumber;
    if (!bookingNumber) return;

    expireHandledRef.current = true;
    markPendingPaymentExpired(bookingNumber);
    setJustExpiredBookingNumber(bookingNumber);
    setIsStripePaymentOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["cart-data"] });

    toast.error("Payment session expired", {
      description:
        "Your items are still in your cart. Start checkout again when you're ready.",
      duration: 8000,
    });

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      requestAnimationFrame(() => {
        document
          .getElementById("checkout-cart-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [markPendingPaymentExpired, queryClient]);

  useEffect(() => {
    if (stripePaymentSession?.bookingNumber) {
      expireHandledRef.current = false;
    }
  }, [stripePaymentSession?.bookingNumber]);

  // Date delete / Clear all clears the payment session — close the Stripe modal
  // so it cannot stay open over an empty cart.
  useEffect(() => {
    if (!stripePaymentSession) {
      setIsStripePaymentOpen(false);
    }
  }, [stripePaymentSession]);

  const sessionSecondsLeft = usePaymentSessionCountdown(
    stripePaymentSession?.expiresAt,
    expireSession,
  );

  // Refresh expiry when a restored session has no countdown (common on /resume omit).
  useEffect(() => {
    const bookingNumber = stripePaymentSession?.bookingNumber;
    if (!bookingNumber || stripePaymentSession.expiresAt) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await resumeCheckoutMutation.mutateAsync({
          booking_number: bookingNumber,
        });
        if (cancelled || !response.status || !response.data) return;
        const paymentAction = resolveCheckoutPaymentAction(response.data);
        if (paymentAction?.type !== "stripe" || !paymentAction.session.expiresAt) {
          return;
        }
        setStripePaymentSession(
          mergeStripePaymentSession(
            useCheckoutPaymentUiStore.getState().stripePaymentSession,
            paymentAction.session,
          ),
        );
      } catch {
        // Silent — banner still prompts user to pay; resume runs again on CTA tap.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    stripePaymentSession?.bookingNumber,
    stripePaymentSession?.expiresAt,
    resumeCheckoutMutation,
    setStripePaymentSession,
  ]);

  const { currentEventSlug, currentEventApiData } = useMemo(() => {
    const { currentEventSlug, currentEventApiData } =
      extractCurrentEventData(apiCartData);
    return { currentEventSlug, currentEventApiData };
  }, [apiCartData]);

  // Cross-device restore — when the cart API returns a `pending_payment` field
  // (backend includes it when the customer has an unpaid booking for this event),
  // restore the stripe session so the user sees the "Complete payment" banner
  // regardless of device/browser. Zustand sessionStorage handles same-device refresh.
  //
  // IMPORTANT: read stripePaymentSession and isBookingCompleted via getState() so
  // they are NOT reactive dependencies. The effect must only re-run when the cart
  // data changes — NOT when the session is set — otherwise it loops infinitely.
  useEffect(() => {
    if (!currentEventApiData || stripePaymentCompletedRef.current) return;

    // Imperative read — avoids adding stripePaymentSession to deps (infinite loop)
    const store = useCheckoutPaymentUiStore.getState();
    if (store.stripePaymentSession) return;

    // Don't restore onto an empty cart (e.g. user deleted the last date). The
    // backend may still attach pending_payment briefly; showing "Payment required"
    // over "Your cart is empty" is the bug we're fixing.
    if (getApiCartDateKeys(currentEventApiData).length === 0) return;

    const pending = currentEventApiData.pending_payment as
      | import("@/lib/types/cart.types").ApiPendingPayment
      | null
      | undefined;
    if (!pending?.payment?.stripe) return;

    // Skip restore if we already paid this booking in the current session —
    // prevents re-hydration while the backend webhook is still processing.
    if (store.isBookingCompleted(pending.booking_number)) return;

    // Skip restore if the payment window already expired on this device.
    if (store.isPendingPaymentExpired(pending.booking_number)) return;

    const checkoutResponseShape = {
      booking_number: pending.booking_number,
      booking_id: pending.booking_id,
      amount: pending.amount,
      due_later: pending.due_later ?? null,
      payment: pending.payment,
    };

    const session = buildCheckoutStripeSession(checkoutResponseShape);
    if (!session) return;

    store.setStripePaymentSession(
      mergeStripePaymentSession(store.stripePaymentSession, session),
    );
    store.setAwaitingStripePayment(true);
    void getStripePromise(session.publishableKey);
    // Only re-run when cart data changes — session state read imperatively above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEventApiData]);

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

  const appliedPromoDiscount = useMemo(() => {
    const getEditableDate = (dateKey: string) =>
      currentEventSlug ? getDateData(currentEventSlug, dateKey) : null;
    const dateRows = resolveCartDateDiscounts(
      currentEventApiData,
      getEditableDate,
    );
    const dateOfferSavings = dateRows.reduce(
      (sum, row) => sum + (row.status === "applied" ? row.amount : 0),
      0,
    );
    // Coupon % is on tables + tickets only (drinks excluded — matches API).
    const discountableSubtotal = calculateEditableCartDiscountableTotal(
      currentEventApiData,
      getEditableDate,
    );
    return resolveCheckoutPromoTotals(
      checkoutPromo,
      resolveCartEventCoupon(currentEventApiData),
      discountableSubtotal,
      dateOfferSavings,
    ).totalDiscount;
  }, [
    checkoutPromo,
    currentEventApiData,
    currentEventSlug,
    editingData,
    getDateData,
  ]);

  const drinksPayToday = useMemo(() => {
    if (!currentEventSlug || !currentEventApiData) return 0;
    return getApiCartDateKeys(currentEventApiData).reduce((sum, dateKey) => {
      const dateData = getDateData(currentEventSlug, dateKey);
      return sum + calculateEditableDateDrinksTotal(dateData);
    }, 0);
  }, [currentEventApiData, currentEventSlug, editingData, getDateData]);

  const payableNowWithFee = useMemo(() => {
    const split = applyDiscountThenSplitPayment({
      subTotal: totalToday + totalLater,
      discountAmount: appliedPromoDiscount,
      payToday: totalToday,
      payLater: totalLater,
      nonDiscountablePayToday: drinksPayToday,
    });
    const feeMeta = (
      currentEventApiData as unknown as {
        vendor_platform_fee?: { mode: "flat" | "percentage"; value: number };
      }
    )?.vendor_platform_fee;
    const platformFeeRaw =
      split.discountedTotal > 0 && feeMeta
        ? feeMeta.mode === "flat"
          ? Number(feeMeta.value || 0)
          : (split.discountedTotal * Number(feeMeta.value || 0)) / 100
        : 0;
    const platformFee =
      Number.isFinite(platformFeeRaw) && platformFeeRaw > 0
        ? Number(platformFeeRaw.toFixed(2))
        : 0;

    return {
      payToday: split.payToday,
      payLater: split.payLater,
      discountedTotal: split.discountedTotal,
      platformFee,
      payTodayWithFee: split.payToday + platformFee,
    };
  }, [
    totalToday,
    totalLater,
    appliedPromoDiscount,
    drinksPayToday,
    currentEventApiData,
  ]);

  // Discard a pending session only when the *cart quote* changes (deposit ↔ full,
  // items, coupon). Never compare that quote with `session.amount` — the backend
  // charge can include a platform fee or rounding the UI does not, which used to
  // fire "Payment option changed" immediately after a successful checkout.
  useEffect(() => {
    if (!stripePaymentSession || stripePaymentCompletedRef.current) return;
    if (isCheckoutInProgressRef.current) return;
    // totalToday is 0 while cart data is loading — ignore transient zeros
    if (totalToday === 0) return;

    const session = useCheckoutPaymentUiStore.getState().stripePaymentSession;
    if (!session) return;

    const quoted = session.clientQuotedAmount;
    if (quoted == null || !Number.isFinite(quoted)) {
      setStripePaymentSession({
        ...session,
        clientQuotedAmount: payableNowWithFee.payTodayWithFee,
      });
      return;
    }

    if (!checkoutMoneyEquals(quoted, payableNowWithFee.payTodayWithFee)) {
      clearPaymentSession();
      toast.info("Payment option changed", {
        description:
          "Your previous booking is still reserved. A new payment will be created for the updated amount.",
      });
    }
  }, [
    totalToday,
    payableNowWithFee.payTodayWithFee,
    stripePaymentSession?.bookingNumber,
    stripePaymentSession?.clientQuotedAmount,
    clearPaymentSession,
    setStripePaymentSession,
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

  const checkoutReadiness = useMemo(
    () =>
      assessCheckoutDatesReadiness({
        eventSlug: currentEventSlug,
        availableDates,
        getDateData,
        hasUnsavedChanges,
        validateDateRequirements,
      }),
    [
      currentEventSlug,
      availableDates,
      editingData,
      getDateData,
      hasUnsavedChanges,
      validateDateRequirements,
    ],
  );

  const { hasUnsavedEdits, hasValidationErrors, validationErrorMessage } =
    checkoutReadiness;

  const resumePendingPayment = useCallback(
    async (paymentGatewayId?: string | null) => {
      if (!stripePaymentSession?.bookingNumber) return;

      const gatewayId = paymentGatewayId
        ? Number(paymentGatewayId)
        : undefined;
      if (
        paymentGatewayId != null &&
        paymentGatewayId !== "" &&
        (!Number.isFinite(gatewayId) || (gatewayId ?? 0) <= 0)
      ) {
        toast.error("Select a payment method", {
          description: formatCheckoutGatewayContinuePrompt(
            currentEventApiData?.payment_gateways as
              | Array<{ slug: string }>
              | undefined,
          ),
        });
        return;
      }

      try {
        setIsProcessing(true);
        toast.info("Loading payment...", { id: "resume-payment" });
        const response = await resumeCheckoutMutation.mutateAsync({
          booking_number: stripePaymentSession.bookingNumber,
          ...(gatewayId && gatewayId > 0
            ? { payment_gateway: gatewayId }
            : {}),
        });
        toast.dismiss("resume-payment");

        if (!response.status || !response.data) {
          throw new Error(response.message || "Could not resume payment");
        }

        const paymentAction = resolveCheckoutPaymentAction(response.data);
        if (!paymentAction) {
          throw new Error(
            "Payment could not be started. Please try again or contact support.",
          );
        }

        if (paymentAction.type === "stripe") {
          useCheckoutPaymentUiStore.getState().setAwaitingStripePayment(true);
          stripePaymentCompletedRef.current = false;
          void getStripePromise(paymentAction.session.publishableKey);
          setStripePaymentSession(
            mergeStripePaymentSession(
              stripePaymentSession,
              paymentAction.session,
            ),
          );
          setIsStripePaymentOpen(true);
          return;
        }

        // Redirect gateway (PayPal, etc.) — leave Stripe modal/session behind.
        useCheckoutPaymentUiStore.getState().setAwaitingStripePayment(false);
        setIsStripePaymentOpen(false);
        window.location.href = paymentAction.url;
      } catch (error) {
        toast.dismiss("resume-payment");
        if (error instanceof Error) {
          handleCheckoutError(error);
        } else {
          toast.error("Could not resume payment", {
            description: "Please try again or contact support.",
          });
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [
      resumeCheckoutMutation,
      stripePaymentSession,
      setStripePaymentSession,
      currentEventApiData?.payment_gateways,
    ],
  );

  // Checkout handler
  const handleProceedToPayment = async () => {
    if (
      isProcessing ||
      processCheckoutMutation.isPending ||
      isCheckoutInProgressRef.current
    ) {
      return;
    }

    if (stripePaymentSession) {
      // If the user changed payment type (deposit ↔ full) while a session is
      // pending, the cart quote no longer matches what this session was created
      // for. Clear the stale session and fall through to create a fresh checkout.
      const quoted =
        stripePaymentSession.clientQuotedAmount ??
        payableNowWithFee.payTodayWithFee;
      if (!checkoutMoneyEquals(quoted, payableNowWithFee.payTodayWithFee)) {
        clearPaymentSession();
        useCheckoutPaymentUiStore.getState().setAwaitingStripePayment(false);
        // fall through to fresh checkout below
      } else {
        // Same booking hold — resume on the currently selected gateway
        // (allows Stripe → PayPal after closing the card modal unpaid).
        void resumePendingPayment(selectedGateway ?? undefined);
        return;
      }
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
        apiCartData,
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      const checkoutData = transformCartToCheckout(
        currentEventSlug,
        editingData,
        apiCartData,
        selectedGateway,
        {
          couponCode: checkoutPromo.couponCode,
          discountAmount: appliedPromoDiscount,
        },
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
      const response = await processCheckoutMutation.mutateAsync(checkoutData);
      toast.dismiss("checkout-progress");

      if (!response.status || !response.data) {
        throw new Error(response.message || "Checkout failed");
      }

      const paymentAction = resolveCheckoutPaymentAction(response.data);
      if (!paymentAction) {
        throw new Error(
          "Payment could not be started. Please try again or contact support.",
        );
      }

      if (paymentAction.type === "stripe") {
        stripePaymentCompletedRef.current = false;
        useCheckoutPaymentUiStore.getState().setAwaitingStripePayment(true);
        void getStripePromise(paymentAction.session.publishableKey);
        setStripePaymentSession(
          mergeStripePaymentSession(
            useCheckoutPaymentUiStore.getState().stripePaymentSession,
            {
              ...paymentAction.session,
              clientQuotedAmount: payableNowWithFee.payTodayWithFee,
            },
          ),
        );
        setIsStripePaymentOpen(true);
        return;
      }

      window.location.href = paymentAction.url;
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

  const selectedPaymentTypes = useMemo(() => {
    if (!currentEventSlug || !editingData[currentEventSlug]) return {};
    const types: Record<string, "full" | "deposit"> = {};
    availableDates.forEach((dateKey) => {
      types[dateKey] =
        getDateData(currentEventSlug, dateKey)?.paymentType ?? "full";
    });
    return types;
  }, [availableDates, currentEventSlug, editingData, getDateData]);

  const hasDepositPaymentChoices = useMemo(() => {
    if (!currentEventApiData || !currentEventSlug) return false;
    return availableDates.some((dateKey) => {
      const apiDate = getApiDateData(currentEventApiData, dateKey);
      return isDepositChoiceAvailable(
        apiDate?.payment,
        getDateData(currentEventSlug, dateKey),
        apiDate,
      );
    });
  }, [
    availableDates,
    currentEventApiData,
    currentEventSlug,
    editingData,
    getDateData,
  ]);

  const hasUnconfirmedSeating = useMemo(() => {
    if (!currentEventSlug) return false;
    return availableDates.some((dateKey) =>
      hasUnconfirmedTableSeating(getDateData(currentEventSlug, dateKey)),
    );
  }, [availableDates, currentEventSlug, editingData, getDateData]);

  const unconfirmedSeatingRoomNames = useMemo(() => {
    if (!currentEventSlug || !roomMode) return [] as string[];
    const names = new Set<string>();
    for (const dateKey of availableDates) {
      if (!hasUnconfirmedTableSeating(getDateData(currentEventSlug, dateKey))) {
        continue;
      }
      const { roomId } = parseRoomDateKey(dateKey);
      if (roomId == null) continue;
      const name = rooms.find((r) => r.room_id === roomId)?.room_name;
      if (name) names.add(name);
    }
    return [...names];
  }, [
    availableDates,
    currentEventSlug,
    editingData,
    getDateData,
    roomMode,
    rooms,
  ]);

  const pendingUnconfirmedSeatingTotal = useMemo(() => {
    if (!currentEventSlug) return 0;
    return availableDates.reduce((sum, dateKey) => {
      return (
        sum +
        calculateUnconfirmedTablesTotal(getDateData(currentEventSlug, dateKey))
      );
    }, 0);
  }, [availableDates, currentEventSlug, editingData, getDateData]);

  const totalGuests = useMemo(() => {
    if (!currentEventSlug) return 0;
    return availableDates.reduce((sum, dateKey) => {
      const dateData = getDateData(currentEventSlug, dateKey);
      if (!dateData) return sum;
      return sum + getDateGuestCount(dateData);
    }, 0);
  }, [availableDates, currentEventSlug, editingData, getDateData]);

  const summaryMetaLine = useMemo(() => {
    if (!currentEventSlug) return "";
    const dateCounts = countCheckoutDateStatuses(
      currentEventSlug,
      availableDates,
      getDateData,
    );
    return formatCheckoutBookingMetaLine({
      roomMode: roomMode && rooms.length > 0,
      roomCount: rooms.length,
      dateCounts,
      guestCount: totalGuests,
    });
  }, [
    availableDates,
    currentEventSlug,
    editingData,
    getDateData,
    roomMode,
    rooms.length,
    totalGuests,
  ]);

  const itineraryDates = useMemo(() => {
    if (!currentEventSlug) return [];
    return availableDates
      .map((dateKey) => {
        const dateData = getDateData(currentEventSlug, dateKey);
        if (!dateData) return null;

        const paymentAmounts = getPaymentAmounts(currentEventSlug, dateKey);
        const fullAmount = calculateEditableDateTotal(dateData);

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

  const hasPendingStripePayment = Boolean(stripePaymentSession);

  const apiPendingBookingNumber = (
    currentEventApiData?.pending_payment as
      | import("@/lib/types/cart.types").ApiPendingPayment
      | null
      | undefined
  )?.booking_number;

  const showExpiredPaymentNotice = Boolean(
    justExpiredBookingNumber ||
      (apiPendingBookingNumber &&
        expiredPendingBookingNumbers.includes(apiPendingBookingNumber) &&
        !hasPendingStripePayment),
  );

  const expiredBookingNumber =
    justExpiredBookingNumber ??
    (showExpiredPaymentNotice ? (apiPendingBookingNumber ?? null) : null);

  const dismissExpiredPaymentNotice = useCallback(() => {
    if (!expiredBookingNumber) return;
    clearExpiredPaymentNotice(expiredBookingNumber);
    setJustExpiredBookingNumber(null);
  }, [clearExpiredPaymentNotice, expiredBookingNumber]);

  const refreshCartAfterCheckout = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["cart-data"] });
    void invalidateCustomerBookingsList(queryClient);
  }, [queryClient]);

  const stripePaymentModal = (
    <CheckoutStripePaymentModal
      open={isStripePaymentOpen}
      onOpenChange={(open) => {
        setIsStripePaymentOpen(open);
        if (!open && !stripePaymentCompletedRef.current) {
          // Read imperatively — session may already be cleared by date delete /
          // Clear all; don't toast "Payment not completed" in that case.
          const session =
            useCheckoutPaymentUiStore.getState().stripePaymentSession;
          // On mobile the sticky pending banner already covers this — a toast
          // stacks a third "payment pending" alert on top of duplicate timers.
          const isNarrowViewport =
            typeof window !== "undefined" &&
            window.matchMedia("(max-width: 1023px)").matches;
          if (session && !isNarrowViewport) {
            toast.message("Payment not completed", {
              description: `Booking ${session.bookingNumber} is reserved. Tap "Complete payment" to continue.`,
            });
          }
        }
      }}
      session={stripePaymentSession}
      sessionSecondsLeft={sessionSecondsLeft}
      onPaymentComplete={() => {
        stripePaymentCompletedRef.current = true;
        // completePaymentSession: clears session + removes sessionStorage key +
        // flags booking number so cross-device restore effect never re-hydrates it.
        completePaymentSession(stripePaymentSession?.bookingNumber ?? "");
        clearAllCarts();
        clearDrinksForNewEvent();
        refreshCartAfterCheckout();
        setIsStripePaymentOpen(false);
      }}
    />
  );

  // Taller mobile bottom bar when pending-payment or expired strip is shown
  useEffect(() => {
    const root = document.querySelector(".checkout-page");
    if (!root) return;
    if (hasPendingStripePayment || showExpiredPaymentNotice) {
      root.setAttribute("data-pending-payment", "true");
    } else {
      root.removeAttribute("data-pending-payment");
    }
    return () => root.removeAttribute("data-pending-payment");
  }, [hasPendingStripePayment, showExpiredPaymentNotice]);

  useEffect(() => {
    const root = document.querySelector(".checkout-page");
    if (!root) return;
    if (pendingUnconfirmedSeatingTotal > 0) {
      root.setAttribute("data-unconfirmed-seating", "true");
    } else {
      root.removeAttribute("data-unconfirmed-seating");
    }
    return () => root.removeAttribute("data-unconfirmed-seating");
  }, [pendingUnconfirmedSeatingTotal]);

  const focusPaymentMethodPicker = useCallback(() => {
    setShowMobileDrawer(true);
    window.setTimeout(() => {
      document
        .getElementById("checkout-payment-method")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
  }, []);

  const renderExpiredPaymentBanner = (
    variant: "card" | "mobile-sticky" = "card",
  ) => {
    if (!showExpiredPaymentNotice || !expiredBookingNumber) return null;

    const body = (
      <div className="flex items-start gap-3">
        <AlertCircle
          className={cn(
            "shrink-0 text-red-600",
            variant === "mobile-sticky" ? "mt-0.5 h-4 w-4" : "mt-0.5 h-4 w-4",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-red-900">
            Payment session expired · {expiredBookingNumber}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red-800/90">
            Your checkout reservation timed out. Your cart is unchanged — use Pay
            now below to start a new checkout.
          </p>
          {variant === "card" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs text-red-800 hover:bg-red-100/80 hover:text-red-900"
              onClick={dismissExpiredPaymentNotice}
            >
              Dismiss
            </Button>
          ) : null}
        </div>
        {variant === "mobile-sticky" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-red-800 hover:bg-red-100/80 hover:text-red-900"
            onClick={dismissExpiredPaymentNotice}
          >
            Dismiss
          </Button>
        ) : null}
      </div>
    );

    if (variant === "mobile-sticky") {
      return (
        <div className="border-b border-red-200/80 bg-red-50/90 px-3 py-3 sm:px-4">
          {body}
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3">
        {body}
      </div>
    );
  };

  const renderPendingPaymentBanner = (
    variant: "card" | "mobile-sticky" = "card",
  ) => {
    if (!hasPendingStripePayment) return null;

    const isUrgent =
      sessionSecondsLeft !== null && sessionSecondsLeft <= 60;
    const hasTimer = sessionSecondsLeft !== null && sessionSecondsLeft > 0;

    const timerPill = hasTimer ? (
      <PaymentSessionCountdownPill
        secondsLeft={sessionSecondsLeft}
        size={variant === "mobile-sticky" ? "md" : "sm"}
      />
    ) : null;

    const countdownMessage = hasTimer
      ? isUrgent
        ? `Only ${formatPaymentTimeRemainingVerbose(sessionSecondsLeft)} left — complete payment now.`
        : `${formatPaymentTimeRemainingVerbose(sessionSecondsLeft)} left to complete payment and keep this booking reserved.`
      : isUrgent
        ? "Hurry! Your reserved session expires soon."
        : "Complete payment to keep your booking reserved.";

    if (variant === "mobile-sticky") {
      return (
        <div
          className={cn(
            "border-b px-3 py-2.5 sm:px-4",
            isUrgent
              ? "border-red-200/80 bg-red-50/90"
              : "border-amber-200/80 bg-amber-50/90",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className={cn(
                "min-w-0 truncate text-xs font-semibold",
                isUrgent ? "text-red-900" : "text-amber-900",
              )}
            >
              Payment pending · {stripePaymentSession?.bookingNumber}
            </p>
            {timerPill}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "rounded-xl border px-4 py-3 transition-colors",
          isUrgent
            ? "border-red-200/80 bg-red-50/50"
            : "border-amber-200/80 bg-amber-50/50",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "text-xs font-semibold",
              isUrgent ? "text-red-900" : "text-amber-900",
            )}
          >
            Payment pending · {stripePaymentSession?.bookingNumber}
          </p>
          {timerPill}
        </div>
        <p
          className={cn(
            "mt-1.5 text-xs leading-relaxed",
            isUrgent ? "text-red-800/90" : "text-amber-800/90",
          )}
        >
          {countdownMessage}
        </p>
      </div>
    );
  };

  const isCheckoutBusy =
    isProcessing ||
    isPending ||
    processCheckoutMutation.isPending ||
    resumeCheckoutMutation.isPending;

  // Do not auto-open the payment drawer when the first item is added —
  // customers often still have other dates to fill.

  // Show skeleton only on first visit — never again after delete/refetch.
  const isInitialLoad =
    !hasLoadedCartRef.current && isLoadingCartData && !apiCartData;
  if (isInitialLoad && !hasPendingStripePayment) {
    return (
      <>
        <BookingSummarySkeleton />
        {stripePaymentModal}
      </>
    );
  }

  // Empty cart — but keep modal open if customer still needs to pay
  if (
    !hasPendingStripePayment &&
    !isFetchingCartData &&
    (!currentEventApiData || totalItems === 0)
  ) {
    return (
      <>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
            <CreditCard className="h-5 w-5 text-gray-300" />
          </div>
          <h3 className="mb-1 text-sm font-medium text-gray-700">
            Order Summary
          </h3>
          <p className="text-xs text-gray-400">
            Add items to see your order total
          </p>
        </div>
        {stripePaymentModal}
      </>
    );
  }

  const bookingGrandTotal = totalToday + totalLater;
  const hasPayableTotal = bookingGrandTotal > 0;
  const eventCoupon = resolveCartEventCoupon(currentEventApiData);
  const getEditableDateForPromo = (dateKey: string) =>
    currentEventSlug ? getDateData(currentEventSlug, dateKey) : null;
  const dateDiscountRows = resolveCartDateDiscounts(
    currentEventApiData,
    getEditableDateForPromo,
  );
  const dateOfferSavings = dateDiscountRows.reduce(
    (sum, row) => sum + (row.status === "applied" ? row.amount : 0),
    0,
  );
  // Coupon % is on tables + tickets only; date offers stay per-date when no coupon.
  const discountableBookingSubtotal = calculateEditableCartDiscountableTotal(
    currentEventApiData,
    getEditableDateForPromo,
  );
  const promoTotals = resolveCheckoutPromoTotals(
    checkoutPromo,
    eventCoupon,
    discountableBookingSubtotal,
    dateOfferSavings,
  );
  const couponDiscount = promoTotals.couponAmount;
  const autoDiscount = promoTotals.autoDiscountAmount;
  const totalPromoDiscount = promoTotals.totalDiscount;
  const appliedCouponLabel = promoTotals.couponLabel;

  const discountedToday = payableNowWithFee.payToday;
  const discountedLater = payableNowWithFee.payLater;
  const discountedGrandTotal = payableNowWithFee.discountedTotal;
  const platformFeeMeta = (
    currentEventApiData as unknown as {
      vendor_platform_fee?: { mode: "flat" | "percentage"; value: number };
    }
  )?.vendor_platform_fee;
  const platformFee = payableNowWithFee.platformFee;

  const bookingGrandTotalWithFee = discountedGrandTotal + platformFee;
  const finalTotalWithFee = payableNowWithFee.payTodayWithFee;

  if (hasPendingStripePayment && !currentEventApiData) {
    return (
      <>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-6 shadow-sm">
          <h3 className="text-base font-bold text-[color:var(--checkout-foreground)]">
            Payment required
          </h3>
          <p className="mt-2 text-sm text-[color:var(--checkout-muted-foreground)]">
            Booking{" "}
            <span className="font-semibold text-[color:var(--checkout-foreground)]">
              {stripePaymentSession?.bookingNumber}
            </span>{" "}
            is reserved. Complete payment to confirm your booking.
          </p>
          <Button
            type="button"
            onClick={() => void resumePendingPayment(selectedGateway)}
            className={cn(
              "mt-4 h-11 w-full rounded-xl text-sm font-bold",
              checkoutPayButtonClass(false),
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Complete payment ·{" "}
              {formatMoney(stripePaymentSession?.amount ?? 0)}
            </span>
          </Button>
        </div>
        {stripePaymentModal}
      </>
    );
  }

  if (!currentEventApiData && !hasPendingStripePayment) {
    return stripePaymentModal;
  }

  // Helper: Format date (handles composite "roomId:date" keys)
  const fmtDate = (dateString: string) => {
    try {
      const { date: actualDate } = parseRoomDateKey(dateString);
      return new Date(actualDate).toLocaleDateString("en-GB", {
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

  const unconfirmedSeatingWarning =
    unconfirmedSeatingRoomNames.length === 1
      ? `Confirm table seating for ${unconfirmedSeatingRoomNames[0]}, or remove it using the trash icon next to Table Seating.`
      : unconfirmedSeatingRoomNames.length > 1
        ? `Confirm table seating for ${unconfirmedSeatingRoomNames.join(", ")}, or remove it using the trash icon next to Table Seating.`
        : "Confirm table seating below, or remove it using the trash icon next to Table Seating.";

  const payableNowWithPromo = finalTotalWithFee;

  const ctaState = resolveCheckoutCtaState({
    isLoading: isCheckoutBusy,
    hasPendingStripePayment,
    stripePaymentAmount: stripePaymentSession?.amount ?? null,
    hasPayableTotal,
    hasValidationErrors,
    hasUnsavedEdits,
    hasSelectedGateway: Boolean(selectedGateway),
    finalTotalWithFee: payableNowWithPromo,
    formatMoney,
  });

  const handleCheckoutCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ctaState.loading || isCheckoutInProgressRef.current) {
      e.preventDefault();
      return;
    }
    if (hasValidationErrors) {
      e.preventDefault();
      const incompleteDate = findFirstIncompleteCheckoutDate(
        currentEventSlug,
        availableDates,
        getDateData,
      );
      if (incompleteDate) {
        focusCheckoutDate(incompleteDate);
      }
      toast.error(
        validationErrorMessage ||
          "Please select at least one table or ticket for each date",
      );
      return;
    }
    if (ctaState.needsGatewaySelection) {
      e.preventDefault();
      focusPaymentMethodPicker();
      return;
    }
    void handleProceedToPayment();
  };

  // ──────────────────────────────────────────────
  // RENDER: ORDER SUMMARY CARD
  // Must be a render fn (not an inner component) so timer ticks
  // re-render without remounting PaymentGatewaySelector every second.
  // ──────────────────────────────────────────────
  const renderPaymentMethodSection = () =>
    currentEventApiData?.payment_gateways &&
    Array.isArray(currentEventApiData.payment_gateways) &&
    currentEventApiData.payment_gateways.length > 0 ? (
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
          disabled={
            isProcessing ||
            processCheckoutMutation.isPending ||
            resumeCheckoutMutation.isPending
          }
          showError={ctaState.showGatewayError}
        />
        <Separator className="bg-gray-100" />
      </>
    ) : null;

  const renderOrderSummaryContent = (options?: {
    /** Mobile sticky strip already shows the session timer — skip the card copy. */
    omitSessionBanners?: boolean;
    /** Put PayPal/card first so mobile customers see them without scrolling. */
    prioritizePaymentMethod?: boolean;
  }) => (
    <div className="space-y-4">
      {!options?.omitSessionBanners ? (
        <>
          {renderExpiredPaymentBanner("card")}
          {renderPendingPaymentBanner("card")}
        </>
      ) : null}

      {options?.prioritizePaymentMethod ? renderPaymentMethodSection() : null}

      {availableDates.length > 0 && hasPayableTotal && (
        <OrderViewBreakdown
          isOpen={showViewBreakdown}
          onToggle={() => setShowViewBreakdown((open) => !open)}
          formatMoney={formatMoney}
          formatDate={fmtDate}
          getRoomName={roomMode ? getRoomNameForKey : undefined}
          rooms={roomMode ? rooms : undefined}
          dates={itineraryDates}
        />
      )}

      {hasPayableTotal && hasDepositPaymentChoices && (
        <PerDatePaymentSelection
          eventData={currentEventApiData}
          selectedPaymentTypes={selectedPaymentTypes}
          onPaymentTypeChange={(dateKey, type) => {
            if (!currentEventSlug) return;
            updatePaymentType(currentEventSlug, dateKey, type);
          }}
          disabled={isProcessing || isPending}
          getDateData={getDateData}
          eventSlug={currentEventSlug ?? undefined}
          getRoomName={roomMode ? getRoomNameForKey : undefined}
          bookingCouponDiscount={
            promoTotals.usingCoupon ? couponDiscount : 0
          }
          bookingSubTotal={discountableBookingSubtotal}
        />
      )}

      {hasPayableTotal &&
      (eventCoupon?.coupon_code ||
        dateDiscountRows.length > 0 ||
        checkoutPromo.couponCode) ? (
        <>
          <Separator className="bg-gray-100" />
          <CheckoutPromoPanel
            formatMoney={formatMoney}
            eventCoupon={eventCoupon}
            dateDiscounts={dateDiscountRows}
            couponSavingsAmount={couponDiscount}
            drinksExcludedFromCoupon={drinksPayToday > 0}
            value={checkoutPromo}
            onChange={setCheckoutPromo}
            onDateOfferClick={(dateKey) => {
              setShowMobileDrawer(false);
              focusCheckoutDate(dateKey);
            }}
            disabled={
              isProcessing ||
              isPending ||
              processCheckoutMutation.isPending ||
              resumeCheckoutMutation.isPending
            }
          />
        </>
      ) : null}

      {hasPayableTotal ? <Separator className="bg-gray-100" /> : null}

      {/* ── Pricing Summary ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[color:var(--checkout-muted-foreground)]">
            Subtotal
          </span>
          {hasPayableTotal ? (
            <span className="text-sm font-medium tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(bookingGrandTotal)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>

        {hasPayableTotal &&
        promoTotals.usingCoupon &&
        drinksPayToday > 0 &&
        discountableBookingSubtotal > 0 ? (
          <div className="space-y-1 border-l-2 border-gray-100 pl-2.5">
            <div className="flex items-center justify-between text-xs text-[color:var(--checkout-muted-foreground)]">
              <span>Tables & tickets</span>
              <span className="tabular-nums">
                {formatMoney(discountableBookingSubtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[color:var(--checkout-muted-foreground)]">
              <span>Drink packages</span>
              <span className="tabular-nums">
                {formatMoney(drinksPayToday)}
              </span>
            </div>
          </div>
        ) : null}

        {hasPayableTotal && autoDiscount > 0 && !promoTotals.usingCoupon ? (
          <div className="flex items-center justify-between text-sm text-emerald-700">
            <span className="font-medium">You saved</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(autoDiscount)}
            </span>
          </div>
        ) : null}

        {hasPayableTotal && couponDiscount > 0 ? (
          <div className="flex items-start justify-between gap-3 text-sm text-emerald-700">
            <span className="min-w-0">
              <span className="font-medium">
                You saved
                {checkoutPromo.couponCode ? (
                  <>
                    {" "}
                    with{" "}
                    <span className="font-mono text-xs tracking-wide">
                      {checkoutPromo.couponCode}
                    </span>
                  </>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs font-normal text-emerald-700/85">
                {drinksPayToday > 0
                  ? appliedCouponLabel
                    ? `${appliedCouponLabel} on tables & tickets · drinks not included`
                    : "On tables & tickets · drinks not included"
                  : appliedCouponLabel
                    ? appliedCouponLabel
                    : "On tables & tickets"}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatMoney(couponDiscount)}
            </span>
          </div>
        ) : null}

        {hasPayableTotal && totalPromoDiscount > 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[color:var(--checkout-muted-foreground)]">
              Booking total
            </span>
            <span className="font-medium tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(discountedGrandTotal)}
            </span>
          </div>
        ) : null}

        {hasPayableTotal && platformFee > 0 && (
          <div className="flex justify-between text-xs text-[color:var(--checkout-muted-foreground)]">
            <span>
              {platformFeeMeta?.mode === "percentage"
                ? `Booking fee (${platformFeeMeta.value}%)`
                : "Booking fee"}
            </span>
            <span className="tabular-nums">{formatMoney(platformFee)}</span>
          </div>
        )}

        {hasPayableTotal && discountedLater > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[color:var(--checkout-muted-foreground)]">
              Due later
            </span>
            <span className="text-sm font-medium tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(discountedLater)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--checkout-foreground)]">
            {discountedLater > 0 ? "Pay today" : "Total"}
          </span>
          {hasPayableTotal ? (
            <span className="text-2xl font-bold tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(payableNowWithPromo)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">
              Add items to calculate
            </span>
          )}
        </div>
        {pendingUnconfirmedSeatingTotal > 0 ? (
          <p className="text-[11px] leading-snug text-amber-800">
            +{formatMoney(pendingUnconfirmedSeatingTotal)} after you confirm
            seating
          </p>
        ) : null}
      </div>

      {!options?.prioritizePaymentMethod ? (
        <>
          <Separator className="bg-gray-100" />
          {renderPaymentMethodSection()}
        </>
      ) : null}

      {/* ── CTA Button — desktop sidebar only; mobile uses sticky footer bar ── */}
      {availableDates.length > 0 && hasUnconfirmedSeating ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-snug text-amber-800">
            {unconfirmedSeatingWarning}
          </p>
        </div>
      ) : null}
      {availableDates.length > 0 && (
        <div className="hidden lg:block">
          <Button
            size="lg"
            onClick={handleCheckoutCtaClick}
            disabled={ctaState.disabled}
            className={cn(
              "h-12 w-full text-sm",
              checkoutPayButtonClass(ctaState.disabled),
            )}
          >
            {ctaState.loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {!ctaState.disabled && !ctaState.needsGatewaySelection && (
                  <Lock className="h-4 w-4" />
                )}
                <span>{ctaState.label}</span>
              </div>
            )}
          </Button>

          {/* Trust signals — hidden on summary to match reference layout */}
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
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-[color:var(--checkout-foreground)]">
                    Order Summary
                  </h2>
                  <p className="mt-1 text-xs text-[color:var(--checkout-muted-foreground)]">
                    {summaryMetaLine}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {hasPayableTotal ? (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--checkout-muted-foreground)]">
                      {discountedLater > 0 ? "Booking total" : "Total"}
                    </p>
                  ) : null}
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-[color:var(--checkout-foreground)]">
                    {hasPayableTotal
                      ? formatMoney(bookingGrandTotalWithFee)
                      : "—"}
                  </p>
                  {hasPayableTotal && discountedLater > 0 ? (
                    <p className="mt-0.5 text-[11px] font-medium tabular-nums text-[color:var(--checkout-muted-foreground)]">
                      Pay today {formatMoney(payableNowWithPromo)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              {renderOrderSummaryContent()}
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

      {/* ── MOBILE: sticky bar + summary sheet ── */}
      {isMobileViewport ? (
        <Sheet open={showMobileDrawer} onOpenChange={setShowMobileDrawer}>
          <SheetContent
            side="bottom"
            className="checkout-page checkout-summary-sheet z-[101] gap-0 rounded-t-2xl border-[color:var(--checkout-border)] p-0 shadow-lg"
            style={{
              paddingBottom:
                "calc(var(--checkout-mobile-chrome-height, 9rem) + 0.5rem)",
            }}
          >
            <SheetHeader className="border-b border-[color:var(--checkout-border)] px-4 py-3 text-left">
              <SheetTitle className="text-base font-semibold text-[color:var(--checkout-brand-primary)]">
                Order Summary
              </SheetTitle>
              <SheetDescription className="sr-only">
                Review your booking totals and choose how to pay. The cart
                stays behind this sheet.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
              {renderOrderSummaryContent({
                omitSessionBanners: true,
                prioritizePaymentMethod: !hasValidationErrors,
              })}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {/* Hide sticky chrome while Stripe modal is open — otherwise mobile shows
          two timers / two "Complete payment" surfaces (sticky sits above dialog). */}
      {!isStripePaymentOpen ? (
        <div className="lg:hidden">
          <CheckoutMobileStickyBar>
            {renderExpiredPaymentBanner("mobile-sticky")}
            {renderPendingPaymentBanner("mobile-sticky")}

            <div className="flex flex-col gap-2.5 px-4 pt-3 pb-[max(0.75rem,var(--checkout-mobile-safe-bottom))]">
              <button
                type="button"
                onClick={() => setShowMobileDrawer((open) => !open)}
                className="flex w-full min-w-0 items-center gap-3 text-left"
                aria-expanded={showMobileDrawer}
                aria-label="Open order summary"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-medium text-[color:var(--checkout-muted-foreground)]">
                      {discountedLater > 0 ? "Pay today" : "Total"}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-[color:var(--checkout-brand-primary)]">
                      {hasPayableTotal ? formatMoney(payableNowWithPromo) : "—"}
                    </p>
                  </div>
                  {discountedLater > 0 && hasPayableTotal ? (
                    <p className="mt-0.5 text-[11px] tabular-nums text-[color:var(--checkout-muted-foreground)]">
                      Booking total {formatMoney(bookingGrandTotalWithFee)}
                    </p>
                  ) : summaryMetaLine ? (
                    <p className="mt-0.5 truncate text-[11px] text-[color:var(--checkout-muted-foreground)]">
                      {summaryMetaLine}
                    </p>
                  ) : null}
                  {pendingUnconfirmedSeatingTotal > 0 ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-amber-800">
                      +{formatMoney(pendingUnconfirmedSeatingTotal)} after you
                      confirm seating
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
                onClick={handleCheckoutCtaClick}
                disabled={ctaState.disabled}
                className={cn(
                  "h-12 w-full px-4 text-sm font-semibold",
                  checkoutPayButtonClass(ctaState.disabled),
                )}
              >
                {ctaState.loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {!ctaState.disabled && !ctaState.needsGatewaySelection && (
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{ctaState.mobileLabel}</span>
                  </div>
                )}
              </Button>
              {ctaState.needsGatewaySelection ? (
                <p className="text-center text-[11px] leading-snug text-[color:var(--checkout-muted-foreground)]">
                  Tap Pay to choose your payment method
                </p>
              ) : hasValidationErrors ? (
                <p className="text-center text-[11px] leading-snug text-amber-700">
                  Finish selections for each date above
                </p>
              ) : null}
            </div>
          </CheckoutMobileStickyBar>
        </div>
      ) : null}

      {stripePaymentModal}
    </>
  );
}

function CheckoutMobileStickyBar({ children }: { children: React.ReactNode }) {
  const ref = useCheckoutMobileChromeHeight<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-[110] border-t border-[color:var(--checkout-border)] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      {children}
    </div>
  );
}
