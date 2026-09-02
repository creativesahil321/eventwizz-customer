"use client";

import { useSession } from "next-auth/react";
import { useProfileData } from "@/app/(protected)/_shared/profile/_lib";

/**
 * Keeps GET /profile subscribed on every protected page (vendor/admin/customer).
 * Location switches invalidate ["profile"] and this active query refetches —
 * site_url, has_payment_provider, notification_stats stay location-fresh.
 */
export function GlobalProfileBootstrap() {
  const { data: session, status } = useSession();
  const accountType = session?.user?.account_type;
  const enabled =
    status === "authenticated" &&
    (accountType === "vendor" ||
      accountType === "admin" ||
      accountType === "customer");

  useProfileData({ enabled }, accountType ?? undefined);

  return null;
}
