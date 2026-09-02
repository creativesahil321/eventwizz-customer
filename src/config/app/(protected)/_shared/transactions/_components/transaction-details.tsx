"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Transaction } from "../_lib/types";
import { formatDistanceToNow, format } from "date-fns";
import { STATUS_CONFIG } from "../_lib/constants";
import {
  Receipt,
  Clock,
  CreditCard,
  Building2,
  Wallet,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import {
  parseFormattedMoney,
  resolveTransactionCurrencyIso,
} from "@/lib/currency-format";

interface TransactionDetailsProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

const getPaymentIcon = (method: string) => {
  const methodLower = method.toLowerCase();
  if (
    methodLower.includes("card") ||
    methodLower.includes("stripe") ||
    methodLower.includes("worldpay")
  ) {
    return CreditCard;
  }
  if (
    methodLower.includes("bank") ||
    methodLower.includes("transfer") ||
    methodLower.includes("truelayer")
  ) {
    return Building2;
  }
  if (methodLower.includes("paypal")) {
    return Wallet;
  }
  if (methodLower.includes("klarna")) {
    return ShoppingBag;
  }
  return CreditCard;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return Clock;
    case "success":
    case "completed":
      return CheckCircle2;
    case "failed":
      return XCircle;
    case "refunded":
      return RefreshCw;
    case "cancelled":
      return X;
    default:
      return Clock;
  }
};

export function TransactionDetailsComponent({
  transaction,
  isOpen,
  onClose,
}: TransactionDetailsProps) {
  const { formatLocale: formatMoneyLocale, symbol: tenantCurrencySymbol } =
    useCurrencyFormat();

  if (!transaction) return null;

  const {
    transaction_id,
    booking_id,
    amount,
    currency,
    status,
    status_key,
    payment_method,
    payment_method_key,
    description,
    created_at,
    paid_at,
    booking_number,
    amount_raw,
  } = transaction;

  // Use status_key for config lookup, fallback to status
  const statusKey = status_key || status?.toLowerCase() || "pending";
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
  const StatusIcon = getStatusIcon(statusKey);
  const PaymentIcon = getPaymentIcon(payment_method_key || payment_method);

  // Helper function to validate and create Date object
  const createValidDate = (
    dateString: string | null | undefined
  ): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format dates - handle null/undefined/invalid values
  const createdDate = createValidDate(created_at);
  const paidDate = createValidDate(paid_at);

  // Use API's date field if available, otherwise calculate from created_at
  const relativeDate =
    transaction.date ||
    (createdDate
      ? formatDistanceToNow(createdDate, { addSuffix: true })
      : "—");

  const fullDate = createdDate ? format(createdDate, "PPP p") : "—";
  const paidDateFormatted = paidDate ? format(paidDate, "PPP p") : null;

  const numericAmount =
    typeof amount_raw === "number" && Number.isFinite(amount_raw)
      ? amount_raw
      : parseFormattedMoney(String(amount ?? ""));
  const formattedAmount = Number.isFinite(numericAmount)
    ? formatMoneyLocale(numericAmount)
    : amount || "—";

  const currencyIso = resolveTransactionCurrencyIso(
    { currency, currency_code: transaction.currency_code, amount },
    tenantCurrencySymbol,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto [&>button]:opacity-100 [&>button]:text-gray-600 [&>button]:hover:text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-black">
            <Receipt className="h-5 w-5 text-[var(--color-primary)]" />
            <span>Transaction Details</span>
          </DialogTitle>
          <DialogDescription className="text-black">
            View detailed information about this transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6 text-black">
          {/* Transaction Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div
              className={cn(
                "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0",
                statusConfig.bgColor
              )}
            >
              <PaymentIcon
                className="h-6 w-6 sm:h-7 sm:w-7"
                style={{ color: statusConfig.color }}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-semibold text-black">
                  {formattedAmount}
                </h3>
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold justify-center sm:justify-start"
                  style={{
                    backgroundColor: statusConfig.badgeBg,
                    color: statusConfig.badgeText,
                  }}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label || status || statusKey}
                </div>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span title={fullDate}>{relativeDate}</span>
              </div>
            </div>
          </div>

          {/* Transaction ID */}
          <div className="bg-accent/5 p-4 rounded-md">
            <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
              Transaction ID
            </h4>
            <p className="text-base font-mono text-black break-all break-words overflow-wrap-anywhere">
              {transaction_id}
            </p>
          </div>

          {/* Description */}
          {description && (
            <div className="bg-accent/10 p-4 rounded-md">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Description
              </h4>
              <p className="text-base break-words overflow-wrap-anywhere">
                {description}
              </p>
            </div>
          )}

          {/* Transaction Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Payment Method
              </p>
              <p className="text-sm font-medium text-black break-words">
                {payment_method || "—"}
              </p>
            </div>

            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Gateway
              </p>
              <p className="text-sm font-medium text-black break-words">
                {payment_method_key || "—"}
              </p>
            </div>

            {booking_id && (
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Booking {booking_number ? "Number" : "ID"}
                </p>
                <p className="text-sm font-medium text-black break-words">
                  {booking_number || `#${booking_id}`}
                </p>
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Currency
              </p>
              <p className="text-sm font-medium text-black break-words">
                {currencyIso}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-shrink-0">
                Created At
              </p>
              <p className="text-sm text-black break-words sm:text-right">
                {fullDate}
              </p>
            </div>
            {paidDateFormatted && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-shrink-0">
                  Paid At
                </p>
                <p className="text-sm text-black break-words sm:text-right">
                  {paidDateFormatted}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="event-primary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
