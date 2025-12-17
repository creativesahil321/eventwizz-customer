"use client";

import { Button } from "@/components/ui/button";
import { Transaction } from "../_lib/types";
import { Badge } from "@/components/ui/badge";
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
  const {
    transaction_id,
    amount,
    currency,
    status,
    payment_method,
    gateway,
    description,
    created_at,
    booking_id,
  } = transaction;

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = getStatusIcon(status);
  const PaymentIcon = getPaymentIcon(payment_method || gateway);

  // Format the date (e.g., "2 days ago")
  const formattedDate = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });

  // Format amount
  const formattedAmount = `${currency}${parseFloat(amount).toFixed(2)}`;

  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Payment method icon */}
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
            statusConfig.bgColor
          )}
        >
          <PaymentIcon
            className="h-5 w-5"
            style={{ color: statusConfig.color }}
          />
        </div>

        {/* Transaction content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-base truncate">
              {formattedAmount}
            </span>
            <Badge
              variant="outline"
              className="text-xs capitalize flex items-center gap-1"
              style={{
                color: statusConfig.color,
                borderColor: statusConfig.color,
              }}
            >
              <StatusIcon className="h-3 w-3" />
              {status}
            </Badge>
            {booking_id && (
              <span className="text-xs text-muted-foreground">
                Booking #{booking_id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground line-clamp-1">
              {description || `${payment_method || gateway} payment`}
            </p>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formattedDate}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            ID: {transaction_id}
          </p>
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <Button
          variant="event-outline"
          size="sm"
          onClick={() => onViewDetails(transaction)}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
