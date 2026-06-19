import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

type CheckoutAuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Checkout auth gate — uses Zustand auth store (synced from NextAuth via
 * SessionValidator) instead of calling useSession() directly.
 *
 * Avoids "[next-auth]: useSession must be wrapped in SessionProvider" crashes
 * during SSR / post-payment navigations where the NextAuth context can be
 * temporarily unavailable even though the root layout provides SessionProvider.
 */
export function useCheckoutAuth() {
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

  const status: CheckoutAuthStatus = useMemo(() => {
    if (!isSessionChecked) return "loading";
    return isAuthenticated ? "authenticated" : "unauthenticated";
  }, [isSessionChecked, isAuthenticated]);

  useEffect(() => {
    if (!isClient || !isSessionChecked) return;

    if (!isAuthenticated) {
      const currentUrl = window.location.href;
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }

    if (accountType !== "customer" || activeRole !== "customer" || !token) {
      router.push("/unauthorized");
    }
  }, [
    isClient,
    isSessionChecked,
    isAuthenticated,
    accountType,
    activeRole,
    token,
    router,
  ]);

  const isCustomer =
    isAuthenticated &&
    accountType === "customer" &&
    activeRole === "customer" &&
    !!token;

  return {
    isClient,
    status,
    isAuthenticated,
    isCustomer,
  };
}
