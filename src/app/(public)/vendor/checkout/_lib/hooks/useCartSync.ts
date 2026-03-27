/**
 * Cart Synchronization Hook
 * Detects mismatches between Zustand cart storage and API data
 * Clears both sides when data doesn't match
 */

import { useCallback } from "react";
import { useClearAllCart } from "@/services/customer/cart/query";
import type { GetCartResponse } from "@/services/customer/cart/type";
import { useCartEditStore } from "@/store/cart-edit.store";
import { CartSyncManager } from "../cart-sync-utils";

/**
 * Cart sync uses the same GET /customer/event data as the parent (e.g. CartManager).
 * Do not call useGetCartData() here — a second observer with enabled: true was
 * fetching for vendors and causing 403 + security logout on checkout/preview.
 */
export function useCartSync(apiCartData: GetCartResponse | undefined) {
  const { editingData, clearAllCarts } = useCartEditStore();
  const clearAllCartMutation = useClearAllCart();

  const syncCart = useCallback(async (eventSlug: string) => {
    if (!apiCartData?.data || !Array.isArray(apiCartData.data)) {
      return false;
    }

    const eventData = apiCartData.data[0];
    const zustandEventData = editingData[eventSlug];

    return await CartSyncManager.quickSyncCheck(
      eventData,
      zustandEventData,
      eventSlug,
      clearAllCartMutation,
      clearAllCarts
    );
  }, [apiCartData, editingData, clearAllCartMutation, clearAllCarts]);

  return { syncCart };
}
