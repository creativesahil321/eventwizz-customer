"use client";

import { Button } from "@/components/ui/button";
import { CircleChevronLeft, CircleChevronRight } from "lucide-react";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
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
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";
import { SiteHeading } from "@/components/public/site-heading";
import {
  type DateCardOffer,
  type PublicEventDateDiscount,
} from "@/components/public/date-card-offer";
import { DateCardPriceFooter } from "@/components/public/date-card-price-footer";
import { savePendingBooking } from "@/lib/booking/pending-booking";
import { saveAuthCallbackUrl } from "@/lib/auth/safe-callback-url";
import {
  CHECKOUT_HANDOFF_COUPON,
  CHECKOUT_HANDOFF_DATES,
  CHECKOUT_HANDOFF_PAY,
  buildCheckoutHandoffHref,
  mergeCheckoutHandoffPending,
  parseCheckoutHandoffPay,
} from "@/lib/checkout-chat-handoff";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

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
  /** Mapped for date cards (from API `discount` via room slices). */
  offer?: DateCardOffer | null;
  /** Raw domain-event API field. */
  discount?: PublicEventDateDiscount | null;
}[];

function isoDateKey(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function parseChatHandoffDates(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => isoDateKey(part.trim()))
    .filter(Boolean);
}

type DatesSectionProps = {
  dates?: DatesSectionType;
  eventSlug?: string;
  eventName?: string;
  eventImage?: string;
  /** Multi-room events: scope booking to the selected room. */
  roomId?: number;
  /** Fallback scope when room id is not assigned yet (onboarding preview). */
  roomIndex?: number;
  /** Site Essentials `typography.headingEmphasis` — required on platform-host previews. */
  headingEmphasis?: HeadingEmphasis | string | null;
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

function getDateCardContainerClass(
  visual: DateCardVisualState,
  narrowPreview: boolean,
): string {
  const base = cn(
    "flex-shrink-0 overflow-hidden rounded-2xl border text-center transition-all duration-300",
    narrowPreview ? "w-[85px]" : "w-[85px] sm:w-[100px] md:w-[120px]",
  );

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
  narrowPreview: boolean,
): string {
  const base = cn(
    "text-white tracking-wider transition-all duration-300",
    narrowPreview
      ? "py-1 text-sm"
      : "py-1 text-sm sm:py-1.5 sm:text-base",
  );

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
  listPrice,
  offer,
  compact,
}: {
  visual: DateCardVisualState;
  dateInfo: DateInfo;
  currencySymbol: string;
  listPrice: number;
  offer?: DateCardOffer | null;
  compact?: boolean;
}) {
  if (visual.isSoldOut) {
    return (
      <DateCardPriceFooter
        currencySymbol={currencySymbol}
        listPrice={listPrice}
        fallbackLabel="SOLD OUT"
        compact={compact}
      />
    );
  }
  if (visual.isSelecting) return <DateCardSelectingIndicator />;
  if (visual.isInCart) {
    return (
      <DateCardPriceFooter
        currencySymbol={currencySymbol}
        listPrice={listPrice}
        fallbackLabel="VIEW CART"
        compact={compact}
      />
    );
  }
  if (dateInfo.isPlaceholder && dateInfo.price === "—") {
    return (
      <DateCardPriceFooter
        currencySymbol={currencySymbol}
        listPrice={listPrice}
        fallbackLabel="Set date"
        compact={compact}
      />
    );
  }
  return (
    <DateCardPriceFooter
      currencySymbol={currencySymbol}
      listPrice={listPrice}
      offer={offer}
      compact={compact}
    />
  );
}

type DateRowsScrollerProps = {
  displayDates: DatesSectionType;
  itemsPerRow: number;
  firstRowCount: number;
  secondRowCount: number;
  pageOffset: number;
  narrowPreview: boolean;
  getDateRowJustifyClass: (itemCount: number) => string;
  renderCard: (
    dateItem: DatesSectionType[0],
    cardKey: string,
    animationIndex: number,
  ) => ReactNode;
};

