"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import {
  getStatusThemeKey,
  type StatusThemeKey,
} from "@/lib/status-theme";
import type { CSSProperties } from "react";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { BookingLineItemsList } from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/booking-line-items-list";
import {
  buildDateSubtitle,
  buildPaymentBreakdown,
  formatDateStripLabel,
  splitLineItemsForDate,
} from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/build-line-items";
import {
  MultiDateSelector,
  type DateCardViewModel,
} from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/multi-date-selector";
import {
  PaymentBreakdownDateAccordion,
  PaymentBreakdownTotals,
} from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/payment-breakdown";
import type { CheckoutDateCard } from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/types";
import { AddExtrasSection } from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/add-extras-panel";
import { isBookingDateEligibleForAddOns } from "@/lib/booking-addons-eligibility";
import type { VendorBookingUser } from "@/services/vendor/bookings/bookings.service";
import type { VendorBookingComment } from "@/services/vendor/bookings/bookings.service";
import type {
  MappedVendorBookingCheckout,
  VendorCheckoutDate,
} from "./map-vendor-booking-to-checkout";
import {
  getAllowedStatusOptions,
  getPaymentStatusLabel,
  getPaymentStatusNumber,
} from "./vendor-booking-status";
import { VendorBookingNotesPanel } from "./vendor-booking-notes-panel";

const FOOTER_STATUS_BADGE_CLASS: Record<StatusThemeKey, string> = {
  success: "border-emerald-400/80 bg-emerald-600 text-white",
  pending: "border-amber-400/80 bg-amber-600 text-white",
  info: "border-sky-400/80 bg-sky-600 text-white",
  destructive: "border-red-400/80 bg-red-600 text-white",
  neutral: "border-gray-400/80 bg-gray-600 text-white",
};

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

function getDateDisplayStatusLabel(
  paymentStatus: CheckoutDateCard["paymentStatus"],
  apiLabel?: string,
): string {
  if (apiLabel?.trim()) {
    const normalized = apiLabel.trim().toUpperCase();
    if (normalized === "PENDING" || normalized === "PENDING PAYMENT") {
      return "UNPAID";
    }
    return normalized;
  }
  return getDateCardStatusLabel(paymentStatus).toUpperCase();
}

interface VendorBookingCheckoutPageProps {
  bookingId: string;
  checkout: MappedVendorBookingCheckout;
  customer: VendorBookingUser;
  notes: VendorBookingComment[];
  canUpdateBooking: boolean;
  isUpdatingStatus?: boolean;
  updatingBookingDateId?: number | null;
  isAddingNote?: boolean;
  onStatusChangeRequest: (
    bookingDateId: number,
    currentStatus: string,
    newStatus: number,
    dateLabel: string,
  ) => void;
  onDeleteAddon: (
    dateKey: string,
    keyword: string | number,
    type: "table" | "package" | "ticket",
  ) => void;
  isDeletingAddon?: boolean;
  onRescheduleClick?: (date: VendorCheckoutDate) => void;
  onAddNote: (content: string) => void;
  onAddonsSaved?: () => void;
}

