"use client";

import { useEffect } from "react";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import CheckoutHeader from "./_components/checkout-header";
import CartManager from "./_components/cart-manager";
import { CheckoutPageProps, type CheckoutHeaderProps } from "./_lib/types";
import { useCheckoutAuth } from "./_lib/hooks";
import { useResumePendingBooking } from "./_lib/hooks/use-resume-pending-booking";
import BookingSummary from "./_components/booking-summary";
import CartSkeletonLoader from "./_components/cart-skeleton-loader";
import BookingSummarySkeleton from "./_components/booking-summary-skeleton-loader";
import { preconnectStripeJs, preloadStripeModule } from "@/lib/stripe/stripe-loader";
import "./checkout-theme.css";

function CheckoutBootSkeleton({
  settings,
}: {
  settings: CheckoutHeaderProps["settings"];
}) {
  return (
    <div className="checkout-page min-h-screen">
      <CheckoutHeader settings={settings} />
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
          <div className="min-w-0 pb-[var(--checkout-mobile-bar-offset)] lg:col-span-8 lg:pb-0">
            <CartSkeletonLoader />
          </div>
          <aside className="min-w-0 lg:col-span-4">
            <BookingSummarySkeleton />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage({}: CheckoutPageProps) {
  const { settings, isLoading: isDomainLoading } = useDomain();
  const { isClient, status, isAuthenticated, isCustomer } = useCheckoutAuth();
  const { isResuming } = useResumePendingBooking(isCustomer);

  useEffect(() => {
    preconnectStripeJs();
    preloadStripeModule();
  }, []);

  if (
    !isClient ||
    isDomainLoading ||
    status === "loading" ||
    isResuming ||
    status === "unauthenticated" ||
    (isClient && isAuthenticated && !isCustomer)
  ) {
    return <CheckoutBootSkeleton settings={settings || undefined} />;
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
