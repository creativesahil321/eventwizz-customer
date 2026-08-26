"use client";

import { useThemeQuery } from "@/hooks/use-theme-query";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import type { ThemeSchema } from "@/types/theme.types";

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
