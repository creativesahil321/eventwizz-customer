"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, X, Loader2 } from "lucide-react";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface SingleDatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateInfo: {
    date: string;
    dateKey: string;
    totalAmount: number;
    paidAmount: number;
    pendingPayment: number;
    partialPaymentOption?: number;
  };
  onConfirm: () => void;
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
  const { format: formatCurrency } = useCurrencyFormat();
  const [useDeposit, setUseDeposit] = useState(false);

  const isRescheduleAcceptance = !!rescheduleRequest;
  const displayDate = isRescheduleAcceptance
    ? rescheduleRequest.event_date
    : dateInfo.date;

  const hasDepositOption =
    !isRescheduleAcceptance &&
    !!dateInfo.partialPaymentOption &&
    dateInfo.partialPaymentOption > 0;

  const depositAmount = dateInfo.partialPaymentOption ?? 0;
  const fullAmount = isRescheduleAcceptance
    ? rescheduleRequest.unpaid_amount
    : dateInfo.pendingPayment;

  const payTodayAmount =
    useDeposit && hasDepositOption ? depositAmount : fullAmount;
  const balanceAfterPayment =
    useDeposit && hasDepositOption ? Math.max(0, fullAmount - depositAmount) : 0;

  useEffect(() => {
    if (!isOpen) {
      setUseDeposit(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isProcessing) return;
    setUseDeposit(false);
    onClose();
  };

  const handleConfirm = () => {
    if (payTodayAmount <= 0) return;
    onConfirm();
    setUseDeposit(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                {isRescheduleAcceptance
                  ? "Accept Reschedule & Pay"
                  : "Confirm payment"}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2">
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
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
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
                  <div className="mt-1 flex items-center justify-between text-sm">
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
              <span className="font-semibold text-muted-foreground">
                {isRescheduleAcceptance
                  ? "Reschedule payment due"
                  : "Amount due"}
              </span>
              <span
                className="text-base font-bold"
                style={{ color: "var(--color-primary)" }}
              >
                {formatCurrency(fullAmount)}
              </span>
            </div>
          </div>

          {hasDepositOption && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={useDeposit}
                onChange={(event) => setUseDeposit(event.target.checked)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Pay deposit only ({formatCurrency(depositAmount)} today)
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pay the remaining {formatCurrency(fullAmount - depositAmount)}{" "}
                  later.
                </p>
              </div>
            </label>
          )}

          <div className="rounded-lg border border-green-100 bg-green-50/70 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
                  You&apos;ll pay now
                </p>
                {balanceAfterPayment > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatCurrency(balanceAfterPayment)} remaining after this
                  </p>
                )}
              </div>
              <span className="text-lg font-bold text-green-700">
                {formatCurrency(payTodayAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-white px-6 py-4">
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
            disabled={isProcessing || payTodayAmount <= 0}
            className="flex-1 gap-2 sm:flex-none"
            style={{
              backgroundColor:
                isProcessing || payTodayAmount <= 0
                  ? undefined
                  : "var(--color-primary)",
              color:
                isProcessing || payTodayAmount <= 0 ? undefined : "white",
            }}
          >
            {isProcessing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isProcessing
              ? "Processing payment..."
              : `Pay ${formatCurrency(payTodayAmount)} Now`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
