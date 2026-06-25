"use client";

import { Button } from "@/components/ui/button";
import {
  CircleChevronLeft,
  CircleChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CHECKOUT_CONSTANTS } from "@/app/(public)/vendor/checkout/_lib/constants";
// Professional API-only approach - no cart store needed
import { useStoreEventBooking } from "@/services/customer/cart/query";
import { CartRequest } from "@/services/customer/cart/type";
import { normalizeSlug } from "@/lib/utils";
import {
  selectScopedDrinks,
  useDrinkSelectionStore,
} from "@/store/drink-selection.store";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useCartConflictCheck } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { useGetCartData } from "@/services/customer/cart/query";
import {
  buildCartDateLookupKey,
  findApiCartEventBySlug,
  resolveDateCartStatus,
  shouldShowViewCartOnDateCard,
} from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { reconcileLocalCartWithApi } from "@/lib/utils/cart-sync-helper";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencySymbol } from "@/hooks/use-currency-format";

// Define proper user interface for session
interface SessionUser {
  account_type: string;
  active_role: string;
  token: string;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// New simplified date structure from optimized API
export type DatesSectionType = {
  event_date: string;
  price: number;
  sold_out?: boolean;
}[];

type DatesSectionProps = {
  dates?: DatesSectionType;
  eventSlug?: string;
  eventName?: string;
  eventImage?: string;
  /** Multi-room events: scope booking to the selected room. */
  roomId?: number;
  /** Fallback scope when room id is not assigned yet (onboarding preview). */
  roomIndex?: number;
};

type DateInfo = {
  day: string;
  month: string;
  date: number | "—";
  price: string;
  isPlaceholder: boolean;
};

type DateCardVisualState = {
  isSoldOut: boolean;
  isInCart: boolean;
  isSelecting: boolean;
  isOtherBusy: boolean;
};

function resolveDateCardVisual(
  eventDate: string,
  soldOut: boolean | undefined,
  selectingDateKey: string | null,
  isPending: boolean,
  showViewCart: (date: string) => boolean,
  roomId?: number,
): DateCardVisualState {
  const dateKey = buildCartDateLookupKey(eventDate, roomId);
  const isSelecting = selectingDateKey === dateKey;
  const isBusy = selectingDateKey !== null || isPending;

  return {
    isSoldOut: soldOut === true,
    isInCart: showViewCart(eventDate),
    isSelecting,
    isOtherBusy: isBusy && !isSelecting,
  };
}

function getDateCardContainerClass(visual: DateCardVisualState): string {
  const base =
    "border rounded-2xl overflow-hidden text-center w-[85px] sm:w-[100px] md:w-[120px] flex-shrink-0 transition-all duration-300";

  if (visual.isSoldOut) {
    return `${base} border-red-500/60 cursor-not-allowed bg-slate-900/40 backdrop-blur-sm opacity-80 shadow-[0_0_25px_rgba(239,68,68,0.45)]`;
  }
  if (visual.isSelecting) {
    return `${base} border-[var(--color-primary)] ring-1 ring-white/30 shadow-[0_0_22px_rgba(255,255,255,0.12)] cursor-wait bg-black/30 backdrop-blur-sm`;
  }
  if (visual.isOtherBusy) {
    return `${base} border-[var(--color-primary)] opacity-45 cursor-not-allowed shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent`;
  }
  if (visual.isInCart) {
    return `${base} border-[var(--color-primary)] bg-black/20 backdrop-blur-sm opacity-95 cursor-pointer shadow-[0_0_20px_var(--color-primary)]/30`;
  }
  return `${base} border-[var(--color-primary)] cursor-pointer shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent hover:shadow-[0_0_25px_rgba(60,70,147,0.5)] hover:border-[var(--color-primary)] hover:bg-gradient-to-b hover:from-[var(--color-primary)]/10 hover:to-transparent`;
}

function getDateCardFooterClass(
  visual: DateCardVisualState,
  inCartStyle: "primary" | "green",
): string {
  const base =
    "text-white text-sm sm:text-base tracking-wider py-1 sm:py-1.5 transition-all duration-300";

  if (visual.isSoldOut) {
    return `${base} bg-gradient-to-b from-red-600 to-red-800 text-white font-semibold border-t border-red-500/40 tracking-wide`;
  }
  if (visual.isSelecting) {
    return `${base} bg-gradient-to-b from-[var(--color-primary)]/95 to-[#232a61]`;
  }
  if (visual.isInCart) {
    return inCartStyle === "green"
      ? `${base} bg-gradient-to-b from-green-500 to-green-700`
      : `${base} bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white font-semibold shadow-lg`;
  }
  return `${base} bg-gradient-to-b from-[var(--color-primary)] to-[#232a61] hover:from-[var(--color-primary)]/90 hover:to-[#232a61]/90 hover:shadow-lg`;
}

function DateCardSelectingIndicator() {
  return (
    <span className="flex w-full items-center justify-center py-0.5">
      <span
        className="relative h-[3px] w-11 overflow-hidden rounded-full bg-white/20 sm:w-12"
        aria-hidden
      >
        <motion.span
          className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-white/85"
          animate={{ x: ["-120%", "220%"] }}
          transition={{
            duration: 1.15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </span>
      <span className="sr-only">Adding date to your booking</span>
    </span>
  );
}

function DateCardFooterContent({
  visual,
  dateInfo,
  currencySymbol,
}: {
  visual: DateCardVisualState;
  dateInfo: DateInfo;
  currencySymbol: string;
}) {
  if (visual.isSoldOut) return <>SOLD OUT</>;
  if (visual.isSelecting) return <DateCardSelectingIndicator />;
  if (visual.isInCart) return <>VIEW CART</>;
  if (dateInfo.isPlaceholder && dateInfo.price === "—") {
    return <>Set date</>;
  }
  return <>{`${currencySymbol}${dateInfo.price}`}</>;
}

export default function DatesSection({
  dates,
  eventSlug,
  eventName,
  eventImage,
  roomId,
  roomIndex,
}: DatesSectionProps) {
  const currencySymbol = useCurrencySymbol();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isOnboarding } = useOnboarding();
  const isPreviewMode = useIsPreviewMode();
  // Professional API-only approach - no local cart state needed
  const { mutateAsync: storeEventBooking, isPending } = useStoreEventBooking();
  const selectedDrinks = useDrinkSelectionStore(selectScopedDrinks);

  // Use Zustand store instead of direct localStorage access
  const editingData = useCartEditStore((state) => state.editingData);
  const getDateData = useCartEditStore((state) => state.getDateData);

  // Cart conflict detection - conditional based on onboarding status
  let checkAndHandleConflict:
    | ((
        eventSlug: string,
        eventInfo: { name: string; slug: string; image: string },
      ) => boolean)
    | null = null;

  try {
    const cartConflictHook = useCartConflictCheck();
    // Only use cart conflict if not in onboarding
    if (!isOnboarding) {
      checkAndHandleConflict = cartConflictHook.checkAndHandleConflict;
    }
  } catch {
    // Context may be absent during onboarding preview render paths.
  }

  const sessionUser = session?.user as SessionUser | undefined;
  const cartQueryEnabled =
    sessionUser?.account_type === "customer" && !isOnboarding && !isPreviewMode;
  const { data: apiCartData, isLoading: isCartDataLoading } = useGetCartData(
    cartQueryEnabled,
  );

  useEffect(() => {
    if (!cartQueryEnabled || isCartDataLoading || apiCartData === undefined) {
      return;
    }
    reconcileLocalCartWithApi(apiCartData);
  }, [apiCartData, cartQueryEnabled, isCartDataLoading]);

  const cartEventData = useMemo(() => {
    if (!eventSlug || !apiCartData) return null;
    return findApiCartEventBySlug(apiCartData, eventSlug);
  }, [apiCartData, eventSlug]);
  const sectionLabel = "Book Your Places Now";
  const heading = "Select a Date";
  const text = "Already Booked? Log In Here";
  /** Log-in CTA only for guests; hide when already signed in (still show in onboarding preview). */
  const showAlreadyBookedLoginCta = isPreviewMode || status !== "authenticated";
  const [isVisible, setIsVisible] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectingDateKey, setSelectingDateKey] = useState<string | null>(null);
  const [datesBackgroundImageFailed, setDatesBackgroundImageFailed] =
    useState(false);
  // Professional API-only approach - no conflict modal needed
  const itemsPerRow = 5; // Number of items to display per row
  const datesPerPage = itemsPerRow * 2; // Total dates visible per page (2 rows)

  const getDateRowJustifyClass = (itemCount: number) =>
    itemCount < itemsPerRow
      ? "justify-center"
      : "justify-start sm:justify-center";

  // Setup client-side detection and window measurements
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setScreenSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (!eventSlug) return;
    useDrinkSelectionStore
      .getState()
      .setCurrentEvent(eventSlug, roomId, roomIndex);
  }, [eventSlug, roomId, roomIndex]);

  // Animation visibility trigger - reduced delay for smoother transition
  useEffect(() => {
    if (!isClient) return;
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [isClient]);

  const getDateCartStatus = useCallback(
    (dateToCheck: string) => {
      if (!eventSlug) {
        return { hasSelections: false, hasSession: false };
      }

      try {
        const decodedEventSlug = decodeURIComponent(eventSlug);
        const storeKey = buildCartDateLookupKey(dateToCheck, roomId);
        const localData = getDateData(decodedEventSlug, storeKey);

        return resolveDateCartStatus({
          date: dateToCheck,
          roomId,
          cartEventData,
          localData,
        });
      } catch (error) {
        console.error("Error checking cart data:", error);
        return { hasSelections: false, hasSession: false };
      }
    },
    [eventSlug, roomId, cartEventData, getDateData, editingData],
  );

  const shouldShowViewCartOnDate = useCallback(
    (dateToCheck: string) =>
      shouldShowViewCartOnDateCard(getDateCartStatus(dateToCheck)),
    [getDateCartStatus],
  );

  const getDateSelectionKey = useCallback(
    (eventDate: string) => buildCartDateLookupKey(eventDate, roomId),
    [roomId],
  );

  const clearDateSelection = useCallback(() => {
    setSelectingDateKey(null);
  }, []);

  // Handle date card click - add to cart and redirect to checkout
  const handleDateClick = (dateItem: DatesSectionType[0]) => {
    if (isPreviewMode) return;
    if (selectingDateKey || isPending) return;

    const dateKey = getDateSelectionKey(dateItem.event_date);
    setSelectingDateKey(dateKey);

    // Resume checkout when the date is already in cart (with or without selections).
    if (shouldShowViewCartOnDate(dateItem.event_date)) {
      router.push("/vendor/checkout");
      return;
    }

    // Check if user is authenticated first
    if (status !== "authenticated" || !session?.user) {
      // User is not logged in, redirect to login with simple callback URL
      const checkoutUrl = `/vendor/checkout`;
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(checkoutUrl)}`);
      return;
    }

    const actualEventSlug = eventSlug || CHECKOUT_CONSTANTS.DEFAULT_EVENT_SLUG;
    const eventDate = dateItem.event_date;
    const actualEventName = eventName || "Festive & Fabulous";
    const actualEventImage =
      eventImage ||
      "http://192.168.1.100:8000/storage/uploads/vendor/events/event_banner_image68bab4bb983bd.jpg";

    // Check for cart conflicts BEFORE making API call (only if available)
    if (checkAndHandleConflict) {
      const canProceed = checkAndHandleConflict(actualEventSlug, {
        name: actualEventName,
        slug: actualEventSlug,
        image: actualEventImage,
      });

      if (!canProceed) {
        // Conflict detected - modal will be shown, don't proceed with API call
        clearDateSelection();
        return;
      }
    }

    // No conflict, proceed with adding to cart
    proceedWithEvent({
      event_slug: actualEventSlug,
      event_name: actualEventName,
      event_image: actualEventImage,
      event_date: eventDate,
    });
  };

  // Proceed with adding event to cart and navigation
  const proceedWithEvent = async (eventData: {
    event_slug: string;
    event_name: string;
    event_image: string;
    event_date: string;
  }) => {
    // Check if user is authenticated and is a customer first
    if (status === "authenticated" && session?.user) {
      const user = session.user as SessionUser;
      const accountType = user.account_type;
      const activeRole = user.active_role;
      const token = user.token;

      // Check if user is a customer with valid token
      if (accountType === "customer" && activeRole === "customer" && token) {
        // User is a customer, make POST API call to initialize cart
        const cartData: CartRequest = {
          slug: normalizeSlug(eventData.event_slug),
          event_date: eventData.event_date,
          ...(roomId != null && roomId > 0 ? { room_id: roomId } : {}),
          // Initially empty - user will add items in checkout page
          drink_package: selectedDrinks.filter((drink) => drink.quantity > 0),
          tables: [],
          tickets: [],
        };

        // Make POST API call to store initial cart data and wait for response
        try {
          const response = await storeEventBooking({ data: cartData });

          if (response?.status === true) {
            // API call succeeded - API interceptor already shows success toast
            // Professional API-only approach - no local storage needed

            // Navigate directly to simple checkout page
            router.push("/vendor/checkout");
          } else {
            console.error("Failed to select event. Please try again.");
            clearDateSelection();
          }
        } catch (error) {
          console.error("Error storing event data:", error);
          console.error("Failed to select event. Please try again.");
          clearDateSelection();
        }
      } else {
        // User is not a customer, redirect to unauthorized page
        router.push("/unauthorized");
      }
    } else {
      // User is not logged in, redirect to login with simple callback URL
      const checkoutUrl = `/vendor/checkout`;
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(checkoutUrl)}`);
    }
  };

  // Professional API-only approach - no conflict resolution needed

  // Helper function to format date and use direct price from API
  const getDateInfo = (dateItem: DatesSectionType[0]) => {
    const raw = dateItem.event_date?.trim() ?? "";
    const dateObj =
      raw.length >= 8 ? new Date(`${raw}T12:00:00`) : new Date(NaN);
    const valid = !Number.isNaN(dateObj.getTime());

    const priceNum =
      typeof dateItem.price === "number" && !isNaN(dateItem.price)
        ? dateItem.price
        : 0;

    if (!valid) {
      return {
        day: "Choose",
        month: "event date",
        date: "—" as const,
        price: priceNum > 0 ? priceNum.toFixed(0) : "—",
        isPlaceholder: true as const,
      };
    }

    const day = dateObj.toLocaleString("default", { weekday: "long" });
    const month = dateObj.toLocaleString("default", { month: "long" });
    const dateNum = dateObj.getDate();

    return {
      day,
      month,
      date: dateNum,
      price: priceNum.toFixed(0),
      isPlaceholder: false as const,
    };
  };

  const handleDateCardClick = (
    dateItem: DatesSectionType[0],
    visual: DateCardVisualState,
  ) => {
    if (visual.isSoldOut || visual.isOtherBusy) return;
    handleDateClick(dateItem);
  };

  const renderStaticDateCard = (
    dateItem: DatesSectionType[0],
    cardKey: string,
    inCartStyle: "primary" | "green" = "primary",
  ) => {
    const dateInfo = getDateInfo(dateItem);
    const visual = resolveDateCardVisual(
      dateItem.event_date,
      dateItem.sold_out,
      selectingDateKey,
      isPending,
      shouldShowViewCartOnDate,
      roomId,
    );

    return (
      <div
        className={getDateCardContainerClass(visual)}
        key={cardKey}
        onClick={() => handleDateCardClick(dateItem, visual)}
        aria-busy={visual.isSelecting}
      >
        <div className="p-2 sm:p-3">
          <p className="text-xs sm:text-sm mb-0.5 sm:mb-1">{dateInfo.day}</p>
          <p className="text-3xl sm:text-4xl md:text-5xl font-bold py-1">
            {dateInfo.date}
          </p>
          <p className="text-xs sm:text-sm">{dateInfo.month}</p>
        </div>
        <div className={getDateCardFooterClass(visual, inCartStyle)}>
          <DateCardFooterContent
            visual={visual}
            dateInfo={dateInfo}
            currencySymbol={currencySymbol}
          />
        </div>
      </div>
    );
  };

  const renderAnimatedDateCard = (
    dateItem: DatesSectionType[0],
    cardKey: string,
    animationIndex: number,
  ) => {
    const dateInfo = getDateInfo(dateItem);
    const visual = resolveDateCardVisual(
      dateItem.event_date,
      dateItem.sold_out,
      selectingDateKey,
      isPending,
      shouldShowViewCartOnDate,
      roomId,
    );

    return (
      <motion.div
        className={getDateCardContainerClass(visual)}
        key={cardKey}
        initial={{ opacity: 1, y: 0 }}
        animate={{
          opacity: visual.isOtherBusy ? 0.45 : visual.isSoldOut ? 0.75 : 1,
          y: 0,
        }}
        transition={{ duration: 0.2, delay: animationIndex * 0.02 }}
        whileHover={{
          scale:
            visual.isOtherBusy ||
            visual.isInCart ||
            visual.isSoldOut ||
            visual.isSelecting
              ? 1
              : 1.02,
          boxShadow:
            visual.isOtherBusy || visual.isInCart || visual.isSoldOut
              ? "none"
              : "0 0 25px rgba(60,70,147,0.5)",
          transition: { duration: 0.2 },
        }}
        whileTap={{
          scale:
            visual.isOtherBusy ||
            visual.isInCart ||
            visual.isSoldOut ||
            visual.isSelecting
              ? 1
              : 0.98,
        }}
        onClick={() => handleDateCardClick(dateItem, visual)}
        aria-busy={visual.isSelecting}
      >
        <div className="p-2 sm:p-3">
          <p className="text-xs sm:text-sm mb-0.5 sm:mb-1">{dateInfo.day}</p>
          <p className="text-3xl sm:text-4xl md:text-5xl font-bold py-1">
            {dateInfo.date}
          </p>
          <p className="text-xs sm:text-sm">{dateInfo.month}</p>
        </div>
        <div className={getDateCardFooterClass(visual, "primary")}>
          <DateCardFooterContent
            visual={visual}
            dateInfo={dateInfo}
            currencySymbol={currencySymbol}
          />
        </div>
      </motion.div>
    );
  };

  // If no dates, show a default preview with dummy data
  const displayDates = dates?.length
    ? dates
    : Array(10)
        .fill({})
        .map((_, i) => ({
          event_date: new Date(new Date().setDate(new Date().getDate() + i))
            .toISOString()
            .split("T")[0],
          price: 65,
          sold_out: false,
        }));

  const firstRowCount = Math.min(itemsPerRow, displayDates.length);
  const secondRowCount = Math.min(
    itemsPerRow,
    Math.max(0, displayDates.length - itemsPerRow),
  );

  // Check if pagination is needed
  const needsPagination = displayDates.length > datesPerPage;
  const maxPages = Math.ceil(displayDates.length / datesPerPage) - 1;
  const canGoLeft = needsPagination && currentPage > 0;
  const canGoRight = needsPagination && currentPage < maxPages;

  // Decorative particles — off in onboarding preview (full-viewport coords + noise).
  const particles =
    isClient && !isPreviewMode
      ? Array.from({ length: 10 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          initial={{
            x: Math.random() * (screenSize.width || 500),
            y: Math.random() * (screenSize.height || 400),
          }}
          animate={{
            x: Math.random() * (screenSize.width || 500),
            y: Math.random() * (screenSize.height || 400),
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
        />
      ))
      : [];

  // Simple non-animated fallback for SSR that matches the client layout
  if (!isClient) {
    return (
      <section className="w-full py-12 sm:py-16 text-white rounded-3xl overflow-hidden relative bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_30%,#0a0014)] via-[color:color-mix(in_srgb,var(--color-primary)_15%,#0a0014)] to-[#0a0014] transition-all duration-200">
        <div className="w-full text-center relative z-10 mb-6 sm:mb-8 px-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            {sectionLabel}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
            {heading}
          </h2>
          {showAlreadyBookedLoginCta && (
            <Button
              type="button"
              variant="outline"
              className="bg-[#1a1a24] hover:bg-[#26273a] !text-white py-1 sm:py-1.5 px-6 sm:px-8 rounded-md text-xs sm:text-sm border border-white/25 shadow-sm"
              onClick={() => {
                if (!isPreviewMode) router.push("/auth/login");
              }}
            >
              {text}
            </Button>
          )}
        </div>

        <div className="w-full max-w-5xl mx-auto relative z-10 px-2 sm:px-8 md:px-12">
          {/* Left arrow - Only show if pagination is needed and not on first page */}
          {needsPagination && (
            <div className="absolute left-0 sm:left-2 top-1/2 transform -translate-y-1/2 z-20">
              <div
                className={`bg-[#21223a] rounded-full p-1 sm:p-2 shadow-[0_0_10px_rgba(33,34,58,0.7)] ${
                  canGoLeft
                    ? "cursor-pointer hover:bg-[#2a2b4a]"
                    : "opacity-30 cursor-not-allowed"
                }`}
              >
                <CircleChevronLeft className="h-7 w-7 sm:h-10 sm:w-10 text-[#8f96c3]" />
              </div>
            </div>
          )}

          {/* Date cards container - matching client layout */}
          <div className="overflow-hidden">
            <div className="flex flex-col gap-4 sm:gap-5">
              {/* First row of date cards */}
              <div
                className={`flex ${getDateRowJustifyClass(firstRowCount)} items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2 mb-4 sm:mb-5`}
              >
                {Array.from({
                  length: firstRowCount,
                }).map((_, i) => {
                  const index = i;
                  if (index >= displayDates.length) return null;
                  return renderStaticDateCard(
                    displayDates[index],
                    `first-${index}`,
                    "green",
                  );
                })}
              </div>

              {/* Second row of date cards */}
              <div
                className={`flex ${getDateRowJustifyClass(secondRowCount)} items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2`}
              >
                {Array.from({
                  length: secondRowCount,
                }).map((_, i) => {
                  const index = itemsPerRow + i;
                  if (index >= displayDates.length) return null;
                  return renderStaticDateCard(
                    displayDates[index],
                    `second-${index}`,
                    "green",
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right arrow - Only show if pagination is needed */}
          {needsPagination && (
            <div className="absolute right-0 sm:right-2 top-1/2 transform -translate-y-1/2 z-20">
              <div
                className={`bg-[#21223a] rounded-full p-1 sm:p-2 shadow-[0_0_10px_rgba(33,34,58,0.7)] ${
                  canGoRight
                    ? "cursor-pointer hover:bg-[#2a2b4a]"
                    : "opacity-30 cursor-not-allowed"
                }`}
              >
                <CircleChevronRight className="h-7 w-7 sm:h-10 sm:w-10 text-[#8f96c3]" />
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Full animated version for client-side
  return (
    <motion.section
      className="w-full py-12 sm:py-16 text-white rounded-3xl overflow-hidden relative bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_30%,#0a0014)] via-[color:color-mix(in_srgb,var(--color-primary)_15%,#0a0014)] to-[#0a0014] transition-all duration-200"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background — decorative; empty alt + onError avoids visible alt on broken asset */}
      <div className="absolute inset-0 z-0">
        {!datesBackgroundImageFailed ? (
          <img
            src={addCacheBusting("/assets/images/events/event-date-banner.jpg")}
            alt=""
            aria-hidden
            onError={() => setDatesBackgroundImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover rounded-3xl opacity-40"
          />
        ) : null}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Floating particles - only rendered client-side */}
        <AnimatePresence>{isVisible && particles}</AnimatePresence>
      </div>

      <div className="w-full text-center relative z-10 mb-6 sm:mb-8 px-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
          {sectionLabel}
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
          {heading}
        </h2>
        {showAlreadyBookedLoginCta && (
          <Button
            type="button"
            variant="outline"
            className="bg-[#1a1a24] hover:bg-[#26273a] !text-white py-1 sm:py-1.5 px-6 sm:px-8 rounded-md text-xs sm:text-sm border border-white/25 shadow-sm"
            onClick={() => {
              if (!isPreviewMode) router.push("/auth/login");
            }}
          >
            {text}
          </Button>
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto relative z-10 px-2 sm:px-8 md:px-12">
        {/* Left arrow - Only show if pagination is needed and can go left */}
        {needsPagination && (
          <div
            className="absolute left-0 sm:left-2 top-1/2 transform -translate-y-1/2 z-20"
            onClick={() =>
              canGoLeft && setCurrentPage((prev) => Math.max(0, prev - 1))
            }
          >
            <div
              className={`bg-[#21223a] rounded-full p-1 sm:p-2 shadow-[0_0_10px_rgba(33,34,58,0.7)] ${
                canGoLeft
                  ? "cursor-pointer hover:bg-[#2a2b4a]"
                  : "opacity-30 cursor-not-allowed"
              }`}
            >
              <CircleChevronLeft className="h-7 w-7 sm:h-10 sm:w-10 text-[#8f96c3]" />
            </div>
          </div>
        )}

        {/* Date cards container with transition */}
        <div className="overflow-hidden relative">
          {/* First row of date cards */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <div
              className={`flex ${getDateRowJustifyClass(firstRowCount)} items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2 mb-4 sm:mb-5`}
            >
              {Array.from({
                length: firstRowCount,
              }).map((_, i) => {
                const index = currentPage * itemsPerRow + i;
                if (index >= displayDates.length) return null;
                return renderAnimatedDateCard(
                  displayDates[index],
                  `first-${index}`,
                  i,
                );
              })}
            </div>

            {/* Second row of date cards */}
            <div
              className={`flex ${getDateRowJustifyClass(secondRowCount)} items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2`}
            >
              {Array.from({
                length: secondRowCount,
              }).map((_, i) => {
                const index = currentPage * itemsPerRow + itemsPerRow + i;
                if (index >= displayDates.length) return null;
                return renderAnimatedDateCard(
                  displayDates[index],
                  `second-${index}`,
                  i,
                );
              })}
            </div>
          </div>
        </div>

        {/* Right arrow - Only show if pagination is needed and can go right */}
        {needsPagination && (
          <div
            className="absolute right-0 sm:right-2 top-1/2 transform -translate-y-1/2 z-20"
            onClick={() => {
              if (canGoRight) {
                setCurrentPage((prev) => Math.min(maxPages, prev + 1));
              }
            }}
          >
            <div
              className={`bg-[#21223a] rounded-full p-1 sm:p-2 shadow-[0_0_10px_rgba(33,34,58,0.7)] ${
                canGoRight
                  ? "cursor-pointer hover:bg-[#2a2b4a]"
                  : "opacity-30 cursor-not-allowed"
              }`}
            >
              <CircleChevronRight className="h-7 w-7 sm:h-10 sm:w-10 text-[#8f96c3]" />
            </div>
          </div>
        )}
      </div>

      {/* Professional API-only approach - no conflict modal needed */}
    </motion.section>
  );
}
