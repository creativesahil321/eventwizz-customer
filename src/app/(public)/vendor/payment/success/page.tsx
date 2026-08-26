"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCustomerBookingsList } from "@/services/customer/bookings/query";
import {
  CheckCircle,
  Calendar,
  MapPin,
  Users,
  Clock,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { saveAuthCallbackUrl } from "@/lib/auth/safe-callback-url";
import {
  confirmStripePaymentBackup,
  fetchPaymentSuccessReceipt,
  type PaymentSuccessReceipt,
} from "@/services/customer/payment/payment-success";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { usePaymentSuccessAuth } from "./_lib/use-payment-success-auth";
import {
  stripVendorPaymentSuccessQuery,
  vendorPaymentSuccessHref,
} from "./_lib/url";

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 8;

type PageView =
  | { type: "loading"; message: string }
  | { type: "success"; data: PaymentSuccessReceipt }
  | { type: "pending" }
  | { type: "not_found" }
  | { type: "error" };

function InvalidateCustomerBookingsOnMount() {
  const queryClient = useQueryClient();
  useEffect(() => {
    void invalidateCustomerBookingsList(queryClient);
  }, [queryClient]);
  return null;
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function isFailedRedirect(status: string | null): boolean {
  return status === "failed" || status === "canceled" || status === "cancelled";
}

function formatTransactionId(id: string): string {
  if (id.length <= 24) return id;
  return `${id.substring(0, 24)}...`;
}

function PaymentSuccessSkeleton({
  message = "Processing your payment...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <Skeleton className="mx-auto mb-4 h-20 w-20 rounded-full" />
          <Skeleton className="mx-auto mb-3 h-9 w-64" />
          <p className="text-gray-600 font-medium">{message}</p>
          <p className="text-sm text-gray-500 mt-2">Please wait</p>
        </div>
        <Card className="mb-6 shadow-lg border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-12 w-48 rounded-md" />
      </div>
    </div>
  );
}

function PaymentSuccessContent() {
  const { format: formatMoney } = useCurrencyFormat();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingNumber = searchParams.get("booking_number")?.trim() || null;
  const sessionId = searchParams.get("session_id")?.trim() || null;
  const { isClient, status, isCustomer } = usePaymentSuccessAuth(
    bookingNumber,
    Boolean(bookingNumber || sessionId),
  );

  const [view, setView] = useState<PageView>({
    type: "loading",
    message: "Processing your payment...",
  });

  useEffect(() => {
    if (!isClient || status === "loading") return;

    if (!bookingNumber && !sessionId) {
      setView({ type: "error" });
      return;
    }

    if (status === "unauthenticated" || !isCustomer) {
      setView({
        type: "loading",
        message: "Processing your payment...",
      });
      return;
    }

    const redirectFailed = isFailedRedirect(
      searchParams.get("redirect_status"),
    );
    const bookingId = parsePositiveInt(searchParams.get("booking_id"));
    const paymentIntentId =
      searchParams.get("payment_intent_id") ??
      searchParams.get("payment_intent");
    const checkoutSessionId = searchParams.get("checkout_session_id");

    let cancelled = false;
    let attempts = 0;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let lookupNumber = bookingNumber;

    const applyResult = async (): Promise<void> => {
      if (cancelled || !lookupNumber) return;

      const result = await fetchPaymentSuccessReceipt(lookupNumber);
      if (cancelled) return;

      if (result.kind === "paid") {
        stripVendorPaymentSuccessQuery(result.data.booking_number);
        setView({ type: "success", data: result.data });
        return;
      }

      if (result.kind === "not_found") {
        setView({ type: "not_found" });
        return;
      }

      if (result.kind === "unauthorized") {
        const returnTo = vendorPaymentSuccessHref(lookupNumber);
        saveAuthCallbackUrl(returnTo);
        return;
      }

      if (result.kind === "pending") {
        if (redirectFailed) {
          setView({ type: "error" });
          return;
        }

        attempts += 1;
        if (attempts >= POLL_MAX_ATTEMPTS) {
          setView({ type: "pending" });
          return;
        }

        setView({
          type: "loading",
          message: "Confirming your payment...",
        });
        pollTimer = setTimeout(() => {
          void applyResult();
        }, POLL_INTERVAL_MS);
        return;
      }

      setView({ type: "error" });
    };

    const run = async () => {
      setView({
        type: "loading",
        message: "Processing your payment...",
      });

      if (!redirectFailed) {
        const confirmedNumber = await confirmStripePaymentBackup({
          bookingId,
          paymentIntentId,
          checkoutSessionId,
          sessionId,
        });
        if (!lookupNumber && confirmedNumber) {
          lookupNumber = confirmedNumber;
        }
      }

      if (cancelled) return;

      if (!lookupNumber) {
        setView({ type: "error" });
        return;
      }

      await applyResult();
    };

    void run();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [isClient, status, isCustomer, bookingNumber, sessionId, searchParams]);

  if (view.type === "not_found") {
    notFound();
  }

  if (
    !isClient ||
    status === "loading" ||
    ((bookingNumber || sessionId) &&
      (status === "unauthenticated" || !isCustomer)) ||
    view.type === "loading"
  ) {
    return (
      <PaymentSuccessSkeleton
        message={
          view.type === "loading"
            ? view.message
            : "Processing your payment..."
        }
      />
    );
  }

  if (view.type === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Confirming your payment
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We&apos;re still confirming this payment with your bank. This can
            take a moment. You can refresh this page or check your bookings —
            you will not be charged again.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button
              variant="outline"
              onClick={() => router.push("/customer/bookings")}
            >
              View bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view.type === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Payment not confirmed
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We couldn&apos;t confirm this payment. If money was taken from your
            account, contact support with your booking reference. Do not pay
            again until this is resolved.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/customer/bookings")}
            >
              View bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view.type !== "success") {
    return null;
  }

  const paymentData = view.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <InvalidateCustomerBookingsOnMount />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
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
                    <span>Booking Number</span>
                  </div>
                  <p className="font-bold text-xl text-gray-900">
                    {paymentData.booking_number}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <CreditCard className="h-4 w-4" />
                    <span>Amount Paid</span>
                  </div>
                  <p className="font-bold text-xl text-green-600">
                    {formatMoney(paymentData.amount)}
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
                      {formatTransactionId(paymentData.transaction_id)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
                              paymentData.event_date,
                            ).toLocaleDateString("en-GB", {
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

                  {paymentData.guest_count ? (
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
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

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
                    You can view and manage your booking anytime in your
                    dashboard
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-8"
        >
          <Button
            variant="event-primary"
            onClick={() => router.push("/customer/bookings")}
            className="w-full sm:w-auto"
          >
            View My Bookings
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>

        <Separator className="my-6" />

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
    <Suspense fallback={<PaymentSuccessSkeleton />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
