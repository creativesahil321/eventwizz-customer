import { cn } from "@/lib/utils";

/**
 * Card shell for multi-section guided steps (split sidebar).
 * Strong active state + hover so users see which block they should complete / approve.
 */
export function guidedSectionSurfaceClass(
  isActive: boolean,
  className?: string,
) {
  return cn(
    "rounded-xl border p-5 outline-none",
    "transition-[border-color,box-shadow,background-color,opacity,ring-color] duration-300 ease-out",
    isActive
      ? [
          "border-[var(--color-primary,#3b82f6)]/70",
          "bg-white/[0.06] backdrop-blur-xl",
          "bg-gradient-to-b from-white/[0.09] to-white/[0.04]",
          "shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary,#3b82f6)_35%,transparent),0_10px_44px_-14px_color-mix(in_srgb,var(--color-primary,#3b82f6)_50%,transparent)]",
          "ring-2 ring-[var(--color-primary,#3b82f6)]/40 ring-offset-2 ring-offset-slate-950",
          "hover:border-[var(--color-primary,#3b82f6)]",
          "hover:from-white/[0.11] hover:to-white/[0.05]",
          "hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary,#3b82f6)_50%,transparent),0_14px_52px_-12px_color-mix(in_srgb,var(--color-primary,#3b82f6)_60%,transparent)]",
          "hover:ring-[var(--color-primary,#3b82f6)]/55",
        ]
      : [
          "border-white/10 bg-white/[0.03] backdrop-blur-md opacity-[0.68]",
          "hover:border-white/20 hover:bg-white/[0.05] hover:opacity-[0.9]",
        ],
    className,
  );
}

/**
 * Nested panel inside {@link WholeStepGuidedShell} (steps 5–11): same family as inactive guided blocks
 * (border + subtle bg + hover) without dimming opacity, so long forms stay readable.
 */
export function guidedInsetSectionSurfaceClass(className?: string) {
  return cn(
    "rounded-xl border border-white/12 bg-white/[0.05] backdrop-blur-md outline-none",
    "p-4 sm:p-5",
    "transition-[border-color,box-shadow,background-color] duration-300 ease-out",
    "hover:border-white/20 hover:bg-white/[0.04]",
    className,
  );
}
