"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  size?: "sm" | "md";
  className?: string;
  /** When true, quantity uses --kind-accent from parent */
  useKindAccent?: boolean;
}

export function QuantityStepper({
  value,
  min = 0,
  max,
  onChange,
  size = "md",
  className,
  useKindAccent = false,
}: QuantityStepperProps) {
  const btnSize =
    size === "sm" ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-lg";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(btnSize, "border-border bg-background shadow-none")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
      >
        <Minus className={iconSize} strokeWidth={2} />
      </Button>
      <span
        className={cn(
          useKindAccent
            ? "min-w-5 text-center text-xs font-bold tabular-nums"
            : "min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-foreground",
          size === "sm" ? "text-sm" : "text-base",
        )}
        style={
          useKindAccent
            ? { color: "var(--kind-accent, var(--color-primary))" }
            : undefined
        }
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(btnSize, "border-border bg-background shadow-none")}
        onClick={() =>
          onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)
        }
        disabled={!canIncrease}
        aria-label="Increase quantity"
      >
        <Plus className={iconSize} strokeWidth={2} />
      </Button>
    </div>
  );
}
