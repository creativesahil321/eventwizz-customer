"use client";

import { rememberCheckoutLocation } from "@/lib/checkout-location-memory";
import {
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
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
  calculateEditableDateTotal,
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
import {
  computeCouponDiscountAmount,
  isCheckoutCouponApplied,
  resolveCartEventCoupon,
} from "./checkout-promo-panel";
import { useCartSync } from "../_lib/hooks/useCartSync";
import { useLocationSlug } from "../_lib/hooks/useLocationSlug";
import { generateEventBookingUrl } from "../_lib/utils/event-url";
import {
  checkoutDateDomId,
  subscribeCheckoutDateFocus,
} from "../_lib/checkout-date-focus";
import {
  firstRoomIdWithRemainingDates,
  hasRemainingDatesToAdd,
  hasRemainingDatesToAddAnywhere,
} from "../_lib/remaining-dates";
import {
  countCheckoutDateStatuses,
  formatCheckoutBookingMetaLine,
  countDatePurchases,
  sumPurchaseCounts,
} from "../_lib/checkout-readiness";
import { useEventDetail } from "@/app/(public)/[locationSlug]/events/[eventSlug]/_lib/hooks";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { resolveDateCardBookingOption } from "@/components/public/booking-type-icons";
import type { ApiRoomCartData } from "@/lib/types/cart.types";
import { useCheckoutChatHandoff } from "../_lib/hooks/use-checkout-chat-handoff";
import { readChatEventReturnHref, markCartClearedByUser } from "@/lib/checkout-chat-handoff";

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
  const eventCoupon = useMemo(
    () => resolveCartEventCoupon(currentEventApiData),
    [currentEventApiData],
  );
  const couponReplacesDateOffers = isCheckoutCouponApplied(
    { couponCode },
    eventCoupon,
  );

  const locationSlug = useLocationSlug();
  // Payment result pages show this location's contact details.
  useEffect(() => {
    rememberCheckoutLocation(locationSlug);
  }, [locationSlug]);
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

  // The cart API can retain both legacy option sets after a vendor changes
  // booking_type. Use the public event detail as the source of truth for what
  // the customer may select, while keeping old cart data available to sync.
  const bookingTypeByDate = useMemo(() => {
    if (!eventDetail) return new Map<string, "tickets" | "tables" | "both">();

    const dates = roomMode
      ? activeRoomId == null
        ? undefined
        : Object.values(eventDetail.rooms ?? {}).find(
            (room) => Number(room.room_id) === activeRoomId,
          )?.dates
      : eventDetail.dates;

    return new Map(
      (dates ?? [])
        .map((date) => {
          const option = resolveDateCardBookingOption({
            soldOut: date.sold_out,
            bookingOption: date.booking_option,
            bookingType: date.booking_type,
          });
          return option ? ([date.event_date, option] as const) : null;
        })
        .filter((entry): entry is readonly [string, "tickets" | "tables" | "both"] =>
          Boolean(entry),
        ),
    );
  }, [activeRoomId, eventDetail, roomMode]);

  // Add room stays unscoped. Add Dates prefers the active room, then any
  // other room that still has bookable dates.
  const eventDetailsUrl = useMemo(
    () => generateEventBookingUrl(locationSlug, currentEventSlug),
    [locationSlug, currentEventSlug],
  );

  const lookupRemainingDate = useCallback(
    (storeKey: string) =>
      currentEventSlug ? getDateData(currentEventSlug, storeKey) : null,
    [currentEventSlug, getDateData, editingData],
  );

  const addDatesRoomId = useMemo(() => {
    if (!roomMode) return null;
    if (
      activeRoomId != null &&
      hasRemainingDatesToAdd({
        eventDetail,
        cartEventData: currentEventApiData,
        roomId: activeRoomId,
        getLocalDateData: lookupRemainingDate,
      })
    ) {
      return activeRoomId;
    }
    return firstRoomIdWithRemainingDates({
      eventDetail,
      cartEventData: currentEventApiData,
      getLocalDateData: lookupRemainingDate,
    });
  }, [
    roomMode,
    activeRoomId,
    eventDetail,
    currentEventApiData,
    lookupRemainingDate,
  ]);

  const addDatesUrl = useMemo(
    () =>
      generateEventBookingUrl(locationSlug, currentEventSlug, addDatesRoomId),
    [locationSlug, currentEventSlug, addDatesRoomId],
  );

  const showAddDates = useMemo(() => {
    if (!addDatesUrl || !currentEventSlug) return false;
    if (!roomMode) {
      return hasRemainingDatesToAdd({
        eventDetail,
        cartEventData: currentEventApiData,
        roomId: null,
        getLocalDateData: lookupRemainingDate,
      });
    }
    return hasRemainingDatesToAddAnywhere({
      eventDetail,
      cartEventData: currentEventApiData,
      getLocalDateData: lookupRemainingDate,
    });
  }, [
    addDatesUrl,
    currentEventSlug,
    eventDetail,
    currentEventApiData,
    roomMode,
    lookupRemainingDate,
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

  /** Whole-booking keys for coupon share (all rooms), not just the active room tab. */
  const allBookingDateKeys = useMemo(() => {
    if (!currentEventApiData) return [];
    if (roomMode) return getAllRoomDateKeys(currentEventApiData);
    return getAvailableDates(currentEventApiData);
  }, [currentEventApiData, roomMode]);

  useCheckoutChatHandoff(currentEventSlug, allBookingDateKeys);

  const bookingDiscountableForPromo = useMemo(() => {
    if (!currentEventSlug) return 0;
    return allBookingDateKeys.reduce((sum, dateKey) => {
      const dateData = getDateData(currentEventSlug, dateKey);
      return (
        sum +
        (dateData ? calculateEditableDateDiscountableTotal(dateData) : 0)
      );
    }, 0);
  }, [allBookingDateKeys, currentEventSlug, editingData, getDateData]);

  const couponDiscountTotal = useMemo(() => {
    if (!couponReplacesDateOffers) return 0;
    return computeCouponDiscountAmount(
      eventCoupon,
      bookingDiscountableForPromo,
    );
  }, [couponReplacesDateOffers, eventCoupon, bookingDiscountableForPromo]);

  const couponDiscountLabel = useMemo(() => {
    if (!couponReplacesDateOffers || !eventCoupon) return null;
    const label = eventCoupon.value_label?.trim();
    if (label) return label;
    const code = couponCode?.trim().toUpperCase();
    return code ? `Coupon ${code}` : "Coupon";
  }, [couponReplacesDateOffers, eventCoupon, couponCode]);

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

  const purchaseTotalsAcrossCart = useMemo(() => {
    if (!currentEventSlug || !currentEventApiData) {
      return { tickets: 0, tables: 0 };
    }
    const dateKeys = roomMode
      ? getAllRoomDateKeys(currentEventApiData)
      : getAvailableDates(currentEventApiData);
    return sumPurchaseCounts(
      dateKeys.map((dateKey) =>
        countDatePurchases(getDateData(currentEventSlug, dateKey)),
      ),
    );
    // editingData: guest counts live in the cart edit store, not only API cart.
  }, [
    currentEventSlug,
    currentEventApiData,
    roomMode,
    getDateData,
    editingData,
  ]);

  const checkoutDateCounts = useMemo(() => {
    if (!currentEventSlug) {
      return { total: 0, ready: 0, needsItems: 0 };
    }
    return countCheckoutDateStatuses(
      currentEventSlug,
      allBookingDateKeys,
      getDateData,
    );
  }, [currentEventSlug, allBookingDateKeys, getDateData, editingData]);

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
      if (currentEventSlug) {
        const remaining = useCartEditStore.getState().editingData[currentEventSlug];
        if (!remaining || Object.keys(remaining).length === 0) {
          markCartClearedByUser();
        }
      }
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
      markCartClearedByUser();
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
    const chatEventHref =
      typeof window !== "undefined" ? readChatEventReturnHref() : null;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center mb-5">
          <ShoppingCart className="h-7 w-7 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1.5">
          Nothing in your cart yet
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          {chatEventHref
            ? "Tap the dates you want on the event page — that adds them here. Then you can choose tickets, tables, drinks, and pay."
            : "Browse events to find tickets, tables, and packages to add to your cart."}
        </p>
        {chatEventHref ? (
          <Button
            asChild
            className="bg-[color:var(--checkout-cta)] hover:bg-[color:var(--checkout-cta)] text-[color:var(--checkout-cta-foreground)] rounded-xl px-6 h-10 text-sm font-medium shadow-sm"
          >
            <Link href={chatEventHref}>Choose dates</Link>
          </Button>
        ) : (
          <Button
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = "/";
              }
            }}
            className="bg-[color:var(--checkout-cta)] hover:bg-[color:var(--checkout-cta)] text-[color:var(--checkout-cta-foreground)] rounded-xl px-6 h-10 text-sm font-medium shadow-sm"
          >
            Browse Events
          </Button>
        )}
      </div>
    );
  }

  const activeRoom = rooms.find((r) => r.room_id === activeRoomId);
  const activeRoomIndex = Math.max(
    0,
    rooms.findIndex((r) => r.room_id === activeRoomId),
  );
  const isSingleRoomCheckout = roomMode && rooms.length === 1;
  const isMultiRoomCheckout = roomMode && rooms.length > 1;
  const bookedRoomCount = rooms.length;
  const bookingMetaLine = formatCheckoutBookingMetaLine({
    roomMode: roomMode && bookedRoomCount > 0,
    roomCount: bookedRoomCount,
    dateCounts: checkoutDateCounts,
    purchaseCounts: purchaseTotalsAcrossCart,
  });

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

        const bookingType = bookingTypeByDate.get(date);
        const displayDateData =
          bookingType == null
            ? dateData
            : {
                ...dateData,
                tickets:
                  bookingType === "tables" ? [] : dateData.tickets,
                tables:
                  bookingType === "tickets" ? [] : dateData.tables,
              };

        return (
          <div
            key={date}
            id={checkoutDateDomId(date)}
            className="scroll-mt-[calc(var(--checkout-header-offset)+0.75rem)]"
          >
            <DateAccordion
              eventSlug={currentEventSlug}
              date={date}
              dateData={displayDateData}
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
                  const dateDiscountable =
                    calculateEditableDateDiscountableTotal(displayDateData);
                  const dateTotal = calculateEditableDateTotal(displayDateData);
                  const share =
                    couponDiscountTotal > 0 &&
                    bookingDiscountableForPromo > 0 &&
                    dateDiscountable > 0
                      ? Math.round(
                          ((dateDiscountable / bookingDiscountableForPromo) *
                            couponDiscountTotal +
                            Number.EPSILON) *
                            100,
                        ) / 100
                      : 0;
                  return {
                    discountLabel: share > 0 ? couponDiscountLabel : null,
                    discountAmount: share > 0 ? share : null,
                    discountStrikeAmount: share > 0 ? dateTotal : null,
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

                const guests = getDateGuestCount(displayDateData);
                const tableTotal =
                  calculateEditableDateTablesTotal(displayDateData);
                const discountableTotal =
                  calculateEditableDateDiscountableTotal(displayDateData);
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
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-dashed border-[color:var(--checkout-brand-accent)]/35 px-3 py-2 text-xs font-semibold text-[color:var(--checkout-brand-accent)] transition-colors hover:border-[color:var(--checkout-brand-accent)] hover:bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_7%,white)]"
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

        {/* Phones: no extra card around the dates (card-in-card squeezed the
            date header); the room tabs above already group them. */}
        <div className="space-y-3 sm:rounded-2xl sm:border sm:border-[color:var(--checkout-border)] sm:bg-[color:var(--checkout-muted)]/40 sm:p-3">
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
