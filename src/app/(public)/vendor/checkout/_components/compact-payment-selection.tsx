/**
 * Compact Payment Selection Component
 *
 * A more space-efficient version of the payment selection for the order summary
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Calendar, CheckCircle, Clock } from "lucide-react";
import { PaymentInfo } from "@/lib/types/cart.types";
import { format } from "date-fns";

interface CompactPaymentSelectionProps {
  paymentInfo: PaymentInfo;
  totalAmount: number;
  onPaymentTypeChange: (type: "full" | "deposit") => void;
  selectedType?: "full" | "deposit";
  disabled?: boolean;
}

export default function CompactPaymentSelection({
  paymentInfo,
  totalAmount,
  onPaymentTypeChange,
  selectedType = "full",
  disabled = false,
}: CompactPaymentSelectionProps) {
  const [selectedPaymentType, setSelectedPaymentType] = useState<
    "full" | "deposit"
  >(selectedType);

  const handlePaymentTypeChange = (type: "full" | "deposit") => {
    setSelectedPaymentType(type);
    onPaymentTypeChange(type);
  };

  const depositAmount = paymentInfo.deposit_amount;
  const balanceAmount = totalAmount - depositAmount;
  const balanceDueDate = paymentInfo.balance_due_date;

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMM dd");
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-sm text-gray-900">
            Payment Options
          </span>
        </div>

        <div className="space-y-2">
          {/* Full Payment Option */}
          <Button
            variant={selectedPaymentType === "full" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePaymentTypeChange("full")}
            disabled={disabled}
            className="w-full justify-start h-auto p-3"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Pay in Full</span>
                <Badge
                  variant="secondary"
                  className="text-xs bg-green-100 text-green-800"
                >
                  Recommended
                </Badge>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatCurrency(totalAmount)}
                </div>
                <div className="text-xs text-gray-500">Due today</div>
              </div>
            </div>
          </Button>

          {/* Deposit Payment Option */}
          {paymentInfo.type === "deposit" && (
            <Button
              variant={
                selectedPaymentType === "deposit" ? "default" : "outline"
              }
              size="sm"
              onClick={() => handlePaymentTypeChange("deposit")}
              disabled={disabled}
              className="w-full justify-start h-auto p-3"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Pay Deposit</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-blue-200 text-blue-700"
                  >
                    Flexible
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(depositAmount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Balance: {formatCurrency(balanceAmount)}
                  </div>
                </div>
              </div>
            </Button>
          )}
        </div>

        {/* Balance Due Date */}
        {selectedPaymentType === "deposit" && balanceDueDate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Calendar className="h-3 w-3" />
              <span>Balance due: {formatDate(balanceDueDate)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
