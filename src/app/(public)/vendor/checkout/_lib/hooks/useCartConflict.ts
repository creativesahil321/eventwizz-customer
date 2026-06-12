/**
 * Cart Conflict Management Hook
 *
 * Handles cart conflict detection and resolution when users try to add
 * items from different events to their cart.
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useCartEditStore } from "@/store/cart-edit.store";
import {
  useClearAllCart,
  useGetCartData,
} from "@/services/customer/cart/query";
import { countEventCartDates } from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { useIsPreviewMode } from "@/contexts/preview-context";

export interface EventInfo {
  name: string;
  slug: string;
  image?: string;
}

export interface CartConflictInfo {
  currentEvent: EventInfo & { dateCount: number };
  newEvent: EventInfo;
}

export interface UseCartConflictReturn {
  // State
  isConflictModalOpen: boolean;
  conflictInfo: CartConflictInfo | null;
  isProcessing: boolean;

  // Actions
  checkForConflict: (newEventSlug: string, newEventInfo: EventInfo) => boolean;
  openConflictModal: (conflictInfo: CartConflictInfo) => void;
  closeConflictModal: () => void;
  handleReplaceCart: () => void;
  handleContinueWithCurrent: () => void;
}

export function useCartConflict(): UseCartConflictReturn {
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<CartConflictInfo | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPreviewMode = useIsPreviewMode();
  const { getCurrentCartEventSlug, clearAllCarts, editingData } =
    useCartEditStore();
  const clearAllCartMutation = useClearAllCart();

  // Get cart data from API for accurate conflict detection (only for authenticated customers and not in preview mode)
  const { data: apiCartData } = useGetCartData(
    session?.user?.account_type === "customer" && !isPreviewMode
  );

  /**
   * Check if adding items from a new event would create a conflict
   */
  const checkForConflict = useCallback(
    (newEventSlug: string, newEventInfo: EventInfo): boolean => {
      // Check API data first (most reliable)
      if (
        apiCartData?.data &&
        Array.isArray(apiCartData.data) &&
        apiCartData.data.length > 0
      ) {
        const currentEvent = apiCartData.data[0];
        const currentEventSlug = currentEvent.event_slug;

        // No conflict if it's the same event (normalize both slugs for comparison)
        const normalizedCurrentSlug = decodeURIComponent(currentEventSlug);
        const normalizedNewSlug = decodeURIComponent(newEventSlug);

        if (normalizedCurrentSlug === normalizedNewSlug) {
          return false;
        }

        // Conflict detected - different event already in cart
        const dateCount = countEventCartDates(currentEvent);

        // Create conflict info for the modal
        const conflict: CartConflictInfo = {
          currentEvent: {
            name: currentEvent.event_name,
            slug: currentEventSlug,
            image: currentEvent.event_image,
            dateCount,
          },
          newEvent: newEventInfo,
        };

        setConflictInfo(conflict);
        setIsConflictModalOpen(true);
        return true; // TRUE means conflict detected
      }

      // Fallback to localStorage data if API data not available
      const currentCartEventSlug = getCurrentCartEventSlug();

      // No conflict if cart is empty
      if (!currentCartEventSlug) {
        return false;
      }

      // No conflict if it's the same event (normalize both slugs for comparison)
      const normalizedCurrentSlug = decodeURIComponent(currentCartEventSlug);
      const normalizedNewSlug = decodeURIComponent(newEventSlug);

      if (normalizedCurrentSlug === normalizedNewSlug) {
        return false;
      }

      // Conflict detected - different event already in cart
      const currentEventData = editingData[currentCartEventSlug];
      const dateCount = currentEventData
        ? Object.keys(currentEventData).length
        : 0;

      // Create conflict info for the modal
      const conflict: CartConflictInfo = {
        currentEvent: {
          name: currentCartEventSlug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          slug: currentCartEventSlug,
          dateCount,
        },
        newEvent: newEventInfo,
      };

      setConflictInfo(conflict);
      setIsConflictModalOpen(true);
      return true;
    },
    [apiCartData, getCurrentCartEventSlug, editingData]
  );

  /**
   * Open the conflict resolution modal
   */
  const openConflictModal = useCallback((conflict: CartConflictInfo) => {
    setConflictInfo(conflict);
    setIsConflictModalOpen(true);
  }, []);

  /**
   * Close the conflict resolution modal
   */
  const closeConflictModal = useCallback(() => {
    if (!isProcessing) {
      setIsConflictModalOpen(false);
      setConflictInfo(null);
    }
  }, [isProcessing]);

  /**
   * Handle replacing the current cart with the new event
   */
  const handleReplaceCart = useCallback(async () => {
    if (!conflictInfo) return;

    setIsProcessing(true);

    try {
      // Clear all cart data from both API and Zustand store
      await clearAllCartMutation.mutateAsync();
      clearAllCarts();

      toast.success(
        `Cart cleared! You can now add items from ${conflictInfo.newEvent.name}`,
        {
          duration: 3000,
        }
      );

      // Close modal and redirect to new event
      setIsConflictModalOpen(false);
      setConflictInfo(null);

      // Redirect to the new event page
      // Extract location from current pathname (e.g., /ewell/events/divesh-wedding -> ewell)
      const pathSegments = pathname.split("/");
      const locationSlug = pathSegments[1]; // Get the location slug from current path
      router.push(`/${locationSlug}/events/${conflictInfo.newEvent.slug}`);
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [conflictInfo, clearAllCartMutation, clearAllCarts, router, pathname]);

  /**
   * Handle continuing with the current cart (redirect to checkout)
   */
  const handleContinueWithCurrent = useCallback(async () => {
    if (!conflictInfo) return;

    setIsProcessing(true);

    try {
      toast.info(
        `Continuing with ${conflictInfo.currentEvent.name}. Redirecting to checkout...`,
        {
          duration: 2000,
        }
      );

      // Close modal
      setIsConflictModalOpen(false);
      setConflictInfo(null);

      // Redirect to simple checkout page
      router.push("/vendor/checkout");
    } catch (error) {
      console.error("Error redirecting to checkout:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [conflictInfo, router]);

  return {
    // State
    isConflictModalOpen,
    conflictInfo,
    isProcessing,

    // Actions
    checkForConflict,
    openConflictModal,
    closeConflictModal,
    handleReplaceCart,
    handleContinueWithCurrent,
  };
}
