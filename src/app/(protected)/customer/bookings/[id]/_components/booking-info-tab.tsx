"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  Banknote,
  Plus,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Ticket,
  Wine,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RescheduleDateModal } from "./reschedule-date-modal";
import { SingleDatePaymentModal } from "./single-date-payment-modal";
import { toast } from "sonner";
import { useDeleteAddOns } from "@/services/customer/bookings/hooks/useDeleteAddOns";
import { useRescheduleBooking } from "@/services/customer/bookings/query";
import type { RescheduleBookingPayload } from "@/services/customer/bookings/type";

interface BookingItem {
  type: "table" | "ticket";
  capacity?: number; // For tables: "Table of 10", "Table of 12"
  people_added: number;
  table_count?: number; // Number of tables selected (for tables only)
  allocation?: Record<string, number | string>; // key = table_id, value = seat count or "+X" for existing
  menuChoicesCompleted?: number;
  price_per_person?: number; // Price per person for tables
}

interface AddOnTicket {
  id?: number;
  title: string;
  description: string;
  price_per_ticket: string;
  quantity: string;
}

interface AddOnDrink {
  id?: number;
  title: string;
  price: string;
  quantity: string;
}

interface AddOnTable {
  table_size: number;
  price_per_person: string;
  no_tables: number;
  allocation: Record<string, number | string>; // key = table_id, value = seat count or "+X"
  people: number;
  total: number;
}

interface AddOnsData {
  tickets?: AddOnTicket[];
  drinks?: AddOnDrink[];
  tables?: AddOnTable[];
  total_amount?: number;
}

interface BookingTicket {
  title: string;
  description: string;
  price_per_ticket: number;
  quantity: number;
}

interface BookingDrink {
  title: string;
  price: number;
  quantity: number;
}

interface BookingDate {
  id: string;
  booking_date_id: number;
  date: string;
  parentBookingDate?: string | null; // Original date before reschedule
  hasUnbookedEventDates: boolean;
  time?: string;
  location?: string;
  items: BookingItem[]; // Breakdown of tables and tickets
  total: string;
  transactionId?: string;
  paymentStatus: "paid" | "pending" | "partial";
  partialPayment?: string; // Show if customer made partial payment
  tickets?: BookingTicket[]; // Full ticket details
  drinks?: BookingDrink[]; // Full drink details
  addons?: AddOnsData; // Add-ons data
}

interface PaymentSummaryData {
  subTotal: number;
  addOns: number;
  total: number;
  paid: number;
  outstanding: number;
  depositSelected: number;
}

interface PaymentSummaryFormattedData {
  subTotal: string;
  addOns: string;
  total: string;
  paid: string;
  outstanding: string;
  depositSelected: string;
}

interface BookingData {
  id: string;
  event_name: string;
  booking_id: string;
  transaction_id?: string;
  booking_date?: string;
  dates: BookingDate[];
  total_tickets?: number;
  total_tables?: number;
  total_people?: number;
  payment_status: string;
  booked_by?: string;
  location?: string;
  is_menu_choice?: boolean;
  summary: PaymentSummaryData;
  summaryFormatted: PaymentSummaryFormattedData;
}

interface BookingInfoTabProps {
  bookingData: BookingData;
}

