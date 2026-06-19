"use client";

import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGetCartData } from "@/services/customer/cart/query";
import {
  countEventCartDates,
  extractEventsFromApiResponse,
} from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { useMemo, useEffect } from "react";
import Link from "next/link";
import { ApiEventCartData } from "@/lib/types/cart.types";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useSession } from "next-auth/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { detectAndFixStaleZustand } from "@/lib/utils/cart-sync-helper";

interface CartButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  /** When false, hides the item-count badge (e.g. mobile drawer where count is redundant). */
  showBadge?: boolean;
  /** Stretch the control to full row width (mobile menu rows). */
  fullWidth?: boolean;
}

export default function CartButton({
  className = "",
  size = "default",
  showBadge = true,
  fullWidth = false,
}: CartButtonProps) {
  const isPreviewMode = useIsPreviewMode();
  const { data: session } = useSession();

  // Fetch cart data to show item count - only for authenticated customers and not in preview mode
  const { data: apiCartData, isLoading } = useGetCartData(
    session?.user?.account_type === "customer" && !isPreviewMode,
  );

  // Get editing state from Zustand store
  const { editingData } = useCartEditStore();

  // 🔄 SYNC FIX: Detect and fix stale Zustand data on component mount
  useEffect(() => {
    if (!isLoading && apiCartData) {
      const wasFixed = detectAndFixStaleZustand(apiCartData);
      if (wasFixed) {
        console.log("🎉 Stale cart data cleaned up successfully");
      }
    }
  }, [apiCartData, isLoading]);

  // Calculate total dates across all events (instead of total items)
  // 🔄 SYNC FIX: Always prioritize API data as source of truth, then validate against Zustand
  const cartSummary = useMemo(() => {
    // Step 1: Get API data (source of truth)
    if (isLoading) {
      console.log("🛒 Cart Button: Loading...");
      return { totalDates: 0, totalEvents: 0, hasItems: false };
    }

    const eventsArray = extractEventsFromApiResponse(apiCartData);
    let totalDatesFromAPI = 0;
    let totalEventsFromAPI = 0;

    eventsArray.forEach((event: ApiEventCartData) => {
      const dateCount = countEventCartDates(event);
      if (dateCount > 0) {
        totalDatesFromAPI += dateCount;
        totalEventsFromAPI++;
      }
    });

    // Step 2: Check Zustand for unsaved changes (overlay on top of API data)
    let totalDatesFromEditing = 0;
    let totalEventsFromEditing = 0;

    if (editingData && Object.keys(editingData).length > 0) {
      Object.values(editingData).forEach((eventData) => {
        // Simply count all dates in this event (no heavy calculations)
        const dateCount = Object.keys(eventData).length;
        if (dateCount > 0) {
          totalDatesFromEditing += dateCount;
          totalEventsFromEditing++;
        }
      });
    }

    // Step 3: Use API data as base, but show editing data if it has MORE dates (unsaved additions)
    // This ensures the badge is accurate with the backend state
    const finalTotalDates = Math.max(totalDatesFromAPI, totalDatesFromEditing);
    const finalTotalEvents = Math.max(
      totalEventsFromAPI,
      totalEventsFromEditing,
    );

    console.log("🛒 Cart Button Sync:", {
      apiDates: totalDatesFromAPI,
      zustandDates: totalDatesFromEditing,
      finalDates: finalTotalDates,
      apiEvents: totalEventsFromAPI,
      zustandEvents: totalEventsFromEditing,
    });

    // ⚠️ CRITICAL FIX: If API is empty but Zustand has data, Zustand is stale
    if (totalDatesFromAPI === 0 && totalDatesFromEditing > 0) {
      console.warn(
        "🚨 Zustand cart is stale! API is empty but Zustand has data. This will be cleared on next cart sync.",
      );
      // Return API state (empty) as source of truth
      return {
        totalDates: 0,
        totalEvents: 0,
        hasItems: false,
      };
    }

    return {
      totalDates: finalTotalDates,
      totalEvents: finalTotalEvents,
      hasItems: finalTotalDates > 0,
    };
  }, [apiCartData, isLoading, editingData]);

  // Generate simple checkout URL without parameters
  const checkoutUrl = useMemo(() => {
    // Always use simple checkout URL - the checkout page will determine current cart state from API data
    return "/vendor/checkout";
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={checkoutUrl}
            className={fullWidth ? "relative block w-full" : "relative"}
          >
            <div
              className={`flex items-center gap-1 transition-colors ${className}`}
              style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
            >
              <span className="relative inline-flex shrink-0">
                <ShoppingCart className="h-4 w-4" />
                {cartSummary.hasItems && showBadge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full p-0 px-1 text-[10px] font-bold leading-none"
                  >
                    {cartSummary.totalDates > 99
                      ? "99+"
                      : cartSummary.totalDates}
                  </Badge>
                )}
              </span>
              {size !== "icon" && <span className="inline">Cart</span>}
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {cartSummary.hasItems
              ? `${cartSummary.totalDates} date${
                  cartSummary.totalDates === 1 ? "" : "s"
                } selected`
              : "Cart is empty"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
