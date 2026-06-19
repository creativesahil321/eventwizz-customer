"use client";

import { memo, useMemo } from "react";
import { Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPersonCountPhrase,
  splitBookedAcrossTempSlots,
} from "../_lib/utils";

export const FinalTablePills = memo(function FinalTablePills({
  values,
  seatCounts: seatCountsProp,
  totalBooked,
  onRemove,
  disabled,
  className,
}: {
  values: string[];
  seatCounts?: number[];
  totalBooked?: number;
  onRemove: (finalTableLabel: string) => void;
  disabled?: boolean;
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
  const horizontalScroll = n >= 5;
  const compact = n >= 10;

  return (
    <div
      role="region"
      aria-label={
        horizontalScroll
          ? `${n} final tables — scroll horizontally to see all`
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
        aria-label="Final table assignments"
      >
        {values.map((label, i) => {
          const seats = seatCounts?.[i];
          const personsReadable = formatPersonCountPhrase(seats);
          const ariaChip =
            personsReadable != null
              ? `Final table ${label}, ${personsReadable}`
              : `Final table ${label}`;

          return (
            <div
              key={`${label}-${i}`}
              role="listitem"
              aria-label={ariaChip}
              title={`${ariaChip}. Remove with the adjacent control.`}
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
                  "flex items-start justify-between gap-0.5 border-b border-border/55",
                  compact ? "pb-px" : "pb-0.5",
                )}
              >
                <div className="min-w-0 flex-1 text-center">
                  <span className="block text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Final
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
                <button
                  type="button"
                  className="-mr-0.5 -mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                  aria-label={`Remove final table ${label}`}
                  disabled={disabled}
                  onClick={() => onRemove(label)}
                >
                  <X className="h-2.5 w-2.5" aria-hidden />
                </button>
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
