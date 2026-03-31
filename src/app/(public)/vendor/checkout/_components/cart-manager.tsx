"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  useGetCartData,
  useDeleteCartDate,
  useClearAllCart,
} from "@/services/customer/cart/query";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { useSession } from "next-auth/react";
import { ANIMATION_VARIANTS } from "../_lib/constants";
import {
  getAvailableDates,
  calculatePaymentAmounts,
  extractCurrentEventData,
  extractEventsFromApiResponse,
} from "../_lib/cart-calculations";
import { CART_METADATA_KEYS_SET } from "@/lib/constants/cart-meta-keys";

// New components
import DateAccordion from "./date-accordion";
import CartSkeletonLoader from "./cart-skeleton-loader";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useCartSync } from "../_lib/hooks/useCartSync";
import { useLocationSlug } from "../_lib/hooks/useLocationSlug";
import { generateEventBookingUrl } from "../_lib/utils/event-url";

// Component interfaces
type CartManagerProps = Record<string, never>;

export default function CartManager({}: CartManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const hasInitializedExpanded = useRef(false);
  const isPreviewMode = useIsPreviewMode();
  const { data: session } = useSession();
  // Removed unused selectedPaymentTypes state - payment types are managed in Zustand store

  // API data (read-only) - only fetch when user is authenticated as customer and not in preview mode
  const {
    data: apiCartData,
    isLoading: isLoadingCartData,
    isFetching: isFetchingCartData,
    error: cartError,
  } = useGetCartData(
    session?.user?.account_type === "customer" && !isPreviewMode,
  );

  // Edit store for temporary state
  const {
    initializeFromAPI,
    syncNewDatesFromAPI,
    getNewDatesFromAPI,
    getDateData,
    hasUnsavedChanges,
    editingData,
    removeDate,
    removeAllDates,
    clearAllCarts,
  } = useCartEditStore();

  // Drink selection store for cleanup
  const { setCurrentEvent } = useDrinkSelectionStore();

  // Cart synchronization
  const { syncCart } = useCartSync(apiCartData);

  // Delete mutations
  const deleteCartDateMutation = useDeleteCartDate();
  const clearAllCartMutation = useClearAllCart();

  // Automatically determine current event and date from API data
  const { currentEventSlug, currentEventApiData, firstDate } = useMemo(() => {
    return extractCurrentEventData(apiCartData);
  }, [apiCartData]);

  // Get location slug with fallback strategy
  const locationSlug = useLocationSlug();

  // Generate event booking URL (with #booking hash anchor)
  const eventDetailsUrl = useMemo(
    () => generateEventBookingUrl(locationSlug, currentEventSlug),
    [locationSlug, currentEventSlug],
  );

  // 🍷 DRINK CLEANUP: Set current event and auto-clear drinks if switching events
  useEffect(() => {
    if (currentEventSlug) {
      console.log(
        `🍷 Setting current event in drink store: ${currentEventSlug}`,
      );
      setCurrentEvent(currentEventSlug);
    }
  }, [currentEventSlug, setCurrentEvent]);

  // Initialize expanded dates when first date is available (only once on initial load)
  useEffect(() => {
    if (firstDate && !hasInitializedExpanded.current) {
      setExpandedDates(new Set([firstDate]));
      hasInitializedExpanded.current = true;
    }
    // Reset initialization flag if firstDate changes (new event loaded)
    if (!firstDate) {
      hasInitializedExpanded.current = false;
    }
  }, [firstDate]);

  // Cart synchronization check
  useEffect(() => {
    if (!currentEventSlug || !currentEventApiData) return;

    // Perform cart sync check
    syncCart(currentEventSlug).then((wasCleared) => {
      if (wasCleared) {
        console.log(
          "🔄 Cart data was cleared due to mismatches, reinitializing...",
        );
        // Cart was cleared, reinitialize from API
        setTimeout(() => {
          if (currentEventApiData) {
            initializeFromAPI(currentEventSlug, currentEventApiData);
          }
        }, 100);
      }
    });
  }, [currentEventSlug, currentEventApiData, syncCart, initializeFromAPI]);

  // 🔄 SYNC FIX: Enhanced cart synchronization with stale data cleanup
  useEffect(() => {
    if (!currentEventSlug) return;

    // Get current editing data from store to avoid dependency issues
    const currentEditingData = useCartEditStore.getState().editingData;

    // ⚠️ CRITICAL FIX: If API data is completely empty, clear ALL Zustand data
    if (!currentEventApiData || Object.keys(currentEventApiData).length === 0) {
      // Check if we have any stale Zustand data
      const hasStaleZustandData = Object.keys(currentEditingData).length > 0;

      if (hasStaleZustandData) {
        console.warn(
          "🚨 API cart is empty but Zustand has stale data. Clearing all Zustand cart data...",
        );
        clearAllCarts(); // Clear ALL events, not just current one
        return;
      }

      console.log("✅ Cart is empty (both API and Zustand)");
      return;
    }

    // If no data exists for this event, initialize it
    if (!currentEditingData[currentEventSlug]) {
      console.log("🔄 Initializing cart data from API for", currentEventSlug);
      initializeFromAPI(currentEventSlug, currentEventApiData);
    } else {
      // If data exists, sync any new dates that might have been added
      const newDates = getNewDatesFromAPI(
        currentEventSlug,
        currentEventApiData,
      );
      if (newDates.length > 0) {
        console.log(
          `🔄 Found ${newDates.length} new date(s) to sync:`,
          newDates,
        );
        syncNewDatesFromAPI(currentEventSlug, currentEventApiData);
      } else {
        console.log("✅ No new dates to sync");
      }

      // Check for removed dates that need to be cleaned up from Zustand
      const apiDates = Object.keys(currentEventApiData).filter(
        (key) => !CART_METADATA_KEYS_SET.has(key),
      );
      const zustandDates = Object.keys(currentEditingData[currentEventSlug]);
      const removedDates = zustandDates.filter(
        (date) => !apiDates.includes(date),
      );

      if (removedDates.length > 0) {
        console.log(
          `🗑️ Found ${removedDates.length} removed date(s) to clean up:`,
          removedDates,
        );
        removedDates.forEach((date) => {
          removeDate(currentEventSlug, date);
        });
      }
    }

    // 🧹 CLEANUP: Check for stale events in Zustand that don't exist in API
    const allApiEventSlugs = extractEventsFromApiResponse(apiCartData).map(
      (e) => e.event_slug,
    );
    const allZustandEventSlugs = Object.keys(currentEditingData);
    const staleEventSlugs = allZustandEventSlugs.filter(
      (slug) => !allApiEventSlugs.includes(slug),
    );

    if (staleEventSlugs.length > 0) {
      console.warn(
        `🗑️ Found ${staleEventSlugs.length} stale event(s) in Zustand:`,
        staleEventSlugs,
      );
      staleEventSlugs.forEach((slug) => {
        console.log(`🗑️ Removing stale event: ${slug}`);
        removeAllDates(slug);
      });
    }
  }, [
    currentEventApiData,
    currentEventSlug,
    apiCartData,
    initializeFromAPI,
    syncNewDatesFromAPI,
    getNewDatesFromAPI,
    removeAllDates,
    removeDate,
    clearAllCarts,
    // Removed editingData from dependencies to prevent infinite loop
  ]);

  // Get all available dates using shared utility (DRY principle)
  const availableDates = useMemo(() => {
    return getAvailableDates(currentEventApiData);
  }, [currentEventApiData]);

  // Initialize payment types for each date (simplified - payment types managed in Zustand)
  const initializedPaymentTypes = useMemo(() => {
    if (!currentEventApiData) return {};

    const newPaymentTypes: Record<string, "full" | "deposit"> = {};

    availableDates.forEach((date) => {
      // Default to "full" for all dates - actual payment types managed in Zustand store
      newPaymentTypes[date] = "full";
    });

    return newPaymentTypes;
  }, [currentEventApiData, availableDates]);

  // Calculate totals with payment breakdown and validation
  const { totalCartItems, unsavedDatesCount } = useMemo(() => {
    if (!currentEventSlug) {
      return {
        totalCartItems: 0,
        unsavedDatesCount: 0,
      };
    }

    let unsavedCount = 0;

    availableDates.forEach((date) => {
      const dateData = getDateData(currentEventSlug, date);
      if (dateData) {
        // Check for unsaved changes using both methods
        const hasChangesMethod1 = hasUnsavedChanges(currentEventSlug, date);
        const hasChangesMethod2 = dateData.hasChanges;

        if (hasChangesMethod1 || hasChangesMethod2) {
          unsavedCount++;
        }
      }
    });

    // Simple logging for debugging
    if (unsavedCount > 0) {
      console.log(`${unsavedCount} date(s) have unsaved changes`);
    }

    return {
      totalCartItems: availableDates.length, // Count dates as items
      unsavedDatesCount: unsavedCount,
    };
  }, [
    availableDates,
    editingData,
    getDateData,
    currentEventSlug,
    hasUnsavedChanges,
  ]);

  // Calculate payment amounts using per-date logic
  useMemo(() => {
    return calculatePaymentAmounts(
      currentEventApiData,
      initializedPaymentTypes,
      currentEventSlug ?? undefined,
      getDateData,
    );
  }, [
    currentEventApiData,
    initializedPaymentTypes,
    currentEventSlug,
    getDateData,
  ]);

  // Check if payment should be blocked (after all variables are defined)

  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  // Handle removing a specific date
  const handleRemoveDate = async (date: string) => {
    try {
      setIsProcessing(true);

      // Call API to delete the date
      await deleteCartDateMutation.mutateAsync(date);

      // Also remove from Zustand store immediately if we have current event
      if (currentEventSlug) {
        removeDate(currentEventSlug, date);
      }

      // Update expanded dates
      setExpandedDates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    } catch (error) {
      console.error("Error removing date:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle clearing all cart data
  const handleClearAllCart = async () => {
    try {
      setIsProcessing(true);

      // Call API to clear all cart data
      await clearAllCartMutation.mutateAsync();

      // Also clear Zustand store immediately
      clearAllCarts();

      // Reset expanded dates
      setExpandedDates(new Set());
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show skeleton only on initial load (no data yet). Keep current UI during background refetch (e.g. after autosave).
  const isInitialLoad = isLoadingCartData && !apiCartData;
  if (isInitialLoad) {
    return <CartSkeletonLoader />;
  }

  // Show error state with better UX
  if (cartError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingCart className="h-8 w-8 text-red-600" />
        </div>
        <div className="text-red-600 font-semibold mb-2">
          Unable to load cart data
        </div>
        <p className="text-gray-500 mb-4">
          There was an error loading your cart. Please try again.
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  // Check if cart is empty (only when not refetching)
  if (
    !isLoadingCartData &&
    !isFetchingCartData &&
    availableDates.length === 0
  ) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          Your cart is empty
        </h3>
        <p className="text-gray-500 mb-6">Add some items to get started</p>
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="mx-auto text-black"
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Cart Header */}
      <motion.div
        className="flex items-center justify-between flex-wrap gap-4"
        {...ANIMATION_VARIANTS.FADE_IN_UP}
      >
        <div className="flex items-center space-x-3">
          <ShoppingCart
            className="h-6 w-6"
            style={{ color: "var(--color-primary)" }}
          />
          <h2 className="text-2xl font-bold text-black">Your Cart</h2>
        </div>
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Add More Dates Button */}
          {eventDetailsUrl && currentEventSlug && (
            <Link href={eventDetailsUrl}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                style={{
                  borderColor: "var(--color-primary)",
                  color: "var(--color-primary)",
                }}
              >
                <CalendarPlus className="h-4 w-4" />
                <span>Add More Dates</span>
              </Button>
            </Link>
          )}
          <Badge variant="primary" className="px-3 py-1 text-white">
            {totalCartItems} {totalCartItems === 1 ? "item" : "items"}
          </Badge>
          {unsavedDatesCount > 0 && (
            <Badge
              variant="secondary"
              className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              {unsavedDatesCount} unsaved
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAllCart}
            disabled={isProcessing || clearAllCartMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            {clearAllCartMutation.isPending ? "Clearing..." : "Clear All"}
          </Button>
        </div>
      </motion.div>

      {/* Date Accordions */}
      <div className="space-y-4">
        {availableDates.length === 0 ? (
          <motion.div
            className="text-center py-12"
            {...ANIMATION_VARIANTS.FADE_IN_UP}
          >
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No event data available
            </h3>
            <p className="text-gray-500">
              Please select a date from the event page to add items to your cart
            </p>
          </motion.div>
        ) : (
          availableDates.map((date) => {
            const isExpanded = expandedDates.has(date);
            const dateData = currentEventSlug
              ? getDateData(currentEventSlug, date)
              : null;

            if (!dateData || !currentEventSlug) return null;

            return (
              <DateAccordion
                key={date}
                eventSlug={currentEventSlug}
                date={date}
                dateData={dateData}
                isExpanded={isExpanded}
                onToggle={() => toggleDateExpansion(date)}
                onRemoveDate={handleRemoveDate}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
