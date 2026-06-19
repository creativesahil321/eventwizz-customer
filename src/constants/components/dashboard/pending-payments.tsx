"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  Clock,
} from "lucide-react";
import PaymentModal from "@/components/payment/payment-modal";
import { PaymentGateway } from "@/components/payment/payment-gateway-selector";
import { toast } from "sonner";

interface PendingPayment {
  id: number;
  booking_id: number;
  amount: number;
  currency: string;
  due_date: string;
  event_name: string;
  event_date: string;
  event_location: string;
  guest_count: number;
  status: "pending" | "overdue" | "cancelled";
  payment_gateways: PaymentGateway[];
}

interface PendingPaymentsProps {
  payments: PendingPayment[];
  onPaymentSuccess?: (bookingId: number, transactionId: string) => void;
  onPaymentError?: (bookingId: number, error: string) => void;
}

export default function PendingPayments({
  payments,
  onPaymentSuccess,
  onPaymentError,
}: PendingPaymentsProps) {
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(
    null
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handlePayNow = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (transactionId: string) => {
    if (selectedPayment && onPaymentSuccess) {
      onPaymentSuccess(selectedPayment.booking_id, transactionId);
    }

    toast.success("Payment completed successfully!", {
      description: `Transaction ID: ${transactionId}`,
    });

    setIsPaymentModalOpen(false);
    setSelectedPayment(null);
  };

  const handlePaymentError = (error: string) => {
    if (selectedPayment && onPaymentError) {
      onPaymentError(selectedPayment.booking_id, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "text-red-600 bg-red-100";
      case "pending":
        return "text-amber-600 bg-amber-100";
      case "cancelled":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "overdue":
        return <AlertTriangle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "cancelled":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Pending Payments
          </h3>
          <p className="text-gray-600">
            All your bookings are fully paid. Great job!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Pending Payments
          </h2>
          <span className="text-sm text-gray-600">
            {payments.length} payment{payments.length > 1 ? "s" : ""} pending
          </span>
        </div>

        <div className="grid gap-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {payment.event_name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {getStatusIcon(payment.status)}
                      <span className="ml-1 capitalize">{payment.status}</span>
                    </span>
                  </div>

                  {/* Event Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {new Date(payment.event_date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {payment.event_location}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {payment.guest_count} guest
                        {payment.guest_count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Booking ID</p>
                      <p className="font-medium text-gray-900">
                        #{payment.booking_id}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600">Amount Due</p>
                      <p className="text-lg font-bold text-gray-900">
                        {payment.currency}
                        {payment.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Due Date Warning */}
                  {isOverdue(payment.due_date) && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <p className="text-sm text-red-800">
                          Payment is overdue. Please pay immediately to avoid
                          cancellation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="ml-6 flex-shrink-0">
                  <button
                    onClick={() => handlePayNow(payment)}
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors duration-200 ${
                      isOverdue(payment.due_date)
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isOverdue(payment.due_date)
                      ? "Pay Now (Overdue)"
                      : "Pay Now"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          bookingId={selectedPayment.booking_id}
          totalAmount={selectedPayment.amount}
          paymentGateways={selectedPayment.payment_gateways}
          currency={selectedPayment.currency}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          title={`Pay for ${selectedPayment.event_name}`}
          description={`Complete payment for your booking to secure your reservation`}
        />
      )}
    </>
  );
}
