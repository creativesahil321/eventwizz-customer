"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { saveAuthCallbackUrl } from "@/lib/auth/safe-callback-url";
import { vendorPaymentSuccessHref } from "./url";

type PaymentSuccessAuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Customer-only gate for the payment success receipt.
 * Login return URL is booking_number only — never amount / verified / intent ids.
 */
export function usePaymentSuccessAuth(
  bookingNumber: string | null,
  requireAuth = false,
) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSessionChecked = useAuthStore((s) => s.isSessionChecked);
  const accountType = useAuthStore((s) => s.account_type);
  const activeRole = useAuthStore((s) => s.active_role);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const status: PaymentSuccessAuthStatus = useMemo(() => {
    if (!isSessionChecked) return "loading";
    return isAuthenticated ? "authenticated" : "unauthenticated";
  }, [isSessionChecked, isAuthenticated]);

  const isCustomer =
    isAuthenticated &&
    accountType === "customer" &&
    activeRole === "customer" &&
    !!token;

  useEffect(() => {
    if (!isClient || !isSessionChecked) return;
    if (!bookingNumber && !requireAuth) return;

    if (!isAuthenticated) {
      const returnTo = bookingNumber
        ? vendorPaymentSuccessHref(bookingNumber)
        : `${window.location.pathname}${window.location.search}`;
      saveAuthCallbackUrl(returnTo);
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (!isCustomer) {
      router.push("/unauthorized");
    }
  }, [
    isClient,
    isSessionChecked,
    isAuthenticated,
    isCustomer,
    bookingNumber,
    requireAuth,
    router,
  ]);

  return {
    isClient,
    status,
    isCustomer,
  };
}
