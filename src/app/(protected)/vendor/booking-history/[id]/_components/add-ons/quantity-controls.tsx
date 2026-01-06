"use client";

import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";

interface QuantityControlsProps {
  quantity: number;
  maxQuantity?: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export function QuantityControls({
  quantity,
  maxQuantity,
  onIncrease,
  onDecrease,
  onRemove,
}: QuantityControlsProps) {
  if (quantity === 0) {
    return (
      <Button
        onClick={onIncrease}
        size="sm"
        className="gap-1.5 h-8 px-3"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 border-gray-300 hover:border-red-400 hover:bg-red-50"
        onClick={onDecrease}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <div
        className="min-w-[2rem] text-center font-semibold text-base"
        style={{ color: "var(--color-primary)" }}
      >
        {quantity}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 border-gray-300 hover:border-green-400 hover:bg-green-50"
        onClick={onIncrease}
        disabled={maxQuantity !== undefined && quantity >= maxQuantity}
      >
        <Plus className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
        onClick={onRemove}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
