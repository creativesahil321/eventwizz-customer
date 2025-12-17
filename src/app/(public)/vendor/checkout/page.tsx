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

  // No URL parameters needed - CartManager will determine current cart state from API data

  // Centralized loading component for better maintainability
  const LoadingScreen = ({
    message,
    color = "blue",
  }: {
    message: string;
    color?: "blue" | "red";
  }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div
          className={`animate-spin rounded-full h-32 w-32 border-b-2 border-${color}-600 mx-auto`}
        ></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );

  // Show loading while checking authentication and domain
  if (!isClient || isDomainLoading || status === "loading") {
    return <LoadingScreen message={LOADING_MESSAGES.LOADING_CHECKOUT} />;
  }

  // Show loading while redirecting to login
  if (status === "unauthenticated") {
    return <LoadingScreen message={LOADING_MESSAGES.REDIRECTING_LOGIN} />;
  }

  // Check if user is authorized (customer with valid token)
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
      className="min-h-screen bg-gray-50"
      {...ANIMATION_VARIANTS.FADE_IN_UP}
    >
      {/* Header */}
      <CheckoutHeader settings={settings || undefined} />

      {/* Main Content - Restore Original 2-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Manager - Takes 2/3 of the space (LEFT SIDE) */}
          <div className="lg:col-span-2">
            <CartManager />
          </div>

          {/* Booking Summary - Takes 1/3 of the space (RIGHT SIDE) */}
          <div className="lg:col-span-1">
            <BookingSummary />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
