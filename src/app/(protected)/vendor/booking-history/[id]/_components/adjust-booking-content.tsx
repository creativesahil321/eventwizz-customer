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
  ArrowRight,
  Calendar,
  Receipt,
  User,
  Mail,
  Phone,
  MapPin,
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
  Trash2,
  Eye,
  Loader2,
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
import AddOnsTab from "./add-ons-tab";
import { useDeleteVendorAddOns } from "@/services/vendor/bookings/hooks/useDeleteVendorAddOns";
import { VendorRescheduleDateModal } from "./vendor-reschedule-modal";
import {
  useVendorRescheduleBooking,
  useUpdateVendorBookingStatus,
} from "@/services/vendor/bookings/query";
import type { VendorRescheduleBookingPayload } from "@/services/vendor/bookings/type";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  } | null>(null);

  // Status update confirmation dialog state
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

  // Fetch booking details from API
  const {
    data: bookingResponse,
    isLoading,
    error,
  } = useVendorBookingDetails(parseInt(bookingId));

  const bookingData = bookingResponse?.data;

  // Delete add-ons mutation
  const deleteAddOnsMutation = useDeleteVendorAddOns();

  // Reschedule mutation
  const rescheduleMutation = useVendorRescheduleBooking();

  // Update booking status mutation
  const updateStatusMutation = useUpdateVendorBookingStatus();

  // Helper function to safely format amounts (handles null/undefined)
  const formatAmount = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return "£0.00";
    }
    return `£${Number(value).toFixed(2)}`;
  };

  // Handler for deleting add-ons
  const handleDeleteAddOn = (
    dateId: string,
    keyword: string | number,
    type: "table" | "drink" | "ticket"
  ) => {
    const apiType =
      type === "table" ? "tables" : type === "drink" ? "drinks" : "tickets";

    deleteAddOnsMutation.mutate({
      bookingId: parseInt(bookingId),
      date: dateId,
      keyword,
      type: apiType,
    });
  };

  // Handler for reschedule button click
  const handleRescheduleClick = (
    dateInfo: NonNullable<typeof bookingData>["event_dates"][0]
  ) => {
    const totalPeople =
      (dateInfo.tables?.reduce((sum, table) => sum + (table.people ?? 0), 0) ??
        0) +
      (dateInfo.tickets?.reduce(
        (sum, ticket) => sum + (ticket.quantity ?? 0),
        0
      ) ?? 0);

    const totalTables =
      dateInfo.tables?.reduce(
        (sum, table) => sum + (table.no_tables ?? 0),
        0
      ) ?? 0;

    const totalTickets =
      dateInfo.tickets?.reduce(
        (sum, ticket) => sum + (ticket.quantity ?? 0),
        0
      ) ?? 0;

    const totalDrinks =
      dateInfo.drinks?.reduce((sum, drink) => sum + (drink.quantity ?? 0), 0) ??
      0;

    const hasAddons =
      (dateInfo.addons?.tables && dateInfo.addons.tables.length > 0) ||
      (dateInfo.addons?.tickets && dateInfo.addons.tickets.length > 0) ||
      (dateInfo.addons?.drinks && dateInfo.addons.drinks.length > 0);

    setSelectedDateForReschedule({
      date: dateInfo.date,
      people: totalPeople,
      tables: totalTables,
      tickets: totalTickets,
      drinks: totalDrinks,
      price: dateInfo.total_amount,
      booking_date_id: dateInfo.booking_date_id,
      date_key: dateInfo.date_key,
      hasAddons,
    });
    setRescheduleModalOpen(true);
  };

  // Handler for reschedule confirm
  const handleRescheduleConfirm = (payload: VendorRescheduleBookingPayload) => {
    rescheduleMutation.mutate(payload, {
      onSuccess: () => {
        setRescheduleModalOpen(false);
        setSelectedDateForReschedule(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reschedule booking date");
      },
    });
  };

  // Handler for requesting status change (opens confirmation dialog)
  const handleStatusChangeRequest = (
    bookingDateId: number,
    currentStatus: string,
    newStatus: number,
    dateLabel: string
  ) => {
    setStatusUpdateDialog({
      open: true,
      bookingDateId,
      currentStatus,
      newStatus,
      dateLabel,
    });
  };

  // Handler for confirming and updating payment status
  const handleConfirmStatusUpdate = () => {
    if (
      !statusUpdateDialog.bookingDateId ||
      statusUpdateDialog.newStatus === null
    ) {
      return;
    }

    updateStatusMutation.mutate(
      {
        booking_id: parseInt(bookingId),
        booking_date_id: statusUpdateDialog.bookingDateId,
        payment_status: statusUpdateDialog.newStatus,
      },
      {
        onSuccess: (response) => {
          if (response.status) {
            // Close dialog
            setStatusUpdateDialog({
              open: false,
              bookingDateId: null,
              currentStatus: null,
              newStatus: null,
              dateLabel: null,
            });
            // Success toast is handled by API interceptor
            // Data will be automatically refetched via query invalidation
          }
        },
        onError: (error) => {
          // Error toast is handled by API interceptor
          console.error("Error updating payment status:", error);
        },
      }
    );
  };

  // Helper function to convert payment status string to number
  // API mapping: 0 => 'Pending', 1 => 'Paid', 2 => 'failed', 3 => 'cancelled', 4 => 'refunded'
  const getPaymentStatusNumber = (status: string): number => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("paid") || statusLower.includes("full")) {
      return 1; // Paid
    }
    if (statusLower.includes("failed")) {
      return 2; // Failed
    }
    if (statusLower.includes("cancel")) {
      return 3; // Cancelled
    }
    if (statusLower.includes("refund")) {
      return 4; // Refunded
    }
    return 0; // Pending (default)
  };

  // Helper function to get status label from number
  const getPaymentStatusLabel = (statusNumber: number): string => {
    switch (statusNumber) {
      case 0:
        return "Pending";
      case 1:
        return "Paid";
      case 2:
        return "Failed";
      case 3:
        return "Cancelled";
      case 4:
        return "Refunded";
      default:
        return "Unknown";
    }
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
    if (statusLower.includes("failed")) {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower.includes("cancel")) {
      return (
        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower.includes("refund")) {
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          <RotateCcw className="h-3 w-3 mr-1" />
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
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Customer Name
                    </p>
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <p className="text-sm font-semibold text-foreground truncate cursor-help">
                            {bookingData.user.full_name}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs p-2 bg-popover text-popover-foreground border shadow-lg"
                        >
                          <p className="text-sm break-words">
                            {bookingData.user.full_name}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Customer Email */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-green-50 shrink-0">
                    <Mail className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-foreground break-all">
                      {bookingData.user.email}
                    </p>
                  </div>
                </div>

                {/* Customer Phone */}
                {bookingData.user.phone && (
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
                )}

                {/* Location */}
                {bookingData.location && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-orange-50 shrink-0">
                      <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Location
                      </p>
                      <TooltipProvider>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-semibold text-foreground truncate cursor-help">
                              {bookingData.location}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs p-2 bg-popover text-popover-foreground border shadow-lg"
                          >
                            <p className="text-sm break-words">
                              {bookingData.location}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
          <TabsTrigger value="add-ons" className="gap-2">
            <Plus className="h-4 w-4" />
            Add-ons & Services
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
                    defaultValue={
                      bookingData.event_dates.length === 1
                        ? "date-0"
                        : undefined
                    }
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
                              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Show rescheduled date information */}
                                {dateInfo.parent_booking_date ? (
                                  <div className="mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-sm text-muted-foreground line-through">
                                        {typeof dateInfo.parent_booking_date ===
                                        "string"
                                          ? dateInfo.parent_booking_date
                                          : dateInfo.parent_booking_date.date}
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
                              <div className="flex items-center gap-2">
                                {getPaymentStatusBadge(dateInfo.payment_status)}
                                <Select
                                  value={String(
                                    getPaymentStatusNumber(
                                      dateInfo.payment_status
                                    )
                                  )}
                                  onValueChange={(value) => {
                                    const newStatusNum = parseInt(value);
                                    const currentStatusNum =
                                      getPaymentStatusNumber(
                                        dateInfo.payment_status
                                      );
                                    // Only open dialog if status is actually changing
                                    if (newStatusNum !== currentStatusNum) {
                                      handleStatusChangeRequest(
                                        dateInfo.booking_date_id,
                                        dateInfo.payment_status,
                                        newStatusNum,
                                        dateInfo.date
                                      );
                                    }
                                  }}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <SelectTrigger className="h-7 w-[120px] text-xs border-2">
                                    <div className="flex items-center gap-2">
                                      {updateStatusMutation.isPending && (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      )}
                                      <SelectValue
                                        placeholder={
                                          updateStatusMutation.isPending
                                            ? "Updating..."
                                            : "Update Status"
                                        }
                                      />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">Pending</SelectItem>
                                    <SelectItem value="1">Paid</SelectItem>
                                    <SelectItem value="2">Failed</SelectItem>
                                    <SelectItem value="3">Cancelled</SelectItem>
                                    <SelectItem value="4">Refunded</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
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
                                              key={`table-${idx}-${table.table_size}-${table.no_tables}`}
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
                                                  Object.keys(table.allocation)
                                                    .length > 0 && (
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

                                                          // Convert allocation object to array of entries
                                                          const allocationEntries =
                                                            Object.entries(
                                                              table.allocation
                                                            );

                                                          const visible =
                                                            isExpanded
                                                              ? allocationEntries
                                                              : allocationEntries.slice(
                                                                  0,
                                                                  MAX_VISIBLE
                                                                );

                                                          const hasMore =
                                                            allocationEntries.length >
                                                            MAX_VISIBLE;

                                                          return (
                                                            <>
                                                              {visible.map(
                                                                ([
                                                                  tableId,
                                                                  people,
                                                                ]) => (
                                                                  <div
                                                                    key={
                                                                      tableId
                                                                    }
                                                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100"
                                                                  >
                                                                    <span className="text-xs font-medium text-blue-700">
                                                                      Table:
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
                                                                      {allocationEntries.length -
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

                                        {/* Menu Choices Actions */}
                                        {bookingData.is_menu_choice && (
                                          <div className="mt-3 pt-3 border-t border-gray-100">
                                            <Button
                                              onClick={() =>
                                                router.push(
                                                  `/vendor/menu-choices/${bookingId}`
                                                )
                                              }
                                              size="sm"
                                              className="w-full h-9 gap-2"
                                              style={{
                                                backgroundColor:
                                                  "var(--color-primary)",
                                                color:
                                                  "var(--color-primary-foreground)",
                                              }}
                                            >
                                              <Eye className="h-4 w-4" />
                                              View Menu Choices
                                            </Button>
                                          </div>
                                        )}

                                        {/* Reschedule Button */}
                                        {dateInfo.has_unbooked_event_dates && (
                                          <div className="mt-3 pt-3 border-t border-gray-100">
                                            <Button
                                              onClick={() =>
                                                handleRescheduleClick(dateInfo)
                                              }
                                              size="sm"
                                              variant="outline"
                                              className="w-full h-9 gap-2 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                                            >
                                              <RotateCcw className="h-4 w-4" />
                                              Reschedule Date
                                            </Button>
                                          </div>
                                        )}
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
                                        {dateInfo.tickets.map((ticket) => (
                                          <div
                                            key={ticket.id}
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
                                              {formatAmount(
                                                ticket.price_per_ticket *
                                                  ticket.quantity
                                              )}
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
                                              {formatAmount(
                                                drink.price * drink.quantity
                                              )}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Add-ons Section */}
                                  {hasAddons && (
                                    <div className="mt-4 p-3 border-2 border-purple-300 rounded-lg bg-gradient-to-br from-purple-50/80 via-purple-50/50 to-transparent shadow-sm">
                                      <button
                                        type="button"
                                        id={`addons-trigger-${dateInfo.booking_date_id}`}
                                        onClick={() =>
                                          toggleAddOnsExpansion(
                                            dateInfo.booking_date_id.toString()
                                          )
                                        }
                                        aria-expanded={
                                          expandedAddOns[
                                            dateInfo.booking_date_id.toString()
                                          ] === true
                                        }
                                        aria-controls={`addons-content-${dateInfo.booking_date_id}`}
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
                                                    sum +
                                                    (table.no_tables || 0),
                                                  0
                                                ) || 0;
                                              const ticketsCount =
                                                dateInfo.addons.tickets?.reduce(
                                                  (sum, ticket) =>
                                                    sum + ticket.quantity,
                                                  0
                                                ) || 0;
                                              const drinksCount =
                                                dateInfo.addons.drinks?.reduce(
                                                  (sum, drink) =>
                                                    sum + drink.quantity,
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
                                        {expandedAddOns[
                                          dateInfo.booking_date_id.toString()
                                        ] === true ? (
                                          <ChevronUp className="h-4 w-4 text-purple-600 group-hover:text-purple-700 transition-colors" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-purple-600 group-hover:text-purple-700 transition-colors" />
                                        )}
                                      </button>

                                      {/* Add-ons Content */}
                                      {expandedAddOns[
                                        dateInfo.booking_date_id.toString()
                                      ] === true && (
                                        <div
                                          id={`addons-content-${dateInfo.booking_date_id}`}
                                          aria-labelledby={`addons-trigger-${dateInfo.booking_date_id}`}
                                          className="mt-3 space-y-3 p-3 bg-white rounded-lg border border-purple-200 transition-opacity duration-200 ease-out"
                                        >
                                          {/* Tables Add-ons */}
                                          {dateInfo.addons.tables &&
                                            dateInfo.addons.tables.length >
                                              0 && (
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
                                                            0 ? (
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
                                                                (
                                                                  val as string
                                                                ).startsWith(
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
                                                                            (
                                                                              people as string
                                                                            ).replace(
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
                                                          {table.total.toFixed(
                                                            2
                                                          )}
                                                        </p>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() =>
                                                            handleDeleteAddOn(
                                                              dateInfo.date_key,
                                                              table.table_size,
                                                              "table"
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
                                            dateInfo.addons.drinks.length >
                                              0 && (
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
                                                              drink.price *
                                                              drink.quantity
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
                                                              handleDeleteAddOn(
                                                                dateInfo.date_key,
                                                                drink.id,
                                                                "drink"
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
                                                              {
                                                                ticket.description
                                                              }
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
                                                              ticket.price_per_ticket *
                                                              ticket.quantity
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
                                                              handleDeleteAddOn(
                                                                dateInfo.date_key,
                                                                ticket.id,
                                                                "ticket"
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

                                  {/* Show Parent Booking Date Info for Rescheduled Bookings */}
                                  {dateInfo.parent_booking_date &&
                                    typeof dateInfo.parent_booking_date ===
                                      "object" && (
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

          <TabsContent value="add-ons" className="mt-0">
            <CardContent className="p-6">
              <AddOnsTab
                bookingId={bookingId}
                onSaveSuccess={() => setActiveTab("booking-info")}
                dates={bookingData.event_dates.map((date) => {
                  // Calculate total people from tables and tickets
                  const tablePeople =
                    date.tables?.reduce(
                      (sum, table) => sum + (table.people ?? 0),
                      0
                    ) ?? 0;
                  const ticketPeople =
                    date.tickets?.reduce(
                      (sum, ticket) => sum + (ticket.quantity ?? 0),
                      0
                    ) ?? 0;
                  const totalPeople = tablePeople + ticketPeople;

                  return {
                    id: date.date_key, // Use date_key as id for API calls
                    date: date.date,
                    people: totalPeople,
                  };
                })}
              />
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>

      {/* Vendor Reschedule Date Modal */}
      {selectedDateForReschedule && (
        <VendorRescheduleDateModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedDateForReschedule(null);
          }}
          currentDate={{
            date: selectedDateForReschedule.date,
            people: selectedDateForReschedule.people,
            tables: selectedDateForReschedule.tables,
            tickets: selectedDateForReschedule.tickets,
            drinks: selectedDateForReschedule.drinks,
            price: selectedDateForReschedule.price,
          }}
          bookingId={parseInt(bookingId)}
          bookingDateId={selectedDateForReschedule.booking_date_id}
          hasAddons={selectedDateForReschedule.hasAddons}
          isProcessing={rescheduleMutation.isPending}
          onConfirm={handleRescheduleConfirm}
        />
      )}

      {/* Status Update Confirmation Dialog */}
      <AlertDialog
        open={statusUpdateDialog.open}
        onOpenChange={(open) => {
          if (!open && !updateStatusMutation.isPending) {
            setStatusUpdateDialog({
              open: false,
              bookingDateId: null,
              currentStatus: null,
              newStatus: null,
              dateLabel: null,
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment Status Change</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to change the payment status for this
                booking date?
              </p>
              {statusUpdateDialog.dateLabel && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date:</span>
                    <span>{statusUpdateDialog.dateLabel}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        Current Status
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {statusUpdateDialog.currentStatus || "Unknown"}
                      </Badge>
                    </div>
                    <span
                      className="flex-shrink-0 text-muted-foreground"
                      aria-hidden
                    >
                      <ArrowRight className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        New Status
                      </p>
                      <Badge
                        className={
                          statusUpdateDialog.newStatus === 1
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : statusUpdateDialog.newStatus === 2
                            ? "bg-red-100 text-red-700 hover:bg-red-100"
                            : statusUpdateDialog.newStatus === 3
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-100"
                            : statusUpdateDialog.newStatus === 4
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-100"
                            : ""
                        }
                      >
                        {statusUpdateDialog.newStatus !== null
                          ? getPaymentStatusLabel(statusUpdateDialog.newStatus)
                          : "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                This action will update the payment status for this booking
                date. Please confirm to proceed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                setStatusUpdateDialog({
                  open: false,
                  bookingDateId: null,
                  currentStatus: null,
                  newStatus: null,
                  dateLabel: null,
                });
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusUpdate}
              disabled={updateStatusMutation.isPending}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Change"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
