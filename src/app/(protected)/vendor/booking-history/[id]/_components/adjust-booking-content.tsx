"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVendorBookingDetails, useAddBookingNote } from "../../_lib/queries";
import { useDeleteVendorAddOns } from "@/services/vendor/bookings/hooks/useDeleteVendorAddOns";
import {
  useUpdateVendorBookingStatus,
  useVendorRescheduleBooking,
} from "@/services/vendor/bookings/query";
import type { VendorRescheduleBookingPayload } from "@/services/vendor/bookings/type";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { usePermission } from "@/hooks/usePermission";
import { VendorRescheduleDateModal } from "./vendor-reschedule-modal";
import { mapVendorBookingToCheckout } from "./map-vendor-booking-to-checkout";
import type { VendorCheckoutDate } from "./map-vendor-booking-to-checkout";
import { buildRescheduleDateSummary, dateHasAddons } from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/build-reschedule-date-summary";
import { resolvePackageSectionTitle } from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/build-line-items";
import { VendorBookingCheckoutPage } from "./vendor-booking-checkout-page";
import { getPaymentStatusLabel } from "./vendor-booking-status";

interface AdjustBookingContentProps {
  bookingId: string;
}

export default function AdjustBookingContent({
  bookingId,
}: AdjustBookingContentProps) {
  const canUpdateBooking = usePermission("update-booking");
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedDateForReschedule, setSelectedDateForReschedule] = useState<{
    date: string;
    people: number;
    tables: number;
    tickets: number;
    drinks: number;
    price: number;
    booking_date_id: number;
    date_key: string;
    hasAddons: boolean;
    packageSectionTitle?: string;
  } | null>(null);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<{
    open: boolean;
    bookingDateId: number | null;
    currentStatus: string | null;
    newStatus: number | null;
    dateLabel: string | null;
  }>({
    open: false,
    bookingDateId: null,
    currentStatus: null,
    newStatus: null,
    dateLabel: null,
  });
  const [updatingBookingDateId, setUpdatingBookingDateId] = useState<
    number | null
  >(null);

  const { format: formatCurrency } = useCurrencyFormat();

  const {
    data: bookingResponse,
    isLoading,
    error,
    refetch,
  } = useVendorBookingDetails(Number.parseInt(bookingId, 10));

  const bookingData = bookingResponse?.data;
  const deleteAddOnsMutation = useDeleteVendorAddOns();
  const rescheduleMutation = useVendorRescheduleBooking();
  const updateStatusMutation = useUpdateVendorBookingStatus();
  const addNoteMutation = useAddBookingNote();

  const checkout = bookingData
    ? mapVendorBookingToCheckout(bookingData, (value) =>
        formatCurrency(typeof value === "number" ? value : Number(value) || 0),
      )
    : null;

  const handleDeleteAddOn = (
    dateKey: string,
    keyword: string | number,
    type: "table" | "package" | "ticket",
  ) => {
    if (!canUpdateBooking) {
      toast.error("You don't have permission to update bookings.");
      return;
    }

    const apiType =
      type === "table" ? "tables" : type === "package" ? "drinks" : "tickets";

    deleteAddOnsMutation.mutate({
      bookingId: Number.parseInt(bookingId, 10),
      date: dateKey,
      keyword,
      type: apiType,
    });
  };

  const handleRescheduleClick = (date: VendorCheckoutDate) => {
    if (!canUpdateBooking) return;

    const summary = buildRescheduleDateSummary({
      ...date,
      totalAmount: date.totalAmount,
    });
    const hasAddons =
      dateHasAddons(date) ||
      (date.packages?.some(
        (pkg) => pkg.is_addon || pkg.purchase_type === "addon",
      ) ??
        false);

    setSelectedDateForReschedule({
      ...summary,
      booking_date_id: date.booking_date_id,
      date_key: date.date_key ?? date.id,
      hasAddons,
      packageSectionTitle: resolvePackageSectionTitle(date, checkout?.drinkTitle),
    });
    setRescheduleModalOpen(true);
  };

  const handleRescheduleConfirm = (payload: VendorRescheduleBookingPayload) => {
    if (!canUpdateBooking) return;
    rescheduleMutation.mutate(payload, {
      onSuccess: () => {
        setRescheduleModalOpen(false);
        setSelectedDateForReschedule(null);
      },
    });
  };

  const handleStatusChangeRequest = (
    bookingDateId: number,
    currentStatus: string,
    newStatus: number,
    dateLabel: string,
  ) => {
    if (!canUpdateBooking) return;
    setStatusUpdateDialog({
      open: true,
      bookingDateId,
      currentStatus,
      newStatus,
      dateLabel,
    });
  };

  const handleConfirmStatusUpdate = () => {
    if (
      !canUpdateBooking ||
      !statusUpdateDialog.bookingDateId ||
      statusUpdateDialog.newStatus === null
    ) {
      return;
    }

    const bookingDateId = statusUpdateDialog.bookingDateId;
    setUpdatingBookingDateId(bookingDateId);

    updateStatusMutation.mutate(
      {
        booking_id: Number.parseInt(bookingId, 10),
        booking_date_id: bookingDateId,
        payment_status: statusUpdateDialog.newStatus,
      },
      {
        onSuccess: (response) => {
          if (response.status) {
            setStatusUpdateDialog({
              open: false,
              bookingDateId: null,
              currentStatus: null,
              newStatus: null,
              dateLabel: null,
            });
          }
          setUpdatingBookingDateId(null);
        },
        onError: () => {
          setUpdatingBookingDateId(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <section className="w-full space-y-4">
        <Card className="overflow-hidden rounded-xl border border-border p-6">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="mb-2 h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
        <Card className="overflow-hidden rounded-xl p-4">
          <Skeleton className="h-48 w-full rounded-xl" />
        </Card>
      </section>
    );
  }

  if (error || !bookingData || !checkout) {
    return (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
              Failed to load booking details
            </p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "Please try again later"}
            </p>
          </div>
        </Card>
    );
  }

  return (
    <>
      <VendorBookingCheckoutPage
        bookingId={bookingId}
        checkout={checkout}
        customer={bookingData.user}
        notes={bookingData.comments ?? []}
        canUpdateBooking={canUpdateBooking}
        isUpdatingStatus={updateStatusMutation.isPending}
        updatingBookingDateId={updatingBookingDateId}
        isAddingNote={addNoteMutation.isPending}
        onStatusChangeRequest={handleStatusChangeRequest}
        onDeleteAddon={handleDeleteAddOn}
        isDeletingAddon={deleteAddOnsMutation.isPending}
        onRescheduleClick={
          canUpdateBooking ? handleRescheduleClick : undefined
        }
        onAddNote={(content) => {
          addNoteMutation.mutate({ bookingId, content });
        }}
        onAddonsSaved={() => {
          void refetch();
        }}
      />

      <AlertDialog
        open={statusUpdateDialog.open}
        onOpenChange={(open) =>
          setStatusUpdateDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update payment status?</AlertDialogTitle>
            <AlertDialogDescription>
              Change status for{" "}
              <span className="font-semibold">
                {statusUpdateDialog.dateLabel}
              </span>{" "}
              from{" "}
              <span className="font-semibold">
                {statusUpdateDialog.currentStatus}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {statusUpdateDialog.newStatus != null
                  ? getPaymentStatusLabel(
                      statusUpdateDialog.newStatus,
                      checkout.dates.find(
                        (date) =>
                          date.booking_date_id ===
                          statusUpdateDialog.bookingDateId,
                      )?.vendorStatusOptions,
                    )
                  : ""}
                                          </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={handleConfirmStatusUpdate}>Confirm</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedDateForReschedule ? (
        <VendorRescheduleDateModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedDateForReschedule(null);
          }}
          bookingId={Number.parseInt(bookingId, 10)}
          bookingDateId={selectedDateForReschedule.booking_date_id}
          hasAddons={selectedDateForReschedule.hasAddons}
          packageSectionTitle={selectedDateForReschedule.packageSectionTitle}
          currentDate={{
            date: selectedDateForReschedule.date,
            people: selectedDateForReschedule.people,
            tables: selectedDateForReschedule.tables,
            tickets: selectedDateForReschedule.tickets,
            drinks: selectedDateForReschedule.drinks,
            price: selectedDateForReschedule.price,
          }}
          onConfirm={handleRescheduleConfirm}
          isProcessing={rescheduleMutation.isPending}
        />
      ) : null}
    </>
  );
}
