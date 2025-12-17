import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartService } from "./cart.service";
import { CartRequest } from "./type";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";

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
 */
export const useStoreEventBooking = () => {
  const queryClient = useQueryClient();
  const { clearDrinks } = useDrinkSelectionStore();

  return useMutation({
    mutationFn: (data: CartRequest) => cartService.storeEventBooking(data),
    onSuccess: (response) => {
      // Only invalidate cache, no toasts (handled by components)
      if (response.status) {
        // Clear drink selection storage after successful submission
        console.log(
          "🧹 Clearing drink-selection-storage after successful cart submission"
        );
        clearDrinks();

        // Immediately invalidate and refetch cart data
        // This triggers the GET API to fetch updated cart data
        queryClient.invalidateQueries({ queryKey: ["cart-data"] });
        queryClient.refetchQueries({ queryKey: ["cart-data"] });
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
 */
export const useDeleteCartDate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (date: string) => cartService.deleteCartData(date),
    onSuccess: () => {
      // Invalidate and refetch cart data after deletion
      queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      queryClient.refetchQueries({ queryKey: ["cart-data"] });
    },
    onError: (error: unknown) => {
      console.error("Error deleting cart date:", error);
    },
  });
};

/**
 * Hook for clearing all cart data
 */
export const useClearAllCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.deleteCartData(""), // Empty string deletes all
    onSuccess: () => {
      // Invalidate and refetch cart data after clearing all
      queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      queryClient.refetchQueries({ queryKey: ["cart-data"] });
    },
    onError: (error: unknown) => {
      console.error("Error clearing all cart data:", error);
    },
  });
};
