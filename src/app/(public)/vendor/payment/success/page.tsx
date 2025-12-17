"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  Download,
  Mail,
  Calendar,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentSuccessData {
  booking_id: number;
  amount: string;
  gateway: string;
  transaction_id?: string;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  guest_count?: number;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const bookingId = searchParams.get("booking_id");
    const amount = searchParams.get("amount");
    const gateway = searchParams.get("gateway");

    // If we have a Stripe session_id, we need to process it
    if (sessionId && !bookingId) {
      handleStripeSession(sessionId);
      return;
    }

    // If we have direct parameters, use them (for other payment methods)
    if (bookingId && amount && gateway) {
      const transactionId = searchParams.get("transaction_id");
      const eventName = searchParams.get("event_name");
      const eventDate = searchParams.get("event_date");
      const eventLocation = searchParams.get("event_location");
      const guestCount = searchParams.get("guest_count");

      setPaymentData({
        booking_id: parseInt(bookingId),
        amount,
        gateway,
        transaction_id: transactionId || undefined,
        event_name: eventName || undefined,
        event_date: eventDate || undefined,
        event_location: eventLocation || undefined,
        guest_count: guestCount ? parseInt(guestCount) : undefined,
      });

      setIsLoading(false);
    } else {
      toast.error("Invalid payment confirmation. Please contact support.");
      router.push("/vendor/dashboard");
    }
  }, [searchParams, router]);

  const handleStripeSession = async (sessionId: string) => {
    try {
      // Call backend API to process Stripe session and get payment details
      const response = await fetch(`/api/v1/customer/payment/stripe/success`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to process payment");
      }

      const data = await response.json();

      if (data.status && data.data) {
        setPaymentData({
          booking_id: data.data.booking_id,
          amount: data.data.amount,
          gateway: "stripe",
          transaction_id: data.data.transaction_id,
          event_name: data.data.event_name,
          event_date: data.data.event_date,
          event_location: data.data.event_location,
          guest_count: data.data.guest_count,
        });
      } else {
        throw new Error(data.message || "Payment processing failed");
      }
    } catch (error) {
      console.error("Error processing Stripe session:", error);
      toast.error("Failed to process payment. Please contact support.");
      router.push("/vendor/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    // In a real implementation, this would generate and download a PDF receipt
    toast.success("Receipt download started");
  };

  const handleEmailReceipt = () => {
    // In a real implementation, this would send an email receipt
    toast.success("Receipt sent to your email");
  };

  const handleViewBookings = () => {
    router.push("/vendor/dashboard/bookings");
  };

  if (isLoading || !paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment confirmation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your booking has been confirmed and payment processed successfully.
          </p>
        </div>

        {/* Payment Confirmation Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Confirmation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Booking ID</p>
              <p className="font-medium text-gray-900">
                #{paymentData.booking_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="font-medium text-gray-900">
                £{parseFloat(paymentData.amount).toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="font-medium text-gray-900">{paymentData.gateway}</p>
            </div>

            {paymentData.transaction_id && (
              <div>
                <p className="text-sm text-gray-600">Transaction ID</p>
                <p className="font-medium text-gray-900 font-mono text-sm">
                  {paymentData.transaction_id}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        {(paymentData.event_name ||
          paymentData.event_date ||
          paymentData.event_location) && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Event Details
            </h2>

            <div className="space-y-4">
              {paymentData.event_name && (
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {paymentData.event_name}
                    </p>
                    {paymentData.event_date && (
                      <p className="text-sm text-gray-600">
                        {new Date(paymentData.event_date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {paymentData.event_location && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {paymentData.event_location}
                    </p>
                  </div>
                </div>
              )}

              {paymentData.guest_count && (
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {paymentData.guest_count} guest
                      {paymentData.guest_count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            What&apos;s Next?
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                You&apos;ll receive a confirmation email shortly
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                Event details and instructions will be sent 24 hours before the
                event
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                You can view and manage your booking in your dashboard
              </span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleDownloadReceipt}
            className="flex items-center justify-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Download Receipt</span>
          </button>

          <button
            onClick={handleEmailReceipt}
            className="flex items-center justify-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            <Mail className="h-4 w-4" />
            <span>Email Receipt</span>
          </button>

          <button
            onClick={handleViewBookings}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 transition-colors duration-200"
          >
            <Calendar className="h-4 w-4" />
            <span>View My Bookings</span>
          </button>
        </div>

        {/* Support Information */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact our support team at{" "}
            <a
              href="mailto:support@eventwizz.com"
              className="text-blue-600 hover:text-blue-700"
            >
              support@eventwizz.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
