/**
 * Add to Cart Button with Conflict Detection
 *
 * Enhanced button component that checks for cart conflicts before allowing
 * users to add items from different events. Shows professional conflict
 * resolution modal when needed.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCartConflictCheck } from "./cart-conflict-provider";
import { EventInfo } from "../_lib/hooks/useCartConflict";
import { CUSTOMER_CHECKOUT_PATH } from "@/lib/customer-checkout-path";

interface AddToCartButtonProps {
  event: EventInfo;
  selectedItems?: {
    tables?: Array<{ id: number; quantity: number }>;
    tickets?: Array<{ id: number; quantity: number }>;
    drinks?: Array<{ title: string; quantity: number; price: number }>;
  };
  onAddToCart?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function AddToCartButton({
  event,
  selectedItems,
  onAddToCart,
  disabled = false,
  className,
  variant = "default",
  size = "default",
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();
  const { checkAndHandleConflict } = useCartConflictCheck();

  const handleAddToCart = async () => {
    if (disabled || isAdding) return;

    setIsAdding(true);

    try {
      const addToCart = async () => {
        if (onAddToCart) {
          await onAddToCart();
        } else {
          router.push(CUSTOMER_CHECKOUT_PATH);
        }
      };

      // Check for cart conflicts first. On Replace, resume add/store only
      // (backend removes other events — no delete API).
      const canProceed = checkAndHandleConflict(event.slug, event, addToCart);

      if (!canProceed) {
        // Conflict detected - modal will be shown; Replace resumes store-only
        setIsAdding(false);
        return;
      }

      await addToCart();
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  // Calculate if there are items selected
  const hasSelectedItems = Boolean(
    selectedItems?.tables?.some((t) => t.quantity > 0) ||
      selectedItems?.tickets?.some((t) => t.quantity > 0) ||
      selectedItems?.drinks?.some((d) => d.quantity > 0)
  );

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      variant={variant}
      size={size}
      className={className}
    >
      {isAdding ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Adding to Cart...
        </>
      ) : (
        <>
          {hasSelectedItems ? (
            <ShoppingCart className="w-4 h-4 mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {hasSelectedItems ? "Add to Cart" : "Select Items"}
        </>
      )}
    </Button>
  );
}

/**
 * Simple Add to Cart Button for quick actions
 * Use this when you just need a basic button without complex item selection
 */
export function SimpleAddToCartButton({
  event,
  ...props
}: Omit<AddToCartButtonProps, "selectedItems">) {
  return <AddToCartButton event={event} {...props} />;
}

/**
 * Cart Conflict Warning Component
 * Shows a warning when user is viewing a different event but has items in cart
 */
export function CartConflictWarning({
  currentEventSlug,
}: {
  currentEventSlug: string;
}) {
  const { checkAndHandleConflict } = useCartConflictCheck();

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-orange-900 mb-1">
            Cart Conflict Notice
          </h4>
          <p className="text-sm text-orange-700 mb-3">
            You have items from another event in your cart. You can only book
            one event at a time.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // This will show the conflict modal
                checkAndHandleConflict(currentEventSlug, {
                  name: currentEventSlug
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase()),
                  slug: currentEventSlug,
                });
              }}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Resolve Conflict
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
