"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { getStatusThemeKey, type StatusThemeKey } from "@/lib/status-theme";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import {
  useBookingPayment,
  bookingsKeys,
  useRescheduleBooking,
} from "@/services/customer/bookings/query";
import { resolveBookingPaymentAction } from "@/services/customer/bookings/booking-payment";
import { resolveReschedulePaymentAction } from "@/services/customer/bookings/reschedule-payment";
import type { BookingPaymentResponse } from "@/services/customer/bookings/type";
import type { CheckoutStripePaymentSession } from "@/services/customer/checkout";
import CheckoutStripePaymentModal from "@/app/(public)/vendor/checkout/_components/checkout-stripe-payment-modal";
import { useDeleteAddOns } from "@/services/customer/bookings/hooks/useDeleteAddOns";
import type {
  BookingDetailsAddonTable,
  BookingDetailsAddonTicket,
  BookingPaymentPayload,
  BookingRescheduleRequest,
  PaymentDate,
  RescheduleBookingPayload,
} from "@/services/customer/bookings/type";
import { toast } from "sonner";
import {
  isPaymentAlreadyProcessing,
  PAYMENT_ALREADY_PROCESSING_MESSAGE,
} from "@/lib/payment-already-processing";
import { resolveBookingPayAllVisibility } from "./booking-payment-visibility";
import { AddExtrasSection } from "./add-extras-panel";
import {
  buildDateSubtitle,
  buildPaymentBreakdown,
  formatDateStripLabel,
  resolvePackageSectionTitle,
  splitLineItemsForDate,
  type BookingDateSource,
} from "./build-line-items";
import { BookingLineItemsList } from "./booking-line-items-list";
import {
  isBookingDateEligibleForAddOns,
  type BookingDatePaymentStatus,
} from "@/lib/booking-addons-eligibility";
import type { CheckoutDateCard } from "./types";
import {
  PaymentBreakdownDateAccordion,
  PaymentBreakdownTotals,
} from "./payment-breakdown";
import { SingleDatePaymentModal } from "../single-date-payment-modal";
import { RescheduleDateModal } from "../reschedule-date-modal";
import {
  buildRescheduleDateSummary,
  dateHasAddons,
} from "./build-reschedule-date-summary";
import { PendingRescheduleBanner } from "./pending-reschedule-banner";
import {
  canShowRescheduleButton,
  hasPendingReschedulePayment,
} from "./reschedule-eligibility";
import type { CSSProperties } from "react";
import {
  MultiDateSelector,
  type DateCardViewModel,
} from "./multi-date-selector";
import PaymentGatewaySelector from "@/app/(public)/vendor/checkout/_components/payment-gateway-selector";
import {
  DEFAULT_STRIPE_PAYMENT_GATEWAY,
  normalizeReschedulePaymentGateways,
} from "@/services/customer/bookings/reschedule-utils";
interface CheckoutDate extends BookingDateSource {
  booking_date_id: number;
  is_menu_choice?: boolean;
  has_unbooked_event_dates?: boolean;
  total: string;
  totalAmount: number;
  /** Present only when this date has promo savings. */
  savedAmount?: number | null;
  paidAmount: number;
  pendingAmount: number | null;
  paymentStatus?: "paid" | "pending" | "partial" | "refunded" | "cancelled";
  paymentStatusLabel?: string;
  addOnsPaymentStatus?: BookingDatePaymentStatus;
  canPayNow?: boolean;
  partialPayment?: string;
  reschedule_requests?: BookingRescheduleRequest[];
}

function getSingleDateStatusLabel(
  status: CheckoutDateCard["paymentStatus"],
  apiLabel?: string,
): string {
  if (apiLabel?.trim()) {
    const normalized = apiLabel.trim().toUpperCase();
    if (normalized === "PENDING" || normalized === "PENDING PAYMENT") {
      return "UNPAID";
    }
    return normalized;
  }

  switch (status) {
    case "paid":
      return "PAID";
    case "partial":
      return "PARTIAL PAYMENT";
    case "pending":
      return "UNPAID";
    case "refunded":
      return "REFUNDED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "UNPAID";
  }
}

function getDateCardStatusLabel(
  status: CheckoutDateCard["paymentStatus"],
): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "pending":
      return "Pending";
    case "refunded":
      return "Refunded";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

