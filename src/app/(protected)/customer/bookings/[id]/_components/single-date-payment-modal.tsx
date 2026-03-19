"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Calendar, X, Loader2 } from "lucide-react";

interface SingleDatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateInfo: {
    date: string;
    dateKey: string;
    totalAmount: number;
    paidAmount: number;
    pendingPayment: number;
    partialPaymentOption?: number; // Deposit amount if available
  };
  onConfirm: (paymentData: {
    dateKey: string;
    paymentPlan: "full" | "deposit";
    amount: number;
  }) => void;
  rescheduleRequest?: {
    id: number;
    event_date: string;
    unpaid_amount: number;
  } | null;
  isProcessing?: boolean;
}

export function SingleDatePaymentModal({
  isOpen,
  onClose,
  dateInfo,
  onConfirm,
  rescheduleRequest,
  isProcessing = false,
}: SingleDatePaymentModalProps) {
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<
    "full" | "deposit" | null
  >(null);

  const isRescheduleAcceptance = !!rescheduleRequest;

  // Auto-select "full" payment for reschedule acceptance
  const effectivePaymentPlan = isRescheduleAcceptance
    ? "full"
    : selectedPaymentPlan;

  // For reschedule acceptance, use reschedule data; otherwise use dateInfo
  const displayDate = isRescheduleAcceptance
    ? rescheduleRequest.event_date
    : dateInfo.date;

  const hasDepositOption =
    !isRescheduleAcceptance &&
    dateInfo.partialPaymentOption &&
    dateInfo.partialPaymentOption > 0;

  const depositAmount = dateInfo.partialPaymentOption || 0;

  const fullAmount = isRescheduleAcceptance
    ? rescheduleRequest.unpaid_amount
    : dateInfo.pendingPayment;

  const payTodayAmount =
    effectivePaymentPlan === "full"
      ? fullAmount
      : effectivePaymentPlan === "deposit"
        ? depositAmount
        : 0;

  const balanceAfterPayment =
    effectivePaymentPlan === "full"
      ? 0
      : effectivePaymentPlan === "deposit"
        ? fullAmount - depositAmount
        : fullAmount;

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const handleConfirm = () => {
    if (!effectivePaymentPlan) return;

    onConfirm({
      dateKey: dateInfo.dateKey,
      paymentPlan: effectivePaymentPlan,
      amount: payTodayAmount,
    });

    // Reset state
    setSelectedPaymentPlan(null);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setSelectedPaymentPlan(null);
    onClose();
  };

  const isConfirmDisabled = !effectivePaymentPlan || !!isProcessing;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                {isRescheduleAcceptance
                  ? "Accept Reschedule & Pay"
                  : "Pay for Single Date"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {displayDate}
                </span>
              </div>
            </div>
            <Button
              variant="event-ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Payment Summary Info */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
            {!isRescheduleAcceptance && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total for this date
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(dateInfo.totalAmount)}
                  </span>
                </div>
                {dateInfo.paidAmount > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Already paid</span>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(dateInfo.paidAmount)}
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
              </>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-semibold">
                {isRescheduleAcceptance
                  ? "Reschedule payment due"
                  : "Amount due"}
              </span>
              <span
                className="font-bold text-base"
                style={{ color: "var(--color-primary)" }}
              >
                {formatCurrency(fullAmount)}
              </span>
            </div>
          </div>

          {/* Step 1: Choose Payment Plan - Only show for regular payments */}
          {!isRescheduleAcceptance && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  1
                </div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">
                  Choose how much to pay today
                </p>
              </div>

              <RadioGroup
                value={selectedPaymentPlan ?? undefined}
                onValueChange={(value) => {
                  setSelectedPaymentPlan(value as "full" | "deposit");
                }}
                className="space-y-3"
              >
                {/* Full Payment Option */}
                <Label
                  htmlFor="single-plan-full"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all duration-200 cursor-pointer ${
                    selectedPaymentPlan === "full"
                      ? "border-[var(--color-primary)] bg-blue-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-[var(--color-primary)]/60 hover:bg-blue-50/40"
                  }`}
                >
                  <RadioGroupItem
                    value="full"
                    id="single-plan-full"
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
                      Clear the outstanding balance for this date completely.
                    </p>
                    <div className="flex items-center gap-3 text-sm pt-2">
                      <span className="font-semibold text-green-700">
                        {formatCurrency(fullAmount)}
                      </span>
                      <span className="text-muted-foreground">due now</span>
                    </div>
                  </div>
                </Label>

                {/* Deposit Payment Option */}
                {hasDepositOption && (
                  <Label
                    htmlFor="single-plan-deposit"
                    className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all duration-200 cursor-pointer ${
                      selectedPaymentPlan === "deposit"
                        ? "border-[var(--color-primary)] bg-purple-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:border-[var(--color-primary)]/60 hover:bg-purple-50/40"
                    }`}
                  >
                    <RadioGroupItem
                      value="deposit"
                      id="single-plan-deposit"
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-foreground text-sm">
                          Pay partial deposit
                        </span>
                        <Badge className="text-xs bg-purple-100 text-purple-700">
                          {formatCurrency(depositAmount)} today
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Secure this date and pay the remaining{" "}
                        {formatCurrency(fullAmount - depositAmount)} later.
                      </p>
                    </div>
                  </Label>
                )}
              </RadioGroup>

              {!selectedPaymentPlan && (
                <p className="text-xs text-muted-foreground italic">
                  👆 Please select a payment option to continue
                </p>
              )}
            </div>
          )}

          {/* Payment Summary - Only show when plan is selected */}
          <AnimatePresence>
            {effectivePaymentPlan && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-3 overflow-hidden"
              >
                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50/70 border border-green-100">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-green-700 font-semibold">
                        You&apos;ll pay today
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedPaymentPlan === "full"
                          ? "Full balance"
                          : "Partial deposit"}
                      </p>
                    </div>
                    <span className="text-base font-semibold text-green-700">
                      {formatCurrency(payTodayAmount)}
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
                        Balance remaining
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {balanceAfterPayment > 0
                          ? "To be paid later"
                          : "Fully settled"}
                      </p>
                    </div>
                    <span
                      className={`text-base font-semibold ${
                        balanceAfterPayment > 0
                          ? "text-amber-700"
                          : "text-green-700"
                      }`}
                    >
                      {formatCurrency(balanceAfterPayment)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between gap-4">
          <Button
            variant="event-outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="event-primary"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 sm:flex-none gap-2"
            style={{
              backgroundColor: isConfirmDisabled
                ? undefined
                : "var(--color-primary)",
              color: isConfirmDisabled ? undefined : "white",
            }}
          >
            {isProcessing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isConfirmDisabled && !isProcessing
              ? "Complete selections above"
              : isProcessing
                ? "Processing payment..."
                : `Confirm & Pay ${formatCurrency(payTodayAmount)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
