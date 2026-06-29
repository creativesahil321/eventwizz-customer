"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useBookingDetails } from "@/services/customer/bookings/query";
import {
  normalizePaymentStatusForAddOnsDate,
  type BookingDatePaymentStatus,
} from "@/lib/booking-addons-eligibility";
import { bookingsService } from "@/services/customer/bookings/bookings.service";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { buildCartDateLookupKey } from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import BookingCheckoutPage from "./booking-checkout/booking-checkout-page";
import type { BookingDateSource } from "./booking-checkout/build-line-items";
import type { BookingRescheduleRequest } from "@/services/customer/bookings/type";
import { useState } from "react";

interface AdjustBookingContentProps {
  bookingId: string;
}

export default function AdjustBookingContent({
  bookingId,
}: AdjustBookingContentProps) {
  const { format: formatCurrency } = useCurrencyFormat();
  const router = useRouter();
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  const {
    data: bookingResponse,
    isLoading,
    error,
  } = useBookingDetails(parseInt(bookingId));

  const bookingData = bookingResponse?.data;

  const parseAmount = (value?: number | string | null) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const normalizePaymentStatus = (
    status: string,
  ): "paid" | "pending" | "partial" | "refunded" | "cancelled" => {
    const s = status?.toLowerCase().trim() ?? "";
    if (s === "paid") return "paid";
    if (s === "refunded") return "refunded";
    if (s === "cancelled" || s === "canceled") return "cancelled";
    if (s === "partial payment" || s === "partial") return "partial";
    return "pending";
  };

  const transformedData = bookingData
    ? (() => {
        const datesSubTotal = bookingData.dates.reduce(
          (sum, dateEntry) => sum + parseAmount(dateEntry.total_amount),
          0,
        );
        const datesPaidTotal = bookingData.dates.reduce(
          (sum, dateEntry) => sum + parseAmount(dateEntry.paid_amount),
          0,
        );

        const apiSummary = bookingData.payment_summary;
        const subTotalAmount =
          parseAmount(apiSummary?.sub_total_amount) || datesSubTotal;
        const addOnsAmount = parseAmount(
          apiSummary?.total_addons_amount ?? apiSummary?.addons_amount,
        );
        const totalAmount =
          parseAmount(apiSummary?.total_amount) || datesSubTotal;
        const paidAmount =
          parseAmount(
            apiSummary?.total_paid_amount ?? apiSummary?.paid_amount,
          ) || datesPaidTotal;
        const depositSelectedAmount = parseAmount(apiSummary?.deposit_amount);

        const pendingFromSummary =
          apiSummary?.total_pending_amount ?? apiSummary?.pending_amount;
        const outstandingAmount =
          pendingFromSummary != null
            ? parseAmount(pendingFromSummary)
            : Math.max(totalAmount - paidAmount, 0);

        const paymentStatusLabel =
          bookingData.payment_status_label?.trim() || "Pending";

        const bookingCanPay = apiSummary?.can_pay_now !== false;
        const isRoomSystem = bookingData.is_room_system === true;

        const effectiveBookingPaymentStatus =
          outstandingAmount > 0 &&
          paymentStatusLabel.toLowerCase().includes("paid")
            ? "Partial Payment"
            : paymentStatusLabel;

        const dates: (BookingDateSource & {
          booking_date_id: number;
          is_menu_choice?: boolean;
          has_unbooked_event_dates?: boolean;
          total: string;
          totalAmount: number;
          paidAmount: number;
          pendingAmount: number | null;
          paymentStatus: ReturnType<typeof normalizePaymentStatus>;
          addOnsPaymentStatus: BookingDatePaymentStatus;
          canPayNow: boolean;
          partialPayment?: string;
          reschedule_requests?: BookingRescheduleRequest[];
        })[] = bookingData.dates.map((dateEntry) => {
          const pendingAmount =
            dateEntry.pending_amount != null
              ? parseAmount(dateEntry.pending_amount)
              : null;
          const paidAmountForDate = parseAmount(dateEntry.paid_amount);
          const totalAmountForDate = parseAmount(dateEntry.total_amount);
          const hasPendingReschedule = (dateEntry.reschedule_requests?.length ?? 0) > 0;
          const rawPaymentStatus = normalizePaymentStatus(
            dateEntry.payment_status_label,
          );
          const paymentStatus =
            pendingAmount != null && pendingAmount > 0 && rawPaymentStatus === "paid"
              ? "partial"
              : rawPaymentStatus;
          const paymentStatusLabel =
            pendingAmount != null && pendingAmount > 0
              ? hasPendingReschedule
                ? "Reschedule Due"
                : dateEntry.payment_status_label?.trim() || "Partial"
              : dateEntry.payment_status_label?.trim() || undefined;
          const dateCanPay =
            bookingCanPay &&
            dateEntry.can_pay_now !== false &&
            (pendingAmount != null && pendingAmount > 0
              ? true
              : paymentStatus !== "paid");

          return {
            id: isRoomSystem
              ? buildCartDateLookupKey(dateEntry.date_key, dateEntry.room_id)
              : dateEntry.date_key,
            date_key: dateEntry.date_key,
            room_id: dateEntry.room_id,
            booking_date_id: dateEntry.booking_date_id,
            is_menu_choice:
              dateEntry.is_menu_choice ?? bookingData.is_menu_choice ?? false,
            has_unbooked_event_dates:
              dateEntry.has_unbooked_event_dates === true,
            date: dateEntry.date_label,
            previous_date_label: dateEntry.previous_date_label ?? null,
            room_name: dateEntry.room_name,
            package_title: dateEntry.package_title,
            item_summary: dateEntry.item_summary,
            paymentStatus,
            paymentStatusLabel,
            addOnsPaymentStatus: normalizePaymentStatusForAddOnsDate(
              dateEntry.payment_status_label,
            ),
            canPayNow: dateCanPay,
            total: formatCurrency(dateEntry.total_amount),
            totalAmount: totalAmountForDate,
            paidAmount: paidAmountForDate,
            pendingAmount,
            partialPayment: dateEntry.paid_amount
              ? formatCurrency(dateEntry.paid_amount)
              : undefined,
            tickets: dateEntry.tickets,
            packages: dateEntry.packages,
            tables: dateEntry.tables,
            addons: dateEntry.addons,
            reschedule_requests: dateEntry.reschedule_requests ?? [],
          };
        });

        return {
          id: bookingId,
          event_name: bookingData.event_name,
          booking_id: bookingData.booking_id.toString(),
          booking_number:
            bookingData.booking_number || bookingData.booking_id.toString(),
          location: bookingData.location,
          payment_status: effectiveBookingPaymentStatus,
          canPayNow: bookingCanPay && outstandingAmount > 0,
          isRoomSystem: bookingData.is_room_system === true,
          is_menu_choice: bookingData.is_menu_choice || false,
          reschedule_status: bookingData.reschedule_status === true,
          reschedule_count: bookingData.reschedule_count ?? 0,
          payment_gateways: bookingData.payment_gateways,
          summary: {
            subTotal: subTotalAmount,
            addOns: addOnsAmount,
            total: totalAmount,
            paid: paidAmount,
            outstanding: outstandingAmount,
            depositSelected: depositSelectedAmount,
          },
          dates,
        };
      })()
    : null;

  const handleDownloadInvoice = async () => {
    if (isDownloadingInvoice) return;
    setIsDownloadingInvoice(true);
    try {
      await bookingsService.downloadBookingInvoice(parseInt(bookingId));
      toast.success("Invoice downloaded successfully");
    } catch (err) {
      console.error("Invoice download failed:", err);
      toast.error("Failed to download invoice. Please try again.");
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  if (isLoading) {
    return (
      <section className="w-full space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="mb-2 h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Card className="overflow-hidden rounded-xl p-4">
          <Skeleton className="mb-3 h-3 w-16" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-48 w-full rounded-xl" />
        </Card>
      </section>
    );
  }

  if (error || !transformedData) {
    return (
      <section className="w-full space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/customer/bookings")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </Button>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-2 text-lg font-semibold text-destructive">
              Failed to load booking details
            </p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "Please try again later"}
            </p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <BookingCheckoutPage
      bookingId={bookingId}
      bookingNumber={transformedData.booking_number}
      eventName={transformedData.event_name}
      location={transformedData.location}
      paymentStatus={transformedData.payment_status}
      canPayNow={transformedData.canPayNow}
      isRoomSystem={transformedData.isRoomSystem}
      isMenuChoice={transformedData.is_menu_choice}
      rescheduleStatus={transformedData.reschedule_status}
      summary={transformedData.summary}
      dates={transformedData.dates}
      paymentGateways={transformedData.payment_gateways}
      onDownloadInvoice={handleDownloadInvoice}
      isDownloadingInvoice={isDownloadingInvoice}
    />
  );
}
