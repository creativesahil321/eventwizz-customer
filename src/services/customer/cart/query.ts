import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartService } from "./cart.service";
import { CartRequest, DeleteCartDateRequest } from "./type";
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
  });
};

/**
 * Hook for storing event booking data
 * Implements the flow: POST → Invalidate Cache → Clear Drink Storage → GET
 * 🔄 SYNC FIX: Ensures cache is properly refreshed after adding/updating cart
 */
export const useStoreEventBooking = () => {
  const queryClient = useQueryClient();
  const { clearDrinks } = useDrinkSelectionStore();

  return useMutation({
    mutationFn: (data: CartRequest) => cartService.storeEventBooking(data),
    onSuccess: (response, variables) => {
      // Only invalidate cache, no toasts (handled by components)
      if (response.status) {
        console.log("🧹 Store Event Booking - Synchronizing cache:");

        // Clear only the active event/room drink scope after successful submission
        console.log(
          "🧹 Clearing drink-selection-storage after successful cart submission"
        );
        clearDrinks({
          eventSlug: variables.slug,
          roomId: variables.room_id,
        });

        // Single refetch: invalidateQueries already refetches active observers (v5 default).
        // Do not also call refetchQueries — that caused duplicate GET /customer/event.
        void queryClient.invalidateQueries({ queryKey: ["cart-data"] });

        console.log("✅ Cache synchronized with backend");
      }
    },
    onError: (error: unknown) => {
      // Only log error, no toasts (handled by components)
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

      // 2️⃣ Clear TanStack Query cache to force refetch
      queryClient.removeQueries({ queryKey: ["cart-data"] });
      queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      console.log("✅ TanStack Query cache cleared");

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

      // 2️⃣ Clear TanStack Query cache (remove all cart-data queries)
      queryClient.removeQueries({ queryKey: ["cart-data"] });
      queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      console.log("✅ TanStack Query cache cleared");

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
