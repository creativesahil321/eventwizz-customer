"use client";

import { useDomain } from "@/providers/domain-provider/domain-provider";
import CheckoutHeader from "./_components/checkout-header";
import CartManager from "./_components/cart-manager";
import { motion } from "framer-motion";
import { CheckoutPageProps } from "./_lib/types";
import { useCheckoutAuth } from "./_lib/hooks";
import { ANIMATION_VARIANTS, LOADING_MESSAGES } from "./_lib/constants";
import BookingSummary from "./_components/booking-summary";

export default function CheckoutPage({}: CheckoutPageProps) {
  const { settings, isLoading: isDomainLoading } = useDomain();
  const { isClient, status, isAuthenticated, isCustomer } = useCheckoutAuth();

  // Centralized loading component
  const LoadingScreen = ({
    message,
    color = "blue",
  }: {
    message: string;
    color?: "blue" | "red";
  }) => (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
      <div className="text-center">
        <div className="relative mx-auto h-12 w-12 mb-4">
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              color === "red"
                ? "border-red-100"
                : "border-blue-100"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-full border-2 border-t-transparent animate-spin ${
              color === "red"
                ? "border-red-500"
                : "border-blue-500"
            }`}
          />
        </div>
        <p className="text-sm text-gray-500 font-medium">{message}</p>
      </div>
    </div>
  );

  if (!isClient || isDomainLoading || status === "loading") {
    return <LoadingScreen message={LOADING_MESSAGES.LOADING_CHECKOUT} />;
  }

  if (status === "unauthenticated") {
    return <LoadingScreen message={LOADING_MESSAGES.REDIRECTING_LOGIN} />;
  }

  if (isClient && isAuthenticated && !isCustomer) {
    return (
      <LoadingScreen
        message={LOADING_MESSAGES.REDIRECTING_UNAUTHORIZED}
        color="red"
      />
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-[#FAFBFC]"
      {...ANIMATION_VARIANTS.FADE_IN_UP}
    >
      {/* Header */}
      <CheckoutHeader settings={settings || undefined} />

      {/* Main Content - 2-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Main content area — tickets/tables/drinks */}
          <div className="lg:col-span-7 xl:col-span-8">
            <CartManager />
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-5 xl:col-span-4">
            <BookingSummary />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
