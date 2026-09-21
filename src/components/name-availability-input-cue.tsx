"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type NameAvailabilityInputCueProps = {
  checking: boolean;
  available: boolean;
  className?: string;
};

/** Trailing spinner / check for name-availability fields. Errors stay as text below. */
export function NameAvailabilityInputCue({
  checking,
  available,
  className,
}: NameAvailabilityInputCueProps) {
  if (!checking && !available) return null;

  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-y-0 right-3 flex items-center",
        className,
      )}
    >
      {checking ? (
        <>
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden
          />
          <span className="sr-only">Checking availability</span>
        </>
      ) : (
        <>
          <Check
            className="h-4 w-4 text-emerald-400"
            strokeWidth={2.5}
            aria-hidden
          />
          <span className="sr-only">Available</span>
        </>
      )}
    </span>
  );
}
