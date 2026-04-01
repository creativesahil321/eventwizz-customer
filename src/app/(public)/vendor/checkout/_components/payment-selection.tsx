/**
 * Payment Selection Component
 *
 * Professional UI for selecting between full payment and deposit payment options
 * with clear information about deposit amounts and balance due dates.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Calendar,
  Info,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { PaymentInfo } from "@/lib/types/cart.types";
import { format } from "date-fns";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface PaymentSelectionProps {
  paymentInfo: PaymentInfo;
  totalAmount: number;
  onPaymentTypeChange: (type: "full" | "deposit") => void;
  selectedType?: "full" | "deposit";
  disabled?: boolean;
}

export default function PaymentSelection({
  paymentInfo,
  totalAmount,
  onPaymentTypeChange,
  selectedType = "full",
  disabled = false,
}: PaymentSelectionProps) {
  const { format: formatCurrency } = useCurrencyFormat();
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard
            className="h-5 w-5"
            style={{ color: "var(--color-primary)" }}
          />
          Payment Options
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedPaymentType}
          onValueChange={(value) =>
            handlePaymentTypeChange(value as "full" | "deposit")
          }
          disabled={disabled}
          className="space-y-3"
        >
          {/* Full Payment Option */}
          <div className="relative">
            <Label
              htmlFor="full-payment"
              className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <RadioGroupItem value="full" id="full-payment" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-gray-900">Pay in Full</span>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-100 text-green-800"
                  >
                    Recommended
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Complete your booking with a single payment. No additional
                  charges.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-green-700">
                    {formatCurrency(totalAmount)}
                  </span>
                  <span className="text-gray-500">Due today</span>
                </div>
              </div>
            </Label>
          </div>

          {/* Deposit Payment Option */}
          {paymentInfo.type === "deposit" && (
            <div className="relative">
              <Label
                htmlFor="deposit-payment"
                className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <RadioGroupItem
                  value="deposit"
                  id="deposit-payment"
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      Pay Deposit
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs border-blue-200 text-blue-700"
                    >
                      Flexible
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Secure your booking with a deposit. Pay the balance later.
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Deposit amount:</span>
                      <span className="font-semibold text-blue-700">
                        {formatCurrency(depositAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Balance remaining:</span>
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(balanceAmount)}
                      </span>
                    </div>

                    {balanceDueDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>Balance due: {formatDate(balanceDueDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Label>
            </div>
          )}
        </RadioGroup>

        {/* Payment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-900">Payment Summary</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total booking value:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">
                {selectedPaymentType === "full"
                  ? "Amount to pay:"
                  : "Deposit amount:"}
              </span>
              <span
                className="font-semibold text-lg"
                style={{ color: "var(--color-primary)" }}
              >
                {formatCurrency(
                  selectedPaymentType === "full" ? totalAmount : depositAmount
                )}
              </span>
            </div>

            {selectedPaymentType === "deposit" && (
              <div className="flex justify-between text-gray-600">
                <span>Balance due later:</span>
                <span>{formatCurrency(balanceAmount)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Important Notice */}
        {selectedPaymentType === "deposit" && balanceDueDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  Important Notice
                </p>
                <p className="text-blue-700">
                  Your balance of {formatCurrency(balanceAmount)} must be paid
                  by <strong>{formatDate(balanceDueDate)}</strong>. Failure to
                  pay by this date may result in cancellation of your booking.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact Payment Selection for smaller spaces
 */
export function CompactPaymentSelection({
  paymentInfo,
  totalAmount,
  onPaymentTypeChange,
  selectedType = "full",
  disabled = false,
}: PaymentSelectionProps) {
  const { format: formatCurrency } = useCurrencyFormat();
  const depositAmount = paymentInfo.deposit_amount;
  const balanceAmount = totalAmount - depositAmount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-gray-600" />
        <span className="font-medium text-sm">Payment Method</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant={selectedType === "full" ? "default" : "outline"}
          size="sm"
          onClick={() => onPaymentTypeChange("full")}
          disabled={disabled}
          className="flex-1"
        >
          Full Payment
          <span className="ml-1 text-xs">({formatCurrency(totalAmount)})</span>
        </Button>

        {paymentInfo.type === "deposit" && (
          <Button
            variant={selectedType === "deposit" ? "default" : "outline"}
            size="sm"
            onClick={() => onPaymentTypeChange("deposit")}
            disabled={disabled}
            className="flex-1"
          >
            Deposit
            <span className="ml-1 text-xs">
              ({formatCurrency(depositAmount)})
            </span>
          </Button>
        )}
      </div>

      {selectedType === "deposit" && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          Balance: {formatCurrency(balanceAmount)} due later
        </div>
      )}
    </div>
  );
}
