"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function hasRescheduledDate(date: {
  previous_date_label?: string | null;
}): boolean {
  return Boolean(date.previous_date_label?.trim());
}

interface RescheduledDateIndicatorProps {
  previousDateLabel: string;
  /** Shown on multi-date pills where the card title is already the current date */
  currentDateLabel?: string;
  /** strip = event date card; compact = multi-date pills */
  variant?: "strip" | "compact";
  className?: string;
}

export function RescheduledDateIndicator({
  previousDateLabel,
  currentDateLabel,
  variant = "strip",
  className,
}: RescheduledDateIndicatorProps) {
  const previous = previousDateLabel.trim();
  if (!previous) return null;

  if (variant === "compact" && currentDateLabel) {
    const current = currentDateLabel.trim();
    return (
      <div
        className={cn(
          "mt-1.5 flex flex-wrap items-center gap-1 text-[11px] leading-snug",
          className,
        )}
      >
        <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1 py-px font-semibold text-slate-600">
          <RotateCcw className="h-2 w-2" />
          Moved
        </span>
        <span className="text-muted-foreground line-through">{previous}</span>
        <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
        <span className="font-semibold text-foreground">{current}</span>
      </div>
    );
  }

  return (
    <p
      className={cn(
        "mt-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      Rescheduled from{" "}
      <span className="line-through decoration-muted-foreground/80">
        {previous}
      </span>
    </p>
  );
}
