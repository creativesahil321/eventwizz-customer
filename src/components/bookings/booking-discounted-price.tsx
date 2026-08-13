"use client";

import { cn } from "@/lib/utils";

type BookingDiscountedPriceProps = {
  total: number;
  originalTotal?: number | null;
  formatMoney: (amount: number) => string;
  /** Optional label above the amounts (e.g. "Total"). */
  label?: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "end";
  className?: string;
  totalClassName?: string;
};

/**
 * Final price with optional strikethrough original (pre-discount) amount.
 */
export function BookingDiscountedPrice({
  total,
  originalTotal,
  formatMoney,
  label,
  size = "md",
  align = "end",
  className,
  totalClassName,
}: BookingDiscountedPriceProps) {
  const showOriginal =
    originalTotal != null && Number.isFinite(originalTotal) && originalTotal > total + 0.009;

  const totalSize =
    size === "lg"
      ? "text-xl sm:text-2xl"
      : size === "sm"
        ? "text-base sm:text-lg"
        : "text-lg sm:text-xl";

  const originalSize =
    size === "lg" ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs";

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "end" ? "items-end text-right" : "items-start text-left",
        className,
      )}
    >
      {label ? (
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}
      {showOriginal ? (
        <span
          className={cn(
            "font-medium tabular-nums text-muted-foreground line-through decoration-muted-foreground/70",
            originalSize,
          )}
        >
          {formatMoney(originalTotal)}
        </span>
      ) : null}
      <span
        className={cn(
          "font-bold tabular-nums leading-none text-[var(--color-primary)]",
          totalSize,
          totalClassName,
        )}
      >
        {formatMoney(total)}
      </span>
    </div>
  );
}
