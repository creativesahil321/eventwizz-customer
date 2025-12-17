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
import { Badge } from "@/components/ui/badge";
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
  if (!transaction) return null;

  const {
    transaction_id,
    booking_id,
    amount,
    currency,
    status,
    payment_method,
    gateway,
    description,
    created_at,
    updated_at,
    metadata,
  } = transaction;

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = getStatusIcon(status);
  const PaymentIcon = getPaymentIcon(payment_method || gateway);

  // Format dates
  const formattedDate = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });
  const fullDate = format(new Date(created_at), "PPP p");
  const updatedDate = format(new Date(updated_at), "PPP p");

  // Format amount
  const formattedAmount = `${currency}${parseFloat(amount).toFixed(2)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] [&>button]:opacity-100 [&>button]:text-gray-600 [&>button]:hover:text-gray-900">
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
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center",
                statusConfig.bgColor
              )}
            >
              <PaymentIcon
                className="h-7 w-7"
                style={{ color: statusConfig.color }}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-black">
                  {formattedAmount}
                </h3>
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
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span title={fullDate}>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Transaction ID */}
          <div className="bg-accent/5 p-4 rounded-md">
            <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
              Transaction ID
            </h4>
            <p className="text-base font-mono text-black">{transaction_id}</p>
          </div>

          {/* Description */}
          {description && (
            <div className="bg-accent/10 p-4 rounded-md">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Description
              </h4>
              <p className="text-base">{description}</p>
            </div>
          )}

          {/* Transaction Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Payment Method
              </p>
              <p className="text-sm font-medium text-black">
                {payment_method || gateway}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Gateway
              </p>
              <p className="text-sm font-medium text-black">{gateway}</p>
            </div>

            {booking_id && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Booking ID
                </p>
                <p className="text-sm font-medium text-black">#{booking_id}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Currency
              </p>
              <p className="text-sm font-medium text-black">{currency}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Created At
              </p>
              <p className="text-sm text-black">{fullDate}</p>
            </div>
            {updated_at !== created_at && (
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Updated At
                </p>
                <p className="text-sm text-black">{updatedDate}</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-semibold">Additional Information</h4>
              <div className="border rounded-md p-3 space-y-2">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="text-xs text-black font-medium">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
