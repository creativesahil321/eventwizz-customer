/**
 * Cart Synchronization Helper
 * 
 * Provides utility functions to manually sync cart data across all sources
 * (Database, TanStack Query cache, Zustand localStorage)
 * 
 * Use this when you need to force a full synchronization check.
 */

import { useCartEditStore } from "@/store/cart-edit.store";
import {
  countDatesInEventCart,
  extractEventsFromApiResponse,
  isApiCartResponseEmpty,
} from "@/app/(public)/vendor/checkout/_lib/cart-calculations";

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
  const { clearAllCarts, pruneEmptyCartDates } = useCartEditStore.getState();

  pruneEmptyCartDates();

  const { editingData } = useCartEditStore.getState();
  const eventsArray = extractEventsFromApiResponse(apiCartData);
  const apiCartDates = eventsArray.reduce(
    (sum, event) => sum + countDatesInEventCart(event),
    0,
  );

  const zustandCartDates = Object.values(editingData).reduce(
    (sum, eventDates) => sum + Object.keys(eventDates).length,
    0,
  );

  const isApiEmpty = isApiCartResponseEmpty(apiCartData);

  if (isApiEmpty && zustandCartDates > 0) {
    console.warn("🚨 Stale Zustand cart detected — API empty but local has data");
    clearAllCarts();
    return true;
  }

  if (isApiEmpty && Object.keys(editingData).length > 0) {
    console.warn("🚨 Stale Zustand cart detected — API empty but local events remain");
    clearAllCarts();
    return true;
  }

  if (apiCartDates === 0 && zustandCartDates === 0) {
    return Object.keys(editingData).length === 0;
  }

  return false;
}

/** Sync local cart-edit storage with GET /customer/event (call after fetch settles). */
export function reconcileLocalCartWithApi(apiCartData: unknown): boolean {
  return detectAndFixStaleZustand(apiCartData);
}
