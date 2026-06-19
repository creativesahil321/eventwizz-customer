/**
 * Cart Sync Middleware for Zustand (FUTURE USE)
 * Auto-runs cart synchronization on hydration to ensure multi-device consistency
 * Server is always the source of truth
 *
 * NOTE: This middleware is not currently used but kept for future implementation
 */

import { StateStorage } from "zustand/middleware";

/**
 * Cart Sync Middleware Configuration
 */
interface CartSyncMiddlewareConfig {
  // API function to fetch cart data
  fetchApiCart: (eventSlug: string) => Promise<unknown>;
  // Function to clear API cart
  clearApiCart: () => Promise<void>;
  // Function to clear Zustand cart
  clearZustandCart: () => void;
  // Function to set cart from API
  setFromApi: (apiData: unknown) => void;
  // Current event slug (must be synchronous for middleware)
  getCurrentEventSlug: () => string | null;
}

/**
 * Creates cart sync middleware that auto-runs on hydration
 *
 * NOTE: Currently disabled due to TypeScript complexity
 * Will be implemented in future version with proper async handling
 */
export function createCartSyncMiddleware() {
  console.warn(
    "createCartSyncMiddleware is not yet implemented. Use useCartSync hook instead."
  );

  // Return a simple pass-through storage for now
  return (baseStorage: StateStorage): StateStorage => {
    return baseStorage;
  };
}

/**
 * Multi-device safe cart sync function (DEPRECATED)
 * Use useCartSync hook from hooks/useCartSync.ts instead
 */
export async function syncCartWithServer(
  eventSlug: string,
  config: CartSyncMiddlewareConfig
) {
  console.warn(
    "syncCartWithServer is deprecated. Use useCartSync hook instead."
  );

  try {
    console.log("🔄 Syncing cart with server for", eventSlug);

    // Fetch API cart
    const apiData = await config.fetchApiCart(eventSlug);

    if (!apiData) {
      console.log("📭 No API cart data found");
      return;
    }

    // Get local cart data
    const localCartData =
      config.getCurrentEventSlug() === eventSlug
        ? JSON.parse(localStorage.getItem("cart-edit-storage") || "{}")
            .editingData?.[eventSlug]
        : null;

    if (!localCartData) {
      // No local cart → hydrate with server data
      console.log("📥 No local cart - hydrating with server data");
      config.setFromApi(apiData);
      return;
    }

    // For now, just log that sync would happen
    console.log("✅ Cart sync logic would be executed here");
  } catch (error) {
    console.error("❌ Cart sync failed:", error);
    // On error, clear local cart to avoid stale data
    config.clearZustandCart();
  }
}

/**
 * Hook for manual cart sync (DEPRECATED)
 * Use useCartSync from hooks/useCartSync.ts instead
 */
export function useManualCartSync() {
  console.warn(
    "useManualCartSync is deprecated. Use useCartSync from hooks/useCartSync.ts"
  );

  const syncCart = async (eventSlug: string) => {
    const config: CartSyncMiddlewareConfig = {
      fetchApiCart: async (slug: string) => {
        // This would be replaced with actual API call
        const response = await fetch(`/api/cart/${slug}`);
        return response.json();
      },
      clearApiCart: async () => {
        // This would be replaced with actual API call
        await fetch("/api/cart/clear", { method: "DELETE" });
      },
      clearZustandCart: () => {
        // Clear Zustand store
        localStorage.removeItem("cart-edit-storage");
      },
      setFromApi: (apiData: unknown) => {
        // Set cart data from API
        console.log("Setting cart from API:", apiData);
      },
      getCurrentEventSlug: (): string | null => {
        // Get current event slug from URL or state
        return window.location.pathname.split("/").pop() || null;
      },
    };

    return await syncCartWithServer(eventSlug, config);
  };

  return { syncCart };
}
