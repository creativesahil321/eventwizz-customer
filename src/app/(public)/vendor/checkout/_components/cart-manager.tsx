"use client";

import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
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
import {
  getAvailableDates,
  extractCurrentEventData,
  extractEventsFromApiResponse,
  isRoomBasedCart,
  getCartRooms,
  getRoomDates,
  buildRoomDateKey,
  parseRoomDateKey,
  getAllRoomDateKeys,
  getApiCartDateKeys,
  getEventRoomCatalog,
  getTotalEventRoomCount,
  hasRoomsAvailableToAdd,
  getRoomDrinkTitle,
  calculateRoomSubtotal,
} from "../_lib/cart-calculations";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";
import DateAccordion from "./date-accordion";
import RoomTabSelector from "./room-tab-selector";
import CartSkeletonLoader from "./cart-skeleton-loader";
import { useCheckoutPaymentUiStore } from "@/store/checkout-payment-ui.store";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useCartSync } from "../_lib/hooks/useCartSync";
import { useLocationSlug } from "../_lib/hooks/useLocationSlug";
import { generateEventBookingUrl } from "../_lib/utils/event-url";
import type { ApiRoomCartData } from "@/lib/types/cart.types";

type CartManagerProps = Record<string, never>;

export default function CartManager({}: CartManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
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
    reconcileSavedDatesFromAPI,
    getNewDatesFromAPI,
    getDateData,
    editingData,
    removeDate,
    removeAllDates,
    clearAllCarts,
  } = useCartEditStore();

  const { setCurrentEvent } = useDrinkSelectionStore();
  const { syncCart } = useCartSync(apiCartData);
  const deleteCartDateMutation = useDeleteCartDate();
  const clearAllCartMutation = useClearAllCart();
  const { format: formatMoney } = useCurrencyFormat();

  const { currentEventSlug, currentEventApiData, firstDate } = useMemo(() => {
    return extractCurrentEventData(apiCartData);
  }, [apiCartData]);

  const locationSlug = useLocationSlug();

  const roomMode = useMemo(
    () => isRoomBasedCart(currentEventApiData),
    [currentEventApiData],
  );
  const rooms: ApiRoomCartData[] = useMemo(
    () => getCartRooms(currentEventApiData),
    [currentEventApiData],
  );

  // Full room list from GET /customer/event → event_rooms (no /domain/.../events call).
  const eventRoomCatalog = useMemo(
    () => getEventRoomCatalog(currentEventApiData),
    [currentEventApiData],
  );

  const showAddRoom = useMemo(
    () => hasRoomsAvailableToAdd(rooms, eventRoomCatalog),
    [rooms, eventRoomCatalog],
  );

  const totalEventRooms = useMemo(
    () => getTotalEventRoomCount(currentEventApiData),
    [currentEventApiData],
  );

  const drinkTitle = useMemo(
    () => getRoomDrinkTitle(currentEventApiData, activeRoomId),
    [currentEventApiData, activeRoomId],
  );

  const eventDetailsUrl = useMemo(
    () => generateEventBookingUrl(locationSlug, currentEventSlug),
    [locationSlug, currentEventSlug],
  );

  // Initialize active room to first room
  useEffect(() => {
    if (roomMode && rooms.length > 0 && activeRoomId === null) {
      setActiveRoomId(rooms[0].room_id);
    }
    if (!roomMode) {
      setActiveRoomId(null);
    }
  }, [roomMode, rooms, activeRoomId]);

  useEffect(() => {
    if (currentEventSlug) {
      setCurrentEvent(
        currentEventSlug,
        roomMode && activeRoomId != null ? activeRoomId : undefined,
      );
    }
  }, [currentEventSlug, roomMode, activeRoomId, setCurrentEvent]);

  // Room mode: dates collapsed by default. Flat mode: all expanded.
  useEffect(() => {
    if (firstDate && !hasInitializedExpanded.current) {
      if (roomMode) {
        setExpandedDates(new Set());
      } else {
        const allDates = currentEventApiData
          ? getAvailableDates(currentEventApiData)
          : [firstDate];
        setExpandedDates(new Set(allDates));
      }
      hasInitializedExpanded.current = true;
    }
    if (!firstDate && !(roomMode && rooms.length > 0)) {
      hasInitializedExpanded.current = false;
    }
  }, [firstDate, currentEventApiData, roomMode, rooms]);

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

  // Hydrate Zustand from GET cart-data before paint to avoid delayed summary UI.
  // Checkout saves use POST without invalidation — local edits stay authoritative.
  useLayoutEffect(() => {
    if (!currentEventSlug) return;
    const currentEditingData = useCartEditStore.getState().editingData;

    if (!currentEventApiData || Object.keys(currentEventApiData).length === 0) {
      const awaitingPayment =
        useCheckoutPaymentUiStore.getState().isAwaitingStripePayment;
      const hasStaleZustandData = Object.keys(currentEditingData).length > 0;
      if (hasStaleZustandData && !awaitingPayment) {
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

      reconcileSavedDatesFromAPI(currentEventSlug, currentEventApiData);

      const apiDates = getApiCartDateKeys(currentEventApiData);
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
    reconcileSavedDatesFromAPI,
    getNewDatesFromAPI,
    removeAllDates,
    removeDate,
    clearAllCarts,
  ]);

  const availableDates = useMemo(() => {
    if (roomMode && activeRoomId != null) {
      return getRoomDates(currentEventApiData, activeRoomId).map((d) =>
        buildRoomDateKey(activeRoomId, d),
      );
    }
    return getAvailableDates(currentEventApiData);
  }, [currentEventApiData, roomMode, activeRoomId]);

  const { totalCartItems } = useMemo(() => {
    if (!currentEventSlug) {
      return { totalCartItems: 0 };
    }
    if (roomMode) {
      return {
        totalCartItems: getAllRoomDateKeys(currentEventApiData).length,
      };
    }
    return { totalCartItems: availableDates.length };
  }, [availableDates, currentEventSlug, roomMode, currentEventApiData]);

  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => {
      if (roomMode) {
        return prev.has(date) ? new Set<string>() : new Set([date]);
      }
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const handleRoomChange = (roomId: number) => {
    setActiveRoomId(roomId);
    if (!currentEventApiData) return;
    const roomDates = getRoomDates(currentEventApiData, roomId).map((d) =>
      buildRoomDateKey(roomId, d),
    );
    setExpandedDates(roomDates.length > 0 ? new Set([roomDates[0]]) : new Set());
  };

  const roomSubtotals = useMemo(() => {
    if (!roomMode || !currentEventApiData) return {};
    const subtotals: Record<number, number> = {};
    for (const room of rooms) {
      subtotals[room.room_id] = calculateRoomSubtotal(
        currentEventApiData,
        room.room_id,
        currentEventSlug
          ? { eventSlug: currentEventSlug, getDateData }
          : undefined,
      );
    }
    return subtotals;
  }, [
    roomMode,
    currentEventApiData,
    rooms,
    currentEventSlug,
    getDateData,
    editingData,
  ]);

  const totalGuestsAcrossCart = useMemo(() => {
    if (!currentEventSlug || !currentEventApiData) return 0;
    const dateKeys = roomMode
      ? getAllRoomDateKeys(currentEventApiData)
      : getAvailableDates(currentEventApiData);
    return dateKeys.reduce((sum, dateKey) => {
      const dateData = getDateData(currentEventSlug, dateKey);
      if (!dateData) return sum;
      const fromPeople = dateData.peopleCount ?? 0;
      if (fromPeople > 0) return sum + fromPeople;
      return (
        sum +
        dateData.tables
          .filter((t) => t.quantity > 0)
          .reduce((tableSum, table) => {
            if (table.allocation?.length) {
              return (
                tableSum + table.allocation.reduce((guestSum, g) => guestSum + g, 0)
              );
            }
            return tableSum + (table.minPersons || 1) * table.quantity;
          }, 0)
      );
    }, 0);
  }, [currentEventSlug, currentEventApiData, roomMode, getDateData]);

  const handleRemoveDate = async (dateKey: string) => {
    try {
      setIsProcessing(true);
      const { roomId, date: eventDate } = parseRoomDateKey(dateKey);
      await deleteCartDateMutation.mutateAsync({
        eventDate,
        roomId: roomId ?? undefined,
        storeDateKey: dateKey,
      });
      if (currentEventSlug) {
        removeDate(currentEventSlug, dateKey);
      }
      setExpandedDates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(dateKey);
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

  const totalDatesAcrossRooms = roomMode
    ? getAllRoomDateKeys(currentEventApiData).length
    : totalCartItems;
  const activeRoom = rooms.find((r) => r.room_id === activeRoomId);
  const activeRoomIndex = Math.max(
    0,
    rooms.findIndex((r) => r.room_id === activeRoomId),
  );
  const bookingMetaLine = roomMode && rooms.length > 0
    ? `${totalEventRooms} ${totalEventRooms === 1 ? "room" : "rooms"} · ${totalDatesAcrossRooms} ${totalDatesAcrossRooms === 1 ? "date" : "dates"} · ${totalGuestsAcrossCart} total guests`
    : `${totalCartItems} ${totalCartItems === 1 ? "date" : "dates"}${totalGuestsAcrossCart > 0 ? ` · ${totalGuestsAcrossCart} guests` : ""}`;

  const bookingHeader = (
    <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--checkout-brand-accent)]">
          Your Booking
        </p>
        <h1 className="mt-1 text-lg font-extrabold tracking-tight text-[color:var(--checkout-brand-primary)] sm:text-2xl">
          {currentEventApiData?.event_name || "Your Booking"}
        </h1>
        <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[color:var(--checkout-muted-foreground)] sm:text-xs">
          {bookingMetaLine}
        </p>
      </div>

      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        {eventDetailsUrl && currentEventSlug && (
          <Link
            href={eventDetailsUrl}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--checkout-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--checkout-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)] sm:flex-none sm:px-4"
          >
            <CalendarPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">Add Dates</span>
          </Link>
        )}

        {showClearConfirm ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearAllCart}
              disabled={isProcessing || clearAllCartMutation.isPending}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              {clearAllCartMutation.isPending ? "Clearing..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="rounded-lg px-3 py-2 text-xs text-[color:var(--checkout-muted-foreground)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="rounded-lg border border-[color:var(--checkout-border)] bg-white p-2 text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-500"
            title="Clear cart"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const dateSections =
    availableDates.length === 0 ? (
      <div className="px-4 py-10 text-center sm:px-5">
        <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-gray-200" />
        <h3 className="mb-1 text-base font-semibold text-gray-700">
          No event data available
        </h3>
        <p className="text-sm text-gray-500">
          Select a date from the event page to add items to your cart
        </p>
      </div>
    ) : (
      availableDates.map((date, index) => {
        const isExpanded = expandedDates.has(date);
        const dateData = currentEventSlug
          ? getDateData(currentEventSlug, date)
          : null;

        if (!dateData || !currentEventSlug) return null;

        return (
          <div key={date}>
            <DateAccordion
              eventSlug={currentEventSlug}
              date={date}
              dateData={dateData}
              isExpanded={isExpanded}
              onToggle={() => toggleDateExpansion(date)}
              onRemoveDate={handleRemoveDate}
              roomId={roomMode ? (activeRoomId ?? undefined) : undefined}
              embedded={roomMode}
              roomAccentIndex={activeRoomIndex}
              drinkTitle={drinkTitle}
              serverEventData={currentEventApiData}
            />
          </div>
        );
      })
    );

  if (roomMode && rooms.length > 0 && activeRoomId != null && activeRoom) {
    return (
      <div className="space-y-4">
        {bookingHeader}

        <RoomTabSelector
          rooms={rooms}
          activeRoomId={activeRoomId}
          onRoomChange={handleRoomChange}
          roomSubtotals={roomSubtotals}
          showAddRoom={showAddRoom}
          addRoomUrl={eventDetailsUrl ?? undefined}
        />

        <div className="overflow-hidden rounded-2xl border border-[color:var(--checkout-border)] bg-white shadow-sm">
          <div className="divide-y divide-[color:var(--checkout-border)]">
            {dateSections}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookingHeader}
      <div className="space-y-3">{dateSections}</div>
    </div>
  );
}
