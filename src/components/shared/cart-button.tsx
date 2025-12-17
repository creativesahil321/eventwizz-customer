"use client";

import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGetCartData } from "@/services/customer/cart/query";
import { extractEventsFromApiResponse } from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { useMemo } from "react";
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

interface CartButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export default function CartButton({
  className = "",
  size = "default",
}: CartButtonProps) {
  const isPreviewMode = useIsPreviewMode();
  const { data: session } = useSession();

  // Fetch cart data to show item count - only for authenticated customers and not in preview mode
  const { data: apiCartData, isLoading } = useGetCartData(
    session?.user?.account_type === "customer" && !isPreviewMode
  );

  // Get editing state from Zustand store
  const { editingData } = useCartEditStore();

  // Calculate total dates across all events (instead of total items)
  const cartSummary = useMemo(() => {
    // First check if we have editing data (local state) - this takes priority
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

    // If we have editing data with items, use that (local changes take priority)
    if (totalDatesFromEditing > 0) {
      console.log("🛒 Cart Button: Using editing data", {
        totalDatesFromEditing,
        totalEventsFromEditing,
        editingDataKeys: Object.keys(editingData),
      });
      return {
        totalDates: totalDatesFromEditing,
        totalEvents: totalEventsFromEditing,
        hasItems: true,
      };
    }

    // Otherwise, fall back to API data
    if (!apiCartData || isLoading) {
      console.log("🛒 Cart Button: No data available", {
        apiCartData: !!apiCartData,
        isLoading,
      });
      return { totalDates: 0, totalEvents: 0, hasItems: false };
    }

    const eventsArray = extractEventsFromApiResponse(apiCartData);
    let totalDates = 0;
    let totalEvents = 0;

    eventsArray.forEach((event: ApiEventCartData) => {
      // Get all date keys (excluding metadata keys)
      const dateKeys = Object.keys(event).filter(
        (key) =>
          ![
            "event_name",
            "event_slug",
            "event_image",
            "vendor_event_id",
            "drinks",
            "payment_gateways",
          ].includes(key)
      );

      // Simply count all date keys (no heavy calculations)
      if (dateKeys.length > 0) {
        totalDates += dateKeys.length;
        totalEvents++;
      }
    });

    console.log("🛒 Cart Button: Using API data", {
      totalDates,
      totalEvents,
      apiDataKeys: Object.keys(apiCartData || {}),
    });

    return {
      totalDates,
      totalEvents,
      hasItems: totalDates > 0,
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
          <Link href={checkoutUrl} className="relative">
            <div
              className={`flex items-center gap-1 transition-colors ${className}`}
              style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
            >
              <ShoppingCart className="h-4 w-4" />
              {size !== "icon" && <span className="inline">Cart</span>}

              {/* Cart date count badge */}
              {cartSummary.hasItems && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
                >
                  {cartSummary.totalDates > 99 ? "99+" : cartSummary.totalDates}
                </Badge>
              )}
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
