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
    <div className="flex items-center gap-1.5">
      <AnimatePresence>
        {quantity > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: "auto" }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex items-center gap-1.5"
          >
            {/* Decrease Button */}
            <button
              className={`${buttonSize} flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
              onClick={onDecrease}
              disabled={!canDecrease}
              aria-label="Decrease quantity"
            >
              <Minus className={iconSize} />
            </button>

            {/* Quantity Display */}
            <motion.div
              key={quantity}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.12 }}
              className={`${size === "sm" ? "min-w-[1.75rem] text-sm" : "min-w-[2rem] text-base"} text-center font-semibold text-gray-900 tabular-nums`}
            >
              {quantity}
            </motion.div>

            {/* Increase Button */}
            <button
              className={`${buttonSize} flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
              onClick={onIncrease}
              disabled={!canIncrease}
              aria-label="Increase quantity"
            >
              <Plus className={iconSize} />
            </button>

            {/* Remove Button */}
            {showRemove && (
              <button
                className={`${buttonSize} flex items-center justify-center rounded-lg text-gray-300 transition-all duration-150 hover:text-red-500 hover:bg-red-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ml-0.5`}
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

      {/* Add Button (shown when quantity is 0) — now shows price preview */}
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
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-blue-600 text-white text-sm font-medium transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
              {priceLabel && (
                <>
                  <span className="w-px h-3.5 bg-blue-400/50" />
                  <span className="text-blue-100 font-normal text-xs">{priceLabel}</span>
                </>
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
