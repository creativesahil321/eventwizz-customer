"use client";

import { cn } from "@/lib/utils";

interface MultiSpaceToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Optional id used to associate with the surrounding label for a11y. */
  labelId?: string;
}

/**
 * Compact pill-style Yes/No toggle used to opt in/out of multi-room ("event spaces") mode.
 *
 * Matches the reference UI (Yes/No segmented control) and reuses the project's neutral palette
 * so the control fits next to the Step 4 "Multiple event spaces" label without introducing a
 * new visual language.
 */
export function MultiSpaceToggle({
  value,
  onChange,
  disabled = false,
  labelId,
}: MultiSpaceToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={cn(
        "inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] p-0.5",
        disabled && "opacity-60 pointer-events-none",
      )}
    >
      {(
        [
          { id: "yes", label: "Yes", checked: value === true },
          { id: "no", label: "No", checked: value === false },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={opt.checked}
          disabled={disabled}
          onClick={() => onChange(opt.id === "yes")}
          className={cn(
            "min-w-[56px] rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#3b82f6)]",
            opt.checked
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-300 hover:text-white",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
