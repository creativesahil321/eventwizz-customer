"use client";

import React, { useEffect, useState, Suspense, useContext } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ServerContext } from "@/lib/server-context";
import { resolvePublicPageContact } from "@/lib/resolve-venue-contact";
import type { ThemeSchema } from "@/types/theme.types";
import {
  XCircle,
  AlertTriangle,
  RotateCcw,
  Home,
  Mail,
  CreditCard,
  ArrowLeft,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CUSTOMER_CHECKOUT_PATH } from "@/lib/customer-checkout-path";

interface PaymentFailureData {
  booking_id?: string;
  error_message?: string;
  error_code?: string;
  reason?: string;
}

const FALLBACK_SUPPORT_EMAIL = "support@eventwizz.com";

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Resolve the vendor's real contact details from theme (no fake placeholders).
  const { theme } = useContext(ServerContext);
  const resolvedContact = resolvePublicPageContact({
    theme: theme as ThemeSchema | null,
  });
  const supportPhone = resolvedContact.phone;
  const supportEmail = resolvedContact.email || FALLBACK_SUPPORT_EMAIL;

  const [failureData, setFailureData] = useState<PaymentFailureData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bookingId = searchParams.get("booking_id");
    const errorMessage =
      searchParams.get("error") || searchParams.get("message");
    const errorCode = searchParams.get("error_code");
    const reason = searchParams.get("reason");

    setFailureData({
      booking_id: bookingId || undefined,
      error_message: errorMessage || "Payment could not be processed",
      error_code: errorCode || undefined,
      reason: reason || undefined,
    });

    setIsLoading(false);

    // Show error toast
    toast.error("Payment Failed", {
      description: errorMessage || "Your payment could not be processed",
    });
  }, [searchParams]);

  const handleRetryPayment = () => {
    if (failureData?.booking_id) {
      // Redirect to booking page to retry payment
      router.push(`/customer/bookings/${failureData.booking_id}`);
    } else {
      // Go back to checkout
      router.push(CUSTOMER_CHECKOUT_PATH);
    }
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleContactSupport = () => {
    // Open email client with pre-filled subject and body
    const subject = encodeURIComponent("Payment Failed - Need Assistance");
    const body = encodeURIComponent(
      `Hi Support Team,\n\nI experienced an issue with my payment.\n\nBooking ID: ${
        failureData?.booking_id || "N/A"
      }\nError: ${
        failureData?.error_message || "N/A"
      }\n\nPlease assist me.\n\nThank you.`
    );
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  const handleViewCart = () => {
    router.push(CUSTOMER_CHECKOUT_PATH);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Failure Animation Header */}
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
            className="mx-auto w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-200"
          >
            <XCircle className="h-12 w-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3"
          >
            Payment Failed
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 text-lg"
          >
            We couldn&apos;t process your payment. Don&apos;t worry, you can try
            again.
          </motion.p>
        </motion.div>

        {/* Error Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="mb-6 shadow-lg border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Payment Details
                </h2>
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-300"
                >
                  Failed
                </Badge>
              </div>

              <div className="space-y-4">
                {failureData?.booking_id && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <CreditCard className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Booking ID</p>
                      <p className="font-semibold text-gray-900">
                        #{failureData.booking_id}
                      </p>
                    </div>
                  </div>
                )}

                {failureData?.error_message && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Error Message</p>
                      <p className="font-medium text-red-700">
                        {failureData.error_message}
                      </p>
                    </div>
                  </div>
                )}

                {failureData?.error_code && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <HelpCircle className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Error Code</p>
                      <p className="font-mono text-sm text-gray-700">
                        {failureData.error_code}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Common Reasons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="mb-6 shadow-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Common Reasons for Payment Failure
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-orange-50 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  </div>
                  <span className="text-gray-700">
                    Insufficient funds in your account
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-orange-50 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  </div>
                  <span className="text-gray-700">
                    Incorrect card details entered
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-orange-50 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  </div>
                  <span className="text-gray-700">
                    Card declined by your bank
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-orange-50 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  </div>
                  <span className="text-gray-700">
                    Network or connection issues
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-orange-50 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  </div>
                  <span className="text-gray-700">
                    Payment method not supported
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* What to do next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                What You Can Do
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <RotateCcw className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  </div>
                  <span className="text-blue-900">
                    Try again with the same or a different payment method
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  </div>
                  <span className="text-blue-900">
                    Verify your card details and available balance
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  </div>
                  <span className="text-blue-900">
                    Contact your bank if the issue persists
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  </div>
                  <span className="text-blue-900">
                    Reach out to our support team for assistance
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
        >
          <Button
            onClick={handleRetryPayment}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Retry Payment
          </Button>

          <Button
            onClick={handleContactSupport}
            variant="outline"
            className="w-full text-lg py-6"
          >
            <Mail className="h-5 w-5 mr-2" />
            Contact Support
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
        >
          <Button onClick={handleViewCart} variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>

          <Button onClick={handleGoHome} variant="outline" className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Go to Homepage
          </Button>
        </motion.div>

        <Separator className="my-6" />

        {/* Support Information */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-center"
        >
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">
              Need Immediate Help?
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Our support team is here to help you complete your booking
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-gray-700">Email:</span>{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {supportEmail}
                </a>
              </p>
              {supportPhone && (
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Phone:</span>{" "}
                  <a
                    href={`tel:${supportPhone.replace(/[^+\d]/g, "")}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {supportPhone}
                  </a>
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                We usually respond within one hour
              </p>
            </div>
          </div>
        </motion.div>

        {/* Reassurance Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600">
            ℹ️ Your booking has been reserved and is waiting for payment
            completion
          </p>
          <p className="text-xs text-gray-500 mt-1">
            No charges have been made to your account
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
