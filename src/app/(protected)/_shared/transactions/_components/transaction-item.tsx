"use client";

import { Button } from "@/components/ui/button";
import { Transaction } from "../_lib/types";
import { formatDistanceToNow } from "date-fns";
import { STATUS_CONFIG } from "../_lib/constants";
import {
  CreditCard,
  Building2,
  Wallet,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { parseFormattedMoney } from "@/lib/currency-format";

interface TransactionItemProps {
  transaction: Transaction;
  onViewDetails: (transaction: Transaction) => void;
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
    methodLower.includes("bank") || methodLower.includes("transfer")
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

export function TransactionItemComponent({
  transaction,
  onViewDetails,
}: TransactionItemProps) {
  const { formatLocale } = useCurrencyFormat();
  const {
    transaction_id,
    amount,
    currency,
    status,
    status_key,
    payment_method,
    payment_method_key,
    description,
    created_at,
    booking_id,
  } = transaction;

  // Use status_key for config lookup, fallback to status
  const statusKey = status_key || status?.toLowerCase() || "pending";
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
  const StatusIcon = getStatusIcon(statusKey);
  const PaymentIcon = getPaymentIcon(
    payment_method_key || payment_method || ""
  );

  // Format the date (e.g., "2 days ago")
  const formattedDate = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });

  // Format amount
  const formattedAmount = formatLocale(
    parseFormattedMoney(amount, currency),
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b border-border last:border-0 hover:bg-accent/5 transition-colors gap-3 sm:gap-4">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {/* Payment method icon */}
        <div
          className={cn(
            "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0",
            statusConfig.bgColor
          )}
        >
          <PaymentIcon
            className="h-5 w-5 sm:h-6 sm:w-6"
            style={{ color: statusConfig.color }}
          />
        </div>

        {/* Transaction content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm sm:text-base truncate">
                {formattedAmount}
              </span>
              <div
                className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: statusConfig.badgeBg,
                  color: statusConfig.badgeText,
                }}
              >
                <StatusIcon className="h-3 w-3" />
                <span className="hidden xs:inline">{statusConfig.label || status}</span>
              </div>
            </div>
            {booking_id && (
              <span className="text-xs text-muted-foreground">
                Booking #{booking_id}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {description || `${payment_method || payment_method_key || "Payment"}`}
            </p>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formattedDate}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
            ID: {transaction_id}
          </p>
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center gap-3 sm:ml-4 flex-shrink-0 w-full sm:w-auto">
        <Button
          variant="event-outline"
          size="sm"
          className="w-full sm:w-auto text-xs sm:text-sm"
          onClick={() => onViewDetails(transaction)}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
