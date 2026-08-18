"use client";

import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingCart,
  CalendarPlus,
  MapPin,
  Calendar,
  Trash2,
  MoreHorizontal,
  Package,
  Loader2,
  Plus,
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
  isApiCartResponseEmpty,
  isRoomBasedCart,
  getCartRooms,
  getRoomDates,
  buildRoomDateKey,
  parseRoomDateKey,
  getAllRoomDateKeys,
  getApiCartDateKeys,
  getEventRoomCatalog,
  hasRoomsAvailableToAdd,
  getRoomDrinkTitle,
  calculateRoomSubtotal,
  getDateGuestCount,
  getApiDateDiscount,
  calculateEditableDateDiscountableTotal,
  calculateEditableDateTablesTotal,
  computeDateDiscountAmount,
  isDateDiscountEligible,
  isFlatPerPersonDateDiscount,
  getDateDiscountMinPeople,
} from "../_lib/cart-calculations";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";
import DateAccordion from "./date-accordion";
import RoomTabSelector from "./room-tab-selector";
import CartSkeletonLoader from "./cart-skeleton-loader";
import { useCheckoutPaymentUiStore } from "@/store/checkout-payment-ui.store";
import { useCheckoutPromoStore } from "@/store/checkout-promo.store";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { isCheckoutCouponApplied } from "./checkout-promo-panel";
import { useCartSync } from "../_lib/hooks/useCartSync";
import { useLocationSlug } from "../_lib/hooks/useLocationSlug";
import { generateEventBookingUrl } from "../_lib/utils/event-url";
import {
  checkoutDateDomId,
  subscribeCheckoutDateFocus,
} from "../_lib/checkout-date-focus";
import { hasRemainingDatesToAdd } from "../_lib/remaining-dates";
import { useEventDetail } from "@/app/(public)/[locationSlug]/events/[eventSlug]/_lib/hooks";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import type { ApiRoomCartData } from "@/lib/types/cart.types";

type CartManagerProps = Record<string, never>;

