"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  UtensilsCrossed,
  Info,
  AlertTriangle,
  FileCheck,
  Loader2,
  Plus,
  CreditCard,
  Receipt,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVendorRescheduleData } from "@/services/vendor/bookings/query";
import type {
  VendorAvailableRescheduleDate,
  VendorMissingTableDetail,
  VendorRescheduleBookingPayload,
} from "@/services/vendor/bookings/type";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";

function getTotalMissingTableQuantity(
  missingTables: VendorMissingTableDetail[],
): number {
  return missingTables.reduce(
    (sum, table) => sum + Math.max(0, Number(table.quantity) || 0),
    0,
  );
}

function formatMissingTablesDetail(
  missingTables: VendorMissingTableDetail[],
): string {
  if (missingTables.length === 0) return "";

  const totalQty = getTotalMissingTableQuantity(missingTables);
  const tierSummary = missingTables
    .map(
      (table) =>
        `${table.quantity}× ${table.min_persons}–${table.max_persons} guests`,
    )
    .join(", ");

  if (missingTables.length === 1) {
    const table = missingTables[0];
    return `Missing: ${table.quantity} table${table.quantity === 1 ? "" : "s"} (${table.min_persons}–${table.max_persons} persons)`;
  }

  return `Missing: ${totalQty} tables (${tierSummary})`;
}

interface VendorRescheduleDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: {
    date: string;
    people: number;
    tables: number;
    tickets: number;
    drinks: number;
    price: number;
  };
  bookingId: number;
  bookingDateId: number;
  hasAddons: boolean;
  packageSectionTitle?: string;
  isProcessing?: boolean;
  onConfirm: (payload: VendorRescheduleBookingPayload) => void;
}

const TERMS_AND_CONDITIONS = [
  "You are rescheduling this booking on behalf of the customer. Ensure you have their consent before proceeding.",
  "If the new date is more expensive, the customer will be charged the difference based on the selected payment method (online or offline).",
  "If the new date is less expensive, no refund will be provided to the customer.",
  "The current seating arrangement must be available on the new date for the reschedule to proceed.",
  "All add-ons and services will be removed when rescheduling. They cannot be transferred to the new date.",
  "Once confirmed, the date change cannot be reversed. Please verify all details before confirming.",
  "Date changes are subject to venue and table availability on the selected date.",
  "You are responsible for notifying the customer about the date change, any additional charges, and the removal of add-ons.",
];

type Step = "warning" | "select" | "review" | "confirm";

