"use client";

import { memo, useMemo } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPersonCountPhrase,
  splitBookedAcrossTempSlots,
} from "../_lib/utils";

export const TempTablePills = memo(function TempTablePills({
  values,
  seatCounts: seatCountsProp,
  totalBooked,
  className,
}: {
  values: string[];
  /** Per-slot headcounts / persons (same length as values). If omitted, derived from totalBooked. */
  seatCounts?: number[];
  /** Used to derive counts when seatCounts not provided. */
  totalBooked?: number;
  className?: string;
}) {
  const seatCounts = useMemo(() => {
    if (seatCountsProp && seatCountsProp.length === values.length) {
      return seatCountsProp;
    }
    if (values.length > 0 && totalBooked != null) {
      return splitBookedAcrossTempSlots(totalBooked, values.length);
    }
    return undefined;
  }, [seatCountsProp, totalBooked, values.length]);

  if (!values.length) {
    return (
      <span className="text-xs text-muted-foreground select-none">—</span>
    );
  }

  const n = values.length;
  /** Few chips can wrap; from 5 onward scroll sideways so the grid row stays one band tall. */
  const horizontalScroll = n >= 5;
  /** Only shrink chips when there are many (horizontal strip gets long). */
  const compact = n >= 10;

  return (
    <div
      role="region"
      aria-label={
        horizontalScroll
          ? `${n} temporary tables — scroll horizontally to see all`
          : undefined
      }
      className={cn(
        horizontalScroll &&
          "overflow-x-auto overscroll-x-contain rounded-md pb-1 pt-0.5 [scrollbar-width:thin]",
      )}
    >
      <div
        className={cn(
          "flex max-w-full items-start",
          horizontalScroll
            ? cn("flex-nowrap gap-1", compact && "gap-0.5")
            : cn("flex-wrap gap-1", compact && "gap-0.5"),
          className,
        )}
        role="list"
        aria-label="Temporary table allocation for this booking"
      >
        {values.map((label, i) => {
          const seats = seatCounts?.[i];
          const personsReadable = formatPersonCountPhrase(seats);
          const ariaChip =
            personsReadable != null
              ? `Temporary table ${label}, ${personsReadable} from this booking`
              : `Temporary table ${label}`;

          return (
            <div
              key={`${label}-${i}`}
              role="listitem"
              aria-label={ariaChip}
              title={ariaChip}
              className={cn(
                "shrink-0 rounded-md border border-border/70 bg-muted/45 shadow-sm ring-1 ring-black/[0.03] dark:bg-muted/30 dark:ring-white/[0.05]",
                "transition-colors hover:border-primary/25 hover:bg-muted/70",
                compact
                  ? "w-[min(100%,5rem)] px-1 py-0.5"
                  : "w-[min(100%,5.75rem)] px-1.5 py-1",
              )}
            >
              <div
                className={cn(
                  "border-b border-border/55 text-center",
                  compact ? "pb-px" : "pb-0.5",
                )}
              >
                <span className="block text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Table
                </span>
                <span
                  className={cn(
                    "mt-px block min-w-0 truncate font-bold tabular-nums leading-none tracking-tight text-foreground",
                    compact ? "text-[11px]" : "text-xs",
                  )}
                >
                  {label}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[10px] leading-tight text-muted-foreground">
                <Users
                  className="h-2.5 w-2.5 shrink-0 text-primary/85"
                  aria-hidden
                />
                {personsReadable ? (
                  <span className="font-medium tabular-nums text-foreground">
                    {personsReadable}
                  </span>
                ) : (
                  <span>Pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