export default function CartManager({}: CartManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [removingDateKey, setRemovingDateKey] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const hasInitializedExpanded = useRef(false);
  const hasLoadedCartRef = useRef(false);
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
  const queryClient = useQueryClient();
  const { format: formatMoney } = useCurrencyFormat();
  const couponCode = useCheckoutPromoStore((s) => s.couponCode);

  const { currentEventSlug, currentEventApiData, firstDate } = useMemo(() => {
    return extractCurrentEventData(apiCartData);
  }, [apiCartData]);

  // Coupon replaces date offers — only one discount applies per booking.
  const couponReplacesDateOffers = isCheckoutCouponApplied(
    { couponCode },
    currentEventApiData?.coupon ?? null,
  );

  const locationSlug = useLocationSlug();
  const { domain } = useDomain();

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

  const drinkTitle = useMemo(
    () => getRoomDrinkTitle(currentEventApiData, activeRoomId),
    [currentEventApiData, activeRoomId],
  );

  // Public event detail (often cached from the event page) — used to know
  // which bookable dates still remain for Add Dates visibility.
  const { data: eventDetailResponse } = useEventDetail(
    currentEventSlug ?? "",
    domain ?? "",
  );
  const eventDetail = eventDetailResponse?.data ?? null;

  // Add room stays unscoped; Add Dates deep-links the active checkout room.
  const eventDetailsUrl = useMemo(
    () => generateEventBookingUrl(locationSlug, currentEventSlug),
    [locationSlug, currentEventSlug],
  );

  const addDatesUrl = useMemo(
    () =>
      generateEventBookingUrl(
        locationSlug,
        currentEventSlug,
        roomMode ? activeRoomId : null,
      ),
    [locationSlug, currentEventSlug, roomMode, activeRoomId],
  );

  const showAddDates = useMemo(() => {
    if (!addDatesUrl || !currentEventSlug) return false;
    return hasRemainingDatesToAdd({
      eventDetail,
      cartEventData: currentEventApiData,
      roomId: roomMode ? activeRoomId : null,
      getLocalDateData: (date) => {
        const storeKey =
          roomMode && activeRoomId != null
            ? buildRoomDateKey(activeRoomId, date)
            : date;
        return getDateData(currentEventSlug, storeKey);
      },
    });
  }, [
    addDatesUrl,
    currentEventSlug,
    eventDetail,
    currentEventApiData,
    roomMode,
    activeRoomId,
    getDateData,
    editingData,
  ]);

  // Keep active room valid for the current cart event (reset after event replace).
  useEffect(() => {
    if (!roomMode) {
      setActiveRoomId(null);
      return;
    }
    if (rooms.length === 0) {
      setActiveRoomId(null);
      return;
    }
    const activeStillValid = rooms.some((room) => room.room_id === activeRoomId);
    if (activeRoomId == null || !activeStillValid) {
      setActiveRoomId(rooms[0].room_id);
    }
  }, [roomMode, rooms, activeRoomId, currentEventSlug]);

  useEffect(() => {
    if (currentEventSlug) {
      setCurrentEvent(
        currentEventSlug,
        roomMode && activeRoomId != null ? activeRoomId : undefined,
      );
    }
  }, [currentEventSlug, roomMode, activeRoomId, setCurrentEvent]);

  // Flat mode: expand all dates. Room mode: keep multi-date collapsed,
  // but open the only date when a room has just one.
  // Reset when the cart event changes (e.g. store-only replace).
  useEffect(() => {
    hasInitializedExpanded.current = false;
    setExpandedDates(new Set());
  }, [currentEventSlug]);

  // Offers panel → expand + scroll to the matching date accordion.
  useEffect(() => {
    return subscribeCheckoutDateFocus((dateKey) => {
      const { roomId } = parseRoomDateKey(dateKey);
      if (roomId != null && roomId !== activeRoomId) {
        setActiveRoomId(roomId);
      }

      setExpandedDates((prev) => {
        if (roomMode) return new Set([dateKey]);
        const next = new Set(prev);
        next.add(dateKey);
        return next;
      });

      window.setTimeout(() => {
        const el = document.getElementById(checkoutDateDomId(dateKey));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, roomId != null && roomId !== activeRoomId ? 80 : 40);
    });
  }, [activeRoomId, roomMode]);

  useEffect(() => {
    if (!firstDate) {
      if (!(roomMode && rooms.length > 0)) {
        hasInitializedExpanded.current = false;
      }
      return;
    }
    if (hasInitializedExpanded.current) return;

    if (roomMode) {
      const roomId = activeRoomId ?? rooms[0]?.room_id ?? null;
      if (roomId == null || !currentEventApiData) return;

      const roomDates = getRoomDates(currentEventApiData, roomId).map((d) =>
        buildRoomDateKey(roomId, d),
      );
      setExpandedDates(
        roomDates.length === 1 ? new Set(roomDates) : new Set(),
      );
    } else {
      const allDates = currentEventApiData
        ? getAvailableDates(currentEventApiData)
        : [firstDate];
      setExpandedDates(new Set(allDates));
    }
    hasInitializedExpanded.current = true;
  }, [firstDate, currentEventApiData, roomMode, rooms, activeRoomId]);

  // Cart synchronization check — never treat "Zustand not hydrated yet" as a wipe.
  useEffect(() => {
    if (!currentEventSlug || !currentEventApiData) return;
    const localEventData = useCartEditStore.getState().editingData[currentEventSlug];
    if (!localEventData || Object.keys(localEventData).length === 0) {
      return;
    }
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
    if (isLoadingCartData || apiCartData === undefined) return;

    const currentEditingData = useCartEditStore.getState().editingData;

    if (isApiCartResponseEmpty(apiCartData)) {
      const awaitingPayment =
        useCheckoutPaymentUiStore.getState().isAwaitingStripePayment;
      if (Object.keys(currentEditingData).length > 0 && !awaitingPayment) {
        clearAllCarts();
      }
      return;
    }

    if (!currentEventSlug) return;

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
    apiCartData,
    currentEventApiData,
    currentEventSlug,
    isLoadingCartData,
    initializeFromAPI,
    syncNewDatesFromAPI,
    reconcileSavedDatesFromAPI,
    getNewDatesFromAPI,
    removeAllDates,
    removeDate,
    clearAllCarts,
  ]);

  const availableDates = useMemo(() => {
    if (!currentEventApiData) return [];
    if (roomMode) {
      // Prefer the active room; fall back to all room dates so event-replace
      // never flashes an empty cart before activeRoomId is reconciled.
      if (activeRoomId != null) {
        const roomDates = getRoomDates(currentEventApiData, activeRoomId);
        if (roomDates.length > 0) {
          return roomDates.map((d) => buildRoomDateKey(activeRoomId, d));
        }
      }
      return getAllRoomDateKeys(currentEventApiData);
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
    // Single date → open; multiple dates stay collapsed by default.
    setExpandedDates(
      roomDates.length === 1 ? new Set(roomDates) : new Set(),
    );
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
      return sum + getDateGuestCount(dateData);
    }, 0);
    // editingData: guest counts live in the cart edit store, not only API cart.
  }, [
    currentEventSlug,
    currentEventApiData,
    roomMode,
    getDateData,
    editingData,
  ]);

  const handleRemoveDate = async (dateKey: string) => {
    if (removingDateKey || deleteCartDateMutation.isPending) return;

    setRemovingDateKey(dateKey);

    // Optimistic: remove locally immediately so the row disappears without waiting on the API.
    if (currentEventSlug) {
      removeDate(currentEventSlug, dateKey);
    }
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      newSet.delete(dateKey);
      return newSet;
    });
    // Drop reserved-payment UI immediately (same as Clear all) so the
    // timer / "Payment required" card cannot outlive a deleted date.
    useCheckoutPaymentUiStore.getState().clearPaymentSession();

    try {
      const { roomId, date: eventDate } = parseRoomDateKey(dateKey);
      await deleteCartDateMutation.mutateAsync({
        eventDate,
        roomId: roomId ?? undefined,
        storeDateKey: dateKey,
      });
    } catch (error) {
      console.error("Error removing date:", error);
      toast.error("Couldn't remove this date. Please try again.");
      void queryClient.invalidateQueries({ queryKey: ["cart-data"] });
    } finally {
      setRemovingDateKey(null);
    }
  };

  const handleClearAllCart = async () => {
    try {
      setIsProcessing(true);
      clearAllCarts();
      // Drop reserved-payment UI + sessionStorage so the timer/"Payment required"
      // card cannot outlive an explicitly cleared cart.
      useCheckoutPaymentUiStore.getState().clearPaymentSession();
      setExpandedDates(new Set());
      setShowClearConfirm(false);
      await clearAllCartMutation.mutateAsync();
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast.error("Couldn't clear your cart. Please try again.");
      void queryClient.invalidateQueries({ queryKey: ["cart-data"] });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (apiCartData) {
      hasLoadedCartRef.current = true;
    }
  }, [apiCartData]);

  // Show skeleton only on first visit — never again after delete/refetch.
  const isInitialLoad =
    !hasLoadedCartRef.current && isLoadingCartData && !apiCartData;
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

  const hasRoomCartSessions = roomMode && rooms.length > 0;
  const isCartEmpty =
    !isLoadingCartData &&
    !isFetchingCartData &&
    availableDates.length === 0 &&
    !hasRoomCartSessions;

  // Empty cart — require no API rooms either (room carts can briefly have
  // availableDates=[] while activeRoomId is reconciled after an event switch).
  if (isCartEmpty) {
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
          onClick={() => {
            // Prefer going back when there's history; otherwise fall back to the
            // tenant home so a direct visit to /checkout never dead-ends.
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
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
  const guestMetaSuffix =
    totalGuestsAcrossCart > 0
      ? ` · ${totalGuestsAcrossCart} guest${totalGuestsAcrossCart !== 1 ? "s" : ""}`
      : "";
  const isSingleRoomCheckout = roomMode && rooms.length === 1;
  const isMultiRoomCheckout = roomMode && rooms.length > 1;
  const bookedRoomCount = rooms.length;
  const bookingMetaLine =
    roomMode && bookedRoomCount > 0
      ? `${bookedRoomCount} ${bookedRoomCount === 1 ? "room" : "rooms"} · ${totalDatesAcrossRooms} ${totalDatesAcrossRooms === 1 ? "date" : "dates"}${guestMetaSuffix}`
      : `${totalCartItems} ${totalCartItems === 1 ? "date" : "dates"}${guestMetaSuffix}`;

  const locationName =
    typeof currentEventApiData?.location_name === "string"
      ? currentEventApiData.location_name.trim()
      : "";

  const bookingHeader = (
    <div className="mb-4 space-y-3 sm:mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--checkout-brand-accent)]">
            Your Booking
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[color:var(--checkout-brand-primary)] sm:text-2xl">
            {currentEventApiData?.event_name || "Your Booking"}
          </h1>
          {locationName ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[color:var(--checkout-muted-foreground)]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[color:var(--checkout-brand-accent)]" />
              <span className="truncate">{locationName}</span>
            </p>
          ) : null}
          <p className="mt-1 text-xs font-medium leading-relaxed text-[color:var(--checkout-muted-foreground)]">
            {bookingMetaLine}
          </p>
        </div>

        {showClearConfirm ? null : (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            aria-label="Clear cart"
            title="Clear cart"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--checkout-border)] bg-white text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-500 sm:hidden"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showAddDates && addDatesUrl ? (
          <Link
            href={addDatesUrl}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--checkout-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--checkout-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)] sm:flex-none sm:px-4"
          >
            <CalendarPlus className="h-4 w-4 shrink-0" />
            <span>Add Dates</span>
          </Link>
        ) : null}

        {showClearConfirm ? (
          <div className="flex flex-1 items-center gap-1.5 sm:flex-none">
            <button
              type="button"
              onClick={handleClearAllCart}
              disabled={isProcessing || clearAllCartMutation.isPending}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 sm:flex-none"
            >
              {clearAllCartMutation.isPending ? "Clearing..." : "Confirm clear"}
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs text-[color:var(--checkout-muted-foreground)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            aria-label="Clear cart"
            title="Clear cart"
            className="hidden min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--checkout-border)] bg-white px-3 text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-500 sm:inline-flex"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">Clear</span>
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
          <div
            key={date}
            id={checkoutDateDomId(date)}
            className="scroll-mt-[calc(var(--checkout-header-offset)+0.75rem)]"
          >
            <DateAccordion
              eventSlug={currentEventSlug}
              date={date}
              dateData={dateData}
              isExpanded={isExpanded}
              onToggle={() => toggleDateExpansion(date)}
              onRemoveDate={handleRemoveDate}
              isRemoving={removingDateKey === date}
              roomId={roomMode ? (activeRoomId ?? undefined) : undefined}
              embedded={isMultiRoomCheckout}
              roomAccentIndex={activeRoomIndex}
              roomName={
                isSingleRoomCheckout ? activeRoom?.room_name : undefined
              }
              drinkTitle={drinkTitle}
              serverEventData={currentEventApiData}
              {...(() => {
                if (couponReplacesDateOffers) {
                  return {
                    discountLabel: null,
                    discountAmount: null as number | null,
                    discountStrikeAmount: null as number | null,
                    discountLockedHint: null as string | null,
                  };
                }

                const discount = getApiDateDiscount(
                  currentEventApiData,
                  date,
                );
                const label = discount?.value_label?.trim() || null;
                if (!discount || !label) {
                  return {
                    discountLabel: null,
                    discountAmount: null as number | null,
                    discountStrikeAmount: null as number | null,
                    discountLockedHint: null as string | null,
                  };
                }

                const guests = getDateGuestCount(dateData);
                const tableTotal = calculateEditableDateTablesTotal(dateData);
                const discountableTotal =
                  calculateEditableDateDiscountableTotal(dateData);
                const eligibility = {
                  guestCount: guests,
                  discountableTotal,
                  tableTotal,
                };
                const eligible = isDateDiscountEligible(discount, eligibility);
                const amount = eligible
                  ? computeDateDiscountAmount(discount, eligibility)
                  : 0;
                const minPeople = getDateDiscountMinPeople(discount);
                const lockedHint = !eligible
                  ? isFlatPerPersonDateDiscount(discount)
                    ? minPeople != null
                      ? `Min ${minPeople} table guests`
                      : "Confirm table seating"
                    : "Add tables or tickets"
                  : null;

                return {
                  discountLabel: label,
                  discountAmount: amount > 0 ? amount : null,
                  discountStrikeAmount: eligible
                    ? isFlatPerPersonDateDiscount(discount)
                      ? tableTotal
                      : discountableTotal
                    : null,
                  discountLockedHint: lockedHint,
                };
              })()}
            />
          </div>
        );
      })
    );

  const compactAddRoomLink =
    showAddRoom && eventDetailsUrl ? (
      <Link
        href={eventDetailsUrl}
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-dashed border-[color:var(--checkout-brand-accent)]/35 px-3 py-2 text-xs font-semibold text-[color:var(--checkout-brand-accent)] transition-colors hover:border-[color:var(--checkout-brand-accent)] hover:bg-blue-50/50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add room
      </Link>
    ) : null;

  // Single room: merge room name into the date row — no heavy room tab bar.
  if (isSingleRoomCheckout && activeRoomId != null && activeRoom) {
    return (
      <div id="checkout-cart-section" className="space-y-4">
        {bookingHeader}
        <div className="space-y-3">{dateSections}</div>
        {compactAddRoomLink}
      </div>
    );
  }

  // Multi room: keep room tabs so customers can switch between rooms.
  if (isMultiRoomCheckout && activeRoomId != null && activeRoom) {
    return (
      <div id="checkout-cart-section" className="space-y-4">
        {bookingHeader}

        <RoomTabSelector
          rooms={rooms}
          activeRoomId={activeRoomId}
          onRoomChange={handleRoomChange}
          roomSubtotals={roomSubtotals}
          showAddRoom={showAddRoom}
          addRoomUrl={eventDetailsUrl ?? undefined}
        />

        <div className="space-y-3 rounded-2xl border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/40 p-2.5 sm:p-3">
          {dateSections}
        </div>
      </div>
    );
  }

  return (
    <div id="checkout-cart-section" className="space-y-4">
      {bookingHeader}
      <div className="space-y-3">{dateSections}</div>
    </div>
  );
}