export function VendorRescheduleDateModal({
  isOpen,
  onClose,
  currentDate,
  bookingId,
  bookingDateId,
  hasAddons,
  packageSectionTitle,
  isProcessing = false,
  onConfirm,
}: VendorRescheduleDateModalProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const [currentStep, setCurrentStep] = useState<Step>(
    hasAddons ? "warning" : "select"
  );
  const [selectedDate, setSelectedDate] =
    useState<VendorAvailableRescheduleDate | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "online" | "offline" | null
  >(null);
  const isSubmittingRef = useRef(false);

  // Fetch reschedule data using TanStack Query (only when past warning step)
  const shouldFetchData = useMemo(
    () =>
      isOpen &&
      !!bookingId &&
      !!bookingDateId &&
      (currentStep === "select" ||
        currentStep === "review" ||
        currentStep === "confirm"),
    [isOpen, bookingId, bookingDateId, currentStep]
  );

  const {
    data: rescheduleDataResponse,
    isLoading: isLoadingData,
    error: dataError,
  } = useVendorRescheduleData(bookingId, bookingDateId, shouldFetchData);

  const rescheduleData = rescheduleDataResponse?.data;
  const availableDates = rescheduleData?.availableDates.available || [];
  const needsTablesDates = rescheduleData?.availableDates.needs_tables || [];
  const currentDateData = rescheduleData?.current;

  const currentBookingDisplay = useMemo(() => {
    if (currentDateData) {
      const price =
        typeof currentDateData.price === "number"
          ? currentDateData.price
          : Number.parseFloat(String(currentDateData.price)) ||
            currentDate.price;

      return {
        date: currentDateData.date,
        price,
        people: currentDateData.people,
        tables: currentDateData.tables,
        tickets: currentDateData.tickets ?? 0,
        drinks: currentDateData.drinks ?? 0,
      };
    }

    return currentDate;
  }, [currentDate, currentDateData]);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(hasAddons ? "warning" : "select");
      setSelectedDate(null);
      setTermsAccepted(false);
      setPaymentMethod(null);
      isSubmittingRef.current = false;
    }
  }, [isOpen, hasAddons]);

  const handleClose = () => {
    if (isProcessing) return;
    setCurrentStep(hasAddons ? "warning" : "select");
    setSelectedDate(null);
    setTermsAccepted(false);
    setPaymentMethod(null);
    onClose();
  };

  const handleWarningConfirm = () => {
    setCurrentStep("select");
  };

  const handleWarningCancel = () => {
    handleClose();
  };

  const handleDateSelect = (date: VendorAvailableRescheduleDate) => {
    setSelectedDate(date);
    setCurrentStep("review");
  };

  const handleReviewConfirm = () => {
    // If price doesn't increase, submit directly from review
    if (priceDifference <= 0) {
      handleFinalConfirm();
      return;
    }
    setCurrentStep("confirm");
  };

  const handleFinalConfirm = () => {
    if (
      !selectedDate ||
      isProcessing ||
      isSubmittingRef.current ||
      !currentDateData
    ) {
      return;
    }

    // Calculate unpaid amount (price difference if new date is more expensive)
    const currentPriceCalc = Number.parseFloat(currentDateData.price);
    const newPriceCalc = selectedDate.price;
    const unpaidAmountCalc =
      newPriceCalc > currentPriceCalc ? newPriceCalc - currentPriceCalc : 0;

    // Check if terms and payment method are required
    const requiresPayment = unpaidAmountCalc > 0;
    if (requiresPayment && (!termsAccepted || !paymentMethod)) {
      return;
    }

    // Prepare table details payload
    const tableDetails = selectedDate.table_details.map((table) => ({
      event_date_table_id: table.event_date_table_id,
      allocated_seat: table.allocated_seat,
      table_size: table.table_size,
      price_per_person: table.price_per_person,
      total: table.total,
    }));

    isSubmittingRef.current = true;

    // Determine payment method to send
    const finalPaymentMethod: "online" | "offline" =
      requiresPayment && paymentMethod ? paymentMethod : "offline";

    // Call parent with full payload
    onConfirm({
      booking_id: bookingId,
      booking_date_id: bookingDateId,
      new_booking_date_id: selectedDate.id,
      new_date: selectedDate.dateKey,
      total_amount: selectedDate.price,
      unpaid_amount: unpaidAmountCalc,
      payment_gateway: finalPaymentMethod === "online" ? "stripe" : "offline",
      payment_method: finalPaymentMethod,
      table_details: tableDetails,
    });

    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 2000);
  };

  const handleBack = () => {
    if (currentStep === "select") {
      setCurrentStep(hasAddons ? "warning" : "select");
      setSelectedDate(null);
    } else if (currentStep === "review") {
      setCurrentStep("select");
      setSelectedDate(null);
    } else if (currentStep === "confirm") {
      setCurrentStep("review");
      setTermsAccepted(false);
      setPaymentMethod(null);
    }
  };

  // Calculate price difference using selected date and current date data
  const priceDifference =
    selectedDate && currentDateData
      ? selectedDate.price - Number.parseFloat(currentDateData.price)
      : 0;
  const isPriceIncrease = priceDifference > 0;

  const getStepProgress = () => {
    const steps: Step[] = hasAddons
      ? ["warning", "select", "review", "confirm"]
      : ["select", "review", "confirm"];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden p-0">
        <DialogTitle className="sr-only ">Reschedule Event Date</DialogTitle>

        {/* Header with Progress */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center justify-between p-4 sm:p-5 pb-2 sm:pb-3">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                Reschedule Event Date
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                {currentStep === "warning" &&
                  "Important: Add-ons will be removed"}
                {currentStep === "select" && "Select a new date for booking"}
                {currentStep === "review" &&
                  "Review the changes and price difference"}
                {currentStep === "confirm" && "Accept terms and confirm"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full flex-shrink-0"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-gray-100">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${getStepProgress()}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 py-3 bg-gray-50 border-b overflow-x-auto">
            {hasAddons && (
              <>
                <div
                  className={`flex items-center gap-1 sm:gap-2 ${
                    currentStep === "warning"
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === "warning"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    1
                  </div>
                  <span className="text-xs font-medium hidden sm:inline">
                    Warning
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </>
            )}
            <div
              className={`flex items-center gap-1 sm:gap-2 ${
                currentStep === "select" ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === "select"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                {hasAddons ? "2" : "1"}
              </div>
              <span className="text-xs font-medium hidden sm:inline">
                Select
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
            <div
              className={`flex items-center gap-1 sm:gap-2 ${
                currentStep === "review" ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === "review"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                {hasAddons ? "3" : "2"}
              </div>
              <span className="text-xs font-medium hidden sm:inline">
                Review
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
            <div
              className={`flex items-center gap-1 sm:gap-2 ${
                currentStep === "confirm" ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === "confirm"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                {hasAddons ? "4" : "3"}
              </div>
              <span className="text-xs font-medium hidden sm:inline">
                Confirm
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-4 sm:p-5 pb-20 sm:pb-20">
          <AnimatePresence mode="wait">
            {/* Step 0: Warning (if has add-ons) */}
            {currentStep === "warning" && hasAddons && (
              <motion.div
                key="warning"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                <Alert
                  variant="destructive"
                  className="border-orange-200 bg-orange-50"
                >
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Important Notice:</strong> If you reschedule this
                    date, all add-ons will be removed. Are you sure you want to
                    proceed?
                  </AlertDescription>
                </Alert>

                <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        Add-ons Will Be Removed
                      </h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Rescheduling this date will permanently remove all
                        add-ons associated with it. This action cannot be
                        undone.
                      </p>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-orange-900">
                          What will be removed:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-orange-800">
                          <li>• Additional tables</li>
                          <li>• Extra tickets</li>
                          <li>• {packageSectionTitle?.trim() || "Drink packages"}</li>
                          <li>• All other add-ons</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Select Date */}
            {currentStep === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* Current Date Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-blue-900 mb-2">
                        Current Booking
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="text-blue-700">Date:</span>
                          <p className="font-medium text-blue-900">
                            {currentBookingDisplay.date}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700">Price:</span>
                          <p className="font-medium text-blue-900">
                            {formatMoney(currentBookingDisplay.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-900">
                            {currentBookingDisplay.people} people
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-900">
                            {currentBookingDisplay.tables} tables
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Dates */}
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">
                  Available Dates
                </h3>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-600">
                      Loading available dates...
                    </span>
                  </div>
                ) : dataError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load available dates. Please try again.
                    </AlertDescription>
                  </Alert>
                ) : availableDates.length === 0 &&
                  needsTablesDates.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available dates found for rescheduling.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {/* Directly Available Dates */}
                    {availableDates.length > 0 && (
                      <div className="space-y-2 sm:space-y-3">
                        {availableDates.map(
                          (date: VendorAvailableRescheduleDate) => {
                            const datePriceDiff =
                              date.price - currentDate.price;
                            const isSame = datePriceDiff === 0;

                            return (
                              <div
                                key={date.id}
                                className="border rounded-lg p-3 sm:p-4 transition-all hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer active:scale-[0.98]"
                                onClick={() => handleDateSelect(date)}
                              >
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="h-4 w-4 text-gray-600" />
                                      <h4 className="font-semibold text-gray-900">
                                        {date.date}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {isSame && (
                                        <Badge
                                          variant="secondary"
                                          className="bg-gray-100 text-gray-700"
                                        >
                                          Same Price
                                        </Badge>
                                      )}
                                      <Badge
                                        variant="secondary"
                                        className="bg-green-100 text-green-700"
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Available
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2">
                                    <p className="text-base sm:text-lg font-bold text-gray-900">
                                      {formatMoney(date.price)}
                                    </p>
                                    <Button
                                      size="sm"
                                      className="mt-0 sm:mt-2 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                                    >
                                      Select
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {/* Dates Requiring Table Addition */}
                    {needsTablesDates.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <h4 className="font-semibold text-sm text-gray-900">
                            Dates Requiring Table Setup
                          </h4>
                        </div>
                        <Alert className="bg-orange-50 border-orange-200">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800 text-xs sm:text-sm">
                            The following dates require table configuration
                            before rescheduling. Please add the required tables
                            to these event dates first, then you can reschedule
                            the booking.
                          </AlertDescription>
                        </Alert>
                        {needsTablesDates.map(
                          (date: (typeof needsTablesDates)[0]) => {
                            const requiredTableCount = getTotalMissingTableQuantity(
                              date.missing_tables,
                            );

                            return (
                            <div
                              key={date.id}
                              className="border-2 border-orange-200 rounded-lg p-3 sm:p-4 bg-orange-50/50 opacity-60"
                            >
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                    <h4 className="font-semibold text-gray-900">
                                      {date.date}
                                    </h4>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-100 text-orange-700"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Requires {requiredTableCount} Table
                                    {requiredTableCount === 1 ? "" : "s"}
                                  </Badge>
                                  <div className="mt-2 text-xs text-gray-600">
                                    {formatMissingTablesDetail(
                                      date.missing_tables,
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  disabled
                                  variant="event-outline"
                                >
                                  Not Available
                                </Button>
                              </div>
                            </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Review Changes */}
            {currentStep === "review" && selectedDate && currentDateData && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Please review the changes carefully before proceeding.
                  </AlertDescription>
                </Alert>

                {/* Date Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Current Date */}
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-red-100 rounded">
                        <X className="h-4 w-4 text-red-600" />
                      </div>
                      <h3 className="font-semibold text-red-900">
                        Current Date
                      </h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-red-900">
                        {currentDateData.date}
                      </p>
                      <div className="flex items-center justify-between text-red-700">
                        <span>Price:</span>
                        <span className="font-bold">
                          {formatMoney(Number(currentDateData.price))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-red-700">
                        <span>People:</span>
                        <span>{currentDateData.people}</span>
                      </div>
                      <div className="flex items-center justify-between text-red-700">
                        <span>Tables:</span>
                        <span>{currentDateData.tables}</span>
                      </div>
                      {currentDateData.drinks !== undefined &&
                        currentDateData.drinks !== null && (
                          <div className="flex items-center justify-between text-red-700">
                            <span>Drinks:</span>
                            <span>{currentDateData.drinks}</span>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* New Date */}
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-green-100 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-green-900">New Date</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-green-900">
                        {selectedDate.date}
                      </p>
                      <div className="flex items-center justify-between text-green-700">
                        <span>Price:</span>
                        <span className="font-bold">
                          {formatMoney(selectedDate.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-green-700">
                        <span>People:</span>
                        <span>{selectedDate.people}</span>
                      </div>
                      <div className="flex items-center justify-between text-green-700">
                        <span>Tables:</span>
                        <span>{selectedDate.tables}</span>
                      </div>
                      {selectedDate.drinks !== undefined &&
                        selectedDate.drinks !== null && (
                          <div className="flex items-center justify-between text-green-700">
                            <span>Drinks:</span>
                            <span>{selectedDate.drinks}</span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Price Difference Message - Only show if price increases */}
                {isPriceIncrease && (
                  <>
                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-orange-900">
                          Additional Payment Required from Customer:
                        </span>
                        <span className="text-lg font-bold text-orange-900">
                          {formatMoney(priceDifference)}
                        </span>
                      </div>
                    </div>

                    {/* Payment Method Selection - Show only if price increases */}
                    <div className="border rounded-lg p-3 sm:p-4 bg-white">
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">
                        Payment Method
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Select how the customer will pay for the additional
                        amount:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          aria-pressed={paymentMethod === "online"}
                          className={cn(
                            "h-auto rounded-lg border-2 px-4 py-4 text-left transition-colors",
                            "flex flex-col items-start gap-2 disabled:pointer-events-none disabled:opacity-50",
                            paymentMethod === "online"
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/30"
                              : "border-slate-200 bg-white hover:border-[var(--color-primary)]/50 hover:bg-slate-50",
                          )}
                          onClick={() => setPaymentMethod("online")}
                          disabled={isProcessing}
                        >
                          <div className="flex w-full items-center gap-2 text-slate-900">
                            <CreditCard
                              className="h-5 w-5 shrink-0 text-[var(--color-primary)]"
                              aria-hidden
                            />
                            <span className="text-sm font-semibold text-slate-900">
                              Online Payment
                            </span>
                          </div>
                          <span className="text-xs leading-relaxed text-slate-600 whitespace-normal">
                            Customer will pay online via payment gateway
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={paymentMethod === "offline"}
                          className={cn(
                            "h-auto rounded-lg border-2 px-4 py-4 text-left transition-colors",
                            "flex flex-col items-start gap-2 disabled:pointer-events-none disabled:opacity-50",
                            paymentMethod === "offline"
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/30"
                              : "border-slate-200 bg-white hover:border-[var(--color-primary)]/50 hover:bg-slate-50",
                          )}
                          onClick={() => setPaymentMethod("offline")}
                          disabled={isProcessing}
                        >
                          <div className="flex w-full items-center gap-2 text-slate-900">
                            <Receipt
                              className="h-5 w-5 shrink-0 text-[var(--color-primary)]"
                              aria-hidden
                            />
                            <span className="text-sm font-semibold text-slate-900">
                              Offline Payment
                            </span>
                          </div>
                          <span className="text-xs leading-relaxed text-slate-600 whitespace-normal">
                            Customer will pay manually (cash, bank transfer,
                            etc.)
                          </span>
                        </button>
                      </div>
                      {!paymentMethod && (
                        <p className="text-xs text-red-600 mt-2">
                          Please select a payment method to continue
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* No additional payment message */}
                {!isPriceIncrease && (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        {priceDifference === 0
                          ? "No additional payment required - same price"
                          : "No additional payment required - new date is less expensive"}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Terms and Final Confirmation */}
            {currentStep === "confirm" && selectedDate && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center py-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Terms and Confirmation
                  </h3>
                  <p className="text-xs text-gray-600">
                    Please review the terms and confirm the date change
                  </p>
                </div>

                {/* Summary Card */}
                <div className="border rounded-lg p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white">
                  <h4 className="font-semibold text-sm text-gray-900 mb-3">
                    Change Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">From:</span>
                      <span className="font-medium text-gray-900">
                        {currentDateData?.date || currentDate.date}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">To:</span>
                      <span className="font-medium text-gray-900">
                        {selectedDate?.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">
                    Terms and Conditions:
                  </h4>
                  <ul className="space-y-1.5">
                    {TERMS_AND_CONDITIONS.map((term, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="p-0.5 bg-blue-100 rounded-full mt-0.5 flex-shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5 text-blue-600" />
                        </div>
                        <span className="text-xs text-gray-700 flex-1 leading-relaxed">
                          {term}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Terms Acceptance Checkbox */}
                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="terms-checkbox-confirm"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label
                    htmlFor="terms-checkbox-confirm"
                    className="text-xs text-gray-700 cursor-pointer flex-1 leading-relaxed"
                  >
                    I have read and accept the terms and conditions for
                    rescheduling this booking date. I understand that this
                    action cannot be reversed once confirmed.
                  </label>
                </div>

                <Alert className="bg-yellow-50 border-yellow-200 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800">
                    This action cannot be undone. The booking will be
                    permanently moved to the new date.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-white/95 border-t p-4 sm:p-6 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[0_-12px_24px_-18px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <Button
              variant="event-outline"
              onClick={
                currentStep === "warning"
                  ? handleWarningCancel
                  : currentStep !== "select"
                  ? handleBack
                  : handleClose
              }
              disabled={
                isProcessing &&
                currentStep !== "select" &&
                currentStep !== "warning"
              }
              className="w-full sm:w-auto"
            >
              {currentStep === "warning"
                ? "Cancel"
                : currentStep !== "select"
                ? "Back"
                : "Cancel"}
            </Button>

            {currentStep === "warning" && (
              <Button
                variant="event-primary"
                onClick={handleWarningConfirm}
                className="w-full sm:w-auto"
              >
                Yes, Proceed
              </Button>
            )}

            {currentStep === "select" && (
              <p className="text-xs sm:text-sm text-muted-foreground flex-1 text-center order-3 sm:order-none">
                Select a date to continue
              </p>
            )}

            {currentStep === "review" && selectedDate && currentDateData && (
              <Button
                variant="event-primary"
                onClick={handleReviewConfirm}
                disabled={isPriceIncrease && !paymentMethod}
                className="w-full sm:w-auto"
              >
                {isPriceIncrease ? (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Change
                  </>
                )}
              </Button>
            )}

            {currentStep === "confirm" && (
              <Button
                variant="event-primary"
                onClick={handleFinalConfirm}
                disabled={
                  isProcessing ||
                  !termsAccepted ||
                  !paymentMethod ||
                  isSubmittingRef.current
                }
                className="w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <motion.div
                      className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Change
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
