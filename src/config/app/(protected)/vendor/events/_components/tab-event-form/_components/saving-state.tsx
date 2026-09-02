"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavingStateProps {
  /** Main label, e.g. "Saving your event..." */
  title?: string;
  /** Optional short description */
  description?: string;
  /** Minimum height to prevent layout jump */
  minHeight?: string;
  className?: string;
}

/**
 * Professional saving/loading state for form steps.
 * Card layout with clear hierarchy, animated progress, and accessibility.
 */
export function SavingState({
  title = "Saving your changes...",
  description = "Please wait. You will be notified when this is complete.",
  minHeight = "min-h-[320px]",
  className,
}: SavingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        minHeight,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="w-full max-w-md animate-fadeIn">
        {/* Card container */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-8 py-10 sm:py-12">
            {/* Icon with ring */}
            <div className="flex justify-center mb-6">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
                <Loader2
                  className="h-8 w-8 animate-spin text-primary"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
            </div>

            {/* Title & description */}
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-8 w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full w-2/5 rounded-full bg-primary animate-loading"
                  style={{ backgroundColor: "var(--color-primary)" }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Please do not close this page
              </p>
            </div>
          </div>

          {/* Bottom accent strip */}
          <div className="h-1 w-full bg-primary/20" />
        </div>
      </div>
    </div>
  );
}
