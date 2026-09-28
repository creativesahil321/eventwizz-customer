"use client";

import { PaymentHelpContact } from "@/components/public/payment-help-contact";
import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Home,
  ArrowLeft,
  Loader2,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

function PaymentCancelledContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const bookingId = searchParams.get("booking_id");

    toast.info("Payment Cancelled", {
      description: "You cancelled the payment process",
    });

    console.log("Payment cancelled for booking:", bookingId);
  }, [searchParams]);

  const handleGoHome = () => {
    router.push("/");
  };

  const handleViewBookings = () => {
    router.push("/customer/bookings");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Cancellation Header */}
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
            className="mx-auto w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-orange-200"
          >
            <AlertCircle className="h-12 w-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3"
          >
            Payment Cancelled
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 text-lg"
          >
            You cancelled the payment process. Your booking is still available.
          </motion.p>
        </motion.div>

        {/* Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="mb-6 shadow-lg border-orange-200">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                What Happened?
              </h2>
              <p className="text-gray-700 mb-4">
                The payment process was cancelled before completion. This could
                be because:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>You clicked the cancel or back button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>You closed the payment window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>The payment session timed out</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Your Booking is Reserved
                  </h3>
                  <p className="text-blue-800 mb-3">
                    Don&apos;t worry! Your booking has been saved and is waiting
                    for you to complete the payment.
                  </p>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Your selected dates are still reserved</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>No charges have been made to your account</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <Button
              onClick={handleViewBookings}
              variant="event-outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              View My Bookings
            </Button>

            <Button onClick={handleGoHome} variant="event-outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>
        </motion.div>

        <Separator className="my-6" />

        {/* Help Information */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center"
        >
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">
              Need Help Completing Your Booking?
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Your selections are saved — contact the venue if you need a hand.
            </p>
            <PaymentHelpContact variant="list" />
          </div>
        </motion.div>

        {/* Reassurance */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600">
            ℹ️ Your booking will be held for 24 hours
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Complete the payment anytime before it expires
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
        </div>
      }
    >
      <PaymentCancelledContent />
    </Suspense>
  );
}
