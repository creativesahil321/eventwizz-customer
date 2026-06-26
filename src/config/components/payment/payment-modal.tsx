"use client";

import React, { useState } from "react";
import { X, CreditCard, AlertCircle } from "lucide-react";
import PaymentGatewaySelector, {
  PaymentGateway,
} from "./payment-gateway-selector";
import { toast } from "sonner";
import { useCurrencySymbol } from "@/hooks/use-currency-format";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  totalAmount: number;
  paymentGateways: PaymentGateway[];
  currency?: string;
  onPaymentSuccess?: (transactionId: string) => void;
  onPaymentError?: (error: string) => void;
  title?: string;
  description?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  bookingId,
  totalAmount,
  paymentGateways,
  currency,
  onPaymentSuccess,
  onPaymentError,
  title = "Complete Payment",
  description = "Pay for your booking to secure your reservation",
}: PaymentModalProps) {
  const tenantSymbol = useCurrencySymbol();
  const displaySymbol = currency ?? tenantSymbol;
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGatewaySelect = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
  };

  const handlePayment = async () => {
    if (!selectedGateway) {
      toast.error("Please select a payment method");
      return;
    }

    setIsProcessing(true);

    try {
      // Here you would integrate with the actual payment gateway
      // For now, we'll simulate the payment process

      const paymentData = {
        booking_id: bookingId,
        gateway_id: selectedGateway.id,
        gateway_name: selectedGateway.name,
        amount: totalAmount,
        currency: "GBP",
      };

      // Simulate API call to process payment
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate a mock transaction ID
      const transactionId = `txn_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      toast.success("Payment processed successfully!");

      // Call success callback
      if (onPaymentSuccess) {
        onPaymentSuccess(transactionId);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error("Payment processing error:", error);
      const errorMessage =
        "Payment failed. Please try again or contact support.";
      toast.error(errorMessage);

      // Call error callback
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>

            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Booking Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Booking ID</p>
                  <p className="font-medium text-gray-900">#{bookingId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Amount Due</p>
                  <p className="text-lg font-bold text-gray-900">
                    {displaySymbol}
                    {totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Gateway Selection */}
            <PaymentGatewaySelector
              gateways={paymentGateways}
              selectedGateway={selectedGateway}
              onSelectGateway={handleGatewaySelect}
              totalAmount={totalAmount}
              currency={displaySymbol}
              isLoading={isProcessing}
            />

            {/* Payment Button */}
            {selectedGateway && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors duration-200 ${
                    isProcessing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </div>
                  ) : (
                    `Pay ${displaySymbol}${totalAmount.toFixed(2)} with ${
                      selectedGateway.name
                    }`
                  )}
                </button>
              </div>
            )}

            {/* Important Notice */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Important Notice
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Your booking will be confirmed immediately after successful
                    payment. You'll receive a confirmation email with all the
                    details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
