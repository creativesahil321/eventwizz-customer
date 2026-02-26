"use client";

import React from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavingStateProps {
  /** Main label, e.g. "Saving your changes..." */
  title?: string;
  /** Optional short description */
  description?: string;
  /** Minimum height to prevent layout jump */
  minHeight?: string;
  className?: string;
}

/**
 * Professional saving/loading state for form steps.
 * Uses a card-style container, spinner, and subtle progress indicator.
 */
export function SavingState({
  title = "Saving your changes...",
  description = "Please wait. You'll be notified when it's done.",
  minHeight = "min-h-[280px]",
  className,
}: SavingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border/80 bg-muted/30 px-6 py-14 text-center",
        minHeight,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <LoaderCircle
            className="h-7 w-7 animate-spin var(--color-primary)"
            aria-hidden
          />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground sm:text-lg">
            {title}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground max-w-xs">
              {description}
            </p>
          )}
        </div>
        {/* Subtle indeterminate-style progress */}
        <div className="w-full max-w-xs overflow-hidden rounded-full bg-primary/15 h-1.5">
          <div className="h-full w-2/5 rounded-full bg-var(--color-primary) animate-loading" />
        </div>
      </div>
    </div>
  );
}
