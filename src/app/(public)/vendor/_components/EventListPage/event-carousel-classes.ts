import { cn } from "@/lib/utils";

/**
 * Circular nav arrow button for event card sliders.
 * Uses the vendor's --color-primary so arrows always match the active theme.
 */
export function eventCarouselNavButtonClass(extra?: string) {
  return cn(
    "size-9 rounded-full border-0 shadow-md",
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
    "hover:opacity-90 active:scale-95 transition-[opacity,transform]",
    "disabled:pointer-events-none disabled:opacity-25",
    "[&_svg]:size-4 [&_svg]:stroke-[2.5]",
    extra,
  );
}