export default function BookingInfoTab({ bookingData }: BookingInfoTabProps) {
  const router = useRouter();
  const deleteAddOnsMutation = useDeleteAddOns();
  const rescheduleMutation = useRescheduleBooking();
  const [expandedAllocations, setExpandedAllocations] = useState<
    Record<string, boolean>
  >({});
  const [expandedAddOns, setExpandedAddOns] = useState<Record<string, boolean>>(
    {}
  );
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedDateForReschedule, setSelectedDateForReschedule] =
    useState<BookingDate | null>(null);
  const [singleDatePaymentModalOpen, setSingleDatePaymentModalOpen] =
    useState(false);
  const [selectedDateForPayment, setSelectedDateForPayment] =
    useState<BookingDate | null>(null);

  const summary: PaymentSummaryData = bookingData.summary || {
    subTotal: 0,
    addOns: 0,
    total: 0,
    paid: 0,
    outstanding: 0,
    depositSelected: 0,
  };

  const summaryFormatted: PaymentSummaryFormattedData =
    bookingData.summaryFormatted || {
      subTotal: "£0.00",
      addOns: "£0.00",
      total: "£0.00",
      paid: "£0.00",
      outstanding: "£0.00",
      depositSelected: "£0.00",
    };

  // Get table count for a date
  const getTableCount = (items: BookingItem[]) => {
    return items
      .filter((item) => item.type === "table")
      .reduce((sum, item) => sum + (item.table_count || 0), 0);
  };

  // Get ticket count for a date
  const getTicketCount = (tickets?: BookingTicket[]) => {
    if (!tickets || tickets.length === 0) {
      return 0;
    }
    return tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  };

  // Toggle allocation expansion for a specific date item
  const toggleAllocationExpansion = (dateId: string, itemIdx: number) => {
    const key = `${dateId}-${itemIdx}`;
    setExpandedAllocations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle add-ons expansion for a specific date
  const toggleAddOnsExpansion = (dateId: string) => {
    setExpandedAddOns((prev) => ({
      ...prev,
      [dateId]: !prev[dateId],
    }));
  };

  // Calculate pending amount for a date
  const getPendingAmount = (dateInfo: BookingDate): string | null => {
    if (dateInfo.paymentStatus === "paid") return null;
    if (!dateInfo.partialPayment) return null;

    // Extract numeric values from strings (e.g., "£60" -> 60)
    const totalMatch = dateInfo.total.match(/[\d.]+/);
    const paidMatch = dateInfo.partialPayment.match(/[\d.]+/);

    if (!totalMatch || !paidMatch) return null;

    const total = parseFloat(totalMatch[0]);
    const paid = parseFloat(paidMatch[0]);
    const pending = total - paid;

    if (pending <= 0) return null;

    // Preserve currency symbol from total
    const currencySymbol =
      dateInfo.total.replace(/[\d.,]/g, "").trim()[0] || "£";
    return `${currencySymbol}${pending.toFixed(2)}`;
  };

  const handleMenuChoices = () => {
    // Navigate to menu choices with bookingId in route
    router.push(`/customer/menu-choices/${bookingData.id}`);
  };

  const handleDeleteAddon = (
    type: "table" | "drink" | "ticket",
    itemName: string,
    dateId: string,
    keyword: string | number
  ) => {
    const bookingId = parseInt(bookingData.id, 10);
    if (isNaN(bookingId)) {
      toast.error("Invalid booking ID");
      return;
    }

    const apiType: "tables" | "drinks" | "tickets" =
      type === "table" ? "tables" : type === "drink" ? "drinks" : "tickets";

    deleteAddOnsMutation.mutate({
      bookingId,
      date: dateId,
      keyword,
      type: apiType,
    });
  };

  const handlePayAll = () => {
    // TODO: Navigate to payment page for all dates
    console.log("Pay all dates");
  };

  // Handle Reschedule
  const handleRescheduleClick = (dateInfo: BookingDate) => {
    setSelectedDateForReschedule(dateInfo);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleConfirm = (payload: RescheduleBookingPayload) => {
    // Prevent multiple simultaneous calls
    if (rescheduleMutation.isPending) {
      return;
    }

    if (!selectedDateForReschedule) {
      console.error("No date selected for rescheduling");
      return;
    }

    rescheduleMutation.mutate(payload, {
      onSuccess: (response) => {
        if (response.status) {
          // Toast is handled by API interceptor, just close modal
          // Data will be refetched automatically via query invalidation
          setRescheduleModalOpen(false);
          setSelectedDateForReschedule(null);
        }
        // Error toasts are handled by API interceptor
      },
      onError: (error) => {
        // Error toasts are handled by API interceptor
        console.error("Error rescheduling booking:", error);
      },
    });
  };

  const handleSingleDatePaymentClick = (dateInfo: BookingDate) => {
    setSelectedDateForPayment(dateInfo);
    setSingleDatePaymentModalOpen(true);
  };

  const handleSingleDatePaymentConfirm = (paymentData: {
    dateKey: string;
    paymentPlan: "full" | "deposit";
    paymentMethod: "card" | "bank-transfer";
    amount: number;
  }) => {
    console.log("Payment data:", paymentData);
    toast.success(
      `Payment of £${paymentData.amount.toFixed(2)} initiated successfully!`
    );
    // TODO: Call payment API here
    setSingleDatePaymentModalOpen(false);
    setSelectedDateForPayment(null);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Dates Accordion */}
      {bookingData.dates && bookingData.dates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                }}
              >
                <Calendar
                  className="h-5 w-5"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Event Dates ({bookingData.dates.length})
              </h3>
            </div>

            {/* Pay All Button - Only show if there are multiple dates with pending payments */}
            {bookingData.dates.length > 1 &&
              bookingData.dates.some((d) => d.paymentStatus !== "paid") && (
                <Button
                  onClick={handlePayAll}
                  size="sm"
                  className="gap-2 cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                  }}
                >
                  <Banknote className="h-4 w-4" />
                  Pay All Dates
                </Button>
              )}
          </div>

          <Accordion
            type="single"
            collapsible
            className="w-full space-y-3"
            defaultValue={bookingData.dates.length === 1 ? "date-0" : undefined}
          >
            {bookingData.dates.map((dateInfo, index) => {
              const tableItems = dateInfo.items.filter(
                (item) => item.type === "table"
              );
              const totalTableCount = tableItems.reduce(
                (sum, item) => sum + (item.table_count ?? 1),
                0
              );
              const totalTableGuests = tableItems.reduce(
                (sum, item) => sum + item.people_added,
                0
              );

              return (
                <AccordionItem
                  key={dateInfo.id}
                  value={`date-${index}`}
                  className="border-2 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all">
                    <AccordionTrigger className="flex-1 hover:no-underline py-0 cursor-pointer">
                      <div className="flex items-center gap-3 text-left w-full">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ backgroundColor: "var(--color-primary)" }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {dateInfo.parentBookingDate ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-foreground line-through text-muted-foreground">
                                {dateInfo.parentBookingDate}
                              </p>
                              <span className="text-muted-foreground">→</span>
                              <p className="font-semibold text-sm text-foreground">
                                {dateInfo.date}
                              </p>
                            </div>
                          ) : (
                            <p className="font-semibold text-sm text-foreground">
                              {dateInfo.date}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap mt-1">
                            {/* Tables */}
                            {getTableCount(tableItems) > 0 && (
                              <div className="flex items-center gap-1">
                                <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {getTableCount(tableItems)}{" "}
                                  {getTableCount(tableItems) === 1
                                    ? "Table"
                                    : "Tables"}
                                </span>
                              </div>
                            )}
                            {/* Tickets */}
                            {getTicketCount(dateInfo.tickets) > 0 && (
                              <div className="flex items-center gap-1">
                                <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {getTicketCount(dateInfo.tickets)}{" "}
                                  {getTicketCount(dateInfo.tickets) === 1
                                    ? "Ticket"
                                    : "Tickets"}
                                </span>
                              </div>
                            )}
                            {/* Drinks - only show if drinks > 0 */}
                            {dateInfo.drinks && dateInfo.drinks.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Wine className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {dateInfo.drinks.reduce(
                                    (sum, d) => sum + d.quantity,
                                    0
                                  )}{" "}
                                  {dateInfo.drinks.reduce(
                                    (sum, d) => sum + d.quantity,
                                    0
                                  ) === 1
                                    ? "Drink"
                                    : "Drinks"}
                                </span>
                              </div>
                            )}
                            {/* Add-ons Badge */}
                            {dateInfo.addons &&
                              ((dateInfo.addons.tables &&
                                dateInfo.addons.tables.length > 0) ||
                                (dateInfo.addons.tickets &&
                                  dateInfo.addons.tickets.length > 0) ||
                                (dateInfo.addons.drinks &&
                                  dateInfo.addons.drinks.length > 0)) && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0.5 h-5 bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 font-medium"
                                >
                                  Add-ons
                                </Badge>
                              )}
                            {/* Total Price */}
                            <span className="text-xs text-muted-foreground">
                              •
                            </span>
                            <p className="text-xs font-semibold text-foreground">
                              {dateInfo.total}
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {dateInfo.paymentStatus !== "paid" ? (
                        <>
                          {(() => {
                            const pendingAmount = getPendingAmount(dateInfo);
                            return pendingAmount ? (
                              <div className="flex flex-col items-end gap-1">
                                <p className="text-xs text-muted-foreground">
                                  Pending
                                </p>
                                <p className="text-sm font-semibold text-red-600">
                                  {pendingAmount}
                                </p>
                              </div>
                            ) : null;
                          })()}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleDatePaymentClick(dateInfo);
                            }}
                            size="sm"
                            className="gap-1.5 cursor-pointer h-8 px-3"
                            style={{
                              backgroundColor: "var(--color-primary)",
                              color: "var(--color-primary-foreground)",
                            }}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Pay Now
                          </Button>
                        </>
                      ) : (
                        getPaymentStatusBadge(dateInfo.paymentStatus)
                      )}
                    </div>
                  </div>
                  <AccordionContent className="px-4 pb-4 bg-gradient-to-br from-gray-50/80 to-white border-t">
                    <div className="pt-3">
                      {/* Booking Breakdown Card with Amount Info */}
                      <Card className="border-2 bg-gradient-to-br from-white to-gray-50/50 shadow-sm">
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {/* Amount Information Row */}
                            <div
                              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-3 border-b-2"
                              style={{ borderColor: "var(--color-primary)" }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="p-1.5 rounded-md shrink-0"
                                  style={{
                                    backgroundColor:
                                      "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                                  }}
                                >
                                  <Banknote
                                    className="h-4 w-4"
                                    style={{ color: "var(--color-primary)" }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">
                                    Total Amount
                                  </p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {dateInfo.total}
                                  </p>
                                </div>
                              </div>
                              {dateInfo.partialPayment && (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="p-1.5 rounded-md shrink-0"
                                    style={{
                                      backgroundColor:
                                        "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                                    }}
                                  >
                                    <CreditCard
                                      className="h-4 w-4"
                                      style={{ color: "var(--color-primary)" }}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                      Paid Amount
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {dateInfo.partialPayment}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {(() => {
                                const pendingAmount =
                                  getPendingAmount(dateInfo);
                                return pendingAmount ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="p-1.5 rounded-md shrink-0"
                                      style={{
                                        backgroundColor:
                                          "color-mix(in srgb, #ef4444 10%, transparent)",
                                      }}
                                    >
                                      <Clock
                                        className="h-4 w-4"
                                        style={{ color: "#ef4444" }}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs text-muted-foreground">
                                        Pending Amount
                                      </p>
                                      <p className="text-sm font-semibold text-red-600">
                                        {pendingAmount}
                                      </p>
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>

                            {/* Booking Breakdown Section */}
                            <div className="space-y-3">
                              <div
                                className="flex items-center justify-between pb-2 border-b"
                                style={{ borderColor: "var(--color-primary)" }}
                              >
                                <span className="text-xs font-semibold text-foreground">
                                  Booking Type
                                </span>
                                <span className="text-xs font-semibold text-foreground">
                                  People Added
                                </span>
                              </div>

                              {tableItems.length > 0 && (
                                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-blue-50 border border-blue-100">
                                  <div className="flex items-center gap-2">
                                    <UtensilsCrossed className="h-4 w-4 text-blue-600" />
                                    <span className="text-xs font-semibold text-blue-900">
                                      Tables Included
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({totalTableCount}{" "}
                                      {totalTableCount === 1
                                        ? "table"
                                        : "tables"}
                                      )
                                    </span>
                                  </div>
                                  <span className="text-xs font-semibold text-blue-900">
                                    {totalTableGuests}{" "}
                                    {totalTableGuests === 1
                                      ? "Guest"
                                      : "Guests"}
                                  </span>
                                </div>
                              )}

                              {tableItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-4"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-foreground">
                                        {`Table of ${item.capacity}`}
                                      </span>
                                      {item.table_count &&
                                        item.table_count > 0 && (
                                          <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                                            {item.table_count}{" "}
                                            {item.table_count === 1
                                              ? "Table"
                                              : "Tables"}
                                          </span>
                                        )}
                                    </div>
                                    {/* Table Allocation Breakdown */}
                                    {item.allocation &&
                                      Object.keys(item.allocation).length >
                                        0 && (
                                        <div className="mt-1.5 space-y-1">
                                          <p className="text-xs text-muted-foreground mb-1">
                                            Seating Arrangement:
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {(() => {
                                              const MAX_VISIBLE_TABLES = 6;
                                              const key = `${dateInfo.id}-${idx}`;
                                              const isExpanded =
                                                expandedAllocations[key] ||
                                                false;
                                              const allocationEntries =
                                                Object.entries(
                                                  item.allocation || {}
                                                );
                                              const visibleTables = isExpanded
                                                ? allocationEntries
                                                : allocationEntries.slice(
                                                    0,
                                                    MAX_VISIBLE_TABLES
                                                  );
                                              const hasMore =
                                                allocationEntries.length >
                                                MAX_VISIBLE_TABLES;

                                              return (
                                                <>
                                                  {visibleTables.map(
                                                    (
                                                      [tableId, people],
                                                      tableIdx
                                                    ) => {
                                                      const displayValue =
                                                        typeof people ===
                                                        "string"
                                                          ? people
                                                          : people;
                                                      const numericValue =
                                                        typeof people ===
                                                        "string"
                                                          ? parseInt(
                                                              people.replace(
                                                                "+",
                                                                ""
                                                              )
                                                            )
                                                          : people;

                                                      return (
                                                        <div
                                                          key={tableId}
                                                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100"
                                                        >
                                                          <span className="text-xs font-medium text-blue-700">
                                                            Table {tableIdx + 1}
                                                            :
                                                          </span>
                                                          <span className="text-xs font-semibold text-blue-900">
                                                            {displayValue}{" "}
                                                            {numericValue === 1
                                                              ? "Person"
                                                              : "People"}
                                                          </span>
                                                        </div>
                                                      );
                                                    }
                                                  )}
                                                  {hasMore && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                      onClick={() =>
                                                        toggleAllocationExpansion(
                                                          dateInfo.id,
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
                                                          {allocationEntries.length -
                                                            MAX_VISIBLE_TABLES}{" "}
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
                                    {/* Price Breakdown - Similar to drinks */}
                                    {item.price_per_person &&
                                      item.people_added > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1.5">
                                          £{item.price_per_person} ×{" "}
                                          {item.people_added}
                                        </p>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    {item.price_per_person ? (
                                      <p className="text-sm font-semibold text-foreground shrink-0">
                                        £
                                        {(
                                          item.price_per_person *
                                          item.people_added
                                        ).toFixed(2)}
                                      </p>
                                    ) : (
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-muted-foreground">
                                          Total People
                                        </span>
                                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-gray-50">
                                          <span className="text-sm font-semibold text-foreground">
                                            {String(item.people_added).padStart(
                                              2,
                                              "0"
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {item.type === "table" &&
                                      bookingData.is_menu_choice && (
                                        <Button
                                          onClick={() => handleMenuChoices()}
                                          size="sm"
                                          className="h-7 px-3 gap-1.5 cursor-pointer text-xs shrink-0"
                                          style={{
                                            backgroundColor:
                                              "var(--color-primary)",
                                            color:
                                              "var(--color-primary-foreground)",
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                          Add Menu Choices
                                        </Button>
                                      )}
                                  </div>
                                </div>
                              ))}

                              {tableItems.length > 0 &&
                                dateInfo.tickets &&
                                dateInfo.tickets.length > 0 && (
                                  <Separator className="my-2 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                )}

                              {/* Booking Tickets Section */}
                              {dateInfo.tickets &&
                                dateInfo.tickets.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Ticket className="h-4 w-4 text-blue-600" />
                                      <span className="text-xs font-semibold text-foreground">
                                        Tickets Included
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        (
                                        {dateInfo.tickets.reduce(
                                          (sum, t) => sum + t.quantity,
                                          0
                                        )}{" "}
                                        total)
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
                                            {(
                                              ticket.price_per_ticket *
                                              ticket.quantity
                                            ).toFixed(2)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              {dateInfo.tickets &&
                                dateInfo.tickets.length > 0 &&
                                dateInfo.drinks &&
                                dateInfo.drinks.length > 0 && (
                                  <Separator className="my-2 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                )}

                              {/* Booking Drinks Section */}
                              {dateInfo.drinks &&
                                dateInfo.drinks.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Wine className="h-4 w-4 text-green-600" />
                                      <span className="text-xs font-semibold text-foreground">
                                        Drinks Package
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        (
                                        {dateInfo.drinks.reduce(
                                          (sum, d) => sum + d.quantity,
                                          0
                                        )}{" "}
                                        items)
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
                                              £{drink.price} × {drink.quantity}
                                            </p>
                                          </div>
                                          <p className="text-sm font-semibold text-foreground shrink-0">
                                            £
                                            {(
                                              drink.price * drink.quantity
                                            ).toFixed(2)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              {dateInfo.drinks &&
                                dateInfo.drinks.length > 0 &&
                                dateInfo.addons &&
                                ((dateInfo.addons.tables &&
                                  dateInfo.addons.tables.length > 0) ||
                                  (dateInfo.addons.tickets &&
                                    dateInfo.addons.tickets.length > 0) ||
                                  (dateInfo.addons.drinks &&
                                    dateInfo.addons.drinks.length > 0)) && (
                                  <Separator className="my-2 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                )}

                              {/* Add-ons Section - Integrated at bottom of Booking Type */}
                              {dateInfo.addons &&
                                ((dateInfo.addons.tables &&
                                  dateInfo.addons.tables.length > 0) ||
                                  (dateInfo.addons.tickets &&
                                    dateInfo.addons.tickets.length > 0) ||
                                  (dateInfo.addons.drinks &&
                                    dateInfo.addons.drinks.length > 0)) && (
                                  <div className="mt-4 p-3 border-2 border-purple-300 rounded-lg bg-gradient-to-br from-purple-50/80 via-purple-50/50 to-transparent shadow-sm">
                                    <button
                                      type="button"
                                      id={`addons-trigger-${dateInfo.id}`}
                                      onClick={() =>
                                        toggleAddOnsExpansion(dateInfo.id)
                                      }
                                      aria-expanded={
                                        expandedAddOns[dateInfo.id] === true
                                      }
                                      aria-controls={`addons-content-${dateInfo.id}`}
                                      className="flex items-center justify-between w-full py-2.5 px-3 border-2 border-purple-400 rounded-md transition-all duration-200 group cursor-pointer bg-white hover:bg-purple-50 hover:-translate-y-0.5 hover:shadow-md hover:border-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="p-1 rounded bg-purple-100">
                                          <svg
                                            className="h-3.5 w-3.5 text-purple-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                            />
                                          </svg>
                                        </div>
                                        <span className="text-sm font-bold text-purple-900">
                                          Add-ons Included
                                        </span>
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const tablesCount =
                                              dateInfo.addons.tables?.reduce(
                                                (sum, table) =>
                                                  sum + (table.no_tables || 0),
                                                0
                                              ) || 0;
                                            const ticketsCount =
                                              dateInfo.addons.tickets?.reduce(
                                                (sum, ticket) =>
                                                  sum +
                                                  parseInt(
                                                    ticket.quantity || "0",
                                                    10
                                                  ),
                                                0
                                              ) || 0;
                                            const drinksCount =
                                              dateInfo.addons.drinks?.reduce(
                                                (sum, drink) =>
                                                  sum +
                                                  parseInt(
                                                    drink.quantity || "0",
                                                    10
                                                  ),
                                                0
                                              ) || 0;

                                            return (
                                              <>
                                                {tablesCount > 0 && (
                                                  <div className="flex items-center gap-1">
                                                    <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                      {tablesCount}{" "}
                                                      {tablesCount === 1
                                                        ? "Table"
                                                        : "Tables"}
                                                    </span>
                                                  </div>
                                                )}
                                                {ticketsCount > 0 && (
                                                  <div className="flex items-center gap-1">
                                                    <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                      {ticketsCount}{" "}
                                                      {ticketsCount === 1
                                                        ? "Ticket"
                                                        : "Tickets"}
                                                    </span>
                                                  </div>
                                                )}
                                                {drinksCount > 0 && (
                                                  <div className="flex items-center gap-1">
                                                    <Wine className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                      {drinksCount}{" "}
                                                      {drinksCount === 1
                                                        ? "Drink"
                                                        : "Drinks"}
                                                    </span>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      {expandedAddOns[dateInfo.id] === true ? (
                                        <ChevronUp className="h-4 w-4 text-purple-600 group-hover:text-purple-700 transition-colors" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-purple-600 group-hover:text-purple-700 transition-colors" />
                                      )}
                                    </button>

                                    {/* Add-ons Content */}
                                    {expandedAddOns[dateInfo.id] === true && (
                                      <div
                                        id={`addons-content-${dateInfo.id}`}
                                        aria-labelledby={`addons-trigger-${dateInfo.id}`}
                                        className="mt-3 space-y-3 p-3 bg-white rounded-lg border border-purple-200 transition-opacity duration-200 ease-out"
                                      >
                                        {/* Tables Add-ons */}
                                        {dateInfo.addons.tables &&
                                          dateInfo.addons.tables.length > 0 && (
                                            <div className="space-y-3">
                                              {dateInfo.addons.tables.map(
                                                (table, idx) => (
                                                  <div
                                                    key={idx}
                                                    className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-4"
                                                  >
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-foreground">
                                                          {`Table of ${table.table_size}`}
                                                        </span>
                                                        {table.no_tables &&
                                                        table.no_tables > 0 ? (
                                                          <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                                                            {table.no_tables}{" "}
                                                            {table.no_tables ===
                                                            1
                                                              ? "Table"
                                                              : "Tables"}
                                                          </span>
                                                        ) : table.allocation &&
                                                          Object.values(
                                                            table.allocation
                                                          ).some(
                                                            (val) =>
                                                              typeof val ===
                                                                "string" &&
                                                              val.startsWith(
                                                                "+"
                                                              )
                                                          ) ? (
                                                          <span className="text-xs text-muted-foreground bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                            Added to existing
                                                          </span>
                                                        ) : null}
                                                      </div>
                                                      {/* Table Allocation Breakdown */}
                                                      {table.allocation &&
                                                        Object.keys(
                                                          table.allocation
                                                        ).length > 0 && (
                                                          <div className="mt-1.5 space-y-1">
                                                            <p className="text-xs text-muted-foreground mb-1">
                                                              Seating
                                                              Arrangement:
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                              {Object.entries(
                                                                table.allocation
                                                              ).map(
                                                                (
                                                                  [
                                                                    tableId,
                                                                    people,
                                                                  ],
                                                                  tableIdx
                                                                ) => {
                                                                  // Check if this is a new table (integer value) or existing (string with "+")
                                                                  const isNewTable =
                                                                    typeof people ===
                                                                    "number";
                                                                  const displayValue =
                                                                    typeof people ===
                                                                    "string"
                                                                      ? people
                                                                      : people;
                                                                  const numericValue =
                                                                    typeof people ===
                                                                    "string"
                                                                      ? parseInt(
                                                                          people.replace(
                                                                            "+",
                                                                            ""
                                                                          )
                                                                        )
                                                                      : people;

                                                                  return (
                                                                    <div
                                                                      key={
                                                                        tableId
                                                                      }
                                                                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                                                                        isNewTable
                                                                          ? "bg-green-50 border-green-200"
                                                                          : "bg-purple-50 border-purple-200"
                                                                      }`}
                                                                    >
                                                                      <span
                                                                        className={`text-xs font-medium ${
                                                                          isNewTable
                                                                            ? "text-green-700"
                                                                            : "text-purple-700"
                                                                        }`}
                                                                      >
                                                                        Table{" "}
                                                                        {tableIdx +
                                                                          1}
                                                                        :
                                                                      </span>
                                                                      <span
                                                                        className={`text-xs font-semibold ${
                                                                          isNewTable
                                                                            ? "text-green-900"
                                                                            : "text-purple-900"
                                                                        }`}
                                                                      >
                                                                        {
                                                                          displayValue
                                                                        }{" "}
                                                                        {numericValue ===
                                                                        1
                                                                          ? "Person"
                                                                          : "People"}
                                                                      </span>
                                                                      {isNewTable && (
                                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-200 text-green-800 uppercase">
                                                                          New
                                                                        </span>
                                                                      )}
                                                                    </div>
                                                                  );
                                                                }
                                                              )}
                                                            </div>
                                                          </div>
                                                        )}
                                                      {/* Price Breakdown */}
                                                      {table.price_per_person && (
                                                        <p className="text-xs text-muted-foreground mt-1.5">
                                                          £
                                                          {
                                                            table.price_per_person
                                                          }{" "}
                                                          × {table.people}
                                                        </p>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                      <p className="text-sm font-semibold text-foreground shrink-0">
                                                        £
                                                        {table.total.toFixed(2)}
                                                      </p>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                          handleDeleteAddon(
                                                            "table",
                                                            `Table of ${table.table_size}`,
                                                            dateInfo.id,
                                                            table.table_size
                                                          )
                                                        }
                                                        disabled={
                                                          deleteAddOnsMutation.isPending
                                                        }
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        title="Delete table"
                                                      >
                                                        <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          )}

                                        {/* Drinks Add-ons */}
                                        {dateInfo.addons.drinks &&
                                          dateInfo.addons.drinks.length > 0 && (
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                                Drinks Package
                                              </p>
                                              <div className="space-y-2">
                                                {dateInfo.addons.drinks.map(
                                                  (drink, idx) => (
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
                                                      <div className="flex items-center gap-3 shrink-0">
                                                        <p className="text-sm font-semibold text-foreground shrink-0">
                                                          £
                                                          {(
                                                            parseFloat(
                                                              drink.price
                                                            ) *
                                                            parseInt(
                                                              drink.quantity
                                                            )
                                                          ).toFixed(2)}
                                                        </p>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() => {
                                                            if (!drink.id) {
                                                              toast.error(
                                                                "Unable to delete: Drink ID not available. Please refresh the page."
                                                              );
                                                              return;
                                                            }
                                                            handleDeleteAddon(
                                                              "drink",
                                                              drink.title,
                                                              dateInfo.id,
                                                              drink.id
                                                            );
                                                          }}
                                                          disabled={
                                                            deleteAddOnsMutation.isPending
                                                          }
                                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                          title="Delete drink"
                                                        >
                                                          <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}

                                        {/* Tickets Add-ons */}
                                        {dateInfo.addons.tickets &&
                                          dateInfo.addons.tickets.length >
                                            0 && (
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                                Additional Tickets
                                              </p>
                                              <div className="space-y-2">
                                                {dateInfo.addons.tickets.map(
                                                  (ticket, idx) => (
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
                                                          £
                                                          {
                                                            ticket.price_per_ticket
                                                          }{" "}
                                                          × {ticket.quantity}
                                                        </p>
                                                      </div>
                                                      <div className="flex items-center gap-3 shrink-0">
                                                        <p className="text-sm font-semibold text-foreground shrink-0">
                                                          £
                                                          {(
                                                            parseFloat(
                                                              ticket.price_per_ticket
                                                            ) *
                                                            parseInt(
                                                              ticket.quantity
                                                            )
                                                          ).toFixed(2)}
                                                        </p>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() => {
                                                            if (!ticket.id) {
                                                              toast.error(
                                                                "Unable to delete: Ticket ID not available. Please refresh the page."
                                                              );
                                                              return;
                                                            }
                                                            handleDeleteAddon(
                                                              "ticket",
                                                              ticket.title,
                                                              dateInfo.id,
                                                              ticket.id
                                                            );
                                                          }}
                                                          disabled={
                                                            deleteAddOnsMutation.isPending
                                                          }
                                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                          title="Delete ticket"
                                                        >
                                                          <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Action Buttons - Hidden at bottom */}
                      {dateInfo.hasUnbookedEventDates && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-3">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRescheduleClick(dateInfo);
                            }}
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all w-auto"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span className="text-xs">Need to reschedule?</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      <Separator className="my-4" />

      {/* Payment Summary - Display Only */}
      <Card className="border-2 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-lg"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                }}
              >
                <CreditCard
                  className="h-4 w-4"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
              <h3 className="text-sm font-semibold text-foreground tracking-wide">
                Payment Summary
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/70 border border-gray-200">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Package Sub-total
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Tables & base tickets
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {summaryFormatted.subTotal}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-50/80 border border-purple-100">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-700 font-semibold">
                    Add-ons Total
                  </p>
                  <p className="text-sm font-medium text-purple-900">
                    Extras & upgrades
                  </p>
                </div>
                <span className="text-sm font-semibold text-purple-900">
                  {summaryFormatted.addOns}
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border-2 border-dashed shadow-sm"
              style={{ borderColor: "var(--color-primary)" }}
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Grand Total
                </p>
                <p className="text-sm font-medium text-foreground">
                  Includes all selected add-ons
                </p>
              </div>
              <span
                className="text-2xl font-bold"
                style={{ color: "var(--color-primary)" }}
              >
                {summaryFormatted.total}
              </span>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {summary.paid > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Paid Amount
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Already collected
                    </p>
                  </div>
                  <span className="text-base font-semibold text-foreground">
                    {summaryFormatted.paid}
                  </span>
                </div>
              )}

              {summary.outstanding > 0 && (
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    summary.outstanding > 0
                      ? "bg-amber-50/70 border-amber-100"
                      : "bg-green-50/70 border-green-100"
                  }`}
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Outstanding Balance
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summary.outstanding > 0
                        ? "Remaining to be paid"
                        : "All paid"}
                    </p>
                  </div>
                  <span
                    className={`text-base font-semibold ${
                      summary.outstanding > 0
                        ? "text-amber-700"
                        : "text-green-700"
                    }`}
                  >
                    {summaryFormatted.outstanding}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Status */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm">
              <span className="text-muted-foreground font-medium">
                Payment Status
              </span>
              <span
                className={`font-semibold flex items-center gap-1.5 ${
                  bookingData.payment_status?.toLowerCase() === "paid"
                    ? "text-green-600"
                    : bookingData.payment_status?.toLowerCase() === "pending" ||
                      bookingData.payment_status?.toLowerCase() ===
                        "partial payment"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    bookingData.payment_status?.toLowerCase() === "paid"
                      ? "bg-green-500"
                      : bookingData.payment_status?.toLowerCase() ===
                          "pending" ||
                        bookingData.payment_status?.toLowerCase() ===
                          "partial payment"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  } ${
                    bookingData.payment_status?.toLowerCase() === "pending" ||
                    bookingData.payment_status?.toLowerCase() ===
                      "partial payment"
                      ? "animate-pulse"
                      : ""
                  }`}
                />
                {bookingData.payment_status || "Pending"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reschedule Date Modal */}
      {selectedDateForReschedule && (
        <RescheduleDateModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedDateForReschedule(null);
          }}
          currentDate={{
            date: selectedDateForReschedule.date,
            people:
              selectedDateForReschedule.items
                .filter((item) => item.type === "table")
                .reduce((sum, item) => sum + item.people_added, 0) +
              (selectedDateForReschedule.tickets
                ? selectedDateForReschedule.tickets.reduce(
                    (sum, ticket) => sum + ticket.quantity,
                    0
                  )
                : 0),
            tables: getTableCount(selectedDateForReschedule.items),
            tickets: selectedDateForReschedule.tickets
              ? selectedDateForReschedule.tickets.reduce(
                  (sum, ticket) => sum + ticket.quantity,
                  0
                )
              : 0,
            drinks: selectedDateForReschedule.drinks
              ? selectedDateForReschedule.drinks.reduce(
                  (sum, d) => sum + d.quantity,
                  0
                )
              : 0,
            price: parseFloat(
              selectedDateForReschedule.total.replace("£", "").replace(",", "")
            ),
          }}
          bookingId={parseInt(bookingData.booking_id)}
          bookingDateId={selectedDateForReschedule.booking_date_id}
          hasAddons={(selectedDateForReschedule.addons?.total_amount ?? 0) > 0}
          isProcessing={rescheduleMutation.isPending}
          onConfirm={handleRescheduleConfirm}
        />
      )}

      {/* Single Date Payment Modal */}
      {selectedDateForPayment && (
        <SingleDatePaymentModal
          isOpen={singleDatePaymentModalOpen}
          onClose={() => {
            setSingleDatePaymentModalOpen(false);
            setSelectedDateForPayment(null);
          }}
          dateInfo={{
            date: selectedDateForPayment.date,
            dateKey: selectedDateForPayment.id,
            totalAmount: parseFloat(
              selectedDateForPayment.total.replace("£", "").replace(",", "")
            ),
            paidAmount: selectedDateForPayment.partialPayment
              ? parseFloat(
                  selectedDateForPayment.partialPayment
                    .replace("£", "")
                    .replace(",", "")
                )
              : 0,
            pendingPayment:
              parseFloat(
                selectedDateForPayment.total.replace("£", "").replace(",", "")
              ) -
              (selectedDateForPayment.partialPayment
                ? parseFloat(
                    selectedDateForPayment.partialPayment
                      .replace("£", "")
                      .replace(",", "")
                  )
                : 0),
            partialPaymentOption:
              summary.depositSelected > 0 ? summary.depositSelected : undefined,
          }}
          onConfirm={handleSingleDatePaymentConfirm}
        />
      )}
    </div>
  );
}