/** High-contrast status pills on the dark payment footer bar. */
const FOOTER_STATUS_BADGE_CLASS: Record<StatusThemeKey, string> = {
  success: "border-emerald-400/80 bg-emerald-600 text-white",
  pending: "border-amber-400/80 bg-amber-600 text-white",
  info: "border-sky-400/80 bg-sky-600 text-white",
  destructive: "border-red-400/80 bg-red-600 text-white",
  neutral: "border-gray-400/80 bg-gray-600 text-white",
};

function getDatePendingAmount(date: CheckoutDate): number {
  if (date.pendingAmount != null) {
    return Math.max(0, date.pendingAmount);
  }

  const total = date.totalAmount ?? 0;
  const paid = date.paidAmount ?? 0;
  return Math.max(0, total - paid);
}

function isDateFullyPaid(pendingDue: number): boolean {
  return pendingDue <= 0;
}

function getDateDisplayStatusLabel(
  paymentStatus: CheckoutDateCard["paymentStatus"],
  apiLabel?: string,
): string {
  if (apiLabel?.trim()) {
    return getSingleDateStatusLabel(paymentStatus, apiLabel);
  }

  return getDateCardStatusLabel(paymentStatus).toUpperCase();
}

function isDatePayable(date: CheckoutDate): boolean {
  if (date.canPayNow === false) return false;
  return getDatePendingAmount(date) > 0;
}

function buildPaymentDateEntry(date: CheckoutDate): PaymentDate {
  return {
    booking_date_id: date.booking_date_id,
    add_ons: {
      tables:
        date.addons?.tables
          ?.map((table: BookingDetailsAddonTable) => ({
            booking_date_table_id: table.booking_date_table_id ?? 0,
            event_date_table_id: table.id ?? 0,
          }))
          .filter(
            (table) =>
              table.booking_date_table_id > 0 && table.event_date_table_id > 0,
          ) ?? [],
      tickets:
        date.addons?.tickets
          ?.map((ticket: BookingDetailsAddonTicket) => ({
            booking_date_ticket_id:
              ticket.booking_date_ticket_id || ticket.id || 0,
          }))
          .filter((ticket) => ticket.booking_date_ticket_id > 0) ?? [],
    },
  };
}

interface BookingCheckoutPageProps {
  bookingId: string;
  bookingNumber: string;
  eventName: string;
  location?: string;
  paymentStatus: string;
  /** Whole-booking order status from API `status` */
  bookingStatus?: string;
  canPayNow?: boolean;
  isRoomSystem?: boolean;
  isMenuChoice?: boolean;
  rescheduleStatus?: boolean;
  summary: {
    subTotal: number;
    addOns: number;
    total: number;
    paid: number;
    outstanding: number;
    depositSelected: number;
    /** Present only when booking has promo savings. */
    savedAmount?: number | null;
  };
  dates: CheckoutDate[];
  paymentGateways?: Array<{ id: number; slug: string }>;
  onDownloadInvoice: () => void;
  isDownloadingInvoice?: boolean;
}

