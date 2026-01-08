"use client";

import { useEffect, useState } from "react";
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
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { RescheduleDateModal } from "./reschedule-date-modal";
import { SingleDatePaymentModal } from "./single-date-payment-modal";
import { toast } from "sonner";
import { useDeleteAddOns } from "@/services/customer/bookings/hooks/useDeleteAddOns";
import { useRescheduleBooking } from "@/services/customer/bookings/query";
import type { RescheduleBookingPayload } from "@/services/customer/bookings/type";
import { motion } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface BookingItem {
  type: "table" | "ticket";
  capacity?: number; // For tables: "Table of 10", "Table of 12"
  people_added: number;
  table_count?: number; // Number of tables selected (for tables only)
  allocation?: number[]; // People per table allocation [8, 4] means 2 tables with 8 and 4 people
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
  allocation: number[];
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

  const hasDepositSelection = summary.depositSelected > 0;
  const depositOutstanding = hasDepositSelection
    ? Math.max(summary.depositSelected - summary.paid, 0)
    : 0;
  const depositOptionAvailable =
    hasDepositSelection && depositOutstanding > 0 && summary.outstanding > 0;
  const depositAlreadySettled =
    hasDepositSelection &&
    !depositOptionAvailable &&
    summary.depositSelected > 0;

  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<
    "full" | "deposit" | null
  >(null);

  useEffect(() => {
    if (!depositOptionAvailable && selectedPaymentPlan === "deposit") {
      setSelectedPaymentPlan(null);
      setSelectedPaymentMethod(null);
    }
  }, [depositOptionAvailable, selectedPaymentPlan]);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "card" | "bank-transfer" | null
  >(null);

  const handlePaymentPlanChange = (value: "full" | "deposit") => {
    if (value === "deposit" && !depositOptionAvailable) {
      return;
    }
    setSelectedPaymentPlan(value);
    setSelectedPaymentMethod(null);
  };

  const payTodayAmount =
    selectedPaymentPlan === "full"
      ? summary.outstanding
      : selectedPaymentPlan === "deposit"
      ? Math.min(depositOutstanding, summary.outstanding)
      : 0;

  const balanceAfterPayment =
    selectedPaymentPlan === null
      ? summary.outstanding
      : Math.max(summary.outstanding - payTodayAmount, 0);
  const formatDisplayAmount = (value: number) => `£${value.toFixed(2)}`;
  const depositBalanceAfterPayment = Math.max(
    summary.outstanding - depositOutstanding,
    0
  );

  const paymentMethods: Array<{
    id: "card" | "bank-transfer";
    label: string;
    description: string;
    icon: LucideIcon;
  }> = [
    {
      id: "card",
      label: "Card payment",
      description:
        "Pay securely with Visa, Mastercard, Amex or other major cards.",
      icon: CreditCard,
    },
    {
      id: "bank-transfer",
      label: "Bank transfer",
      description:
        "Receive our bank details instantly and complete the transfer.",
      icon: Banknote,
    },
  ];

  const selectedMethodMeta = selectedPaymentMethod
    ? paymentMethods.find((method) => method.id === selectedPaymentMethod)
    : undefined;

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
                                      item.allocation.length > 0 && (
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
                                              const visibleTables = isExpanded
                                                ? item.allocation
                                                : item.allocation?.slice(
                                                    0,
                                                    MAX_VISIBLE_TABLES
                                                  ) || [];
                                              const hasMore =
                                                (item.allocation?.length || 0) >
                                                MAX_VISIBLE_TABLES;

                                              return (
                                                <>
                                                  {visibleTables.map(
                                                    (people, tableIdx) => (
                                                      <div
                                                        key={tableIdx}
                                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100"
                                                      >
                                                        <span className="text-xs font-medium text-blue-700">
                                                          Table {tableIdx + 1}:
                                                        </span>
                                                        <span className="text-xs font-semibold text-blue-900">
                                                          {people}{" "}
                                                          {people === 1
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
                                                          {(item.allocation
                                                            ?.length || 0) -
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
                                    {item.price_per_person && (
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
                                  <div className="mt-3 pt-3 border-t border-gray-200">
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
                                      className="flex items-center justify-between w-full py-2 px-3 border border-[var(--color-primary)] rounded-md transition-all duration-200 group cursor-pointer hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/300 focus-visible:ring-offset-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">
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
                                        <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                      )}
                                    </button>

                                    {/* Add-ons Content */}
                                    {expandedAddOns[dateInfo.id] === true && (
                                      <div
                                        id={`addons-content-${dateInfo.id}`}
                                        aria-labelledby={`addons-trigger-${dateInfo.id}`}
                                        className="mt-2 space-y-3 transition-opacity duration-200 ease-out"
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
                                                          table.no_tables >
                                                            0 && (
                                                            <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                                                              {table.no_tables}{" "}
                                                              {table.no_tables ===
                                                              1
                                                                ? "Table"
                                                                : "Tables"}
                                                            </span>
                                                          )}
                                                      </div>
                                                      {/* Table Allocation Breakdown */}
                                                      {table.allocation &&
                                                        table.allocation
                                                          .length > 0 && (
                                                          <div className="mt-1.5 space-y-1">
                                                            <p className="text-xs text-muted-foreground mb-1">
                                                              Seating
                                                              Arrangement:
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                              {table.allocation.map(
                                                                (
                                                                  people,
                                                                  tableIdx
                                                                ) => {
                                                                  // Detect if this is an existing table with additions
                                                                  // If allocation is less than 50% of table capacity, it's likely an addition
                                                                  const isExistingTable =
                                                                    people <
                                                                    table.table_size *
                                                                      0.5;
                                                                  const displayPeople =
                                                                    isExistingTable
                                                                      ? `${people}`
                                                                      : people;

                                                                  return (
                                                                    <div
                                                                      key={
                                                                        tableIdx
                                                                      }
                                                                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                                                                        isExistingTable
                                                                          ? "bg-purple-50 border-purple-200"
                                                                          : "bg-blue-50 border-blue-100"
                                                                      }`}
                                                                    >
                                                                      <span
                                                                        className={`text-xs font-medium ${
                                                                          isExistingTable
                                                                            ? "text-purple-700"
                                                                            : "text-blue-700"
                                                                        }`}
                                                                      >
                                                                        Table{" "}
                                                                        {tableIdx +
                                                                          1}
                                                                        :
                                                                      </span>
                                                                      <span
                                                                        className={`text-xs font-semibold ${
                                                                          isExistingTable
                                                                            ? "text-purple-900"
                                                                            : "text-blue-900"
                                                                        }`}
                                                                      >
                                                                        {
                                                                          displayPeople
                                                                        }{" "}
                                                                        {people ===
                                                                        1
                                                                          ? "Person"
                                                                          : "People"}
                                                                      </span>
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

      {/* Payment Summary - Professional */}
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

            {depositOptionAvailable && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-700">
                Secure this booking with a deposit of{" "}
                <span className="font-semibold">
                  {formatDisplayAmount(depositOutstanding)}
                </span>{" "}
                or settle the full balance today.
              </div>
            )}

            {depositAlreadySettled && (
              <div className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 text-xs text-green-700">
                The deposit of{" "}
                <span className="font-semibold">
                  {summaryFormatted.depositSelected}
                </span>{" "}
                has already been collected. Choose how you would like to clear
                the remaining balance.
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Step 1 · Choose how much to pay today
              </p>
              <RadioGroup
                value={selectedPaymentPlan ?? ""}
                onValueChange={(value) =>
                  handlePaymentPlanChange(value as "full" | "deposit")
                }
                className="space-y-3"
              >
                <Label
                  htmlFor="plan-full"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all duration-200 ${
                    selectedPaymentPlan === "full"
                      ? "border-[var(--color-primary)] bg-blue-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-[var(--color-primary)]/60 hover:bg-blue-50/40 cursor-pointer"
                  }`}
                >
                  <RadioGroupItem
                    value="full"
                    id="plan-full"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className="h-4 w-4 text-green-600"
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-foreground text-sm">
                        Pay full balance
                      </span>
                      <Badge className="text-xs bg-green-100 text-green-700">
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Settle everything today and keep your booking fully
                      confirmed.
                    </p>
                    <div className="flex items-center gap-3 text-sm pt-2">
                      <span className="font-semibold text-green-700">
                        {formatDisplayAmount(summary.outstanding)}
                      </span>
                      <span className="text-muted-foreground">due now</span>
                    </div>
                  </div>
                </Label>

                {hasDepositSelection && (
                  <Label
                    htmlFor="plan-deposit"
                    aria-disabled={!depositOptionAvailable}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all duration-200 ${
                      selectedPaymentPlan === "deposit"
                        ? "border-[var(--color-primary)] bg-purple-50/70 shadow-sm"
                        : "border-slate-200 bg-white"
                    } ${
                      depositOptionAvailable
                        ? "cursor-pointer hover:border-[var(--color-primary)]/60 hover:bg-purple-50/40"
                        : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <RadioGroupItem
                      value="deposit"
                      id="plan-deposit"
                      className="mt-1"
                      disabled={!depositOptionAvailable}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-foreground text-sm">
                          Pay deposit now
                        </span>
                        <Badge className="text-xs bg-purple-100 text-purple-700">
                          {depositOptionAvailable
                            ? `Pay ${formatDisplayAmount(
                                depositOutstanding
                              )} today`
                            : "Already collected"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {depositOptionAvailable
                          ? `Secure your booking now and pay the remaining ${formatDisplayAmount(
                              depositBalanceAfterPayment
                            )} later.`
                          : "Deposit payment is complete. Proceed with the remaining balance below."}
                      </p>
                    </div>
                  </Label>
                )}
              </RadioGroup>
            </div>

            {selectedPaymentPlan === null && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-muted-foreground">
                Select how much you want to pay today to continue.
              </div>
            )}

            {/* Step 2: Payment Method - Only show after plan selection */}
            {selectedPaymentPlan !== null && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Step 2 · Select payment method
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedPaymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-[var(--color-primary)] bg-blue-50/70 shadow-md"
                            : "border-slate-200 bg-white hover:border-[var(--color-primary)]/60 hover:bg-blue-50/40"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-md ${
                            isSelected
                              ? "bg-[var(--color-primary)] text-white"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {method.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {method.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2
                            className="h-5 w-5 text-[var(--color-primary)]"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedPaymentMethod === null && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-muted-foreground">
                    Select a payment method to review your payment summary.
                  </div>
                )}

                {/* Summary boxes - Only show when payment method is also selected */}
                {selectedPaymentMethod !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Paying with
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedMethodMeta?.label ??
                            "Select a payment method"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground sm:text-right">
                        {selectedMethodMeta?.description ??
                          "Choose how you would like to complete this payment."}
                      </p>
                    </div>

                    <div
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-4 rounded-xl bg-white border-2 border-dashed shadow-sm"
                      style={{ borderColor: "var(--color-primary)" }}
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50/70 border border-green-100">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-green-700 font-semibold">
                            You&apos;ll pay today
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedPaymentPlan === "full"
                              ? "Full balance taken immediately."
                              : depositOptionAvailable
                              ? "Deposit to secure your booking."
                              : "Remaining balance due now."}
                          </p>
                        </div>
                        <span className="text-base font-semibold text-green-700">
                          {formatDisplayAmount(payTodayAmount)}
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                          balanceAfterPayment > 0
                            ? "bg-amber-50/70 border-amber-100"
                            : "bg-green-50/70 border-green-100"
                        }`}
                      >
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Balance after this payment
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {balanceAfterPayment > 0
                              ? "To be settled later."
                              : "All balances cleared."}
                          </p>
                        </div>
                        <span
                          className={`text-base font-semibold ${
                            balanceAfterPayment > 0
                              ? "text-amber-700"
                              : "text-green-700"
                          }`}
                        >
                          {formatDisplayAmount(balanceAfterPayment)}
                        </span>
                      </div>
                    </div>

                    {summary.paid > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                        <span className="text-muted-foreground">
                          Already collected previously
                        </span>
                        <span className="font-semibold text-foreground">
                          {summaryFormatted.paid}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2">
                      <span className="text-muted-foreground">Status</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          bookingData.payment_status?.toLowerCase() === "paid"
                            ? "text-green-600"
                            : bookingData.payment_status?.toLowerCase() ===
                              "pending"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            bookingData.payment_status?.toLowerCase() === "paid"
                              ? "bg-green-500"
                              : bookingData.payment_status?.toLowerCase() ===
                                "pending"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          } ${
                            bookingData.payment_status?.toLowerCase() ===
                            "pending"
                              ? "animate-pulse"
                              : ""
                          }`}
                        />
                        {bookingData.payment_status || "Pending"}
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
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
