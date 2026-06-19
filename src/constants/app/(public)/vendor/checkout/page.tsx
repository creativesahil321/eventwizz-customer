"use client";

import { useEffect } from "react";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import CheckoutHeader from "./_components/checkout-header";
import CartManager from "./_components/cart-manager";
import { CheckoutPageProps } from "./_lib/types";
import { useCheckoutAuth } from "./_lib/hooks";
import { LOADING_MESSAGES } from "./_lib/constants";
import BookingSummary from "./_components/booking-summary";
import { preconnectStripeJs, preloadStripeModule } from "@/lib/stripe/stripe-loader";
import "./checkout-theme.css";

export default function CheckoutPage({}: CheckoutPageProps) {
  const { settings, isLoading: isDomainLoading } = useDomain();
  const { isClient, status, isAuthenticated, isCustomer } = useCheckoutAuth();

  useEffect(() => {
    preconnectStripeJs();
    preloadStripeModule();
  }, []);

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
    <div className="checkout-page min-h-screen">
      <CheckoutHeader settings={settings || undefined} />

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
          <div className="min-w-0 pb-[var(--checkout-mobile-bar-offset)] lg:col-span-8 lg:pb-0">
            <CartManager />
          </div>

          <aside className="min-w-0 lg:col-span-4">
            <BookingSummary />
          </aside>
        </div>
      </div>
    </div>
  );
}
