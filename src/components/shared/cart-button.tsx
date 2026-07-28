"use client";

import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useIsPreviewMode } from "@/contexts/preview-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { detectAndFixStaleZustand } from "@/lib/utils/cart-sync-helper";
import { useCartVisibility } from "@/app/(public)/vendor/checkout/_lib/hooks/useCartVisibility";

interface CartButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  /** When false, hides the item-count badge. */
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

  const { summary: cartSummary, isLoading, apiCartData } = useCartVisibility({
    enabled: session?.user?.account_type === "customer" && !isPreviewMode,
  });

  useEffect(() => {
    if (!isLoading && apiCartData) {
      detectAndFixStaleZustand(apiCartData);
    }
  }, [apiCartData, isLoading]);

  const checkoutUrl = "/vendor/checkout";

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
                <ShoppingCart className={fullWidth ? "h-5 w-5" : "h-4 w-4"} />
                {cartSummary.hasItems && showBadge && !fullWidth && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full p-0 px-1 text-[10px] font-bold leading-none"
                  >
                    {cartSummary.badgeCount > 99
                      ? "99+"
                      : cartSummary.badgeCount}
                  </Badge>
                )}
              </span>
              {size !== "icon" && (
                <span className={fullWidth ? undefined : "hidden xl:inline"}>
                  Cart
                </span>
              )}
              {cartSummary.hasItems && showBadge && fullWidth ? (
                <Badge
                  variant="destructive"
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none"
                >
                  {cartSummary.badgeCount > 99
                    ? "99+"
                    : cartSummary.badgeCount}
                </Badge>
              ) : null}
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {cartSummary.hasItems
              ? cartSummary.totalDates > 0
                ? `${cartSummary.totalDates} date${
                    cartSummary.totalDates === 1 ? "" : "s"
                  } selected`
                : `${cartSummary.totalEvents} event${
                    cartSummary.totalEvents === 1 ? "" : "s"
                  } in cart`
              : "Cart is empty"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
