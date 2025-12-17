/**
 * Cart Synchronization Hook
 * Detects mismatches between Zustand cart storage and API data
 * Clears both sides when data doesn't match
 */

import { useCallback } from 'react';
import { useGetCartData, useClearAllCart } from '@/services/customer/cart/query';
import { useCartEditStore } from '@/store/cart-edit.store';
import { CartSyncManager } from '../cart-sync-utils';

/**
 * Hook for cart synchronization
 */
export function useCartSync() {
  const { data: apiCartData } = useGetCartData();
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
