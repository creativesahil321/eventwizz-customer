/**
 * Refined Quantity Controls Component
 * Cleaner visual design with smooth animations
 * Enhanced: Add button shows price preview for zero-quantity items
 */

import { Minus, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuantityControlsProps {
  quantity: number;
  maxQuantity?: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  disabled?: boolean;
  showRemove?: boolean;
  size?: "sm" | "default";
  /** Optional price to show on the Add button */
  priceLabel?: string;
}

export default function QuantityControls({
  quantity,
  maxQuantity,
  onIncrease,
  onDecrease,
  onRemove,
  disabled = false,
  showRemove = true,
  size = "default",
  priceLabel,
}: QuantityControlsProps) {
  const buttonSize = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-3.5 h-3.5";

  const canIncrease = !disabled && (!maxQuantity || quantity < maxQuantity);
  const canDecrease = !disabled && quantity > 0;

  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
      <AnimatePresence>
        {quantity > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex items-center gap-0.5 rounded-lg border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/60 p-0.5"
          >
            <button
              className={`${buttonSize} flex items-center justify-center rounded-md bg-white text-[color:var(--checkout-muted-foreground)] transition-all duration-150 hover:text-[color:var(--checkout-foreground)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
              onClick={onDecrease}
              disabled={!canDecrease}
              aria-label="Decrease quantity"
            >
              <Minus className={iconSize} />
            </button>

            <motion.div
              key={quantity}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.12 }}
              className={`${size === "sm" ? "min-w-[1.75rem] text-sm" : "min-w-[2rem] text-base"} px-1 text-center font-bold text-[color:var(--checkout-foreground)] tabular-nums`}
            >
              {quantity}
            </motion.div>

            <button
              className={`${buttonSize} flex items-center justify-center rounded-md bg-white text-[color:var(--checkout-muted-foreground)] transition-all duration-150 hover:text-[color:var(--checkout-brand-accent)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
              onClick={onIncrease}
              disabled={!canIncrease}
              aria-label="Increase quantity"
            >
              <Plus className={iconSize} />
            </button>

            {showRemove && (
              <button
                className={`${buttonSize} flex items-center justify-center rounded-md text-[color:var(--checkout-muted-foreground)] transition-all duration-150 hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
                onClick={onRemove}
                disabled={disabled}
                aria-label="Remove item"
              >
                <Trash2 className={iconSize} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quantity === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={onIncrease}
              disabled={!canIncrease}
              className="flex h-9 max-w-full items-center gap-1.5 rounded-lg border border-[color:var(--checkout-border)] bg-white px-2.5 text-sm font-semibold text-[color:var(--checkout-brand-accent)] transition-all duration-200 hover:bg-[color:var(--checkout-muted)]/50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none sm:px-3"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Add</span>
              {priceLabel && (
                <span className="hidden text-xs font-medium text-[color:var(--checkout-muted-foreground)] min-[380px]:inline">
                  {priceLabel}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capacity Warning */}
      {maxQuantity && quantity >= maxQuantity && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-medium"
        >
          Max
        </motion.div>
      )}
    </div>
  );
}
