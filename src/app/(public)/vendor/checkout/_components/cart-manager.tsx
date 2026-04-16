"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  CalendarPlus,
  MapPin,
  Calendar,
  Trash2,
  MoreHorizontal,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

import DateAccordion from "./date-accordion";
import CartSkeletonLoader from "./cart-skeleton-loader";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useCartSync } from "../_lib/hooks/useCartSync";
import { useLocationSlug } from "../_lib/hooks/useLocationSlug";
import { generateEventBookingUrl } from "../_lib/utils/event-url";
import { addCacheBusting } from "@/lib/image-utils";
import { format } from "date-fns";

type CartManagerProps = Record<string, never>;

export default function CartManager({}: CartManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const hasInitializedExpanded = useRef(false);
  const isPreviewMode = useIsPreviewMode();
  const { data: session } = useSession();

  const {
    data: apiCartData,
    isLoading: isLoadingCartData,
    isFetching: isFetchingCartData,
    error: cartError,
  } = useGetCartData(
    session?.user?.account_type === "customer" && !isPreviewMode,
  );

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

  const { setCurrentEvent } = useDrinkSelectionStore();
  const { syncCart } = useCartSync(apiCartData);
  const deleteCartDateMutation = useDeleteCartDate();
  const clearAllCartMutation = useClearAllCart();

  const { currentEventSlug, currentEventApiData, firstDate } = useMemo(() => {
    return extractCurrentEventData(apiCartData);
  }, [apiCartData]);

  const locationSlug = useLocationSlug();

  const eventDetailsUrl = useMemo(
    () => generateEventBookingUrl(locationSlug, currentEventSlug),
    [locationSlug, currentEventSlug],
  );

  useEffect(() => {
    if (currentEventSlug) {
      setCurrentEvent(currentEventSlug);
    }
  }, [currentEventSlug, setCurrentEvent]);

  // Initialize all dates as expanded (no accordion collapse by default)
  useEffect(() => {
    if (firstDate && !hasInitializedExpanded.current) {
      // Expand ALL dates by default for the new design
      const allDates = currentEventApiData
        ? getAvailableDates(currentEventApiData)
        : [firstDate];
      setExpandedDates(new Set(allDates));
      hasInitializedExpanded.current = true;
    }
    if (!firstDate) {
      hasInitializedExpanded.current = false;
    }
  }, [firstDate, currentEventApiData]);

  // Cart synchronization check
  useEffect(() => {
    if (!currentEventSlug || !currentEventApiData) return;
    syncCart(currentEventSlug).then((wasCleared) => {
      if (wasCleared) {
        setTimeout(() => {
          if (currentEventApiData) {
            initializeFromAPI(currentEventSlug, currentEventApiData);
          }
        }, 100);
      }
    });
  }, [currentEventSlug, currentEventApiData, syncCart, initializeFromAPI]);

  // Sync Zustand with API
  useEffect(() => {
    if (!currentEventSlug) return;
    const currentEditingData = useCartEditStore.getState().editingData;

    if (!currentEventApiData || Object.keys(currentEventApiData).length === 0) {
      const hasStaleZustandData = Object.keys(currentEditingData).length > 0;
      if (hasStaleZustandData) {
        clearAllCarts();
        return;
      }
      return;
    }

    if (!currentEditingData[currentEventSlug]) {
      initializeFromAPI(currentEventSlug, currentEventApiData);
    } else {
      const newDates = getNewDatesFromAPI(currentEventSlug, currentEventApiData);
      if (newDates.length > 0) {
        syncNewDatesFromAPI(currentEventSlug, currentEventApiData);
      }

      const apiDates = Object.keys(currentEventApiData).filter(
        (key) => !CART_METADATA_KEYS_SET.has(key),
      );
      const zustandDates = Object.keys(currentEditingData[currentEventSlug]);
      const removedDates = zustandDates.filter(
        (date) => !apiDates.includes(date),
      );

      if (removedDates.length > 0) {
        removedDates.forEach((date) => {
          removeDate(currentEventSlug, date);
        });
      }
    }

    const allApiEventSlugs = extractEventsFromApiResponse(apiCartData).map(
      (e) => e.event_slug,
    );
    const allZustandEventSlugs = Object.keys(currentEditingData);
    const staleEventSlugs = allZustandEventSlugs.filter(
      (slug) => !allApiEventSlugs.includes(slug),
    );

    if (staleEventSlugs.length > 0) {
      staleEventSlugs.forEach((slug) => {
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
  ]);

  const availableDates = useMemo(() => {
    return getAvailableDates(currentEventApiData);
  }, [currentEventApiData]);

  const initializedPaymentTypes = useMemo(() => {
    if (!currentEventApiData) return {};
    const newPaymentTypes: Record<string, "full" | "deposit"> = {};
    availableDates.forEach((date) => {
      newPaymentTypes[date] = "full";
    });
    return newPaymentTypes;
  }, [currentEventApiData, availableDates]);

  const { totalCartItems } = useMemo(() => {
    if (!currentEventSlug) {
      return { totalCartItems: 0 };
    }
    return { totalCartItems: availableDates.length };
  }, [availableDates, currentEventSlug]);

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

  const handleRemoveDate = async (date: string) => {
    try {
      setIsProcessing(true);
      await deleteCartDateMutation.mutateAsync(date);
      if (currentEventSlug) {
        removeDate(currentEventSlug, date);
      }
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

  const handleClearAllCart = async () => {
    try {
      setIsProcessing(true);
      await clearAllCartMutation.mutateAsync();
      clearAllCarts();
      setExpandedDates(new Set());
      setShowClearConfirm(false);
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show skeleton only on initial load
  const isInitialLoad = isLoadingCartData && !apiCartData;
  if (isInitialLoad) {
    return <CartSkeletonLoader />;
  }

  if (cartError) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <ShoppingCart className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Unable to load your cart
        </h3>
        <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
          Something went wrong while loading your cart. Please try refreshing.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-5 h-10 text-sm font-medium"
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  // Empty cart
  if (!isLoadingCartData && !isFetchingCartData && availableDates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center mb-5">
          <ShoppingCart className="h-7 w-7 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1.5">
          Your cart is empty
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          Browse events to find tickets, tables, and packages to add to your cart.
        </p>
        <Button
          onClick={() => window.history.back()}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 h-10 text-sm font-medium shadow-sm"
        >
          Browse Events
        </Button>
      </div>
    );
  }

  // Format date range for header
  const formatDateRange = () => {
    if (availableDates.length === 0) return "";
    try {
      if (availableDates.length === 1) {
        return format(new Date(availableDates[0]), "EEE, MMM d, yyyy");
      }
      const first = format(new Date(availableDates[0]), "MMM d");
      const last = format(
        new Date(availableDates[availableDates.length - 1]),
        "MMM d, yyyy",
      );
      return `${first} — ${last}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Event Context Bar — not a hero card */}
      <motion.div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        {...ANIMATION_VARIANTS.FADE_IN_UP}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Compact Event Image */}
          {currentEventApiData?.event_image && (
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={addCacheBusting(currentEventApiData.event_image)}
                alt={currentEventApiData?.event_name || "Event"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )}

          {/* Event Info — condensed */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-gray-900 truncate leading-tight">
              {currentEventApiData?.event_name || "Your Booking"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {formatDateRange() && (
                <span className="text-xs text-gray-500 truncate">
                  {formatDateRange()}
                </span>
              )}
              {totalCartItems > 1 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs font-medium text-blue-600">
                    {totalCartItems} dates
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions — compact */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {eventDetailsUrl && currentEventSlug && (
              <Link href={eventDetailsUrl}>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 rounded-lg h-8 text-xs font-medium"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Add Dates
                </Button>
              </Link>
            )}

            {/* Clear all — overflow menu style */}
            <div className="relative">
              {showClearConfirm ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllCart}
                    disabled={isProcessing || clearAllCartMutation.isPending}
                    className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg h-8 text-xs"
                  >
                    {clearAllCartMutation.isPending ? "Clearing..." : "Confirm"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowClearConfirm(false)}
                    className="rounded-lg h-8 text-xs text-gray-500"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Clear cart"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Date Sections — always expanded, no accordion collapse */}
      <div className="space-y-4">
        {availableDates.length === 0 ? (
          <motion.div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center"
            {...ANIMATION_VARIANTS.FADE_IN_UP}
          >
            <ShoppingCart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              No event data available
            </h3>
            <p className="text-sm text-gray-500">
              Select a date from the event page to add items to your cart
            </p>
          </motion.div>
        ) : (
          availableDates.map((date, index) => {
            const isExpanded = expandedDates.has(date);
            const dateData = currentEventSlug
              ? getDateData(currentEventSlug, date)
              : null;

            if (!dateData || !currentEventSlug) return null;

            return (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <DateAccordion
                  eventSlug={currentEventSlug}
                  date={date}
                  dateData={dateData}
                  isExpanded={isExpanded}
                  onToggle={() => toggleDateExpansion(date)}
                  onRemoveDate={handleRemoveDate}
                />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
