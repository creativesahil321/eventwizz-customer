"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { parseFormattedMoney } from "@/lib/currency-format";
import { useBookingPayment } from "@/services/customer/bookings/query";
import { useDeleteAddOns } from "@/services/customer/bookings/hooks/useDeleteAddOns";
import type {
  BookingDetailsAddonTable,
  BookingDetailsAddonTicket,
  BookingPaymentPayload,
} from "@/services/customer/bookings/type";
import { toast } from "sonner";
import { AddExtrasPanel, AddExtrasToggle } from "./add-extras-panel";
import {
  buildDateSubtitle,
  buildLineItemsForDate,
  buildPaymentBreakdown,
  formatDateStripLabel,
  type BookingDateSource,
} from "./build-line-items";
import { getKindStyles, getKindAllocationPillStyle } from "./item-kinds";
import { KindIconChip } from "./kind-icon-chip";
import {
  isBookingDateEligibleForAddOns,
  type BookingDatePaymentStatus,
} from "@/lib/booking-addons-eligibility";
import type { CheckoutDateCard } from "./types";
import { SingleDatePaymentModal } from "../single-date-payment-modal";
import "./booking-checkout.css";

interface RescheduleRequest {
  id: number;
  event_date: string;
  unpaid_amount: number;
}

interface CheckoutDate extends BookingDateSource {
  booking_date_id: number;
  total: string;
  paymentStatus?: "paid" | "pending" | "partial" | "refunded" | "cancelled";
  addOnsPaymentStatus?: BookingDatePaymentStatus;
  canPayNow?: boolean;
  partialPayment?: string;
  reschedule_requests?: RescheduleRequest[];
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
  const {
    format: formatCurrency,
    formatCompact: formatUnit,
    symbol,
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

  const selectedDate = dates.find((d) => d.id === selectedDateId) ?? dates[0];
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
        subtitle: isRoomSystem
          ? d.room_name
          : buildDateSubtitle(d),
        amount: 0,
        amountFormatted: d.total,
        paymentStatus: d.paymentStatus ?? "pending",
        canPayNow: d.canPayNow,
      })),
    [dates, isRoomSystem],
  );

  const lineItems = useMemo(
    () => (selectedDate ? buildLineItemsForDate(selectedDate, formatUnit) : []),
    [selectedDate, formatUnit],
  );

  const breakdownGroups = useMemo(
    () => buildPaymentBreakdown(dates, formatUnit, summary.addOns),
    [dates, formatUnit, summary.addOns],
  );

  const pendingExtrasTotal = Object.values(pendingExtrasByDate).reduce(
    (s, p) => s + p.total,
    0,
  );

  const displayTotal = summary.outstanding + pendingExtrasTotal;
  const isFullyPaid = displayTotal <= 0;
  const footerLabel = isFullyPaid ? "Total Paid" : "Total Due";
  const footerAmount = isFullyPaid
    ? summary.paid > 0
      ? summary.paid
      : summary.total
    : displayTotal;

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

  const handlePayNow = () => {
    const target =
      dates.find(
        (d) =>
          d.canPayNow !== false &&
          (d.paymentStatus === "pending" || d.paymentStatus === "partial"),
      ) ?? selectedDate;

    if (!target) {
      toast.info("Nothing to pay right now");
      return;
    }
    setPaymentDateId(target.id);
    setRescheduleRequest(null);
    setPaymentModalOpen(true);
  };

  const handlePaymentConfirm = () => {
    if (!paymentDate) return;
    const paymentGatewayId = paymentGateways?.[0]?.id ?? 1;
    const dateWithMeta = paymentDate as CheckoutDate;

    const payload: BookingPaymentPayload = {
      booking_id: parseInt(bookingId, 10),
      payment_gateway: paymentGatewayId,
      dates: [
        {
          booking_date_id: dateWithMeta.booking_date_id,
          add_ons: {
            tables:
              dateWithMeta.addons?.tables
                ?.map((table: BookingDetailsAddonTable) => ({
                  booking_date_table_id: table.booking_date_table_id ?? 0,
                  event_date_table_id: table.id ?? 0,
                }))
                .filter(
                  (t: { booking_date_table_id: number; event_date_table_id: number }) =>
                    t.booking_date_table_id > 0 && t.event_date_table_id > 0,
                ) ?? [],
            tickets:
              dateWithMeta.addons?.tickets
                ?.map((ticket: BookingDetailsAddonTicket) => ({
                  booking_date_ticket_id:
                    ticket.booking_date_ticket_id || ticket.id || 0,
                }))
                .filter((t: { booking_date_ticket_id: number }) => t.booking_date_ticket_id > 0) ?? [],
          },
        },
      ],
    };

    paymentMutation.mutate(payload, {
      onSuccess: (response) => {
        if (response.status && !response.data?.redirect_url) {
          toast.success(response.message || "Payment processed successfully!");
          setPaymentModalOpen(false);
          setPaymentDateId(null);
        }
      },
    });
  };

  return (
    <div className="booking-checkout-page w-full">
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
          <p className="booking-section-label mb-3">Dates</p>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="grid min-w-[260px] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {dateCards.map((card) => {
                const active = card.id === selectedDateId;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setSelectedDateId(card.id);
                      setExtrasOpen(false);
                    }}
                    className={cn(
                      "booking-date-card rounded-lg border bg-card text-left transition-all",
                      active
                        ? "booking-date-card--active"
                        : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <p
                      className={cn(
                        "booking-date-card__date text-[13px] font-bold leading-snug sm:text-sm",
                        !active && "text-foreground",
                      )}
                    >
                      {card.date}
                    </p>
                    {card.subtitle && (
                      <p className="mt-0.5 truncate text-[11px] font-normal text-muted-foreground">
                        {card.subtitle}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                      {card.amountFormatted}
                    </p>
                  </button>
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
                <div className="booking-line-list divide-y divide-border/70">
                  {lineItems.map((item) => {
                const kind = getKindStyles(item.kind);
                return (
                  <div
                    key={item.id}
                    className="booking-line-item flex gap-3 sm:items-start sm:gap-4"
                  >
                    <KindIconChip kind={item.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {item.name}
                        </p>
                        <span className={kind.badgeClassName}>
                          {kind.label}
                        </span>
                        {item.quantity && item.quantity > 1 && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                              color: "var(--color-primary)",
                            }}
                          >
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-xs font-normal leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {item.allocation && item.allocation.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.allocation.map((pill) => (
                            <span
                              key={pill.label}
                              className="rounded-md border px-2 py-0.5 text-[10px] font-semibold"
                              style={getKindAllocationPillStyle()}
                            >
                              {pill.label}: {pill.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                        {item.meta}
                      </p>
                      {item.showMenuChoices && isMenuChoice && (
                        <button
                          type="button"
                          className="booking-menu-link"
                          onClick={handleMenuChoices}
                        >
                          Menu choices →
                        </button>
                      )}
                    </div>
                    <div className="flex shrink-0 items-start gap-1.5">
                      <p className="booking-line-amount">
                        {formatCurrency(item.amount)}
                      </p>
                      {item.deletable &&
                        item.deletePayload &&
                        canModifyAddOns && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAddon(
                                item.deletePayload!.type,
                                selectedDateId,
                                item.deletePayload!.keyword,
                              )
                            }
                            disabled={deleteAddOnsMutation.isPending}
                            className="booking-line-delete"
                            title={`Remove ${item.name}`}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}

              {lineItems.length === 0 && (
                <p className="booking-line-item py-10 text-center text-sm font-normal text-muted-foreground">
                  No items for this date yet.
                </p>
              )}
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
      <section className="booking-payment-summary">
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
                      style={
                        group.isExtras
                          ? {
                              backgroundColor:
                                "color-mix(in srgb, var(--color-primary) 10%, var(--color-card))",
                            }
                          : {
                              backgroundColor:
                                "color-mix(in srgb, var(--color-muted) 55%, var(--color-card))",
                            }
                      }
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {group.title}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {formatCurrency(group.subtotal)}
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {group.lines.map((line, idx) => (
                        <div
                          key={line.id}
                          className={cn(
                            "flex items-start justify-between gap-3 px-4 py-2.5",
                            idx % 2 === 1 && "bg-muted/40",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {line.label}
                            </p>
                            <p className="text-[11px] font-normal text-muted-foreground">
                              {line.meta}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(line.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
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

          <div className="booking-payment-summary__footer booking-panel-padding py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="booking-payment-summary__total-label">{footerLabel}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-card sm:text-[1.75rem]">
                  {formatCurrency(footerAmount)}
                </p>
              </div>
              {canPayNow && summary.outstanding > 0 ? (
                <Button
                  type="button"
                  size="lg"
                  className="booking-payment-summary__pay-btn h-11 shrink-0 px-7 text-sm shadow-none"
                  onClick={handlePayNow}
                  disabled={paymentMutation.isPending}
                >
                  {paymentMutation.isPending ? "Processing…" : "Pay Now"}
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
            totalAmount: parseFormattedMoney(paymentDate.total, symbol),
            paidAmount: paymentDate.partialPayment
              ? parseFormattedMoney(paymentDate.partialPayment, symbol)
              : 0,
            pendingPayment:
              parseFormattedMoney(paymentDate.total, symbol) -
              (paymentDate.partialPayment
                ? parseFormattedMoney(paymentDate.partialPayment, symbol)
                : 0),
            partialPaymentOption:
              summary.depositSelected > 0 ? summary.depositSelected : undefined,
          }}
          rescheduleRequest={rescheduleRequest}
          isProcessing={paymentMutation.isPending}
          onConfirm={handlePaymentConfirm}
        />
      )}
    </div>
  );
}
