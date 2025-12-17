/**
 * Cart Conflict Provider
 *
 * Provides cart conflict detection and resolution throughout the application.
 * This component should wrap the entire application or at least the event/checkout sections.
 */

"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  useCartConflict,
  UseCartConflictReturn,
  EventInfo,
} from "../_lib/hooks/useCartConflict";
import CartConflictModal from "./cart-conflict-modal";

// Create context for cart conflict management
const CartConflictContext = createContext<UseCartConflictReturn | null>(null);

interface CartConflictProviderProps {
  children: ReactNode;
}

export function CartConflictProvider({ children }: CartConflictProviderProps) {
  const cartConflict = useCartConflict();

  return (
    <CartConflictContext.Provider value={cartConflict}>
      {children}

      {/* Cart Conflict Modal - Always render when conflict info exists */}
      {cartConflict.conflictInfo && (
        <CartConflictModal
          isOpen={cartConflict.isConflictModalOpen}
          onClose={cartConflict.closeConflictModal}
          currentEvent={cartConflict.conflictInfo.currentEvent}
          newEvent={cartConflict.conflictInfo.newEvent}
          onReplaceCart={cartConflict.handleReplaceCart}
          onContinueWithCurrent={cartConflict.handleContinueWithCurrent}
          isProcessing={cartConflict.isProcessing}
        />
      )}
    </CartConflictContext.Provider>
  );
}

/**
 * Hook to use cart conflict functionality
 */
export function useCartConflictContext(): UseCartConflictReturn {
  const context = useContext(CartConflictContext);

  if (!context) {
    throw new Error(
      "useCartConflictContext must be used within a CartConflictProvider"
    );
  }

  return context;
}

/**
 * Utility function to check for cart conflicts before adding items
 * This can be used in event detail pages or anywhere items are added to cart
 */
export function useCartConflictCheck() {
  const { checkForConflict } = useCartConflictContext();

  /**
   * Check for conflicts and show modal if needed
   * Returns true if safe to proceed, false if conflict detected
   */
  const checkAndHandleConflict = (
    newEventSlug: string,
    newEventInfo: EventInfo
  ): boolean => {
    const hasConflict = checkForConflict(newEventSlug, newEventInfo);

    if (hasConflict) {
      // Conflict detected - modal will be shown automatically by the hook
      return false;
    }

    // No conflict - safe to proceed
    return true;
  };

  return { checkAndHandleConflict };
}