export function VendorBookingCheckoutPage({
  bookingId,
  checkout,
  customer,
  notes,
  canUpdateBooking,
  isUpdatingStatus = false,
  updatingBookingDateId = null,
  isAddingNote = false,
  onStatusChangeRequest,
  onDeleteAddon,
  isDeletingAddon = false,
  onRescheduleClick,
  onAddNote,
  onAddonsSaved,
}: VendorBookingCheckoutPageProps) {
  const router = useRouter();
  const { format: formatCurrency } = useCurrencyFormat();
  const formatUnit = (amount: number) => formatCurrency(amount);

  const [selectedDateId, setSelectedDateId] = useState(
    checkout.dates[0]?.id ?? "",
  );
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [openBreakdownDates, setOpenBreakdownDates] = useState<string[]>(() =>
    checkout.dates[0]?.id ? [checkout.dates[0].id] : [],
  );
  const [newNote, setNewNote] = useState("");

  const selectedDate =
    checkout.dates.find((date) => date.id === selectedDateId) ??
    checkout.dates[0];
  const hasMultipleDates = checkout.dates.length > 1;
  const isMenuChoiceForDate =
    selectedDate?.is_menu_choice ?? checkout.isMenuChoice;

  const dateCards: CheckoutDateCard[] = useMemo(
    () =>
      checkout.dates.map((date) => ({
        id: date.id,
        booking_date_id: date.booking_date_id,
        date: formatDateStripLabel(date.date_key ?? date.id, date.date),
        previousDateLabel: date.previous_date_label?.trim() || undefined,
        subtitle: buildDateSubtitle(date),
        amount: date.totalAmount ?? 0,
        amountFormatted: date.total,
        paidAmount: date.paidAmount ?? 0,
        paidAmountFormatted: formatCurrency(date.paidAmount ?? 0),
        paymentStatus: date.paymentStatus ?? "pending",
        paymentStatusLabel: date.paymentStatusLabel,
        canPayNow: false,
      })),
    [checkout.dates, formatCurrency],
  );

  const dateCardViews = useMemo((): DateCardViewModel[] => {
    return dateCards.map((card) => {
      const dateMeta = checkout.dates.find((date) => date.id === card.id);
      const pendingDue = dateMeta?.pendingAmount ?? 0;

      return {
        card,
        pendingDue,
        showDatePay: false,
        isFullyPaid: pendingDue <= 0,
        statusLabel: getDateDisplayStatusLabel(
          card.paymentStatus,
          card.paymentStatusLabel,
        ),
      };
    });
  }, [checkout.dates, dateCards]);

  const numericBookingId = Number.parseInt(bookingId, 10) || 0;

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
    () => buildPaymentBreakdown(checkout.dates, formatUnit),
    [checkout.dates, formatUnit],
  );

  useEffect(() => {
    if (!breakdownOpen || !selectedDateId) return;
    setOpenBreakdownDates((prev) =>
      prev.includes(selectedDateId) ? prev : [...prev, selectedDateId],
    );
  }, [breakdownOpen, selectedDateId]);

  const canModifyAddOns =
    canUpdateBooking &&
    isBookingDateEligibleForAddOns(selectedDate?.addOnsPaymentStatus);

  const selectedStatusNum = selectedDate
    ? getPaymentStatusNumber(selectedDate.paymentStatusRaw)
    : 0;
  const allowedStatusOptions = getAllowedStatusOptions(selectedStatusNum);

  const showPaymentFooter = checkout.summary.outstanding > 0;
  const footerLabel = hasMultipleDates
    ? "Total Due (all dates)"
    : "Total Due";

  return (
    <div
      className="w-full min-w-0 lg:!pb-0"
      style={
        {
          "--booking-kind-table": "var(--color-info)",
          "--booking-kind-ticket": "var(--chart-3)",
          "--booking-kind-package": "var(--color-success)",
          "--booking-kind-addon": "var(--color-warning)",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
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
        <header className="border-b border-border p-4 sm:p-6 lg:p-8">
          <button
            type="button"
            onClick={() => router.push("/vendor/booking-history")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Back to Booking History
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
                    {checkout.eventName}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-normal text-muted-foreground">
                      Booking #{checkout.bookingNumber}
                    </span>
                    {checkout.paymentStatus ? (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <StatusBadge
                          status={checkout.paymentStatus}
                          showIcon={false}
                          className="text-[11px] font-semibold"
                        />
                      </>
                    ) : null}
                  </div>
                  {checkout.location ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={2}
                      />
                      <span className="truncate">{checkout.location}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-muted/30 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <User
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              strokeWidth={2}
            />
            <span className="font-medium text-foreground">
              {customer.full_name}
            </span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{customer.email}</span>
          </span>
          {customer.phone ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{customer.phone}</span>
            </span>
          ) : null}
        </div>

        <section className="border-b border-border p-4 sm:p-6 lg:p-8">
          <p className="mb-3 text-[10px] font-bold tracking-[0.18em] leading-none uppercase text-muted-foreground">
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
            onPayForDate={() => undefined}
            formatCurrency={formatCurrency}
          />
        </section>

        {selectedDate ? (
          <section className="border-b border-border">
            <div className="p-4 sm:p-6 lg:p-8 pb-4 pt-3">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="px-5 sm:px-6 lg:px-8">
                  <BookingLineItemsList
                    bookingItems={lineItemSections.bookingItems}
                    addonItems={lineItemSections.addonItems}
                    addonTotal={lineItemSections.addonTotal}
                    addonLineCount={lineItemSections.addonLineCount}
                    packageSectionTitle={selectedDate.package_title}
                    formatCurrency={formatCurrency}
                    canModifyAddOns={canModifyAddOns}
                    isMenuChoice={isMenuChoiceForDate}
                    onDeleteAddon={(type, keyword) =>
                      onDeleteAddon(
                        selectedDate.date_key ?? selectedDate.id,
                        keyword,
                        type,
                      )
                    }
                    isDeleting={isDeletingAddon}
                  />
                </div>

                {canModifyAddOns ? (
                  <AddExtrasSection
                    open={extrasOpen}
                    onToggle={() => setExtrasOpen((open) => !open)}
                    bookingId={bookingId}
                    dateId={selectedDateId}
                    dateKey={selectedDate.date_key ?? selectedDate.id}
                    paymentStatus={selectedDate.addOnsPaymentStatus}
                    dateSource={selectedDate}
                    formatCurrency={formatCurrency}
                    formatUnit={formatUnit}
                    addonApi="vendor"
                    onSaveSuccess={onAddonsSaved}
                  />
                ) : null}

                {canUpdateBooking && selectedDate ? (
                  <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Payment status
                      </span>
                      <StatusBadge status={selectedDate.paymentStatusRaw} />
                    </div>
                    <Select
                      value={String(selectedStatusNum)}
                      onValueChange={(value) => {
                        const newStatusNum = Number.parseInt(value, 10);
                        if (newStatusNum !== selectedStatusNum) {
                          onStatusChangeRequest(
                            selectedDate.booking_date_id,
                            selectedDate.paymentStatusRaw,
                            newStatusNum,
                            selectedDate.date,
                          );
                        }
                      }}
                      disabled={
                        isUpdatingStatus || allowedStatusOptions.length === 0
                      }
                    >
                      <SelectTrigger className="h-9 w-full min-w-[10rem] rounded-lg border-border text-xs sm:w-[160px]">
                        {isUpdatingStatus &&
                        updatingBookingDateId ===
                          selectedDate.booking_date_id ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Updating…
                          </span>
                        ) : (
                          <span>Change status</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {allowedStatusOptions.map((statusNum) => (
                          <SelectItem
                            key={statusNum}
                            value={String(statusNum)}
                          >
                            {getPaymentStatusLabel(statusNum)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {canUpdateBooking && onRescheduleClick ? (
                  <div className="border-t border-border px-5 py-3 sm:px-6 lg:px-8">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 rounded-lg border-border px-3 text-xs font-semibold"
                      onClick={() => onRescheduleClick(selectedDate)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reschedule
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section
        className={cn(
          "border-t border-border bg-card",
          "lg:overflow-hidden lg:border lg:rounded-b-xl",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card p-4 py-3 pr-14 sm:p-6 sm:pr-6 lg:p-8 lg:pr-8 sm:py-3.5">
          <p className="text-[10px] font-extrabold tracking-[0.18em] leading-none uppercase text-foreground">
            Payment Summary
          </p>
          <button
            type="button"
            onClick={() => setBreakdownOpen((open) => !open)}
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

        {breakdownOpen ? (
          <div className="border-b border-border bg-card p-4 sm:p-6 lg:p-8 py-4 max-lg:max-h-[min(42vh,20rem)] max-lg:overflow-y-auto">
            <div className="space-y-4">
              <PaymentBreakdownDateAccordion
                groups={breakdownGroups}
                formatCurrency={formatCurrency}
                openDates={openBreakdownDates}
                onOpenDatesChange={setOpenBreakdownDates}
              />

              <PaymentBreakdownTotals
                subTotal={checkout.summary.subTotal + checkout.summary.addOns}
                paid={checkout.summary.paid}
                outstanding={checkout.summary.outstanding}
                formatCurrency={formatCurrency}
              />
            </div>
          </div>
        ) : null}

        {showPaymentFooter ? (
          <div className="bg-foreground p-4 text-card sm:p-6 lg:p-8 lg:rounded-b-xl py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-[10px] font-bold tracking-[0.18em] leading-none uppercase"
                  style={{
                    color:
                      "color-mix(in srgb, var(--card) 62%, transparent)",
                  }}
                >
                  {footerLabel}
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-card sm:text-[1.75rem]">
                  {formatCurrency(checkout.summary.outstanding)}
                </p>
              </div>
              {checkout.paymentStatus ? (
                <StatusBadge
                  status={checkout.paymentStatus}
                  className={cn(
                    "shrink-0 px-4 py-2 text-xs font-semibold [&_svg]:text-white",
                    FOOTER_STATUS_BADGE_CLASS[
                      getStatusThemeKey(checkout.paymentStatus)
                    ],
                  )}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <VendorBookingNotesPanel
        notes={notes}
        canUpdate={canUpdateBooking}
        newNote={newNote}
        onNewNoteChange={setNewNote}
        onAddNote={() => {
          const trimmed = newNote.trim();
          if (!trimmed) return;
          onAddNote(trimmed);
          setNewNote("");
        }}
        isSubmitting={isAddingNote}
      />
    </div>
  );
}
