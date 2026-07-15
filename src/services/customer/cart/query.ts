import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { cartService } from "./cart.service";
import {
  CartRequest,
  DeleteCartDateRequest,
  StoreEventBookingInput,
} from "./type";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useCartEditStore } from "@/store/cart-edit.store";

/**
 * Hook for fetching event checkout data
 * Note: Currently using getCartData since fetchCartData doesn't exist
 */
export const useCheckoutData = (eventSlug: string, eventDate: string) => {
  return useQuery({
    queryKey: ["checkout-data", eventSlug, eventDate],
    queryFn: () => cartService.getCartData(),
    enabled: !!eventSlug && !!eventDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook for fetching all cart data
 */
export const useGetCartData = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["cart-data"],
    queryFn: () => cartService.getCartData(),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    // Keep cart visible during background refetch (e.g. after delete) — avoids full-page skeleton flash.
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for storing event booking data.
 *
 * Sync strategy:
 * - Checkout edits: POST only (skipInvalidation) — Zustand stays authoritative.
 * - Event preview / add-to-cart: POST + GET refetch to hydrate checkout.
 */
export const useStoreEventBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StoreEventBookingInput | CartRequest) => {
      const payload = "data" in input ? input.data : input;
      return cartService.storeEventBooking(payload);
    },
    onSuccess: (response, input) => {
      if (!response.status) return;

      const skipInvalidation =
        "data" in input ? Boolean(input.skipInvalidation) : false;
      const variables: CartRequest = "data" in input ? input.data : input;
      const storedSlug = decodeURIComponent(variables.slug);

      useDrinkSelectionStore.getState().clearDrinks({
        eventSlug: variables.slug,
        roomId: variables.room_id,
      });

      // Backend store replaces other events — drop stale local carts immediately
      // so checkout doesn't keep the previous event's active room / dates.
      const { editingData, removeAllDates } = useCartEditStore.getState();
      Object.keys(editingData).forEach((eventSlug) => {
        if (decodeURIComponent(eventSlug) !== storedSlug) {
          removeAllDates(eventSlug);
        }
      });

      if (!skipInvalidation) {
        void queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      }
    },
    onError: (error: unknown) => {
      console.error("Error storing cart data:", error);
    },
  });
};

/**
 * Hook for deleting cart data for a specific date
 * 🔄 SYNC FIX: Ensures all three sources are synchronized
 */
export const useDeleteCartDate = () => {
  const queryClient = useQueryClient();
  const { removeDate, getCurrentEventSlug } = useCartEditStore();

  return useMutation({
    mutationFn: (params: DeleteCartDateRequest) =>
      cartService.deleteCartData(params),
    onSuccess: (_, params) => {
      console.log(
        `🧹 Delete Cart Date (${params.storeDateKey}) - Synchronizing all sources:`,
      );

      // 1️⃣ Delete from database (already done by mutation)
      console.log("✅ Database cleared");

      // 2️⃣ Soft refetch — keep cached cart visible while syncing (no skeleton flash)
      void queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      console.log("✅ TanStack Query cache invalidated");

      // 3️⃣ Remove from Zustand store
      const currentEventSlug = getCurrentEventSlug();
      if (currentEventSlug) {
        removeDate(currentEventSlug, params.storeDateKey);
        console.log("✅ Zustand localStorage cleared");
      }

      console.log("🎉 Cart date deleted and all sources synchronized");
    },
    onError: (error: unknown) => {
      console.error("Error deleting cart date:", error);
    },
  });
};

/**
 * Hook for clearing all cart data
 * 🔄 SYNC FIX: Ensures all three sources are cleared (DB, API cache, Zustand)
 */
export const useClearAllCart = () => {
  const queryClient = useQueryClient();
  const { clearAllCarts } = useCartEditStore();

  return useMutation({
    mutationFn: () => cartService.deleteCartData("all"),
    onSuccess: () => {
      console.log("🧹 Clear All Cart - Synchronizing all sources:");

      // 1️⃣ Clear database (already done by mutation)
      console.log("✅ Database cleared");

      // 2️⃣ Soft refetch — keep UI stable while syncing
      void queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      console.log("✅ TanStack Query cache invalidated");

      // 3️⃣ Clear Zustand localStorage
      clearAllCarts();
      console.log("✅ Zustand localStorage cleared");

      console.log("🎉 All cart data sources synchronized and cleared");
    },
    onError: (error: unknown) => {
      console.error("Error clearing all cart data:", error);
    },
  });
};
