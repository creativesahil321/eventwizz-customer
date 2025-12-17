/**
 * Multi-Device Cart Synchronization Example
 * Demonstrates how to handle cart sync across devices
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCartEditStore } from "@/store/cart-edit.store";
import {
  useGetCartData,
  useClearAllCart,
} from "@/services/customer/cart/query";
import { CartSyncDetector, CartSyncManager } from "../cart-sync-utils";

/**
 * Example: Multi-Device Sync Handler
 *
 * This function demonstrates the complete flow for syncing cart data
 * when a user switches devices or when the app loads.
 */
export async function syncCartWithServer(eventSlug: string) {
  const cartStore = useCartEditStore.getState();

  try {
    console.log("🔄 Starting multi-device cart sync for", eventSlug);

    // 1. Fetch API cart (server is source of truth)
    const response = await fetch(`/api/customer/event?slug=${eventSlug}`);
    const apiCart = await response.json();

    if (
      !apiCart?.data ||
      !Array.isArray(apiCart.data) ||
      apiCart.data.length === 0
    ) {
      console.log("📭 No API cart data found");
      return;
    }

    const apiEventData = apiCart.data[0];

    // 2. Get local cart data
    const localCartData = cartStore.editingData[eventSlug];

    if (!localCartData) {
      // No local cart → hydrate with server data
      console.log("📥 No local cart - hydrating with server data");
      cartStore.setFromApi(eventSlug, apiEventData);
      return;
    }

    // 3. Check for mismatches
    const mismatchInfo = CartSyncDetector.detectMismatches(
      apiEventData,
      localCartData,
      eventSlug
    );

    // 4. Log mismatches for debugging
    CartSyncDetector.logMismatches(mismatchInfo, eventSlug);

    if (CartSyncDetector.shouldClearCart(mismatchInfo)) {
      console.warn(
        "🧹 Cart mismatch detected - clearing local and syncing with server"
      );

      // Clear both sides
      await fetch("/api/customer/event/delete/all", { method: "DELETE" });
      cartStore.clearAllCarts();

      // Set fresh data from API
      cartStore.setFromApi(eventSlug, apiEventData);

      console.log("✅ Cart cleared and synced with server");
    } else {
      console.log("✅ Cart data is in sync");
    }
  } catch (error) {
    console.error("❌ Cart sync failed:", error);
    // On error, clear local cart to avoid stale data
    cartStore.clearAllCarts();
  }
}

/**
 * Example: React Hook for Cart Sync (DEPRECATED)
 * Use the main useCartSync hook from hooks/useCartSync.ts instead
 */
export function useCartSyncExample() {
  console.warn(
    "useCartSyncExample is deprecated. Use useCartSync from hooks/useCartSync.ts"
  );

  const { data: apiCartData } = useGetCartData();
  const { editingData, clearAllCarts, setFromApi } = useCartEditStore();
  const clearAllCartMutation = useClearAllCart();

  const syncCart = async (eventSlug: string) => {
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
  };

  return { syncCart };
}

/**
 * Example: Component Integration
 */
export function CartSyncComponent({ eventSlug }: { eventSlug: string }) {
  const { syncCart } = useCartSyncExample();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const wasCleared = await syncCart(eventSlug);
      if (wasCleared) {
        toast.success("Cart synced with latest data");
      } else {
        toast.info("Cart is already up to date");
      }
    } catch (error) {
      toast.error("Failed to sync cart");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleManualSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
    >
      {isSyncing ? "Syncing..." : "Sync Cart"}
    </Button>
  );
}

/**
 * Example: Auto-sync on App Load
 */
export function useAutoCartSync(eventSlug: string) {
  const { syncCart } = useCartSyncExample();
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    if (!hasSynced && eventSlug) {
      syncCart(eventSlug).then((wasCleared) => {
        if (wasCleared) {
          console.log("🔄 Cart auto-synced on app load");
        }
        setHasSynced(true);
      });
    }
  }, [eventSlug, syncCart, hasSynced]);

  return { hasSynced };
}

/**
 * Example: Multi-Device Scenarios
 */

// Scenario 1: User adds items on Device A, then switches to Device B
export const scenario1 = `
Device A: User adds table for 10 people
├── Local storage: { tables: [{ id: 124, quantity: 1, allocation: [10] }] }
├── API: { tables: [{ id: 124, no_tables: 1, allocation: [10] }] }
└── ✅ Sync: No mismatch, continue normally

Device B: User opens app
├── Local storage: {} (empty)
├── API: { tables: [{ id: 124, no_tables: 1, allocation: [10] }] }
└── 📥 Action: Hydrate local storage with API data
`;

// Scenario 2: User modifies cart on Device B, then returns to Device A
export const scenario2 = `
Device B: User changes table allocation from 10 to 15 people
├── Local storage: { tables: [{ id: 124, quantity: 1, allocation: [15] }] }
├── API: { tables: [{ id: 124, no_tables: 1, allocation: [15] }] }
└── ✅ Sync: No mismatch, continue normally

Device A: User opens app (stale data)
├── Local storage: { tables: [{ id: 124, quantity: 1, allocation: [10] }] }
├── API: { tables: [{ id: 124, no_tables: 1, allocation: [15] }] }
└── 🧹 Action: Clear local storage, hydrate with API data
`;

// Scenario 3: User adds different items on different devices
export const scenario3 = `
Device A: User adds table for 10 people
├── Local storage: { tables: [{ id: 124, quantity: 1, allocation: [10] }] }
├── API: { tables: [{ id: 124, no_tables: 1, allocation: [10] }] }

Device B: User adds VIP ticket
├── Local storage: { tickets: [{ id: 185, quantity: 1 }] }
├── API: { tables: [{ id: 124, no_tables: 1, allocation: [10] }], tickets: [{ id: 185, quantity: 1 }] }

Device A: User opens app (stale data)
├── Local storage: { tables: [{ id: 124, quantity: 1, allocation: [10] }] }
├── API: { tables: [{ id: 124, no_tables: 1, allocation: [10] }], tickets: [{ id: 185, quantity: 1 }] }
└── 🧹 Action: Clear local storage, hydrate with API data (now includes both table and ticket)
`;

/**
 * Example: Error Handling
 */
export const errorHandlingExample = `
Error Scenarios:
├── Network failure during sync
│   └── 🧹 Action: Clear local cart to avoid stale data
├── API returns invalid data
│   └── 🧹 Action: Clear local cart, show error message
├── Local storage corruption
│   └── 🧹 Action: Clear local cart, reinitialize from API
└── Server returns empty cart
    └── 📥 Action: Clear local cart, show empty cart state
`;

/**
 * Key Benefits of This Approach:
 *
 * 1. **Server Always Wins**: Server is the single source of truth
 * 2. **Multi-Device Consistency**: All devices sync to the same state
 * 3. **Stale Data Prevention**: Local cache is cleared when outdated
 * 4. **Simple Logic**: No complex merging - just clear and reload
 * 5. **Error Recovery**: Failed syncs clear local data to prevent corruption
 * 6. **User Experience**: Seamless sync with clear feedback
 */
