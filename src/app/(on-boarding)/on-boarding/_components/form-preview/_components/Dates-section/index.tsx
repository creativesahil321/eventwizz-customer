"use client";

import { Button } from "@/components/ui/button";
import { CircleChevronLeft, CircleChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CHECKOUT_CONSTANTS } from "@/app/(public)/vendor/checkout/_lib/constants";
// Professional API-only approach - no cart store needed
import { useStoreEventBooking } from "@/services/customer/cart/query";
import { CartRequest } from "@/services/customer/cart/type";
import { toast } from "sonner";
import { normalizeSlug } from "@/lib/utils";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useCartConflictCheck } from "@/app/(public)/vendor/checkout/_components/cart-conflict-provider";
import { useGetCartData } from "@/services/customer/cart/query";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { addCacheBusting } from "@/lib/image-utils";

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
};

export default function DatesSection({
  dates,
  eventSlug,
  eventName,
  eventImage,
}: DatesSectionProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isOnboarding } = useOnboarding();
  const isPreviewMode = useIsPreviewMode();
  // Professional API-only approach - no local cart state needed
  const { mutateAsync: storeEventBooking, isPending } = useStoreEventBooking();
  const { selectedDrinks } = useDrinkSelectionStore();

  // Use Zustand store instead of direct localStorage access
  const { getDateData } = useCartEditStore();

  // Cart conflict detection - conditional based on onboarding status
  let checkAndHandleConflict:
    | ((
        eventSlug: string,
        eventInfo: { name: string; slug: string; image: string }
      ) => boolean)
    | null = null;

  try {
    const cartConflictHook = useCartConflictCheck();
    // Only use cart conflict if not in onboarding
    if (!isOnboarding) {
      checkAndHandleConflict = cartConflictHook.checkAndHandleConflict;
    }
  } catch {
    // Cart conflict context not available - this is expected in some contexts
    console.log("Cart conflict context not available");
  }

  // Cart data fetching - conditional based on onboarding status and preview mode
  try {
    // Only fetch cart data if not in onboarding AND not in preview mode
    useGetCartData(
      !isOnboarding && status === "authenticated" && !isPreviewMode
    );
  } catch {
    // Cart data not available - this is expected in some contexts
    console.log("Cart data not available");
  }

  // Get cart data to check if dates are already in cart (for future use)
  // const { data: apiCartData } = useGetCartData();
  const heading = "Book Your Places Now";
  const text = "Already Booked? Log In Here";
  const [isVisible, setIsVisible] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  // Professional API-only approach - no conflict modal needed
  const itemsPerRow = 5; // Number of items to display per row
  const datesPerPage = itemsPerRow * 2; // Total dates visible per page (2 rows)

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

  // Animation visibility trigger - reduced delay for smoother transition
  useEffect(() => {
    if (!isClient) return;
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [isClient]);

  // Helper function to check if a date is already in cart
  const isDateInCart = useCallback(
    (dateToCheck: string): boolean => {
      if (!eventSlug) {
        return false;
      }

      try {
        // Decode URL-encoded eventSlug to match storage format
        const decodedEventSlug = decodeURIComponent(eventSlug);

        // Use Zustand store instead of direct localStorage access
        const dateData = getDateData(decodedEventSlug, dateToCheck);

        // Simply check if the date exists in cart storage
        const isInCart = !!dateData;

        return isInCart;
      } catch (error) {
        console.error("Error checking cart data:", error);
        return false;
      }
    },
    [eventSlug, getDateData]
  );

  // Handle date card click - add to cart and redirect to checkout
  const handleDateClick = (dateItem: DatesSectionType[0]) => {
    // Check if this date is already in cart
    if (isDateInCart(dateItem.event_date)) {
      toast.info("This date is already in your cart!");
      // Redirect to simple checkout page to manage existing cart items
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
          // Initially empty - user will add items in checkout page
          drink_package: selectedDrinks.filter((drink) => drink.quantity > 0),
          tables: [],
          tickets: [],
        };

        // Make POST API call to store initial cart data and wait for response
        try {
          const response = await storeEventBooking(cartData);

          if (response?.status === true) {
            // API call succeeded - API interceptor already shows success toast
            // Professional API-only approach - no local storage needed

            // Navigate directly to simple checkout page
            router.push("/vendor/checkout");
          } else {
            console.error("Failed to select event. Please try again.");
          }
        } catch (error) {
          console.error("Error storing event data:", error);
          console.error("Failed to select event. Please try again.");
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
    // Create a new date object with proper timezone handling
    const dateObj = new Date(`${dateItem.event_date}T12:00:00`);

    // Get day name and month
    const day = dateObj.toLocaleString("default", { weekday: "long" });
    const month = dateObj.toLocaleString("default", { month: "long" });
    const dateNum = dateObj.getDate();

    // Ensure price is a valid number before calling toFixed
    const price =
      typeof dateItem.price === "number" && !isNaN(dateItem.price)
        ? dateItem.price
        : 0;

    return {
      day,
      month,
      date: dateNum,
      price: price.toFixed(0),
    };
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

  // Check if pagination is needed
  const needsPagination = displayDates.length > datesPerPage;
  const maxPages = Math.ceil(displayDates.length / datesPerPage) - 1;
  const canGoLeft = needsPagination && currentPage > 0;
  const canGoRight = needsPagination && currentPage < maxPages;

  // Floating particles animation - only rendered client-side
  const particles = isClient
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
      <section className="w-full py-8 sm:py-10 text-white rounded-lg overflow-hidden relative bg-black transition-all duration-200">
        <div className="w-full text-center relative z-10 mb-4 sm:mb-6 px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {heading}
          </h2>
          <Button
            className="bg-[#1a1a24] hover:bg-[#26273a] text-white py-1 sm:py-1.5 px-6 sm:px-8 rounded-md text-xs sm:text-sm border border-[#333450]"
            onClick={() => router.push("/auth/login")}
          >
            {text}
          </Button>
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
              <div className="flex justify-start sm:justify-center items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2 mb-4 sm:mb-5">
                {Array.from({
                  length: Math.min(itemsPerRow, displayDates.length),
                }).map((_, i) => {
                  const index = i;
                  if (index >= displayDates.length) return null;

                  const dateItem = displayDates[index];
                  const dateInfo = getDateInfo(dateItem);
                  const isInCart = isDateInCart(dateItem.event_date);
                  const isSoldOut = dateItem.sold_out === true;

                  return (
                    <div
                      className={`border rounded-sm overflow-hidden text-center w-[85px] sm:w-[100px] md:w-[120px] flex-shrink-0 transition-all duration-300 ${
                        isSoldOut
                          ? "border-red-500/60 cursor-not-allowed bg-slate-900/40 backdrop-blur-sm opacity-80 shadow-[0_0_25px_rgba(239,68,68,0.45)]"
                          : isInCart
                          ? "border-[var(--color-primary)] bg-black/20 backdrop-blur-sm opacity-95 cursor-pointer shadow-[0_0_20px_var(--color-primary)]/30"
                          : isPending
                          ? "border-[var(--color-primary)] opacity-50 cursor-not-allowed shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent"
                          : "border-[var(--color-primary)] cursor-pointer shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent hover:shadow-[0_0_25px_rgba(60,70,147,0.5)] hover:border-[var(--color-primary)] hover:bg-gradient-to-b hover:from-[var(--color-primary)]/10 hover:to-transparent"
                      }`}
                      key={`first-${index}`}
                      onClick={() => {
                        if (isSoldOut) return; // Don't allow clicks on sold out dates
                        if (!isPending && !isInCart) {
                          handleDateClick(dateItem);
                        } else if (isInCart) {
                          handleDateClick(dateItem); // This will redirect to checkout
                        }
                      }}
                    >
                      <div className="p-2 sm:p-3">
                        <p className="text-xs sm:text-sm mb-0.5 sm:mb-1">
                          {dateInfo.day}
                        </p>
                        <p className="text-3xl sm:text-4xl md:text-5xl font-bold py-1">
                          {dateInfo.date}
                        </p>
                        <p className="text-xs sm:text-sm">{dateInfo.month}</p>
                      </div>
                      <div
                        className={`text-white text-sm sm:text-base tracking-wider py-1 sm:py-1.5 transition-all duration-300 ${
                          isSoldOut
                            ? "bg-gradient-to-b from-red-600 to-red-800 text-white font-semibold border-t border-red-500/40 tracking-wide"
                            : isInCart
                            ? "bg-gradient-to-b from-green-500 to-green-700"
                            : "bg-gradient-to-b from-[var(--color-primary)] to-[#232a61] hover:from-[var(--color-primary)]/90 hover:to-[#232a61]/90 hover:shadow-lg"
                        }`}
                      >
                        {isSoldOut
                          ? "SOLD OUT"
                          : isInCart
                          ? "VIEW CART"
                          : `£${dateInfo.price}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Second row of date cards */}
              <div className="flex justify-start sm:justify-center items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2">
                {Array.from({
                  length: Math.min(
                    itemsPerRow,
                    displayDates.length - itemsPerRow
                  ),
                }).map((_, i) => {
                  const index = itemsPerRow + i;
                  if (index >= displayDates.length) return null;

                  const dateItem = displayDates[index];
                  const dateInfo = getDateInfo(dateItem);
                  const isInCart = isDateInCart(dateItem.event_date);
                  const isSoldOut = dateItem.sold_out === true;

                  return (
                    <div
                      className={`border rounded-sm overflow-hidden text-center w-[85px] sm:w-[100px] md:w-[120px] flex-shrink-0 transition-all duration-300 ${
                        isSoldOut
                          ? "border-red-500/60 cursor-not-allowed bg-slate-900/40 backdrop-blur-sm opacity-80 shadow-[0_0_25px_rgba(239,68,68,0.45)]"
                          : isInCart
                          ? "border-[var(--color-primary)] bg-black/20 backdrop-blur-sm opacity-95 cursor-pointer shadow-[0_0_20px_var(--color-primary)]/30"
                          : isPending
                          ? "border-[var(--color-primary)] opacity-50 cursor-not-allowed shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent"
                          : "border-[var(--color-primary)] cursor-pointer shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent hover:shadow-[0_0_25px_rgba(60,70,147,0.5)] hover:border-[var(--color-primary)] hover:bg-gradient-to-b hover:from-[var(--color-primary)]/10 hover:to-transparent"
                      }`}
                      key={`second-${index}`}
                      onClick={() => {
                        if (isSoldOut) return; // Don't allow clicks on sold out dates
                        if (!isPending && !isInCart) {
                          handleDateClick(dateItem);
                        } else if (isInCart) {
                          handleDateClick(dateItem); // This will redirect to checkout
                        }
                      }}
                    >
                      <div className="p-2 sm:p-3">
                        <p className="text-xs sm:text-sm mb-0.5 sm:mb-1">
                          {dateInfo.day}
                        </p>
                        <p className="text-3xl sm:text-4xl md:text-5xl font-bold py-1">
                          {dateInfo.date}
                        </p>
                        <p className="text-xs sm:text-sm">{dateInfo.month}</p>
                      </div>
                      <div
                        className={`text-white text-sm sm:text-base tracking-wider py-1 sm:py-1.5 transition-all duration-300 ${
                          isSoldOut
                            ? "bg-gradient-to-b from-red-600 to-red-800 text-white font-semibold border-t border-red-500/40 tracking-wide"
                            : isInCart
                            ? "bg-gradient-to-b from-green-500 to-green-700"
                            : "bg-gradient-to-b from-[var(--color-primary)] to-[#232a61] hover:from-[var(--color-primary)]/90 hover:to-[#232a61]/90 hover:shadow-lg"
                        }`}
                      >
                        {isSoldOut
                          ? "SOLD OUT"
                          : isInCart
                          ? "VIEW CART"
                          : `£${dateInfo.price}`}
                      </div>
                    </div>
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
      className="w-full py-8 sm:py-10 text-white overflow-hidden relative transition-all duration-200"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background - completely black with subtle pattern */}
      <div className="absolute inset-0 z-0">
        <img
          src={addCacheBusting("/assets/images/events/event-date-banner.jpg")}
          alt="Event background"
          className="absolute inset-0 w-full h-full object-cover"
        />
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

      <div className="w-full text-center relative z-10 mb-4 sm:mb-6 px-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
          {heading}
        </h2>
        <Button
          className="bg-[#1a1a24] hover:bg-[#26273a] text-white py-1 sm:py-1.5 px-6 sm:px-8 rounded-md text-xs sm:text-sm border border-[#333450]"
          onClick={() => router.push("/auth/login")}
        >
          {text}
        </Button>
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
        <div className="overflow-hidden">
          {/* First row of date cards */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex justify-start sm:justify-center items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2 mb-4 sm:mb-5">
              {Array.from({
                length: Math.min(itemsPerRow, displayDates.length),
              }).map((_, i) => {
                const index = currentPage * itemsPerRow + i;
                if (index >= displayDates.length) return null;

                const dateItem = displayDates[index];
                const dateInfo = getDateInfo(dateItem);
                const isInCart = isDateInCart(dateItem.event_date);
                const isSoldOut = dateItem.sold_out === true;

                return (
                  <motion.div
                    className={`border rounded-sm overflow-hidden text-center w-[85px] sm:w-[100px] md:w-[120px] flex-shrink-0 transition-all duration-300 ${
                      isSoldOut
                        ? "border-red-500/60 cursor-not-allowed bg-slate-900/40 backdrop-blur-sm opacity-80 shadow-[0_0_25px_rgba(239,68,68,0.45)]"
                        : isInCart
                        ? "border-[var(--color-primary)] bg-black/20 backdrop-blur-sm opacity-95 cursor-pointer shadow-[0_0_20px_var(--color-primary)]/30"
                        : isPending
                        ? "border-[var(--color-primary)] opacity-50 cursor-not-allowed shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent"
                        : "border-[var(--color-primary)] cursor-pointer shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent hover:shadow-[0_0_25px_rgba(60,70,147,0.5)] hover:border-[var(--color-primary)] hover:bg-gradient-to-b hover:from-[var(--color-primary)]/10 hover:to-transparent"
                    }`}
                    key={`first-${index}`}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{
                      opacity: isPending ? 0.5 : isSoldOut ? 0.75 : 1,
                      y: 0,
                    }}
                    transition={{ duration: 0.1, delay: i * 0.02 }}
                    whileHover={{
                      scale: isPending || isInCart || isSoldOut ? 1 : 1.02,
                      boxShadow:
                        isPending || isInCart || isSoldOut
                          ? "none"
                          : "0 0 25px rgba(60,70,147,0.5)",
                      transition: { duration: 0.2 },
                    }}
                    whileTap={{
                      scale: isPending || isInCart || isSoldOut ? 1 : 0.98,
                    }}
                    onClick={() => {
                      if (isSoldOut) return; // Don't allow clicks on sold out dates
                      if (!isPending && !isInCart) {
                        handleDateClick(dateItem);
                      } else if (isInCart) {
                        handleDateClick(dateItem); // This will redirect to checkout
                      }
                    }}
                  >
                    <div className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm mb-0.5 sm:mb-1">
                        {dateInfo.day}
                      </p>
                      <p className="text-3xl sm:text-4xl md:text-5xl font-bold py-1">
                        {dateInfo.date}
                      </p>
                      <p className="text-xs sm:text-sm">{dateInfo.month}</p>
                    </div>
                    <div
                      className={`text-white text-sm sm:text-base tracking-wider py-1 sm:py-1.5 transition-all duration-300 ${
                        isSoldOut
                          ? "bg-gradient-to-b from-red-600 to-red-800 text-white font-semibold border-t border-red-500/40 tracking-wide"
                          : isInCart
                          ? "bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white font-semibold shadow-lg"
                          : "bg-gradient-to-b from-[var(--color-primary)] to-[#232a61] hover:from-[var(--color-primary)]/90 hover:to-[#232a61]/90 hover:shadow-lg"
                      }`}
                    >
                      {isSoldOut
                        ? "SOLD OUT"
                        : isInCart
                        ? "VIEW CART"
                        : `£${dateInfo.price}`}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Second row of date cards */}
            <div className="flex justify-start sm:justify-center items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2">
              {Array.from({
                length: Math.min(
                  itemsPerRow,
                  displayDates.length - itemsPerRow
                ),
              }).map((_, i) => {
                const index = currentPage * itemsPerRow + itemsPerRow + i;
                if (index >= displayDates.length) return null;

                const dateItem = displayDates[index];
                const dateInfo = getDateInfo(dateItem);
                const isInCart = isDateInCart(dateItem.event_date);
                const isSoldOut = dateItem.sold_out === true;

                return (
                  <motion.div
                    className={`border rounded-sm overflow-hidden text-center w-[85px] sm:w-[100px] md:w-[120px] flex-shrink-0 transition-all duration-300 ${
                      isSoldOut
                        ? "border-red-500/60 cursor-not-allowed bg-slate-900/40 backdrop-blur-sm opacity-80 shadow-[0_0_25px_rgba(239,68,68,0.45)]"
                        : isInCart
                        ? "border-[var(--color-primary)] bg-black/20 backdrop-blur-sm opacity-95 cursor-pointer shadow-[0_0_20px_var(--color-primary)]/30"
                        : isPending
                        ? "border-[var(--color-primary)] opacity-50 cursor-not-allowed shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent"
                        : "border-[var(--color-primary)] cursor-pointer shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent hover:shadow-[0_0_25px_rgba(60,70,147,0.5)] hover:border-[var(--color-primary)] hover:bg-gradient-to-b hover:from-[var(--color-primary)]/10 hover:to-transparent"
                    }`}
                    key={`second-${index}`}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{
                      opacity: isPending ? 0.5 : 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.1,
                      delay: i * 0.02,
                    }}
                    whileHover={{
                      scale: isPending || isInCart || isSoldOut ? 1 : 1.02,
                      boxShadow:
                        isPending || isInCart || isSoldOut
                          ? "none"
                          : "0 0 25px rgba(60,70,147,0.5)",
                      transition: { duration: 0.2 },
                    }}
                    whileTap={{
                      scale: isPending || isInCart || isSoldOut ? 1 : 0.98,
                    }}
                    onClick={() => {
                      if (isSoldOut) return; // Don't allow clicks on sold out dates
                      if (!isPending && !isInCart) {
                        handleDateClick(dateItem);
                      } else if (isInCart) {
                        handleDateClick(dateItem); // This will redirect to checkout
                      }
                    }}
                  >
                    <div className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm mb-0.5 sm:mb-1">
                        {dateInfo.day}
                      </p>
                      <p className="text-3xl sm:text-4xl md:text-5xl font-bold py-1">
                        {dateInfo.date}
                      </p>
                      <p className="text-xs sm:text-sm">{dateInfo.month}</p>
                    </div>
                    <div
                      className={`text-white text-sm sm:text-base tracking-wider py-1 sm:py-1.5 transition-all duration-300 ${
                        isSoldOut
                          ? "bg-gradient-to-b from-red-600 to-red-800 text-white font-semibold border-t border-red-500/40 tracking-wide"
                          : isInCart
                          ? "bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white font-semibold shadow-lg"
                          : "bg-gradient-to-b from-[var(--color-primary)] to-[#232a61] hover:from-[var(--color-primary)]/90 hover:to-[#232a61]/90 hover:shadow-lg"
                      }`}
                    >
                      {isSoldOut
                        ? "SOLD OUT"
                        : isInCart
                        ? "VIEW CART"
                        : `£${dateInfo.price}`}
                    </div>
                  </motion.div>
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
