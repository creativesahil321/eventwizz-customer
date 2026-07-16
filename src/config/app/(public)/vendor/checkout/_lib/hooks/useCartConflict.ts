/**
 * Cart Conflict Management Hook
 *
 * Handles cart conflict detection and resolution when users try to add
 * items from different events to their cart.
 *
 * Event switch uses store-only replace: POST /customer/event/store replaces
 * other events on the backend — no delete API before store.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useGetCartData } from "@/services/customer/cart/query";
import {
  countEventCartDates,
  extractEventsFromApiResponse,
} from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
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

/** Pending store (or add) to run when the user confirms replace — no delete first. */
export type CartReplaceAction = () => void | Promise<void>;

export interface UseCartConflictReturn {
  // State
  isConflictModalOpen: boolean;
  conflictInfo: CartConflictInfo | null;
  isProcessing: boolean;

  // Actions
  checkForConflict: (
    newEventSlug: string,
    newEventInfo: EventInfo,
    onConfirmReplace?: CartReplaceAction,
  ) => boolean;
  openConflictModal: (conflictInfo: CartConflictInfo) => void;
  closeConflictModal: () => void;
  handleReplaceCart: () => void;
  handleContinueWithCurrent: () => void;
}

export function useCartConflict(): UseCartConflictReturn {
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<CartConflictInfo | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingReplaceActionRef = useRef<CartReplaceAction | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPreviewMode = useIsPreviewMode();
  const { getCurrentCartEventSlug, editingData } = useCartEditStore();

  // Get cart data from API for accurate conflict detection (only for authenticated customers and not in preview mode)
  const { data: apiCartData } = useGetCartData(
    session?.user?.account_type === "customer" && !isPreviewMode,
  );

  const rememberPendingReplace = useCallback(
    (onConfirmReplace?: CartReplaceAction) => {
      pendingReplaceActionRef.current = onConfirmReplace ?? null;
    },
    [],
  );

  const clearConflictState = useCallback(() => {
    setIsConflictModalOpen(false);
    setConflictInfo(null);
    pendingReplaceActionRef.current = null;
  }, []);

  /**
   * Check if adding items from a new event would create a conflict
   */
  const checkForConflict = useCallback(
    (
      newEventSlug: string,
      newEventInfo: EventInfo,
      onConfirmReplace?: CartReplaceAction,
    ): boolean => {
      // Check API data first (most reliable)
      const apiEvents = extractEventsFromApiResponse(apiCartData);
      if (apiEvents.length > 0) {
        const currentEvent = apiEvents[0];
        const currentEventSlug = currentEvent.event_slug;

        // No conflict if it's the same event (normalize both slugs for comparison)
        const normalizedCurrentSlug = decodeURIComponent(currentEventSlug);
        const normalizedNewSlug = decodeURIComponent(newEventSlug);

        if (normalizedCurrentSlug === normalizedNewSlug) {
          return false;
        }

        // Conflict detected - different event already in cart
        const dateCount = countEventCartDates(currentEvent);

        const conflict: CartConflictInfo = {
          currentEvent: {
            name: currentEvent.event_name,
            slug: currentEventSlug,
            image: currentEvent.event_image,
            dateCount,
          },
          newEvent: newEventInfo,
        };

        rememberPendingReplace(onConfirmReplace);
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

      rememberPendingReplace(onConfirmReplace);
      setConflictInfo(conflict);
      setIsConflictModalOpen(true);
      return true;
    },
    [apiCartData, getCurrentCartEventSlug, editingData, rememberPendingReplace],
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
      clearConflictState();
    }
  }, [isProcessing, clearConflictState]);

  /**
   * Replace cart with the new event via store only (backend removes other events).
   * Prefer the pending store action from the blocked add; otherwise navigate to the event.
   */
  const handleReplaceCart = useCallback(async () => {
    if (!conflictInfo) return;

    setIsProcessing(true);

    try {
      const pendingReplace = pendingReplaceActionRef.current;

      if (pendingReplace) {
        // Store-only replace — no delete. Cart cache refreshes after successful store.
        await pendingReplace();
        clearConflictState();
        return;
      }

      // No pending store (e.g. resolve-from-warning): go to the new event;
      // the next POST /event/store will replace other events on the backend.
      toast.info(
        `Select a date to switch your cart to ${conflictInfo.newEvent.name}`,
        { duration: 3000 },
      );

      clearConflictState();

      const pathSegments = pathname.split("/");
      const locationSlug = pathSegments[1];
      router.push(`/${locationSlug}/events/${conflictInfo.newEvent.slug}`);
    } catch (error) {
      console.error("Error replacing cart with new event:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [conflictInfo, router, pathname, clearConflictState]);

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
        },
      );

      clearConflictState();

      router.push("/vendor/checkout");
    } catch (error) {
      console.error("Error redirecting to checkout:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [conflictInfo, router, clearConflictState]);

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
