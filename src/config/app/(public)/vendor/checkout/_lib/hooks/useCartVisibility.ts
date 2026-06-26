"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useGetCartData } from "@/services/customer/cart/query";
import { summarizeCartDates } from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { reconcileLocalCartWithApi } from "@/lib/utils/cart-sync-helper";

type UseCartVisibilityOptions = {
  /** When omitted, fetches for authenticated customers outside preview mode. */
  enabled?: boolean;
};

/**
 * Shared cart visibility for header badge, cart button, and mobile nav.
 * Merges GET cart API data with persisted Zustand edit sessions.
 */
export function useCartVisibility(options: UseCartVisibilityOptions = {}) {
  const isPreviewMode = useIsPreviewMode();
  const { data: session } = useSession();

  const defaultEnabled =
    session?.user?.account_type === "customer" && !isPreviewMode;
  const enabled = options.enabled ?? defaultEnabled;

  const { data: apiCartData, isLoading } = useGetCartData(enabled);
  const editingData = useCartEditStore((state) => state.editingData);

  useEffect(() => {
    if (!enabled || isLoading || apiCartData === undefined) return;
    reconcileLocalCartWithApi(apiCartData);
  }, [enabled, isLoading, apiCartData]);

  const summary = useMemo(
    () => summarizeCartDates(isLoading ? null : apiCartData, editingData),
    [apiCartData, editingData, isLoading],
  );

  return {
    summary,
    hasItems: summary.hasItems,
    isLoading: enabled && isLoading,
    apiCartData,
  };
}
