/**
 * Professional Quantity Controls Component
 * Handles +/- buttons with smooth animations and validation
 */

import { Button } from "@/components/ui/button";
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
}: QuantityControlsProps) {
  const buttonSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  const canIncrease = !disabled && (!maxQuantity || quantity < maxQuantity);
  const canDecrease = !disabled && quantity > 0;

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence>
        {quantity > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: "auto" }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex items-center gap-2"
          >
            {/* Decrease Button */}
            <Button
              variant="outline"
              size="icon"
              className={`${buttonSize} border-gray-300 hover:border-red-400 hover:bg-red-50 transition-colors`}
              onClick={onDecrease}
              disabled={!canDecrease}
              aria-label="Decrease quantity"
            >
              <Minus className={iconSize} />
            </Button>

            {/* Quantity Display */}
            <motion.div
              key={quantity}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
              className="min-w-[2rem] text-center font-semibold text-lg"
              style={{ color: "var(--color-primary)" }}
            >
              {quantity}
            </motion.div>

            {/* Increase Button */}
            <Button
              variant="outline"
              size="icon"
              className={`${buttonSize} border-gray-300 hover:border-green-400 hover:bg-green-50 transition-colors`}
              onClick={onIncrease}
              disabled={!canIncrease}
              aria-label="Increase quantity"
            >
              <Plus className={iconSize} />
            </Button>

            {/* Remove Button */}
            {showRemove && (
              <Button
                variant="ghost"
                size="icon"
                className={`${buttonSize} text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors ml-2`}
                onClick={onRemove}
                disabled={disabled}
                aria-label="Remove item"
              >
                <Trash2 className={iconSize} />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button (shown when quantity is 0) */}
      <AnimatePresence>
        {quantity === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="event-outline"
              size={size}
              onClick={onIncrease}
              disabled={!canIncrease}
              className="transition-all duration-200 hover:scale-105"
            >
              <Plus className={`${iconSize} mr-1`} />
              Add
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capacity Warning */}
      {maxQuantity != null && maxQuantity > 0 && quantity >= maxQuantity && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200"
        >
          Max: {maxQuantity}
        </motion.div>
      )}
    </div>
  );
}
