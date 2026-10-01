"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { themeKeys, useThemeQuery } from "@/hooks/use-theme-query";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useAuthStore } from "@/store/auth.store";
import type { ThemeSchema } from "@/types/theme.types";

/** Last auth state the theme was refetched for (shared by all callers on the page). */
let lastNewsletterSyncKey = "";

/**
 * The SSR/guest theme has no `is_newsletter_subscribed`. When `active`, refetch
 * the theme query with the customer token (or without it after logout) so the
 * flag matches the session. Only the newsletter UI needs the flag, so callers
 * enable this when that UI is (about to be) on screen instead of on every page.
 */
export function useSyncCustomerNewsletterFlag(active: boolean) {
  const queryClient = useQueryClient();
  const { domain, settings } = useDomain();
  const { data: themeData } = useThemeQuery(domain, settings);
  const isSessionChecked = useAuthStore((s) => s.isSessionChecked);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.account_type);

  useEffect(() => {
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

/** Reuses the existing theme-settings query. Never fetches GET /customer/newsletter. */
export function useThemeNewsletterSubscription() {
  const { domain, settings } = useDomain();
  const query = useThemeQuery(domain, settings);
  const { isLoggedInCustomer, isSubscribed } = readCustomerNewsletterFromTheme(
    query.data,
  );

  return {
    isLoggedInCustomer,
    isSubscribed,
    isFetching: query.isFetching,
  };
}