export default function BookingCheckoutPage({
  bookingId,
  bookingNumber,
  eventName,
  location,
  paymentStatus,
  bookingStatus,
  canPayNow = true,
  isRoomSystem = false,
  isMenuChoice,
  rescheduleStatus = false,
  summary,
  dates,
  paymentGateways,
  onDownloadInvoice,
  isDownloadingInvoice,
}: BookingCheckoutPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { format: formatCurrency, formatCompact: formatUnit } =
    useCurrencyFormat();
  const paymentMutation = useBookingPayment();
  const rescheduleMutation = useRescheduleBooking();
  const deleteAddOnsMutation = useDeleteAddOns();

  const [selectedDateId, setSelectedDateId] = useState(dates[0]?.id ?? "");
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [openBreakdownDates, setOpenBreakdownDates] = useState<string[]>(() =>
    dates[0]?.id ? [dates[0].id] : [],
  );

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDateId, setPaymentDateId] = useState<string | null>(null);
  const [rescheduleRequest, setRescheduleRequest] =
    useState<BookingRescheduleRequest | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedDateForReschedule, setSelectedDateForReschedule] =
    useState<CheckoutDate | null>(null);
  const [stripePaymentSession, setStripePaymentSession] =
    useState<CheckoutStripePaymentSession | null>(null);
  const [isStripePaymentOpen, setIsStripePaymentOpen] = useState(false);
  const stripePaymentCompletedRef = useRef(false);
  const [selectedPaymentGatewayId, setSelectedPaymentGatewayId] = useState<
    number | null
  >(null);
  const [paymentAlreadyProcessing, setPaymentAlreadyProcessing] =
    useState(false);

  const availablePaymentGateways = useMemo(
    () => normalizeReschedulePaymentGateways(null, paymentGateways),
    [paymentGateways],
  );

  useEffect(() => {
    if (
      availablePaymentGateways.length === 1 &&
      selectedPaymentGatewayId == null
    ) {
      setSelectedPaymentGatewayId(availablePaymentGateways[0].id);
      return;
    }

    if (
      selectedPaymentGatewayId != null &&
      !availablePaymentGateways.some((g) => g.id === selectedPaymentGatewayId)
    ) {
      setSelectedPaymentGatewayId(
        availablePaymentGateways.length === 1
          ? availablePaymentGateways[0].id
          : null,
      );
    }
  }, [availablePaymentGateways, selectedPaymentGatewayId]);

  const selectedDate = dates.find((d) => d.id === selectedDateId) ?? dates[0];
  const packageTitleFallback = useMemo(
    () => dates.find((d) => d.package_title?.trim())?.package_title,
    [dates],
  );
  const packageSectionTitle = useMemo(
    () => resolvePackageSectionTitle(selectedDate, packageTitleFallback),
    [selectedDate, packageTitleFallback],
  );
  const isMenuChoiceForDate =
    selectedDate?.is_menu_choice ?? isMenuChoice ?? false;
  const hasMultipleDates = dates.length > 1;

  const dateCards: CheckoutDateCard[] = useMemo(
    () =>
      dates.map((d) => ({
        id: d.id,
        booking_date_id: d.booking_date_id,
        date: formatDateStripLabel(d.date_key ?? d.id, d.date),
        previousDateLabel: d.previous_date_label?.trim() || undefined,
        subtitle: isRoomSystem ? d.room_name : buildDateSubtitle(d),
        amount: d.totalAmount ?? 0,
        amountFormatted: d.total,
        savedAmount: d.savedAmount ?? null,
        paidAmount: d.paidAmount ?? 0,
        paidAmountFormatted: formatCurrency(d.paidAmount ?? 0),
        paymentStatus: d.paymentStatus ?? "pending",
        paymentStatusLabel: d.paymentStatusLabel,
        canPayNow: d.canPayNow,
      })),
    [dates, isRoomSystem, formatCurrency],
  );

  const dateCardViews = useMemo((): DateCardViewModel[] => {
    return dateCards.map((card) => {
      const dateMeta = dates.find((d) => d.id === card.id) as
        | CheckoutDate
        | undefined;
      const pendingDue = dateMeta ? getDatePendingAmount(dateMeta) : 0;

      return {
        card,
        pendingDue,
        showDatePay: Boolean(dateMeta && isDatePayable(dateMeta)),
        isFullyPaid: isDateFullyPaid(pendingDue),
        hasRescheduleRequest: hasPendingReschedulePayment(dateMeta ?? {}),
        statusLabel: getDateDisplayStatusLabel(
          card.paymentStatus,
          card.paymentStatusLabel,
        ),
      };
    });
  }, [dateCards, dates]);

  const numericBookingId = parseInt(bookingId, 10) || 0;

  const lineItemSections = useMemo(
    () =>
      selectedDate
        ? splitLineItemsForDate(selectedDate, formatUnit, {
            bookingId: numericBookingId,
          })
        : {
            bookingItems: [],
            addonItems: [],
            addonTotal: 0,
            addonLineCount: 0,
          },
    [selectedDate, formatUnit, numericBookingId],
  );

  const breakdownGroups = useMemo(
    () => buildPaymentBreakdown(dates, formatUnit),
    [dates, formatUnit],
  );

  useEffect(() => {
    if (!breakdownOpen || !selectedDateId) return;
    setOpenBreakdownDates((prev) =>
      prev.includes(selectedDateId) ? prev : [...prev, selectedDateId],
    );
  }, [breakdownOpen, selectedDateId]);

  const payableDates = useMemo(
    () => dates.filter((date) => isDatePayable(date as CheckoutDate)),
    [dates],
  );

  const showRescheduleForSelectedDate =
    selectedDate != null && canShowRescheduleButton(selectedDate);

  const bookingOutstanding = summary.outstanding;
  const showPaymentFooter = bookingOutstanding > 0;
  const footerLabel = hasMultipleDates ? "Total Due (all dates)" : "Total Due";
  const footerAmount = bookingOutstanding;
  const payAllVisibility = useMemo(
    () =>
      resolveBookingPayAllVisibility({
        canPayNow,
        bookingOutstanding,
        payableDateCount: payableDates.length,
      }),
    [canPayNow, bookingOutstanding, payableDates.length],
  );

  const canModifyAddOns = isBookingDateEligibleForAddOns(
    selectedDate?.addOnsPaymentStatus,
  );

  const handleDeleteAddon = (
    type: "table" | "package" | "ticket",
    date: CheckoutDate,
    keyword: string | number,
  ) => {
    const parsedBookingId = parseInt(bookingId, 10);
    if (Number.isNaN(parsedBookingId)) {
      toast.error("Invalid booking ID");
      return;
    }

    const apiType: "tables" | "drinks" | "tickets" =
      type === "table" ? "tables" : type === "package" ? "drinks" : "tickets";
    const apiDate = date.date_key ?? date.id;

    deleteAddOnsMutation.mutate({
      bookingId: parsedBookingId,
      date: apiDate,
      keyword,
      type: apiType,
    });
  };

  const paymentDate = dates.find((d) => d.id === paymentDateId);

  const handlePayForDate = (dateId: string) => {
    if (paymentAlreadyProcessing) return;
    const date = dates.find((d) => d.id === dateId) as CheckoutDate | undefined;
    const pendingRequest =
      date?.reschedule_requests?.find((request) => request.unpaid_amount > 0) ??
      date?.reschedule_requests?.[0] ??
      null;

    setPaymentDateId(dateId);
    setRescheduleRequest(pendingRequest);
    setPaymentModalOpen(true);
  };

  const handleRescheduleClick = (date: CheckoutDate) => {
    if (paymentAlreadyProcessing) return;
    setSelectedDateForReschedule(date);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleConfirm = (payload: RescheduleBookingPayload) => {
    if (rescheduleMutation.isPending || !selectedDateForReschedule) {
      return;
    }

    rescheduleMutation.mutate(payload, {
      onError: (error) => {
        if (!isPaymentAlreadyProcessing(error)) return;
        setPaymentAlreadyProcessing(true);
        setRescheduleModalOpen(false);
        setPaymentModalOpen(false);
        void queryClient.invalidateQueries({
          queryKey: bookingsKeys.bookingDetails(),
        });
        void queryClient.invalidateQueries({
          queryKey: bookingsKeys.lists(),
        });
      },
      onSuccess: (response) => {
        if (!response.status || !response.data) return;

        const action = resolveReschedulePaymentAction(response.data);
        if (action?.type === "stripe") {
          setRescheduleModalOpen(false);
          setSelectedDateForReschedule(null);
          setStripePaymentSession(action.session);
          stripePaymentCompletedRef.current = false;
          setIsStripePaymentOpen(true);
          return;
        }

        if (action?.type === "redirect") {
          return;
        }

        setRescheduleModalOpen(false);
        setSelectedDateForReschedule(null);
      },
    });
  };

  const handlePendingReschedulePay = (
    date: CheckoutDate,
    request: BookingRescheduleRequest,
  ) => {
    if (paymentAlreadyProcessing) return;
    setPaymentDateId(date.id);
    setRescheduleRequest(request);
    setPaymentModalOpen(true);
  };

  const handlePaymentApiSuccess = useCallback(
    (response: BookingPaymentResponse) => {
      if (!response.status || !response.data) return;

      const action = resolveBookingPaymentAction(response.data);
      if (action?.type === "stripe") {
        setPaymentModalOpen(false);
        setStripePaymentSession(action.session);
        stripePaymentCompletedRef.current = false;
        setIsStripePaymentOpen(true);
        return;
      }

      if (action?.type === "redirect") {
        return;
      }

      toast.success(response.message || "Payment processed successfully.");
      setPaymentModalOpen(false);
      setPaymentDateId(null);
      setRescheduleRequest(null);
      void queryClient.invalidateQueries({
        queryKey: bookingsKeys.bookingDetails(),
      });
    },
    [queryClient],
  );

  const handleStripePaymentComplete = useCallback(() => {
    stripePaymentCompletedRef.current = true;
    queryClient.invalidateQueries({
      queryKey: bookingsKeys.bookingDetails(),
    });
    queryClient.invalidateQueries({
      queryKey: bookingsKeys.rescheduleDates(),
    });
    queryClient.invalidateQueries({
      queryKey: bookingsKeys.lists(),
    });
    setStripePaymentSession(null);
    setIsStripePaymentOpen(false);
    setPaymentDateId(null);
    setRescheduleRequest(null);
    setRescheduleModalOpen(false);
    setSelectedDateForReschedule(null);
  }, [queryClient]);

  const resolvePaymentGatewayId = (): number | null => {
    if (
      selectedPaymentGatewayId != null &&
      availablePaymentGateways.some((g) => g.id === selectedPaymentGatewayId)
    ) {
      return selectedPaymentGatewayId;
    }
    if (availablePaymentGateways.length === 1) {
      return availablePaymentGateways[0].id;
    }
    return null;
  };

  const submitPayment = (targetDates: CheckoutDate[]) => {
    if (targetDates.length === 0) return;

    const gatewayId = resolvePaymentGatewayId();
    if (availablePaymentGateways.length > 1 && gatewayId == null) {
      toast.error("Please select a payment method");
      return;
    }

    const payload: BookingPaymentPayload = {
      booking_id: parseInt(bookingId, 10),
      payment_gateway: gatewayId ?? DEFAULT_STRIPE_PAYMENT_GATEWAY.id,
      dates: targetDates.map(buildPaymentDateEntry),
    };

    paymentMutation.mutate(payload, {
      onSuccess: handlePaymentApiSuccess,
      onError: (error) => {
        if (!isPaymentAlreadyProcessing(error)) return;
        setPaymentAlreadyProcessing(true);
        setPaymentModalOpen(false);
        setRescheduleModalOpen(false);
        void queryClient.invalidateQueries({
          queryKey: bookingsKeys.bookingDetails(),
        });
        void queryClient.invalidateQueries({
          queryKey: bookingsKeys.lists(),
        });
      },
    });
  };

  const handlePayAll = () => {
    if (payableDates.length === 0) {
      toast.info("There’s nothing to pay at the moment.");
      return;
    }

    submitPayment(payableDates as CheckoutDate[]);
  };

  const handlePaymentConfirm = () => {
    if (!paymentDate) return;
    submitPayment([paymentDate as CheckoutDate]);
  };

  return (
    <div
      className="w-full min-w-0 lg:!pb-0"
      style={
        {
          "--booking-kind-table": "var(--color-primary)",
          "--booking-kind-ticket": "var(--color-primary)",
          "--booking-kind-package": "var(--color-primary)",
          "--booking-kind-addon": "var(--color-primary)",
          paddingBottom: showPaymentFooter
            ? "calc(4.75rem + max(0.75rem, env(safe-area-inset-bottom, 0px)))"
            : "max(1rem, env(safe-area-inset-bottom, 0px))",
        } as CSSProperties
      }
    >
      <div
        className="overflow-hidden rounded-xl border border-border bg-card lg:rounded-b-none lg:border-b-0"
        style={{
          boxShadow:
            "0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent)",
        }}
      >
        {/* Header card */}
        <header className="border-b border-border p-4 sm:p-6 lg:p-8">
          <button
            type="button"
            onClick={() => router.push("/customer/bookings")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Back to Bookings
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-7 w-[3px] shrink-0 rounded-sm"
                  style={{ backgroundColor: "var(--color-primary)" }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {eventName}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-normal text-muted-foreground">
                      Booking #{bookingNumber}
                    </span>
                    {(bookingStatus ?? paymentStatus).trim() ? (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <StatusBadge
                          status={(bookingStatus ?? paymentStatus).trim()}
                          showIcon={false}
                          className="text-[11px] font-semibold"
                        />
                      </>
                    ) : null}
                    {rescheduleStatus && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          <RotateCcw className="h-3 w-3" />
                          Reschedule payment pending
                        </span>
                      </>
                    )}
                  </div>
                  {location && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={2}
                      />
                      <span className="truncate">{location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-2 self-start rounded-lg border-border px-3 text-sm font-semibold"
              onClick={onDownloadInvoice}
              disabled={isDownloadingInvoice}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {isDownloadingInvoice ? "Downloading…" : "Download Invoice"}
            </Button>
          </div>
        </header>

        {rescheduleStatus && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <RotateCcw className="h-4 w-4 shrink-0" />
              Reschedule payment pending — complete payment on the affected date
              below.
            </p>
          </div>
        )}

        {/* Dates selector */}
        <section className="border-b border-border p-4 sm:p-6 lg:p-8">
          <p className="mb-3 text-[11px] font-bold tracking-[0.18em] leading-none uppercase text-muted-foreground">
            {hasMultipleDates
              ? `Dates${dateCards.length > 1 ? ` · ${dateCards.length}` : ""}`
              : "Event date"}
          </p>
          <MultiDateSelector
            items={dateCardViews}
            selectedDateId={selectedDateId}
            onSelectDate={(id) => {
              setSelectedDateId(id);
              setExtrasOpen(false);
            }}
            onPayForDate={handlePayForDate}
            formatCurrency={formatCurrency}
            isProcessingPayment={paymentMutation.isPending}
          />
        </section>

        {/* Active date content */}
        {selectedDate && (
          <section className="border-b border-border">
            {selectedDate.reschedule_requests &&
              selectedDate.reschedule_requests.length > 0 && (
                <div className="border-b border-border bg-muted/50 p-4 sm:p-6 lg:p-8">
                  <PendingRescheduleBanner
                    requests={selectedDate.reschedule_requests}
                    formatCurrency={formatCurrency}
                    isProcessing={paymentMutation.isPending}
                    onPay={(request) =>
                      handlePendingReschedulePay(selectedDate, request)
                    }
                  />
                </div>
              )}
            <div className="p-4 sm:p-6 lg:p-8 pb-4 pt-3">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="px-5 sm:px-6 lg:px-8">
                  <BookingLineItemsList
                    bookingItems={lineItemSections.bookingItems}
                    addonItems={lineItemSections.addonItems}
                    addonTotal={lineItemSections.addonTotal}
                    addonLineCount={lineItemSections.addonLineCount}
                    packageSectionTitle={packageSectionTitle}
                    formatCurrency={formatCurrency}
                    canModifyAddOns={canModifyAddOns}
                    isMenuChoice={isMenuChoiceForDate}
                    onMenuChoices={undefined}
                    onDeleteAddon={(type, keyword) =>
                      handleDeleteAddon(type, selectedDate, keyword)
                    }
                    isDeleting={deleteAddOnsMutation.isPending}
                  />
                </div>

                {canModifyAddOns && (
                  <AddExtrasSection
                    open={extrasOpen}
                    onToggle={() => setExtrasOpen((v) => !v)}
                    bookingId={bookingId}
                    dateId={selectedDateId}
                    dateKey={selectedDate.date_key ?? selectedDate.id}
                    roomId={
                      isRoomSystem && selectedDate.room_id != null
                        ? selectedDate.room_id
                        : undefined
                    }
                    paymentStatus={selectedDate.addOnsPaymentStatus}
                    dateSource={selectedDate}
                    packageTitleFallback={packageTitleFallback}
                    formatCurrency={formatCurrency}
                    formatUnit={formatUnit}
                  />
                )}

                {showRescheduleForSelectedDate && (
                  <div className="border-t border-border px-5 py-3 sm:px-6 lg:px-8">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 rounded-lg border-border px-3 text-xs font-semibold"
                      onClick={() => handleRescheduleClick(selectedDate)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reschedule
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Payment summary — scrolls with page on mobile; pay bar is separate sticky strip */}
      <section className="overflow-hidden border-t border-border bg-card lg:border lg:rounded-b-xl">
        {summary.savedAmount != null ? (
          <div className="border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-emerald-700">
              You saved {formatCurrency(summary.savedAmount)}
            </p>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card p-4 py-3 pr-14 sm:p-6 sm:pr-6 lg:p-8 lg:pr-8 sm:py-3.5">
          <p className="text-[11px] font-extrabold tracking-[0.18em] leading-none uppercase text-foreground">
            Payment Summary
          </p>
          <button
            type="button"
            onClick={() => setBreakdownOpen((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold leading-none transition-opacity hover:opacity-85"
            style={{ color: "var(--color-primary)" }}
          >
            {breakdownOpen ? "Hide Breakdown" : "Show Breakdown"}
            {breakdownOpen ? (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
            )}
          </button>
        </div>

        {breakdownOpen && (
          <div className="border-b border-border bg-card p-4 sm:p-6 lg:p-8 py-4 max-lg:max-h-[min(42vh,20rem)] max-lg:overflow-y-auto">
            <div className="space-y-4">
              <PaymentBreakdownDateAccordion
                groups={breakdownGroups}
                formatCurrency={formatCurrency}
                openDates={openBreakdownDates}
                onOpenDatesChange={setOpenBreakdownDates}
              />

              <PaymentBreakdownTotals
                subTotal={summary.subTotal}
                addOns={summary.addOns}
                total={summary.total}
                paid={summary.paid}
                outstanding={summary.outstanding}
                formatCurrency={formatCurrency}
                savedAmount={summary.savedAmount}
              />
            </div>
          </div>
        )}

        {/* Desktop: full pay bar with gateway selector */}
        {paymentAlreadyProcessing ? (
          <div className="hidden border-t border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950 lg:block lg:rounded-b-xl">
            {PAYMENT_ALREADY_PROCESSING_MESSAGE}
          </div>
        ) : null}
        {showPaymentFooter && !paymentAlreadyProcessing && (
          <div className="hidden bg-foreground text-card p-4 sm:p-6 lg:block lg:p-8 lg:py-4 lg:rounded-b-xl">
            {payAllVisibility.showFooterPaymentControls &&
              availablePaymentGateways.length > 1 && (
                <div className="mb-4 rounded-lg border border-border bg-white p-3 text-foreground sm:p-4">
                  <PaymentGatewaySelector
                    availableGateways={availablePaymentGateways}
                    selectedGateway={
                      selectedPaymentGatewayId != null
                        ? selectedPaymentGatewayId.toString()
                        : null
                    }
                    onGatewaySelect={(gatewayId) => {
                      const parsed = Number.parseInt(gatewayId, 10);
                      setSelectedPaymentGatewayId(
                        Number.isFinite(parsed) ? parsed : null,
                      );
                    }}
                    disabled={paymentMutation.isPending}
                    showError={
                      selectedPaymentGatewayId == null &&
                      !paymentMutation.isPending
                    }
                  />
                </div>
              )}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-[11px] font-bold tracking-[0.18em] leading-none uppercase"
                  style={{
                    color: "color-mix(in srgb, var(--card) 62%, transparent)",
                  }}
                >
                  {footerLabel}
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-card sm:text-[1.75rem]">
                  {formatCurrency(footerAmount)}
                </p>
                {payAllVisibility.showPayableDatesHint && (
                  <p className="mt-1 text-[11px] text-card/70">
                    {payableDates.length} dates with outstanding balance
                  </p>
                )}
              </div>
              {payAllVisibility.showPayAllButton ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-11 shrink-0 rounded-lg px-7 text-sm font-bold shadow-none hover:opacity-[0.92]"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color:
                      "var(--color-primary-foreground, var(--primary-foreground))",
                  }}
                  onClick={handlePayAll}
                  disabled={
                    paymentMutation.isPending ||
                    (availablePaymentGateways.length > 1 &&
                      selectedPaymentGatewayId == null)
                  }
                >
                  {paymentMutation.isPending ? "Processing…" : "Pay All"}
                </Button>
              ) : payAllVisibility.showSinglePayButton &&
                payableDates.length === 1 ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-11 shrink-0 rounded-lg px-7 text-sm font-bold shadow-none hover:opacity-[0.92]"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color:
                      "var(--color-primary-foreground, var(--primary-foreground))",
                  }}
                  onClick={() => handlePayForDate(payableDates[0].id)}
                  disabled={
                    paymentMutation.isPending ||
                    (availablePaymentGateways.length > 1 &&
                      selectedPaymentGatewayId == null)
                  }
                >
                  {paymentMutation.isPending ? "Processing…" : "Pay Now"}
                </Button>
              ) : (
                <StatusBadge
                  status={paymentStatus}
                  className={cn(
                    "shrink-0 px-4 py-2 text-xs font-semibold [&_svg]:text-white",
                    FOOTER_STATUS_BADGE_CLASS[getStatusThemeKey(paymentStatus)],
                  )}
                />
              )}
            </div>
          </div>
        )}
      </section>

      {paymentAlreadyProcessing ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 lg:hidden">
          {PAYMENT_ALREADY_PROCESSING_MESSAGE}
        </div>
      ) : null}
      {/* Mobile: compact sticky pay bar — no gateway selector (modal handles that) */}
      {showPaymentFooter && !paymentAlreadyProcessing && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-foreground px-4 py-3 text-card lg:hidden"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
            boxShadow:
              "0 -8px 24px color-mix(in srgb, var(--foreground) 10%, transparent)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[11px] font-bold tracking-[0.18em] leading-none uppercase"
                style={{
                  color: "color-mix(in srgb, var(--card) 62%, transparent)",
                }}
              >
                {footerLabel}
              </p>
              <p className="mt-0.5 truncate text-xl font-extrabold tabular-nums tracking-tight text-card">
                {formatCurrency(footerAmount)}
              </p>
            </div>
            {payAllVisibility.showPayAllButton ? (
              <Button
                type="button"
                size="lg"
                className="h-11 shrink-0 rounded-lg px-5 text-sm font-bold shadow-none hover:opacity-[0.92]"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color:
                    "var(--color-primary-foreground, var(--primary-foreground))",
                }}
                onClick={handlePayAll}
                disabled={paymentMutation.isPending}
              >
                {paymentMutation.isPending ? "Processing…" : "Pay All"}
              </Button>
            ) : payAllVisibility.showSinglePayButton &&
              payableDates.length === 1 ? (
              <Button
                type="button"
                size="lg"
                className="h-11 shrink-0 rounded-lg px-5 text-sm font-bold shadow-none hover:opacity-[0.92]"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color:
                    "var(--color-primary-foreground, var(--primary-foreground))",
                }}
                onClick={() => handlePayForDate(payableDates[0].id)}
                disabled={paymentMutation.isPending}
              >
                {paymentMutation.isPending ? "Processing…" : "Pay Now"}
              </Button>
            ) : (
              <StatusBadge
                status={paymentStatus}
                className={cn(
                  "shrink-0 px-3 py-2 text-xs font-semibold [&_svg]:text-white",
                  FOOTER_STATUS_BADGE_CLASS[getStatusThemeKey(paymentStatus)],
                )}
              />
            )}
          </div>
        </div>
      )}

      {paymentDate && (
        <SingleDatePaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setPaymentDateId(null);
            setRescheduleRequest(null);
          }}
          dateInfo={{
            date: paymentDate.date,
            dateKey: paymentDate.id,
            totalAmount: (paymentDate as CheckoutDate).totalAmount,
            paidAmount: (paymentDate as CheckoutDate).paidAmount,
            pendingPayment: getDatePendingAmount(paymentDate as CheckoutDate),
            partialPaymentOption:
              summary.depositSelected > 0 ? summary.depositSelected : undefined,
          }}
          rescheduleRequest={rescheduleRequest}
          isProcessing={paymentMutation.isPending}
          paymentGateways={availablePaymentGateways}
          selectedPaymentGatewayId={selectedPaymentGatewayId}
          onPaymentGatewaySelect={setSelectedPaymentGatewayId}
          onConfirm={handlePaymentConfirm}
        />
      )}

      {selectedDateForReschedule && (
        <RescheduleDateModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedDateForReschedule(null);
          }}
          currentDate={buildRescheduleDateSummary(selectedDateForReschedule)}
          bookingId={numericBookingId}
          bookingDateId={selectedDateForReschedule.booking_date_id}
          hasAddons={dateHasAddons(selectedDateForReschedule)}
          packageSectionTitle={resolvePackageSectionTitle(
            selectedDateForReschedule,
          )}
          isProcessing={rescheduleMutation.isPending}
          bookingPaymentGateways={availablePaymentGateways}
          onConfirm={handleRescheduleConfirm}
        />
      )}

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
              description: `Booking ${stripePaymentSession.bookingNumber} — select Pay now when you’re ready to continue.`,
            });
          }
          if (!open) {
            setStripePaymentSession(null);
          }
        }}
        session={stripePaymentSession}
        successReturnPath="/payment/success"
        onPaymentComplete={handleStripePaymentComplete}
      />
    </div>
  );
}
