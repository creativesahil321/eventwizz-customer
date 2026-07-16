"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import BookingSummarySkeleton from "./booking-summary-skeleton-loader";
import {
  CreditCard,
  Shield,
  ChevronUp,
  ChevronDown,
  Lock,
  Zap,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  isDepositChoiceAvailable,
  hasUnconfirmedTableSeating,
  getDateGuestCount,
} from "../_lib/cart-calculations";
import {
  transformCartToCheckout,
  validateCheckoutRequirements,
  calculateCheckoutSummary,
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
import { useCartEditStore } from "@/store/cart-edit.store";
import { usePaymentGatewaySelection } from "@/store/payment-gateway-selection.store";
import PaymentGatewaySelector from "./payment-gateway-selector";
import CheckoutStripePaymentModal from "./checkout-stripe-payment-modal";
import { PaymentSessionCountdownPill } from "./payment-session-countdown-pill";
import { usePaymentSessionCountdown, formatPaymentTimeRemainingVerbose } from "../_lib/use-payment-session-countdown";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import OrderViewBreakdown from "./order-view-breakdown";
import PerDatePaymentSelection from "./per-date-payment-selection";
import { cn } from "@/lib/utils";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import {
  assessCheckoutDatesReadiness,
  resolveCheckoutCtaState,
} from "../_lib/checkout-readiness";

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
        const response = await resumeCheckoutMutation.mutateAsync(bookingNumber);
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

  // Bug 1 fix — discard pending session when the amount the user owes today changes
  // (e.g. switching deposit ↔ pay-in-full, adding/removing items).
  // The backend keeps the old booking alive; calling /resume with a new bookingNumber
  // would open the wrong intent, so we drop the session and let the user re-checkout.
  useEffect(() => {
    if (!stripePaymentSession || stripePaymentCompletedRef.current) return;
    // totalToday is 0 while cart data is loading — ignore transient zeros
    if (totalToday === 0) return;

    if (totalToday !== stripePaymentSession.amount) {
      clearPaymentSession();
      toast.info("Payment option changed", {
        description:
          "Your previous booking is still reserved. A new payment will be created for the updated amount.",
      });
    }
  }, [totalToday, stripePaymentSession, clearPaymentSession]);

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
      // pending, the stored amount no longer matches the current cart total.
      // Clear the stale session and fall through to create a fresh checkout.
      if (stripePaymentSession.amount !== totalToday) {
        clearPaymentSession();
        useCheckoutPaymentUiStore.getState().setAwaitingStripePayment(false);
        // fall through to fresh checkout below
      } else {
        void resumeStripePayment();
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
            paymentAction.session,
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

  const totalGuests = useMemo(() => {
    if (!currentEventSlug) return 0;
    return availableDates.reduce((sum, dateKey) => {
      const dateData = getDateData(currentEventSlug, dateKey);
      if (!dateData) return sum;
      return sum + getDateGuestCount(dateData);
    }, 0);
  }, [availableDates, currentEventSlug, editingData, getDateData]);

  const summaryMetaLine = useMemo(() => {
    const guestSuffix =
      totalGuests > 0
        ? ` · ${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`
        : "";
    if (roomMode && rooms.length > 0) {
      return `${rooms.length} room${rooms.length > 1 ? "s" : ""} · ${totalItems} date${totalItems !== 1 ? "s" : ""}${guestSuffix}`;
    }
    return `${totalItems} date${totalItems !== 1 ? "s" : ""}${guestSuffix}`;
  }, [roomMode, rooms.length, totalItems, totalGuests]);

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

  const resumeStripePayment = useCallback(async () => {
    if (!stripePaymentSession?.bookingNumber) return;

    try {
      setIsProcessing(true);
      toast.info("Loading payment...", { id: "resume-payment" });
      const response = await resumeCheckoutMutation.mutateAsync(
        stripePaymentSession.bookingNumber,
      );
      toast.dismiss("resume-payment");

      if (!response.status || !response.data) {
        throw new Error(response.message || "Could not resume payment");
      }

      const paymentAction = resolveCheckoutPaymentAction(response.data);
      if (paymentAction?.type !== "stripe") {
        throw new Error("Stripe payment could not be resumed.");
      }

      useCheckoutPaymentUiStore.getState().setAwaitingStripePayment(true);
      stripePaymentCompletedRef.current = false;
      void getStripePromise(paymentAction.session.publishableKey);
      setStripePaymentSession(
        mergeStripePaymentSession(stripePaymentSession, paymentAction.session),
      );
      setIsStripePaymentOpen(true);
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
  }, [resumeCheckoutMutation, stripePaymentSession]);

  const stripePaymentModal = (
    <CheckoutStripePaymentModal
      open={isStripePaymentOpen}
      onOpenChange={(open) => {
        setIsStripePaymentOpen(open);
        if (
          !open &&
          stripePaymentSession &&
          !stripePaymentCompletedRef.current
        ) {
          toast.message("Payment not completed", {
            description: `Booking ${stripePaymentSession.bookingNumber} is reserved. Tap "Complete payment" to continue.`,
          });
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
            "border-b px-3 py-3 sm:px-4",
            isUrgent
              ? "border-red-200/80 bg-red-50/90"
              : "border-amber-200/80 bg-amber-50/90",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xs font-semibold",
                  isUrgent ? "text-red-900" : "text-amber-900",
                )}
              >
                Payment pending · {stripePaymentSession?.bookingNumber}
              </p>
              <p
                className={cn(
                  "mt-1 text-[12px] font-medium leading-snug",
                  isUrgent ? "text-red-800" : "text-amber-900/95",
                )}
              >
                {countdownMessage}
              </p>
            </div>
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
            onClick={resumeStripePayment}
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

  const ctaState = resolveCheckoutCtaState({
    isLoading:
      isProcessing ||
      isPending ||
      processCheckoutMutation.isPending ||
      resumeCheckoutMutation.isPending,
    hasPendingStripePayment,
    stripePaymentAmount: stripePaymentSession?.amount ?? null,
    hasPayableTotal,
    hasValidationErrors,
    hasUnsavedEdits,
    hasSelectedGateway: Boolean(selectedGateway),
    finalTotalWithFee,
    formatMoney,
  });

  const handleCheckoutCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ctaState.loading || isCheckoutInProgressRef.current) {
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
    void handleProceedToPayment();
  };

  // ──────────────────────────────────────────────
  // RENDER: ORDER SUMMARY CARD
  // ──────────────────────────────────────────────
  const OrderSummaryContent = () => (
    <div className="space-y-4">
      {renderExpiredPaymentBanner("card")}
      {renderPendingPaymentBanner("card")}

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
        />
      )}

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

        {hasPayableTotal && platformFee > 0 && (
          <div className="flex justify-between text-xs text-[color:var(--checkout-muted-foreground)]">
            <span>
              {platformFeeMeta?.mode === "percentage"
                ? `Service fee (${platformFeeMeta.value}%)`
                : "Service fee"}
            </span>
            <span className="tabular-nums">{formatMoney(platformFee)}</span>
          </div>
        )}

        {hasPayableTotal && totalLater > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[color:var(--checkout-muted-foreground)]">
              Due later
            </span>
            <span className="text-sm font-medium tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(totalLater)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--checkout-foreground)]">
            {totalLater > 0 ? "Due Today" : "Total"}
          </span>
          {hasPayableTotal ? (
            <span className="text-2xl font-bold tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(finalTotalWithFee)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">
              Add items to calculate
            </span>
          )}
        </div>
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
              showError={ctaState.showGatewayError}
            />
            <Separator className="bg-gray-100" />
          </>
        )}

      {/* ── CTA Button — desktop sidebar only; mobile uses sticky footer bar ── */}
      {availableDates.length > 0 && hasUnconfirmedSeating ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-snug text-amber-800">
            Confirm table seating below, or remove it using the trash icon
            next to Table Seating.
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
                {!ctaState.disabled && <Lock className="h-4 w-4" />}
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
                  {availableDates.length > 1 && hasPayableTotal ? (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--checkout-muted-foreground)]">
                      Booking total
                    </p>
                  ) : null}
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-[color:var(--checkout-foreground)]">
                    {hasPayableTotal
                      ? formatMoney(bookingGrandTotalWithFee)
                      : "—"}
                  </p>
                </div>
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
          {/* Always-visible pending / expired payment strip (not hidden in drawer) */}
          {renderExpiredPaymentBanner("mobile-sticky")}
          {renderPendingPaymentBanner("mobile-sticky")}
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
              onClick={handleCheckoutCtaClick}
              disabled={ctaState.disabled}
              className={cn(
                "h-11 max-w-[48%] shrink-0 px-3 text-xs font-semibold min-[400px]:max-w-none min-[400px]:px-4 min-[400px]:text-sm sm:px-6",
                checkoutPayButtonClass(ctaState.disabled),
              )}
            >
              {ctaState.loading ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="hidden min-[360px]:inline">
                    Processing...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {!ctaState.disabled && <Lock className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{ctaState.label}</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {stripePaymentModal}
    </>
  );
}
