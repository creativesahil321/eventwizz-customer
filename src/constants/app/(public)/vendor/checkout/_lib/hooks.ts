import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User } from "./types";

export function useCheckoutAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && status === "unauthenticated") {
      const currentUrl = window.location.href;
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
    } else if (isClient && status === "authenticated" && session?.user) {
      const user = session.user as User;
      const { account_type, active_role, token } = user;

      if (account_type !== "customer" || active_role !== "customer" || !token) {
        router.push("/unauthorized");
      }
    }
  }, [isClient, status, session, router]);

  const isAuthenticated = status === "authenticated";
  const isCustomer =
    isAuthenticated && session?.user
      ? (session.user as User).account_type === "customer" &&
        (session.user as User).active_role === "customer" &&
        !!(session.user as User).token
      : false;

  return {
    isClient,
    status,
    isAuthenticated,
    isCustomer,
  };
}
