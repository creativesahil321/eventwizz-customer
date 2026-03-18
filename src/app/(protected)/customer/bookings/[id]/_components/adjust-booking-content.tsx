"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  Receipt,
  UtensilsCrossed,
  FileDown,
  MapPin,
} from "lucide-react";
import BookingInfoTab from "./booking-info-tab";
import AddOnsTab from "./add-ons-tab";
import { toast } from "sonner";
import { useBookingDetails } from "@/services/customer/bookings/query";
import { bookingsService } from "@/services/customer/bookings/bookings.service";
import { Skeleton } from "@/components/ui/skeleton";

interface AdjustBookingContentProps {
  bookingId: string;
}

export default function AdjustBookingContent({
  bookingId,
}: AdjustBookingContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("booking-info");
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  // Fetch booking details from API
  const {
    data: bookingResponse,
    isLoading,
    error,
  } = useBookingDetails(parseInt(bookingId));

  const bookingData = bookingResponse?.data;

  const parseAmount = (value?: number | string | null) => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const normalizePaymentStatus = (
    status: string,
  ): "paid" | "pending" | "partial" | "refunded" => {
    const s = status?.toLowerCase().trim() ?? "";
    if (s === "paid") return "paid";
    if (s === "refunded") return "refunded";
    if (s === "partial payment" || s === "partial") return "partial";
    return "pending";
  };

  const transformedData = bookingData
    ? (() => {
        const subTotalAmount = parseAmount(bookingData.sub_total);
        const addOnsAmount = parseAmount(bookingData.addons_amount);
        const totalAmount = parseAmount(bookingData.total);
        const paidAmount = parseAmount(bookingData.paid_amount);
        const depositSelectedAmount = parseAmount(bookingData.partial_payment);
        const outstandingAmount = Math.max(totalAmount - paidAmount, 0);

        return {
          id: bookingId,
          event_name: bookingData.event_name,
          booking_id: bookingData.booking_id.toString(),
          booking_number:
            bookingData.booking_number || bookingData.booking_id.toString(),
          location: bookingData.location,
          payment_status: bookingData.payment_status,
          is_menu_choice: bookingData.is_menu_choice || false,
          summary: {
            subTotal: subTotalAmount,
            addOns: addOnsAmount,
            total: totalAmount,
            paid: paidAmount,
            outstanding: outstandingAmount,
            depositSelected: depositSelectedAmount,
          },
          summaryFormatted: {
            subTotal: formatCurrency(subTotalAmount),
            addOns: formatCurrency(addOnsAmount),
            total: formatCurrency(totalAmount),
            paid: formatCurrency(paidAmount),
            outstanding: formatCurrency(outstandingAmount),
            depositSelected: formatCurrency(depositSelectedAmount),
          },
          dates: bookingData.event_dates.map((eventDate) => ({
            id: eventDate.date_key,
            booking_date_id: eventDate.booking_date_id,
            date: eventDate.date,
            parentBookingDate: eventDate.parent_booking_date || null,
            hasUnbookedEventDates: eventDate.has_unbooked_event_dates,
            paymentStatus: normalizePaymentStatus(eventDate.payment_status),
            total: `£${eventDate.total_amount.toFixed(2)}`,
            partialPayment: eventDate.paid_amount
              ? `£${eventDate.paid_amount.toFixed(2)}`
              : undefined,
            tickets: eventDate.tickets, // Full ticket details
            drinks: eventDate.drinks, // Full drink details
            addons: eventDate.addons, // Include add-ons data
            reschedule_requests: eventDate.reschedule_requests || [], // Include reschedule requests
            items: [
              ...eventDate.tables.map((table) => ({
                type: "table" as const,
                capacity: table.table_size,
                people_added: table.people,
                table_count: table.no_tables,
                allocation: table.allocation, // Now Record<string, number | string>
                price_per_person:
                  typeof table.price_per_person === "string"
                    ? parseFloat(table.price_per_person)
                    : table.price_per_person,
                menuChoicesCompleted: 0, // TODO: Get from API if available
              })),
              // Tickets are now displayed separately with full details
            ],
          })),
          total_people: bookingData.event_dates.reduce(
            (sum, date) =>
              sum +
              date.tables.reduce((tSum, table) => tSum + table.people, 0) +
              date.tickets.reduce((tSum, ticket) => tSum + ticket.quantity, 0),
            0,
          ),
          total_tables: bookingData.event_dates.reduce(
            (sum, date) =>
              sum +
              date.tables.reduce((tSum, table) => tSum + table.no_tables, 0),
            0,
          ),
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
      <section className="w-full relative flex flex-col space-y-6">
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => router.push("/customer/bookings")}
                className="gap-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Bookings
              </Button>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        </div>
        {/* Tabs Section Skeleton */}
        <Card className="shadow-sm">
          <div className="space-y-6 pb-6">
            {/* Tabs List Skeleton */}
            <div className="w-full overflow-x-auto pb-2 no-scrollbar mb-4">
              <div className="flex w-full bg-background p-1 h-auto rounded-lg gap-1 border">
                <Skeleton className="h-9 w-40 mx-0.5 rounded-md" />
                <Skeleton className="h-9 w-40 mx-0.5 rounded-md" />
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="bg-white rounded-lg p-4 sm:p-6">
              <div className="space-y-4">
                {/* Accordion Skeleton */}
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>

                {/* Separator */}
                <div className="h-px bg-gray-200 my-4" />

                {/* Payment Summary Skeleton */}
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="h-px bg-gray-200 my-2" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  // Error state
  if (error || !transformedData) {
    return (
      <section className="w-full relative flex flex-col space-y-6">
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/customer/bookings")}
            className="gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Button>
        </div>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-semibold text-red-600 mb-2">
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
    <section className="w-full relative flex flex-col space-y-6">
      {/* Header with Back Button */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6">
        <div className="flex flex-col gap-4">
          {/* Top Row - Back Button & Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push("/customer/bookings")}
              className="gap-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Bookings
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadInvoice}
                disabled={isDownloadingInvoice}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                {isDownloadingInvoice ? "Downloading…" : "Download Invoice"}
              </Button>
            </div>
          </div>

          {/* Event Info Row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl title-header font-bold text-black mb-4">
                {transformedData.event_name}
              </h1>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Location */}
                {transformedData.location && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-gray-100 shrink-0">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Location
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {transformedData.location}
                      </p>
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-gray-100 shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Date
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        {transformedData.dates &&
                        transformedData.dates.length > 0
                          ? transformedData.dates[0].date
                          : "No dates"}
                      </p>
                      {transformedData.dates &&
                        transformedData.dates.length > 1 && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">
                            +{transformedData.dates.length - 1} more
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                {/* Booking Number */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-gray-100 shrink-0">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Booking Number
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {transformedData.booking_number}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <StatusBadge
              status={transformedData.payment_status}
              className="text-sm px-3 py-1.5 shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2 no-scrollbar mb-4">
          <TabsList className="flex w-max min-w-full bg-background p-1 h-auto rounded-lg gap-1 border">
            <TabsTrigger
              value="booking-info"
              className="px-4 py-2 h-9 text-sm font-medium whitespace-nowrap rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5 flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Booking Information</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger
              value="add-ons"
              className="px-4 py-2 h-9 text-sm font-medium whitespace-nowrap rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5 flex items-center gap-2"
            >
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Add-ons & Services</span>
              <span className="sm:hidden">Add-ons</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <Card className="shadow-sm">
          <div className="space-y-6 pb-6">
            <TabsContent value="booking-info" className="mt-0 w-full">
              <div className="bg-white rounded-lg p-4 sm:p-6">
                <BookingInfoTab bookingData={transformedData} />
              </div>
            </TabsContent>

            <TabsContent value="add-ons" className="mt-0 w-full">
              <div className="bg-white rounded-lg p-4 sm:p-6">
                <AddOnsTab
                  bookingId={bookingId}
                  onSaveSuccess={() => setActiveTab("booking-info")}
                  dates={transformedData.dates.map((d) => ({
                    id: d.id,
                    date: d.date,
                    people: d.items.reduce(
                      (sum, item) => sum + item.people_added,
                      0,
                    ),
                    tables: d.items
                      .filter((item) => item.type === "table")
                      .map((item) => {
                        // Convert Record<string, number | string> to arrays for internal state
                        const allocationArray: number[] = [];
                        const parentIdsArray: number[] = [];

                        if (item.allocation) {
                          Object.entries(item.allocation).forEach(
                            ([tableId, val]) => {
                              parentIdsArray.push(parseInt(tableId));
                              const numericValue =
                                typeof val === "string"
                                  ? parseInt(val.replace("+", ""))
                                  : val;
                              allocationArray.push(numericValue);
                            },
                          );
                        }

                        return {
                          id: `table-${item.capacity}`,
                          tableConfigId: 0, // Placeholder - not available from booking details API
                          capacity: item.capacity || 0,
                          table_count: item.table_count || 0,
                          allocation: allocationArray,
                          parent_ids: parentIdsArray,
                          people_added: item.people_added,
                          price_per_person: item.price_per_person || 0,
                        };
                      }),
                  }))}
                />
              </div>
            </TabsContent>
          </div>
        </Card>
      </Tabs>
    </section>
  );
}
