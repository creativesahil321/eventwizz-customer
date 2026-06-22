"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { useBookingPayment, bookingsKeys } from "@/services/customer/bookings/query";
import { resolveBookingPaymentAction } from "@/services/customer/bookings/booking-payment";
import type { BookingPaymentResponse } from "@/services/customer/bookings/type";
import type { CheckoutStripePaymentSession } from "@/services/customer/checkout";
import CheckoutStripePaymentModal from "@/app/(public)/vendor/checkout/_components/checkout-stripe-payment-modal";
import { useDeleteAddOns } from "@/services/customer/bookings/hooks/useDeleteAddOns";
import type {
  BookingDetailsAddonTable,
  BookingDetailsAddonTicket,
  BookingPaymentPayload,
  PaymentDate,
} from "@/services/customer/bookings/type";
import { toast } from "sonner";
import {
  AddExtrasPanel,
  AddExtrasToggle,
} from "./add-extras-panel";
import {
  buildDateSubtitle,
  buildPaymentBreakdown,
  formatDateStripLabel,
  splitLineItemsForDate,
  type BookingDateSource,
} from "./build-line-items";
import { BookingLineItemsList } from "./booking-line-items-list";
import {
  isBookingDateEligibleForAddOns,
  type BookingDatePaymentStatus,
} from "@/lib/booking-addons-eligibility";
import type { CheckoutDateCard, PaymentBreakdownLine } from "./types";
import {
  getAddonCategoryLabel,
  splitAddonsByCategory,
} from "./types";
import { SingleDatePaymentModal } from "../single-date-payment-modal";
import { SingleDateEventStrip } from "./single-date-event-strip";
import "./booking-checkout.css";

interface RescheduleRequest {
  id: number;
  event_date: string;
  unpaid_amount: number;
}

interface CheckoutDate extends BookingDateSource {
  booking_date_id: number;
  total: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number | null;
  paymentStatus?: "paid" | "pending" | "partial" | "refunded" | "cancelled";
  paymentStatusLabel?: string;
  addOnsPaymentStatus?: BookingDatePaymentStatus;
  canPayNow?: boolean;
  partialPayment?: string;
  reschedule_requests?: RescheduleRequest[];
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
  canPayNow?: boolean;
  isRoomSystem?: boolean;
  isMenuChoice?: boolean;
  summary: {
    subTotal: number;
    addOns: number;
    total: number;
    paid: number;
    outstanding: number;
    depositSelected: number;
  };
  dates: CheckoutDate[];
  paymentGateways?: Array<{ id: number; slug: string }>;
  onDownloadInvoice: () => void;
  isDownloadingInvoice?: boolean;
}

