"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Receipt,
  User,
  Mail,
  Phone,
  MapPin,
  Download,
  Printer,
  CreditCard,
  CheckCircle2,
  UtensilsCrossed,
  Ticket,
  Wine,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useVendorBookingDetails } from "../../_lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

interface AdjustBookingContentProps {
  bookingId: string;
}

export default function AdjustBookingContent({
  bookingId,
}: AdjustBookingContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("booking-info");
  const [expandedAllocations, setExpandedAllocations] = useState<
    Record<string, boolean>
  >({});
  const [expandedAddOns, setExpandedAddOns] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch booking details from API
  const {
    data: bookingResponse,
    isLoading,
    error,
  } = useVendorBookingDetails(parseInt(bookingId));

  const bookingData = bookingResponse?.data;

  // Helper function to safely format amounts (handles null/undefined)
  const formatAmount = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return "£0.00";
    }
    return `£${Number(value).toFixed(2)}`;
  };

  const handleDownload = () => {
    toast.success("Downloading booking receipt...");
    // TODO: Implement download logic
  };

  const handlePrint = () => {
    toast.success("Preparing to print...");
    // TODO: Implement print logic
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("paid") || statusLower.includes("full")) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower.includes("pending")) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower.includes("partial")) {
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          <Clock className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getPendingAmount = (
    totalAmount: number | null | undefined,
    paidAmount: number | null | undefined
  ): string | null => {
    const total = totalAmount ?? 0;
    const paid = paidAmount ?? 0;
    const pending = total - paid;
    if (pending <= 0) return null;
    return formatAmount(pending);
  };

  const toggleAllocationExpansion = (dateId: string, itemIdx: number) => {
    const key = `${dateId}-${itemIdx}`;
    setExpandedAllocations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAddOnsExpansion = (dateId: string) => {
    setExpandedAddOns((prev) => ({
      ...prev,
      [dateId]: !prev[dateId],
    }));
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="w-full relative flex flex-col space-y-6">
        <Card className="border-[var(--color-border)] shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/vendor/booking-history")}
                  className="gap-2 hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Booking History
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
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <div className="space-y-6 pb-6">
            <div className="w-full overflow-x-auto pb-2 no-scrollbar mb-4">
              <div className="flex w-full bg-background p-1 h-auto rounded-lg gap-1 border">
                <Skeleton className="h-9 w-40 mx-0.5 rounded-md" />
                <Skeleton className="h-9 w-40 mx-0.5 rounded-md" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  // Error state
  if (error || !bookingData) {
    return (
      <section className="w-full relative flex flex-col space-y-6">
        <Card className="border-[var(--color-border)] shadow-md">
          <CardContent className="p-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/vendor/booking-history")}
              className="gap-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Booking History
            </Button>
          </CardContent>
        </Card>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
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

  // Calculate totals with null safety
  const totalTables = bookingData.event_dates.reduce(
    (sum, date) =>
      sum +
      (date.tables?.reduce((tSum, table) => tSum + (table.no_tables ?? 0), 0) ??
        0),
    0
  );

  const totalTickets = bookingData.event_dates.reduce(
    (sum, date) =>
      sum +
      (date.tickets?.reduce(
        (tSum, ticket) => tSum + (ticket.quantity ?? 0),
        0
      ) ?? 0),
    0
  );

  const totalPeople = bookingData.event_dates.reduce(
    (sum, date) =>
      sum +
      (date.tables?.reduce((tSum, table) => tSum + (table.people ?? 0), 0) ??
        0) +
      (date.tickets?.reduce(
        (tSum, ticket) => tSum + (ticket.quantity ?? 0),
        0
      ) ?? 0),
    0
  );

  return (
    <section className="w-full relative flex flex-col space-y-6">
      {/* Header Section */}
      <Card className="border-[var(--color-border)] shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Top Row - Back Button & Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push("/vendor/booking-history")}
                className="gap-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Booking History
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>

            <Separator />

            {/* Event & Customer Info */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl title-header font-bold text-black mb-2">
                    {bookingData.event_name}
                  </h1>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="font-mono bg-blue-600 text-white hover:bg-blue-700 border-0">
                      <Receipt className="h-3 w-3 mr-1" />
                      {bookingData.booking_number}
                    </Badge>
                    {getPaymentStatusBadge(bookingData.payment_status)}
                  </div>
                </div>
              </div>

              {/* Customer & Booking Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Customer Name */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-blue-50 shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Customer Name
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {bookingData.user.full_name}
                    </p>
                  </div>
                </div>

                {/* Customer Email */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-green-50 shrink-0">
                    <Mail className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-foreground break-all">
                      {bookingData.user.email}
                    </p>
                  </div>
                </div>

                {/* Customer Phone */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-purple-50 shrink-0">
                    <Phone className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Phone
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {bookingData.user.phone}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {bookingData.location && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-orange-50 shrink-0">
                      <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Location
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {bookingData.location}
                      </p>
                    </div>
                  </div>
                )}

                {/* Event Dates Count */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-indigo-50 shrink-0">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Event Dates
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {bookingData.event_dates.length}{" "}
                      {bookingData.event_dates.length === 1 ? "Date" : "Dates"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="booking-info" className="gap-2">
            <Receipt className="h-4 w-4" />
            Booking Details
          </TabsTrigger>
          <TabsTrigger value="payment-info" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Summary
          </TabsTrigger>
        </TabsList>

        <Card className="shadow-sm border-[var(--color-border)]">
          <TabsContent value="booking-info" className="mt-0">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Event Dates */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Event Dates ({bookingData.event_dates.length})
                    </h3>
                  </div>

                  <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-3"
                  >
                    {bookingData.event_dates.map((dateInfo, index) => {
                      const pendingAmount = getPendingAmount(
                        dateInfo.total_amount,
                        dateInfo.paid_amount
                      );
                      const totalDateTables =
                        dateInfo.tables?.reduce(
                          (sum, table) => sum + (table.no_tables ?? 0),
                          0
                        ) ?? 0;
                      const totalDateGuests =
                        dateInfo.tables?.reduce(
                          (sum, table) => sum + (table.people ?? 0),
                          0
                        ) ?? 0;
                      const totalDateTickets =
                        dateInfo.tickets?.reduce(
                          (sum, ticket) => sum + (ticket.quantity ?? 0),
                          0
                        ) ?? 0;
                      const totalDateDrinks =
                        dateInfo.drinks?.reduce(
                          (sum, drink) => sum + (drink.quantity ?? 0),
                          0
                        ) ?? 0;

                      const hasAddons =
                        (dateInfo.addons?.tables &&
                          dateInfo.addons.tables.length > 0) ||
                        (dateInfo.addons?.tickets &&
                          dateInfo.addons.tickets.length > 0) ||
                        (dateInfo.addons?.drinks &&
                          dateInfo.addons.drinks.length > 0);

                      return (
                        <AccordionItem
                          key={dateInfo.booking_date_id}
                          value={`date-${index}`}
                          className="border-2 rounded-lg overflow-hidden bg-white shadow-sm"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 hover:no-underline">
                            <div className="flex items-center gap-3 text-left w-full">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Show rescheduled date information */}
                                {dateInfo.parent_booking_date ? (
                                  <div className="mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-sm text-muted-foreground line-through">
                                        {dateInfo.parent_booking_date.date}
                                      </p>
                                      <RotateCcw className="h-3 w-3 text-amber-600" />
                                      <p className="font-semibold text-sm text-foreground">
                                        {dateInfo.date}
                                      </p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="mt-1 text-xs border-amber-300 bg-amber-50 text-amber-700"
                                    >
                                      Rescheduled
                                    </Badge>
                                  </div>
                                ) : (
                                  <p className="font-semibold text-sm text-foreground">
                                    {dateInfo.date}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-muted-foreground">
                                  {/* Tables */}
                                  {totalDateTables > 0 && (
                                    <div className="flex items-center gap-1">
                                      <UtensilsCrossed className="h-3.5 w-3.5" />
                                      <span>
                                        {totalDateTables}{" "}
                                        {totalDateTables === 1
                                          ? "Table"
                                          : "Tables"}
                                      </span>
                                    </div>
                                  )}
                                  {/* Tickets */}
                                  {totalDateTickets > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Ticket className="h-3.5 w-3.5" />
                                      <span>
                                        {totalDateTickets}{" "}
                                        {totalDateTickets === 1
                                          ? "Ticket"
                                          : "Tickets"}
                                      </span>
                                    </div>
                                  )}
                                  {/* Drinks */}
                                  {totalDateDrinks > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Wine className="h-3.5 w-3.5" />
                                      <span>
                                        {totalDateDrinks}{" "}
                                        {totalDateDrinks === 1
                                          ? "Drink"
                                          : "Drinks"}
                                      </span>
                                    </div>
                                  )}
                                  {/* Add-ons Badge */}
                                  {hasAddons && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0.5 h-5 bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 font-medium"
                                    >
                                      Add-ons
                                    </Badge>
                                  )}
                                  <span>•</span>
                                  <span className="font-semibold text-foreground">
                                    {formatAmount(dateInfo.total_amount)}
                                  </span>
                                </div>
                              </div>
                              {getPaymentStatusBadge(dateInfo.payment_status)}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 bg-gray-50/50 border-t">
                            <div className="pt-3 space-y-4">
                              {/* Payment Information */}
                              <Card className="border-2 bg-white">
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-3 border-b-2 border-primary">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md shrink-0 bg-primary/10">
                                        <CreditCard className="h-4 w-4 text-primary" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">
                                          Total Amount
                                        </p>
                                        <p className="text-sm font-semibold text-foreground">
                                          {formatAmount(dateInfo.total_amount)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md shrink-0 bg-green-100">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">
                                          Paid Amount
                                        </p>
                                        <p className="text-sm font-semibold text-green-600">
                                          {formatAmount(dateInfo.paid_amount)}
                                        </p>
                                      </div>
                                    </div>
                                    {pendingAmount && (
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md shrink-0 bg-red-100">
                                          <Clock className="h-4 w-4 text-red-600" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs text-muted-foreground">
                                            Pending
                                          </p>
                                          <p className="text-sm font-semibold text-red-600">
                                            {pendingAmount}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Tables Section */}
                                  {dateInfo.tables &&
                                    dateInfo.tables.length > 0 && (
                                      <div className="mt-4">
                                        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-blue-50 border border-blue-100 mb-3">
                                          <div className="flex items-center gap-2">
                                            <UtensilsCrossed className="h-4 w-4 text-blue-600" />
                                            <span className="text-xs font-semibold text-blue-900">
                                              Tables ({totalDateTables})
                                            </span>
                                          </div>
                                          <span className="text-xs font-semibold text-blue-900">
                                            {totalDateGuests} Guests
                                          </span>
                                        </div>

                                        <div className="space-y-3">
                                          {dateInfo.tables.map((table, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-4"
                                            >
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-sm font-medium text-foreground">
                                                    Table of {table.table_size}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                                                    {table.no_tables}{" "}
                                                    {table.no_tables === 1
                                                      ? "Table"
                                                      : "Tables"}
                                                  </span>
                                                </div>
                                                {/* Table Allocation */}
                                                {table.allocation &&
                                                  table.allocation.length >
                                                    0 && (
                                                    <div className="mt-1.5 space-y-1">
                                                      <p className="text-xs text-muted-foreground mb-1">
                                                        Seating Arrangement:
                                                      </p>
                                                      <div className="flex flex-wrap gap-2">
                                                        {(() => {
                                                          const MAX_VISIBLE = 6;
                                                          const key = `${dateInfo.booking_date_id}-${idx}`;
                                                          const isExpanded =
                                                            expandedAllocations[
                                                              key
                                                            ] || false;
                                                          const visible =
                                                            isExpanded
                                                              ? table.allocation
                                                              : table.allocation?.slice(
                                                                  0,
                                                                  MAX_VISIBLE
                                                                ) || [];
                                                          const hasMore =
                                                            (table.allocation
                                                              ?.length || 0) >
                                                            MAX_VISIBLE;

                                                          return (
                                                            <>
                                                              {visible.map(
                                                                (
                                                                  people,
                                                                  tableIdx
                                                                ) => (
                                                                  <div
                                                                    key={
                                                                      tableIdx
                                                                    }
                                                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100"
                                                                  >
                                                                    <span className="text-xs font-medium text-blue-700">
                                                                      Table{" "}
                                                                      {tableIdx +
                                                                        1}
                                                                      :
                                                                    </span>
                                                                    <span className="text-xs font-semibold text-blue-900">
                                                                      {people}{" "}
                                                                      {people ===
                                                                      1
                                                                        ? "Person"
                                                                        : "People"}
                                                                    </span>
                                                                  </div>
                                                                )
                                                              )}
                                                              {hasMore && (
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                  onClick={() =>
                                                                    toggleAllocationExpansion(
                                                                      dateInfo.booking_date_id.toString(),
                                                                      idx
                                                                    )
                                                                  }
                                                                >
                                                                  {isExpanded ? (
                                                                    <>
                                                                      <ChevronUp className="h-3 w-3 mr-1" />
                                                                      Show Less
                                                                    </>
                                                                  ) : (
                                                                    <>
                                                                      <ChevronDown className="h-3 w-3 mr-1" />
                                                                      Show{" "}
                                                                      {(table
                                                                        .allocation
                                                                        ?.length ||
                                                                        0) -
                                                                        MAX_VISIBLE}{" "}
                                                                      More
                                                                    </>
                                                                  )}
                                                                </Button>
                                                              )}
                                                            </>
                                                          );
                                                        })()}
                                                      </div>
                                                    </div>
                                                  )}
                                                <p className="text-xs text-muted-foreground mt-1.5">
                                                  £{table.price_per_person ?? 0}{" "}
                                                  × {table.people ?? 0}
                                                </p>
                                              </div>
                                              <p className="text-sm font-semibold text-foreground shrink-0">
                                                {formatAmount(table.total)}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                  {/* Tickets Section */}
                                  {dateInfo.tickets.length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Ticket className="h-4 w-4 text-blue-600" />
                                        <span className="text-xs font-semibold text-foreground">
                                          Tickets ({totalDateTickets})
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {dateInfo.tickets.map((ticket, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-4"
                                          >
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-foreground">
                                                {ticket.title}
                                              </p>
                                              {ticket.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                  {ticket.description}
                                                </p>
                                              )}
                                              <p className="text-xs text-muted-foreground mt-0.5">
                                                £{ticket.price_per_ticket} ×{" "}
                                                {ticket.quantity}
                                              </p>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground shrink-0">
                                              £
                                              {ticket.price_per_ticket *
                                                ticket.quantity}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Drinks Section */}
                                  {dateInfo.drinks.length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Wine className="h-4 w-4 text-green-600" />
                                        <span className="text-xs font-semibold text-foreground">
                                          {bookingData.drink_title || "Drinks"}{" "}
                                          ({totalDateDrinks})
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {dateInfo.drinks.map((drink, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-4"
                                          >
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-foreground">
                                                {drink.title}
                                              </p>
                                              <p className="text-xs text-muted-foreground mt-0.5">
                                                £{drink.price} ×{" "}
                                                {drink.quantity}
                                              </p>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground shrink-0">
                                              {formatAmount(drink.total)}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Add-ons Section */}
                                  {hasAddons && (
                                    <div className="mt-4 pt-4 border-t">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleAddOnsExpansion(
                                            dateInfo.booking_date_id.toString()
                                          )
                                        }
                                        className="flex items-center justify-between w-full py-2 px-3 border border-primary rounded-md hover:bg-primary/10 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Plus className="h-4 w-4" />
                                          <span className="text-xs font-semibold">
                                            Add-ons Included
                                          </span>
                                          <Badge className="text-xs bg-purple-100 text-purple-700">
                                            £
                                            {dateInfo.addons.total_amount?.toFixed(
                                              2
                                            ) ?? "0.00"}
                                          </Badge>
                                        </div>
                                        {expandedAddOns[
                                          dateInfo.booking_date_id.toString()
                                        ] ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </button>

                                      {expandedAddOns[
                                        dateInfo.booking_date_id.toString()
                                      ] && (
                                        <div className="mt-2 space-y-3 pl-4">
                                          {/* Add-on Tables */}
                                          {dateInfo.addons.tables &&
                                            dateInfo.addons.tables.length >
                                              0 && (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                                  Additional Tables
                                                </p>
                                                {dateInfo.addons.tables.map(
                                                  (table, idx) => (
                                                    <div
                                                      key={idx}
                                                      className="text-sm py-1"
                                                    >
                                                      Table of{" "}
                                                      {table.table_size} ×{" "}
                                                      {table.no_tables} - £
                                                      {table.total
                                                        ? table.total.toFixed(2)
                                                        : "0.00"}
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            )}

                                          {/* Add-on Tickets */}
                                          {dateInfo.addons.tickets &&
                                            dateInfo.addons.tickets.length >
                                              0 && (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                                  Additional Tickets
                                                </p>
                                                {dateInfo.addons.tickets.map(
                                                  (ticket, idx) => (
                                                    <div
                                                      key={idx}
                                                      className="text-sm py-1"
                                                    >
                                                      {ticket.title} ×{" "}
                                                      {ticket.quantity}
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            )}

                                          {/* Add-on Drinks */}
                                          {dateInfo.addons.drinks &&
                                            dateInfo.addons.drinks.length >
                                              0 && (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                                  Additional Drinks
                                                </p>
                                                {dateInfo.addons.drinks.map(
                                                  (drink, idx) => (
                                                    <div
                                                      key={idx}
                                                      className="text-sm py-1"
                                                    >
                                                      {drink.title} ×{" "}
                                                      {drink.quantity} - £
                                                      {drink.total
                                                        ? drink.total.toFixed(2)
                                                        : "0.00"}
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Show Parent Booking Date Info for Rescheduled Bookings */}
                                  {dateInfo.parent_booking_date && (
                                    <div className="mt-4 pt-4 border-t">
                                      <div className="flex items-center gap-2 mb-3">
                                        <RotateCcw className="h-4 w-4 text-amber-600" />
                                        <span className="text-xs font-semibold text-amber-900">
                                          Original Booking (Before Reschedule)
                                        </span>
                                      </div>
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                                        <p className="text-sm font-medium text-amber-900">
                                          {dateInfo.parent_booking_date.date}
                                        </p>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                          <div>
                                            <p className="text-amber-700">
                                              Total
                                            </p>
                                            <p className="font-semibold text-amber-900">
                                              {formatAmount(
                                                dateInfo.parent_booking_date
                                                  .total_amount
                                              )}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-amber-700">
                                              Paid
                                            </p>
                                            <p className="font-semibold text-green-600">
                                              {formatAmount(
                                                dateInfo.parent_booking_date
                                                  .paid_amount
                                              )}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-amber-700">
                                              Pending
                                            </p>
                                            <p className="font-semibold text-red-600">
                                              {formatAmount(
                                                dateInfo.parent_booking_date
                                                  .pending_payment
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="payment-info" className="mt-0">
            <CardContent className="p-6">
              <Card className="border-2 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        Payment Summary
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">
                          Package Sub-total
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatAmount(bookingData.sub_total)}
                        </span>
                      </div>

                      {bookingData.addons_amount !== null &&
                        bookingData.addons_amount > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-muted-foreground">
                              Add-ons Total
                            </span>
                            <span className="text-sm font-semibold text-purple-600">
                              {formatAmount(bookingData.addons_amount)}
                            </span>
                          </div>
                        )}

                      {bookingData.deposit_paid !== null &&
                        bookingData.deposit_paid > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-muted-foreground">
                              Deposit
                            </span>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatAmount(bookingData.deposit_paid)}
                            </span>
                          </div>
                        )}

                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">
                          Paid Amount
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatAmount(bookingData.paid_amount)}
                        </span>
                      </div>

                      {bookingData.pending_payment > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-muted-foreground">
                            Pending Payment
                          </span>
                          <span className="text-sm font-semibold text-red-600">
                            {formatAmount(bookingData.pending_payment)}
                          </span>
                        </div>
                      )}

                      <Separator className="my-3" />

                      <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-white border-2 border-dashed border-primary">
                        <span className="text-base font-semibold text-foreground">
                          Total Amount
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {formatAmount(bookingData.total)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-muted-foreground">
                          Payment Status
                        </span>
                        {getPaymentStatusBadge(bookingData.payment_status)}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <UtensilsCrossed className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-xs text-muted-foreground mb-1">
                          Tables
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {totalTables}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Ticket className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-xs text-muted-foreground mb-1">
                          Tickets
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {totalTickets}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <User className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-xs text-muted-foreground mb-1">
                          People
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {totalPeople}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </section>
  );
}
