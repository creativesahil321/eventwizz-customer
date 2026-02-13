/**
 * Cart Synchronization Helper
 * 
 * Provides utility functions to manually sync cart data across all sources
 * (Database, TanStack Query cache, Zustand localStorage)
 * 
 * Use this when you need to force a full synchronization check.
 */

import { useCartEditStore } from "@/store/cart-edit.store";

/**
 * Check if cart data is synchronized across all sources
 * Returns detailed sync status
 */
export function checkCartSyncStatus(): {
  hasZustandData: boolean;
  zustandEventCount: number;
  zustandDateCount: number;
  zustandEvents: string[];
} {
  const { editingData } = useCartEditStore.getState();
  
  const zustandEvents = Object.keys(editingData);
  const zustandEventCount = zustandEvents.length;
  
  let zustandDateCount = 0;
  zustandEvents.forEach((eventSlug) => {
    zustandDateCount += Object.keys(editingData[eventSlug]).length;
  });

  return {
    hasZustandData: zustandEventCount > 0,
    zustandEventCount,
    zustandDateCount,
    zustandEvents,
  };
}

/**
 * Force clear all Zustand cart data
 * Useful for manual cleanup when sync is broken
 */
export function forceCleanZustandCart(): void {
  console.log("🧹 Force cleaning Zustand cart data...");
  const { clearAllCarts } = useCartEditStore.getState();
  clearAllCarts();
  console.log("✅ Zustand cart data cleared");
}

/**
 * Log current cart sync status for debugging
 */
export function logCartSyncStatus(): void {
  const status = checkCartSyncStatus();
  
  console.group("🔍 Cart Sync Status");
  console.log("Has Zustand Data:", status.hasZustandData);
  console.log("Zustand Events:", status.zustandEventCount);
  console.log("Zustand Dates:", status.zustandDateCount);
  console.log("Event Slugs:", status.zustandEvents);
  console.groupEnd();
}

/**
 * Detect and fix stale Zustand data when API is empty
 * Returns true if cleanup was performed
 */
export function detectAndFixStaleZustand(apiCartData: unknown): boolean {
  const status = checkCartSyncStatus();
  
  // Check if API is empty but Zustand has data
  const isApiEmpty = !apiCartData || 
    (typeof apiCartData === 'object' && 
     'data' in apiCartData && 
     Array.isArray(apiCartData.data) && 
     apiCartData.data.length === 0);
  
  if (isApiEmpty && status.hasZustandData) {
    console.warn("🚨 Stale Zustand data detected!");
    console.warn(`API is empty but Zustand has ${status.zustandEventCount} event(s) with ${status.zustandDateCount} date(s)`);
    
    forceCleanZustandCart();
    return true;
  }
  
  return false;
}
