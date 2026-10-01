"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { themeKeys, useThemeQuery } from "@/hooks/use-theme-query";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useAuthStore } from "@/store/auth.store";
import type { ThemeSchema } from "@/types/theme.types";
import { newsletterKeys } from "./queries";
import { getCustomerNewsletterStatus } from "./newsletter.service";
import { NEWSLETTER_STATUS_API_ENABLED } from "./config";

/** Last auth state the theme was refetched for (shared by all callers on the page). */
let lastNewsletterSyncKey = "";

/**
 * The SSR/guest theme has no `is_newsletter_subscribed`. When `active`, refetch
 * the theme query with the customer token (or without it after logout) so the
 * flag matches the session. Only the newsletter UI needs the flag, so callers
 * enable this when that UI is (about to be) on screen instead of on every page.
 *
 * No-op once NEWSLETTER_STATUS_API_ENABLED is true — the status endpoint
 * (fetched in useThemeNewsletterSubscription) supplies the flag instead.
 */
export function useSyncCustomerNewsletterFlag(active: boolean) {
  const queryClient = useQueryClient();
  const { domain, settings } = useDomain();
  const { data: themeData } = useThemeQuery(domain, settings);
  const isSessionChecked = useAuthStore((s) => s.isSessionChecked);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.account_type);

  useEffect(() => {
    if (NEWSLETTER_STATUS_API_ENABLED) return;
    if (!active || !isSessionChecked || !domain) return;

    const isCustomer = Boolean(isAuthenticated && accountType === "customer");
    const hasFlag = typeof themeData?.is_newsletter_subscribed === "boolean";
    if (isCustomer === hasFlag) return;

    const syncKey = `${isAuthenticated}:${accountType ?? ""}`;
    if (lastNewsletterSyncKey === syncKey) return;
    lastNewsletterSyncKey = syncKey;

    void queryClient.invalidateQueries({ queryKey: themeKeys.all });
  }, [
    active,
    isSessionChecked,
    isAuthenticated,
    accountType,
    domain,
    themeData?.is_newsletter_subscribed,
    queryClient,
  ]);
}

export function readCustomerNewsletterFromTheme(
  theme: Pick<ThemeSchema, "is_newsletter_subscribed"> | null | undefined,
) {
  const flag = theme?.is_newsletter_subscribed;
  return {
    isLoggedInCustomer: typeof flag === "boolean",
    isSubscribed: flag === true,
  };
}

/**
 * Customer subscription flag.
 *
 * - NEWSLETTER_STATUS_API_ENABLED === false: reads the flag from the existing
 *   theme-settings query (never fetches a separate endpoint).
 * - NEWSLETTER_STATUS_API_ENABLED === true: `isLoggedInCustomer` comes from the
 *   session and `isSubscribed` from the lightweight /customer/newsletter/status
 *   query, so the full theme is not refetched.
 *
 * Both query hooks are always called (React rules of hooks); the status query
 * stays dormant (`enabled: false`) until the flag is on.
 */
export function useThemeNewsletterSubscription() {
  const { domain, settings } = useDomain();
  const themeQuery = useThemeQuery(domain, settings);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.account_type);
  const isCustomerSession = Boolean(
    isAuthenticated && accountType === "customer",
  );

  const statusQuery = useQuery({
    queryKey: newsletterKeys.customerStatus(domain ?? ""),
    queryFn: getCustomerNewsletterStatus,
    enabled: NEWSLETTER_STATUS_API_ENABLED && isCustomerSession && !!domain,
    staleTime: 60 * 1000,
  });

  if (NEWSLETTER_STATUS_API_ENABLED) {
    return {
      isLoggedInCustomer: isCustomerSession,
      isSubscribed: statusQuery.data === true,
      isFetching: statusQuery.isFetching,
    };
  }

  const { isLoggedInCustomer, isSubscribed } = readCustomerNewsletterFromTheme(
    themeQuery.data,
  );
  return {
    isLoggedInCustomer,
    isSubscribed,
    isFetching: themeQuery.isFetching,
  };
}
