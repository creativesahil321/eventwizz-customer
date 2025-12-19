"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  Download,
  Mail,
  Calendar,
  MapPin,
  Users,
  Clock,
  CreditCard,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const handleStripeSession = useCallback(
    async (sessionId: string) => {
      try {
        // Call backend API to process Stripe session and get payment details
        const response = await fetch(
          `/api/v1/customer/payment/stripe/success`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_id: sessionId }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to process payment");
        }

        const data = await response.json();

        if (data.status && data.data) {
          setPaymentData({
            booking_id: data.data.booking_id,
            amount: data.data.amount,
            gateway: "Stripe",
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
        setTimeout(() => {
          router.push("/customer/bookings");
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const bookingId = searchParams.get("booking_id");
    const amount = searchParams.get("amount");
    const gateway = searchParams.get("gateway");

    // If we have a Stripe session_id, we need to process it
    if (sessionId && bookingId) {
      // Direct Stripe session with booking ID
      setPaymentData({
        booking_id: parseInt(bookingId),
        amount: amount || "0",
        gateway: "Stripe",
        transaction_id: sessionId,
      });
      setIsLoading(false);
      return;
    }

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
      setTimeout(() => {
        router.push("/customer/bookings");
      }, 2000);
    }
  }, [searchParams, router, handleStripeSession]);

  const handleDownloadReceipt = () => {
    toast.success("Receipt download started");
    // TODO: Implement actual PDF generation
  };

  const handleEmailReceipt = () => {
    toast.success("Receipt will be sent to your email shortly");
    // TODO: Implement email sending
  };

  const handleViewBookings = () => {
    router.push("/customer/bookings");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            Processing your payment...
          </p>
          <p className="text-sm text-gray-500 mt-2">Please wait</p>
        </motion.div>
      </div>
    );
  }

  if (!paymentData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Success Animation Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-200"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3"
          >
            Payment Successful! 🎉
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 text-lg"
          >
            Your booking has been confirmed and payment processed successfully.
          </motion.p>
        </motion.div>

        {/* Payment Confirmation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="mb-6 shadow-lg border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Payment Confirmation
                </h2>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-300"
                >
                  Confirmed
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Booking ID</span>
                  </div>
                  <p className="font-bold text-xl text-gray-900">
                    #{paymentData.booking_id}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <CreditCard className="h-4 w-4" />
                    <span>Amount Paid</span>
                  </div>
                  <p className="font-bold text-xl text-green-600">
                    £{parseFloat(paymentData.amount).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <CreditCard className="h-4 w-4" />
                    <span>Payment Method</span>
                  </div>
                  <p className="font-semibold text-gray-900 capitalize">
                    {paymentData.gateway}
                  </p>
                </div>

                {paymentData.transaction_id && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Transaction ID</span>
                    </div>
                    <p className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded break-all">
                      {paymentData.transaction_id.substring(0, 24)}...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Event Details */}
        {(paymentData.event_name ||
          paymentData.event_date ||
          paymentData.event_location ||
          paymentData.guest_count) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="mb-6 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Event Details
                </h2>

                <div className="space-y-4">
                  {paymentData.event_name && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {paymentData.event_name}
                        </p>
                        {paymentData.event_date && (
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(
                              paymentData.event_date
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentData.event_location && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">Location</p>
                        <p className="text-sm text-gray-600">
                          {paymentData.event_location}
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentData.guest_count && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Users className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">Guests</p>
                        <p className="text-sm text-gray-600">
                          {paymentData.guest_count} guest
                          {paymentData.guest_count > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                What&apos;s Next?
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-900">
                    You&apos;ll receive a confirmation email within 5 minutes
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-900">
                    Event details and instructions will be sent 24 hours before
                    the event
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-900">
                    You can view and manage your booking anytime in your
                    dashboard
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <Button
            onClick={handleDownloadReceipt}
            variant="event-outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>

          <Button
            onClick={handleEmailReceipt}
            variant="event-outline"
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Receipt
          </Button>

          <Button
            onClick={handleViewBookings}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            View My Bookings
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>

        <Separator className="my-6" />

        {/* Support Information */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center"
        >
          <p className="text-sm text-gray-600">
            Need help? Contact our support team at{" "}
            <a
              href="mailto:support@eventwizz.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              support@eventwizz.com
            </a>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Our team is available 24/7 to assist you
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