/** One horizontal scroller for both rows on mobile; desktop uses arrow pagination. */
function DateRowsScroller({
  displayDates,
  itemsPerRow,
  firstRowCount,
  secondRowCount,
  pageOffset,
  narrowPreview,
  getDateRowJustifyClass,
  renderCard,
}: DateRowsScrollerProps) {
  const hasPartialRow =
    (firstRowCount > 0 && firstRowCount < itemsPerRow) ||
    (secondRowCount > 0 && secondRowCount < itemsPerRow);

  return (
    <div
      className={cn(
        "pb-2",
        hasPartialRow
          ? "overflow-visible"
          : cn(
              "overflow-x-auto [-webkit-overflow-scrolling:touch]",
              !narrowPreview && "sm:overflow-hidden",
            ),
      )}
    >
      <div
        className={cn(
          "flex flex-col",
          narrowPreview ? "gap-4" : "gap-4 sm:gap-5",
          hasPartialRow
            ? "w-full"
            : cn("inline-flex w-max", !narrowPreview && "sm:w-full"),
        )}
      >
        <div
          className={cn(
            "flex flex-nowrap items-center",
            getDateRowJustifyClass(firstRowCount),
            narrowPreview ? "gap-3" : "gap-3 sm:gap-5",
          )}
        >
          {Array.from({ length: firstRowCount }).map((_, i) => {
            const index = pageOffset + i;
            if (index >= displayDates.length) return null;
            return renderCard(displayDates[index], `first-${index}`, i);
          })}
        </div>
        {secondRowCount > 0 ? (
          <div
            className={cn(
              "flex flex-nowrap items-center",
              getDateRowJustifyClass(secondRowCount),
              narrowPreview ? "gap-3" : "gap-3 sm:gap-5",
            )}
          >
            {Array.from({ length: secondRowCount }).map((_, i) => {
              const index = pageOffset + itemsPerRow + i;
              if (index >= displayDates.length) return null;
              return renderCard(displayDates[index], `second-${index}`, i);
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DatesSection({
  dates,
  eventSlug,
  eventName,
  eventImage,
  roomId,
  roomIndex,
  headingEmphasis,
}: DatesSectionProps) {
  const currencySymbol = useCurrencySymbol();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatDateHandoffRan = useRef(false);
  const { data: session, status } = useSession();
  const { isOnboarding } = useOnboarding();
  const isPreviewMode = useIsPreviewMode();
  const narrowPreview = usePreviewNarrowLayout();
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
        onConfirmReplace?: () => void | Promise<void>,
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
  const { data: apiCartData, isLoading: isCartDataLoading } =
    useGetCartData(cartQueryEnabled);

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
    itemCount > 0 && itemCount < itemsPerRow
      ? "justify-center"
      : cn("justify-start", !narrowPreview && "sm:justify-center");

  const dateCardBodyClass = narrowPreview
    ? "p-2"
    : "p-2 sm:p-3";
  const dateCardDayClass = narrowPreview
    ? "mb-0.5 text-xs"
    : "mb-0.5 text-xs sm:mb-1 sm:text-sm";
  const dateCardNumberClass = narrowPreview
    ? "py-1 text-3xl font-bold"
    : "py-1 text-3xl font-bold sm:text-4xl md:text-5xl";
  const dateCardMonthClass = narrowPreview
    ? "text-xs"
    : "text-xs sm:text-sm";
  const sectionClass = cn(
    "relative w-full overflow-hidden rounded-3xl text-white transition-all duration-200",
    "bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_30%,#0a0014)] via-[color:color-mix(in_srgb,var(--color-primary)_15%,#0a0014)] to-[#0a0014]",
    narrowPreview ? "py-12" : "py-12 sm:py-16",
  );
  const headingClass = cn(
    "mb-0 !block !w-full !font-black",
    narrowPreview
      ? "!text-3xl"
      : "!text-3xl sm:!text-4xl md:!text-5xl",
  );
  const headerWrapClass = cn(
    "relative z-10 mb-6 flex w-full flex-col items-center gap-3 px-4 text-center",
    !narrowPreview && "sm:mb-8 sm:gap-4",
  );
  const cardsWrapClass = cn(
    "relative z-10 mx-auto w-full max-w-5xl px-2",
    !narrowPreview && "sm:px-8 md:px-12",
  );
  const loginCtaClass = cn(
    "mt-1 shrink-0 rounded-md border border-white/25 bg-[#1a1a24] !text-white shadow-sm hover:bg-[#26273a]",
    narrowPreview
      ? "px-6 py-1.5 text-xs"
      : "px-6 py-1.5 text-xs sm:px-8 sm:py-2 sm:text-sm",
  );

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

    const actualEventSlug = eventSlug || CHECKOUT_CONSTANTS.DEFAULT_EVENT_SLUG;
    const eventDate = dateItem.event_date;
    const actualEventName = eventName || "Festive & Fabulous";
    const actualEventImage =
      eventImage ||
      "http://192.168.1.100:8000/storage/uploads/vendor/events/event_banner_image68bab4bb983bd.jpg";

    // Guest: stash booking intent, then return to checkout after login
    if (status !== "authenticated" || !session?.user) {
      savePendingBooking({
        event_slug: actualEventSlug,
        event_name: actualEventName,
        event_image: actualEventImage,
        event_date: eventDate,
        ...(roomId != null && roomId > 0 ? { room_id: roomId } : {}),
      });
      saveAuthCallbackUrl("/vendor/checkout");
      clearDateSelection();
      router.push(
        `/auth/login?callbackUrl=${encodeURIComponent("/vendor/checkout")}`,
      );
      return;
    }

    const eventPayload = {
      event_slug: actualEventSlug,
      event_name: actualEventName,
      event_image: actualEventImage,
      event_date: eventDate,
    };

    // Check for cart conflicts BEFORE making API call (only if available).
    // On Replace, run the same store — backend removes other events (no delete).
    if (checkAndHandleConflict) {
      const canProceed = checkAndHandleConflict(
        actualEventSlug,
        {
          name: actualEventName,
          slug: actualEventSlug,
          image: actualEventImage,
        },
        () => proceedWithEvent(eventPayload),
      );

      if (!canProceed) {
        // Conflict detected - modal will be shown; Replace resumes store-only
        clearDateSelection();
        return;
      }
    }

    // No conflict, proceed with adding to cart
    proceedWithEvent(eventPayload);
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
      savePendingBooking({
        event_slug: eventData.event_slug,
        event_name: eventData.event_name,
        event_image: eventData.event_image,
        event_date: eventData.event_date,
        ...(roomId != null && roomId > 0 ? { room_id: roomId } : {}),
      });
      saveAuthCallbackUrl("/vendor/checkout");
      clearDateSelection();
      router.push(
        `/auth/login?callbackUrl=${encodeURIComponent("/vendor/checkout")}`,
      );
    }
  };

  useEffect(() => {
    if (isPreviewMode || isOnboarding || chatDateHandoffRan.current) return;
    const requested = parseChatHandoffDates(
      searchParams.get(CHECKOUT_HANDOFF_DATES),
    );
    if (requested.length === 0) return;

    const available = dates ?? [];
    const toAdd = requested
      .map((iso) =>
        available.find(
          (item) => isoDateKey(item.event_date) === iso && item.sold_out !== true,
        ),
      )
      .filter((item): item is DatesSectionType[0] => Boolean(item));
    if (toAdd.length === 0) return;

    chatDateHandoffRan.current = true;

    const pay = parseCheckoutHandoffPay(searchParams.get(CHECKOUT_HANDOFF_PAY));
    const coupon = searchParams.get(CHECKOUT_HANDOFF_COUPON)?.trim() || null;
    mergeCheckoutHandoffPending({ pay, coupon });
    const checkoutHref = buildCheckoutHandoffHref({ pay, coupon });

    const actualEventSlug = eventSlug || CHECKOUT_CONSTANTS.DEFAULT_EVENT_SLUG;
    const actualEventName = eventName || "Festive & Fabulous";
    const actualEventImage =
      eventImage ||
      "http://192.168.1.100:8000/storage/uploads/vendor/events/event_banner_image68bab4bb983bd.jpg";

    const user = session?.user as SessionUser | undefined;
    const isCustomer =
      status === "authenticated" &&
      user?.account_type === "customer" &&
      user?.active_role === "customer" &&
      Boolean(user?.token);

    if (!isCustomer) {
      savePendingBooking({
        event_slug: actualEventSlug,
        event_name: actualEventName,
        event_image: actualEventImage,
        event_date: toAdd[0].event_date,
        extra_dates: toAdd.slice(1).map((item) => item.event_date),
        ...(roomId != null && roomId > 0 ? { room_id: roomId } : {}),
      });
      saveAuthCallbackUrl(checkoutHref);
      router.push(
        `/auth/login?callbackUrl=${encodeURIComponent(checkoutHref)}`,
      );
      return;
    }

    void (async () => {
      try {
        for (const item of toAdd) {
          await storeEventBooking({
            data: {
              slug: normalizeSlug(actualEventSlug),
              event_date: item.event_date,
              ...(roomId != null && roomId > 0 ? { room_id: roomId } : {}),
              drink_package: [],
              tables: [],
              tickets: [],
            },
          });
        }
        router.push(checkoutHref);
      } catch (error) {
        console.error("Chat date handoff failed:", error);
        chatDateHandoffRan.current = false;
      }
    })();
  }, [
    dates,
    eventImage,
    eventName,
    eventSlug,
    isOnboarding,
    isPreviewMode,
    roomId,
    router,
    searchParams,
    session?.user,
    status,
    storeEventBooking,
  ]);

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
        className={getDateCardContainerClass(visual, narrowPreview)}
        key={cardKey}
        onClick={() => handleDateCardClick(dateItem, visual)}
        aria-busy={visual.isSelecting}
      >
        <div className={dateCardBodyClass}>
          <p className={dateCardDayClass}>{dateInfo.day}</p>
          <p className={dateCardNumberClass}>{dateInfo.date}</p>
          <p className={dateCardMonthClass}>{dateInfo.month}</p>
        </div>
        <div
          className={getDateCardFooterClass(visual, inCartStyle, narrowPreview)}
        >
          <DateCardFooterContent
            visual={visual}
            dateInfo={dateInfo}
            currencySymbol={currencySymbol}
            listPrice={
              typeof dateItem.price === "number" && !isNaN(dateItem.price)
                ? dateItem.price
                : 0
            }
            offer={
              !visual.isSoldOut && !visual.isInCart && !visual.isSelecting
                ? dateItem.offer
                : null
            }
            compact={narrowPreview}
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
        className={getDateCardContainerClass(visual, narrowPreview)}
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
        <div className={dateCardBodyClass}>
          <p className={dateCardDayClass}>{dateInfo.day}</p>
          <p className={dateCardNumberClass}>{dateInfo.date}</p>
          <p className={dateCardMonthClass}>{dateInfo.month}</p>
        </div>
        <div
          className={getDateCardFooterClass(visual, "primary", narrowPreview)}
        >
          <DateCardFooterContent
            visual={visual}
            dateInfo={dateInfo}
            currencySymbol={currencySymbol}
            listPrice={
              typeof dateItem.price === "number" && !isNaN(dateItem.price)
                ? dateItem.price
                : 0
            }
            offer={
              !visual.isSoldOut && !visual.isInCart && !visual.isSelecting
                ? dateItem.offer
                : null
            }
            compact={narrowPreview}
          />
        </div>
      </motion.div>
    );
  };

  // Live + preview: no fake placeholder dates. While editing dates with none yet, show a light empty cue.
  if (!dates?.length) {
    if (!isPreviewMode) return null;
    return (
      <section className={cn(sectionClass, "px-4 py-10")}>
        <div className={headerWrapClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            {sectionLabel}
          </p>
          <SiteHeading
            level={2}
            title={heading}
            variant="onDark"
            align="center"
            className={headingClass}
            emphasis={headingEmphasis as HeadingEmphasis | undefined}
          />
          <p className="text-sm text-white/70">
            Add dates in the form to preview them here.
          </p>
        </div>
      </section>
    );
  }

  const displayDates = dates;

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
      <section className={sectionClass}>
        <div className={headerWrapClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            {sectionLabel}
          </p>
          <SiteHeading
            level={2}
            title={heading}
            variant="onDark"
            align="center"
            className={headingClass}
            emphasis={headingEmphasis as HeadingEmphasis | undefined}
          />
          {showAlreadyBookedLoginCta && (
            <Button
              type="button"
              variant="outline"
              className={loginCtaClass}
              onClick={() => {
                if (!isPreviewMode) router.push("/auth/login");
              }}
            >
              {text}
            </Button>
          )}
        </div>

        <div className={cardsWrapClass}>
          {/* Left arrow - Only show if pagination is needed and not on first page */}
          {needsPagination && (
            <div
              className={cn(
                "absolute top-1/2 z-20 -translate-y-1/2 transform left-0",
                !narrowPreview && "sm:left-2",
              )}
            >
              <div
                className={cn(
                  "rounded-full bg-[#21223a] shadow-[0_0_10px_rgba(33,34,58,0.7)]",
                  narrowPreview ? "p-1" : "p-1 sm:p-2",
                  canGoLeft
                    ? "cursor-pointer hover:bg-[#2a2b4a]"
                    : "cursor-not-allowed opacity-30",
                )}
              >
                <CircleChevronLeft
                  className={cn(
                    "text-[#8f96c3]",
                    narrowPreview ? "h-7 w-7" : "h-7 w-7 sm:h-10 sm:w-10",
                  )}
                />
              </div>
            </div>
          )}

          {/* Date cards — single horizontal scroller (both rows) on mobile */}
          <DateRowsScroller
            displayDates={displayDates}
            itemsPerRow={itemsPerRow}
            firstRowCount={firstRowCount}
            secondRowCount={secondRowCount}
            pageOffset={0}
            narrowPreview={narrowPreview}
            getDateRowJustifyClass={getDateRowJustifyClass}
            renderCard={(dateItem, cardKey) =>
              renderStaticDateCard(dateItem, cardKey, "green")
            }
          />

          {/* Right arrow - Only show if pagination is needed */}
          {needsPagination && (
            <div
              className={cn(
                "absolute top-1/2 z-20 -translate-y-1/2 transform right-0",
                !narrowPreview && "sm:right-2",
              )}
            >
              <div
                className={cn(
                  "rounded-full bg-[#21223a] shadow-[0_0_10px_rgba(33,34,58,0.7)]",
                  narrowPreview ? "p-1" : "p-1 sm:p-2",
                  canGoRight
                    ? "cursor-pointer hover:bg-[#2a2b4a]"
                    : "cursor-not-allowed opacity-30",
                )}
              >
                <CircleChevronRight
                  className={cn(
                    "text-[#8f96c3]",
                    narrowPreview ? "h-7 w-7" : "h-7 w-7 sm:h-10 sm:w-10",
                  )}
                />
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
      className={sectionClass}
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

      <div className={headerWrapClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
          {sectionLabel}
        </p>
        <SiteHeading
          level={2}
          title={heading}
          variant="onDark"
          align="center"
          className={headingClass}
          emphasis={headingEmphasis as HeadingEmphasis | undefined}
        />
        {showAlreadyBookedLoginCta && (
          <Button
            type="button"
            variant="outline"
            className={loginCtaClass}
            onClick={() => {
              if (!isPreviewMode) router.push("/auth/login");
            }}
          >
            {text}
          </Button>
        )}
      </div>

      <div className={cardsWrapClass}>
        {needsPagination && (
          <div
            className={cn(
              "absolute top-1/2 z-20 -translate-y-1/2 transform left-0",
              !narrowPreview && "sm:left-2",
            )}
            onClick={() =>
              canGoLeft && setCurrentPage((prev) => Math.max(0, prev - 1))
            }
          >
            <div
              className={cn(
                "rounded-full bg-[#21223a] shadow-[0_0_10px_rgba(33,34,58,0.7)]",
                narrowPreview ? "p-1" : "p-1 sm:p-2",
                canGoLeft
                  ? "cursor-pointer hover:bg-[#2a2b4a]"
                  : "cursor-not-allowed opacity-30",
              )}
            >
              <CircleChevronLeft
                className={cn(
                  "text-[#8f96c3]",
                  narrowPreview ? "h-7 w-7" : "h-7 w-7 sm:h-10 sm:w-10",
                )}
              />
            </div>
          </div>
        )}

        <DateRowsScroller
          displayDates={displayDates}
          itemsPerRow={itemsPerRow}
          firstRowCount={firstRowCount}
          secondRowCount={secondRowCount}
          pageOffset={currentPage * itemsPerRow}
          narrowPreview={narrowPreview}
          getDateRowJustifyClass={getDateRowJustifyClass}
          renderCard={(dateItem, cardKey, animationIndex) =>
            renderAnimatedDateCard(dateItem, cardKey, animationIndex)
          }
        />

        {needsPagination && (
          <div
            className={cn(
              "absolute top-1/2 z-20 -translate-y-1/2 transform right-0",
              !narrowPreview && "sm:right-2",
            )}
            onClick={() => {
              if (canGoRight) {
                setCurrentPage((prev) => Math.min(maxPages, prev + 1));
              }
            }}
          >
            <div
              className={cn(
                "rounded-full bg-[#21223a] shadow-[0_0_10px_rgba(33,34,58,0.7)]",
                narrowPreview ? "p-1" : "p-1 sm:p-2",
                canGoRight
                  ? "cursor-pointer hover:bg-[#2a2b4a]"
                  : "cursor-not-allowed opacity-30",
              )}
            >
              <CircleChevronRight
                className={cn(
                  "text-[#8f96c3]",
                  narrowPreview ? "h-7 w-7" : "h-7 w-7 sm:h-10 sm:w-10",
                )}
              />
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