function PaymentBreakdownLineSections({
  lines,
  formatCurrency,
  variant = "default",
  packageSectionTitle,
}: {
  lines: PaymentBreakdownLine[];
  formatCurrency: (amount: number) => string;
  variant?: "default" | "addon";
  packageSectionTitle?: string;
}) {
  const { seating, packages } = splitAddonsByCategory(lines);
  const sections = [
    { category: "seating" as const, items: seating },
    { category: "package" as const, items: packages },
  ].filter((section) => section.items.length > 0);

  if (sections.length <= 1) {
    return (
      <div className="divide-y divide-border/60">
        {lines.map((line) => (
          <PaymentBreakdownLineRow
            key={line.id}
            line={line}
            formatCurrency={formatCurrency}
            variant={variant}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <div
          key={section.category}
          className={cn(
            "booking-breakdown-subsection",
            variant === "addon" && "booking-breakdown-subsection--addon",
            sectionIndex > 0 && "booking-breakdown-subsection--separated",
          )}
        >
          <p
            className={cn(
              "booking-breakdown-subsection__label",
              variant === "addon" && "booking-breakdown-subsection__label--addon",
            )}
          >
            {getAddonCategoryLabel(
              section.category,
              section.items,
              packageSectionTitle,
            )}
          </p>
          <div className="divide-y divide-border/60">
            {section.items.map((line) => (
              <PaymentBreakdownLineRow
                key={line.id}
                line={line}
                formatCurrency={formatCurrency}
                variant={variant}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function PaymentBreakdownLineRow({
  line,
  formatCurrency,
  variant = "default",
}: {
  line: PaymentBreakdownLine;
  formatCurrency: (amount: number) => string;
  variant?: "default" | "addon";
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-4 py-2.5",
        variant === "addon" && "booking-payment-breakdown-addons__line",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{line.label}</p>
        <p className="text-[11px] font-normal text-muted-foreground">
          {line.meta}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {formatCurrency(line.amount)}
      </span>
    </div>
  );
}

export default function BookingCheckoutPage({
  bookingId,
  bookingNumber,
  eventName,
  location,
  paymentStatus,
  canPayNow = true,
  isRoomSystem = false,
  isMenuChoice,
  summary,
  dates,
  paymentGateways,
  onDownloadInvoice,
  isDownloadingInvoice,
}: BookingCheckoutPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    format: formatCurrency,
    formatCompact: formatUnit,
  } = useCurrencyFormat();
  const paymentMutation = useBookingPayment();
  const deleteAddOnsMutation = useDeleteAddOns();

  const [selectedDateId, setSelectedDateId] = useState(dates[0]?.id ?? "");
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [pendingExtrasByDate, setPendingExtrasByDate] = useState<
    Record<string, { total: number; count: number }>
  >({});

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDateId, setPaymentDateId] = useState<string | null>(null);
  const [rescheduleRequest, setRescheduleRequest] =
    useState<RescheduleRequest | null>(null);
  const [stripePaymentSession, setStripePaymentSession] =
    useState<CheckoutStripePaymentSession | null>(null);
  const [isStripePaymentOpen, setIsStripePaymentOpen] = useState(false);

  const selectedDate = dates.find((d) => d.id === selectedDateId) ?? dates[0];
  const hasMultipleDates = dates.length > 1;
  const pendingExtras = pendingExtrasByDate[selectedDateId] ?? {
    total: 0,
    count: 0,
  };

  const dateCards: CheckoutDateCard[] = useMemo(
    () =>
      dates.map((d) => ({
        id: d.id,
        booking_date_id: d.booking_date_id,
        date: formatDateStripLabel(d.id, d.date),
        subtitle: isRoomSystem ? d.room_name : buildDateSubtitle(d),
        amount: d.totalAmount ?? 0,
        amountFormatted: d.total,
        paidAmount: d.paidAmount ?? 0,
        paidAmountFormatted: formatCurrency(d.paidAmount ?? 0),
        paymentStatus: d.paymentStatus ?? "pending",
        paymentStatusLabel: d.paymentStatusLabel,
        canPayNow: d.canPayNow,
      })),
    [dates, isRoomSystem, formatCurrency],
  );

  const lineItemSections = useMemo(
    () =>
      selectedDate
        ? splitLineItemsForDate(selectedDate, formatUnit)
        : {
            bookingItems: [],
            addonItems: [],
            addonTotal: 0,
            addonLineCount: 0,
          },
    [selectedDate, formatUnit],
  );

  const breakdownGroups = useMemo(
    () => buildPaymentBreakdown(dates, formatUnit),
    [dates, formatUnit],
  );

  const pendingExtrasTotal = Object.values(pendingExtrasByDate).reduce(
    (s, p) => s + p.total,
    0,
  );

  const payableDates = useMemo(
    () => dates.filter((date) => isDatePayable(date as CheckoutDate)),
    [dates],
  );

  const bookingOutstanding = summary.outstanding;
  const isFullyPaid = bookingOutstanding <= 0 && pendingExtrasTotal <= 0;
  const footerLabel = isFullyPaid
    ? "Total Paid"
    : hasMultipleDates
      ? "Total Due (all dates)"
      : "Total Due";
  const footerAmount = isFullyPaid
    ? summary.paid > 0
      ? summary.paid
      : summary.total
    : bookingOutstanding;
  const showFooterPayAll =
    canPayNow && bookingOutstanding > 0 && payableDates.length > 0 && hasMultipleDates;
  const showPayAll =
    canPayNow && bookingOutstanding > 0 && payableDates.length > 0;

  const handlePendingExtrasChange = useCallback(
    (total: number, count: number) => {
      setPendingExtrasByDate((prev) => ({
        ...prev,
        [selectedDateId]: { total, count },
      }));
    },
    [selectedDateId],
  );

  const handleMenuChoices = () => {
    router.push(`/customer/menu-choices/${bookingId}`);
  };

  const canModifyAddOns = isBookingDateEligibleForAddOns(
    selectedDate?.addOnsPaymentStatus,
  );

  const handleDeleteAddon = (
    type: "table" | "package" | "ticket",
    dateId: string,
    keyword: string | number,
  ) => {
    const parsedBookingId = parseInt(bookingId, 10);
    if (Number.isNaN(parsedBookingId)) {
      toast.error("Invalid booking ID");
      return;
    }

    const apiType: "tables" | "drinks" | "tickets" =
      type === "table" ? "tables" : type === "package" ? "drinks" : "tickets";

    deleteAddOnsMutation.mutate({
      bookingId: parsedBookingId,
      date: dateId,
      keyword,
      type: apiType,
    });
  };

  const paymentDate = dates.find((d) => d.id === paymentDateId);

  const handlePayForDate = (dateId: string) => {
    setPaymentDateId(dateId);
    setRescheduleRequest(null);
    setPaymentModalOpen(true);
  };

  const handlePaymentApiSuccess = useCallback(
    (response: BookingPaymentResponse) => {
      if (!response.status || !response.data) return;

      const action = resolveBookingPaymentAction(response.data);
      if (action?.type === "stripe") {
        setPaymentModalOpen(false);
        setStripePaymentSession(action.session);
        setIsStripePaymentOpen(true);
        return;
      }

      if (action?.type === "redirect") {
        return;
      }

      toast.success(response.message || "Payment processed successfully!");
      setPaymentModalOpen(false);
      setPaymentDateId(null);
      setRescheduleRequest(null);
    },
    [],
  );

  const handleStripePaymentComplete = useCallback(() => {
    const parsedBookingId = parseInt(bookingId, 10);
    if (!Number.isNaN(parsedBookingId)) {
      queryClient.invalidateQueries({
        queryKey: bookingsKeys.bookingDetail(parsedBookingId),
      });
      queryClient.invalidateQueries({
        queryKey: bookingsKeys.lists(),
      });
    }
    setStripePaymentSession(null);
    setIsStripePaymentOpen(false);
    setPaymentDateId(null);
    setRescheduleRequest(null);
  }, [bookingId, queryClient]);

  const submitPayment = (targetDates: CheckoutDate[]) => {
    if (targetDates.length === 0) return;

    const payload: BookingPaymentPayload = {
      booking_id: parseInt(bookingId, 10),
      payment_gateway: paymentGateways?.[0]?.id ?? 1,
      dates: targetDates.map(buildPaymentDateEntry),
    };

    paymentMutation.mutate(payload, {
      onSuccess: handlePaymentApiSuccess,
    });
  };

  const handlePayAll = () => {
    if (payableDates.length === 0) {
      toast.info("Nothing to pay right now");
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
      className={cn(
        "booking-checkout-page w-full",
        !hasMultipleDates && "booking-checkout-page--single-date",
      )}
    >
      <div className="booking-card">
        {/* Header card */}
        <header className="border-b border-border booking-panel-padding">
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
                    <span className="text-muted-foreground/50">·</span>
                    <StatusBadge
                      status={paymentStatus}
                      label={
                        paymentStatus.toLowerCase().includes("paid")
                          ? "Paid"
                          : undefined
                      }
                      className="text-[11px] font-semibold"
                    />
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

        {/* Dates selector */}
        <section className="border-b border-border booking-panel-padding">
          <p className="booking-section-label mb-3">
            {hasMultipleDates ? "Dates" : "Event date"}
          </p>
          <div className={cn(!hasMultipleDates && "-mx-0", "-mx-1 overflow-x-auto pb-1")}>
            <div
              className={cn(
                hasMultipleDates
                  ? "grid min-w-[280px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                  : "grid grid-cols-1",
              )}
            >
              {hasMultipleDates
                ? dateCards.map((card) => {
                const active = card.id === selectedDateId;
                const dateMeta = dates.find((d) => d.id === card.id) as
                  | CheckoutDate
                  | undefined;
                const pendingDue = dateMeta ? getDatePendingAmount(dateMeta) : 0;
                const showDatePay =
                  dateMeta != null && isDatePayable(dateMeta) && pendingDue > 0;
                const isFullyPaid = isDateFullyPaid(pendingDue);
                const statusLabel = getDateDisplayStatusLabel(
                  card.paymentStatus,
                  card.paymentStatusLabel,
                );

                return (
                  <div
                    key={card.id}
                    className={cn(
                      "booking-date-card rounded-xl border bg-card transition-all",
                      active
                        ? "booking-date-card--active"
                        : "border-border",
                      isFullyPaid && "booking-date-card--paid",
                      showDatePay && "booking-date-card--payable",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateId(card.id);
                        setExtrasOpen(false);
                      }}
                      className="booking-date-card__select w-full text-left"
                    >
                      <div className="booking-date-card__header flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "booking-date-card__date min-w-0 text-sm font-bold leading-snug",
                            !active && "text-foreground",
                          )}
                        >
                          {card.date}
                        </p>
                        <span
                          className={cn(
                            "booking-date-card__status-badge shrink-0",
                            `booking-date-card__status-badge--${card.paymentStatus}`,
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      {card.subtitle && (
                        <p className="booking-date-card__subtitle mt-0.5 truncate text-xs text-muted-foreground">
                          {card.subtitle}
                        </p>
                      )}
                      <div className="booking-date-card__amounts mt-3 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="booking-date-card__amount-label text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Total
                          </p>
                          <p className="booking-date-card__amount-value mt-0.5 text-lg font-bold leading-none text-foreground">
                            {card.amountFormatted}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {isFullyPaid ? (
                            <>
                              <p className="booking-date-card__amount-label booking-date-card__amount-label--paid text-[10px] font-semibold uppercase tracking-wide">
                                Paid
                              </p>
                              <p className="booking-date-card__amount-value booking-date-card__amount-value--paid mt-0.5 text-base font-bold leading-none">
                                {card.paidAmountFormatted}
                              </p>
                            </>
                          ) : pendingDue > 0 ? (
                            <>
                              <p className="booking-date-card__amount-label booking-date-card__amount-label--due text-[10px] font-semibold uppercase tracking-wide">
                                Due
                              </p>
                              <p className="booking-date-card__amount-value booking-date-card__amount-value--due mt-0.5 text-base font-bold leading-none">
                                {formatCurrency(pendingDue)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="booking-date-card__amount-label text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Paid
                              </p>
                              <p className="booking-date-card__amount-value mt-0.5 text-base font-bold leading-none text-muted-foreground">
                                {card.paidAmountFormatted}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                    {isFullyPaid ? (
                      <div className="booking-date-card__footer booking-date-card__footer--paid">
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={2.5}
                        />
                        <span>Fully Paid</span>
                      </div>
                    ) : showDatePay ? (
                      <Button
                        type="button"
                        size="sm"
                        className="booking-date-card__pay-btn booking-date-card__footer-pay"
                        onClick={() => handlePayForDate(card.id)}
                        disabled={paymentMutation.isPending}
                      >
                        Pay {formatCurrency(pendingDue)} Now
                      </Button>
                    ) : null}
                  </div>
                );
              })
                : dateCards.map((card) => {
                    const dateMeta = dates.find((d) => d.id === card.id) as
                      | CheckoutDate
                      | undefined;
                    const pendingDue = dateMeta
                      ? getDatePendingAmount(dateMeta)
                      : 0;
                    const showDatePay =
                      dateMeta != null &&
                      isDatePayable(dateMeta) &&
                      pendingDue > 0;

                    return (
                      <SingleDateEventStrip
                        key={card.id}
                        card={card}
                        pendingDue={pendingDue}
                        showPay={showDatePay}
                        statusLabel={getDateDisplayStatusLabel(
                          card.paymentStatus,
                          card.paymentStatusLabel,
                        )}
                        formatCurrency={formatCurrency}
                        isProcessing={paymentMutation.isPending}
                        onPay={() => handlePayForDate(card.id)}
                      />
                    );
                  })}
            </div>
          </div>
        </section>

        {/* Active date content */}
        {selectedDate && (
          <section className="border-b border-border">
            {selectedDate.reschedule_requests &&
              selectedDate.reschedule_requests.length > 0 && (
                <div className="border-b border-border bg-muted/50 booking-panel-padding">
                  {selectedDate.reschedule_requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        Vendor reschedule request
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Proposed new date: {request.event_date}
                      </p>
                      {request.unpaid_amount > 0 && (
                        <p className="mt-2 text-sm font-medium text-foreground">
                          Additional payment:{" "}
                          {formatCurrency(request.unpaid_amount)}
                        </p>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                          setPaymentDateId(selectedDate.id);
                          setRescheduleRequest(request);
                          setPaymentModalOpen(true);
                        }}
                      >
                        {request.unpaid_amount > 0
                          ? "Accept & Pay Now"
                          : "Accept Reschedule"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            <div className="booking-panel-padding pb-4 pt-3">
              <div className="booking-date-group">
                <div className="booking-line-list">
                  <BookingLineItemsList
                    bookingItems={lineItemSections.bookingItems}
                    addonItems={lineItemSections.addonItems}
                    addonTotal={lineItemSections.addonTotal}
                    addonLineCount={lineItemSections.addonLineCount}
                    packageSectionTitle={selectedDate.package_title}
                    formatCurrency={formatCurrency}
                    canModifyAddOns={canModifyAddOns}
                    isMenuChoice={isMenuChoice}
                    onMenuChoices={handleMenuChoices}
                    onDeleteAddon={(type, keyword) =>
                      handleDeleteAddon(type, selectedDateId, keyword)
                    }
                    isDeleting={deleteAddOnsMutation.isPending}
                  />
                </div>

                <AddExtrasToggle
                  open={extrasOpen}
                  onToggle={() => setExtrasOpen((v) => !v)}
                  pendingCount={pendingExtras.count}
                  pendingTotalFormatted={formatCurrency(pendingExtras.total)}
                />
                {extrasOpen && (
                  <AddExtrasPanel
                    bookingId={bookingId}
                    dateId={selectedDateId}
                    paymentStatus={selectedDate.addOnsPaymentStatus}
                    dateSource={selectedDate}
                    formatCurrency={formatCurrency}
                    formatUnit={formatUnit}
                    onPendingTotalChange={handlePendingExtrasChange}
                  />
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Payment summary + pay bar (Lovable unified block) */}
      <section
        className={cn(
          "booking-payment-summary",
          !hasMultipleDates && "booking-payment-summary--single-date",
        )}
      >
          <div className="booking-payment-summary__header booking-panel-padding py-3 sm:py-3.5">
            <p className="booking-payment-summary__title">Payment Summary</p>
            <button
              type="button"
              onClick={() => setBreakdownOpen((v) => !v)}
              className="booking-payment-summary__toggle"
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
            <div className="booking-payment-summary__breakdown booking-panel-padding py-4">
              <div className="space-y-4">
                {breakdownGroups.map((group) => (
                  <div
                    key={group.id}
                    className="overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <div
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--color-muted) 55%, var(--color-card))",
                      }}
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {group.title}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {formatCurrency(group.subtotal)}
                      </span>
                    </div>

                    {group.lines.length > 0 && (
                      <PaymentBreakdownLineSections
                        lines={group.lines}
                        formatCurrency={formatCurrency}
                        packageSectionTitle={group.packageTitle}
                      />
                    )}

                    {group.addonLines && group.addonLines.length > 0 && (
                      <div className="booking-payment-breakdown-addons">
                        <div className="booking-payment-breakdown-addons__header">
                          <span className="booking-payment-breakdown-addons__title">
                            Extra add-ons
                          </span>
                          <span className="text-xs font-semibold tabular-nums">
                            {formatCurrency(group.addonSubtotal ?? 0)}
                          </span>
                        </div>
                        <PaymentBreakdownLineSections
                          lines={group.addonLines}
                          formatCurrency={formatCurrency}
                          variant="addon"
                          packageSectionTitle={group.packageTitle}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="space-y-2 rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-normal text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCurrency(summary.subTotal + summary.addOns)}
                    </span>
                  </div>
                  {summary.paid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.paid)}
                      </span>
                    </div>
                  )}
                  {summary.outstanding > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Outstanding</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.outstanding)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!hasMultipleDates ? null : (
          <div className="booking-payment-summary__footer booking-panel-padding py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="booking-payment-summary__total-label">{footerLabel}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-card sm:text-[1.75rem]">
                  {formatCurrency(footerAmount)}
                </p>
                {showPayAll && payableDates.length > 1 && (
                  <p className="mt-1 text-[11px] text-card/70">
                    {payableDates.length} dates with outstanding balance
                  </p>
                )}
              </div>
              {showFooterPayAll ? (
                <Button
                  type="button"
                  size="lg"
                  className="booking-payment-summary__pay-btn h-11 shrink-0 px-7 text-sm shadow-none"
                  onClick={handlePayAll}
                  disabled={paymentMutation.isPending}
                >
                  {paymentMutation.isPending ? "Processing…" : "Pay All"}
                </Button>
              ) : (
                <StatusBadge
                  status={paymentStatus}
                  label={
                    paymentStatus.toLowerCase().includes("paid")
                      ? "Paid"
                      : undefined
                  }
                  className="booking-payment-summary__paid-badge shrink-0"
                />
              )}
            </div>
          </div>
          )}
        </section>

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
          onConfirm={handlePaymentConfirm}
        />
      )}

      <CheckoutStripePaymentModal
        open={isStripePaymentOpen}
        onOpenChange={(open) => {
          setIsStripePaymentOpen(open);
          if (!open && stripePaymentSession) {
            toast.message("Payment not completed", {
              description: `Booking ${stripePaymentSession.bookingNumber} — tap Pay Now when you're ready to continue.`,
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
