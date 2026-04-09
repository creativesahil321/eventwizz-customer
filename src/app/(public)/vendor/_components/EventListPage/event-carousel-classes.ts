import { cn } from "@/lib/utils";

/**
 * Circular nav arrow button for event card sliders.
 * Uses the vendor's --color-primary so arrows always match the active theme.
 */
export function eventCarouselNavButtonClass(extra?: string) {
  return cn(
    "inline-flex size-9 shrink-0 items-center justify-center rounded-full border-0 shadow-md",
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
    "hover:opacity-90 active:scale-95 transition-[opacity,transform]",
    "disabled:pointer-events-none disabled:opacity-25",
    "[&_svg]:size-4 [&_svg]:stroke-[2.5]",
    extra,
  );
}

/**
 * Mobile strip for 2–4 events: one main card plus a sliver of the next slide.
 * (Legacy Embla `CarouselItem` basis — prefer `mobileEventRowPeekScrollItemClass` for native scroll.)
 */
export const mobileEventRowPeekItemClass =
  "basis-[min(88%,19.5rem)] sm:basis-[min(88%,20.5rem)]";

/** Fixed widths for `EventListingHorizontalScroll` (viewport-based, not % of content width). */
export const mobileEventRowPeekScrollItemClass =
  "shrink-0 w-[min(88vw,19.5rem)] sm:w-[min(88vw,20.5rem)]";

export const eventListingManyScrollItemClass =
  "shrink-0 w-[min(88vw,19.5rem)] sm:w-[min(46vw,20rem)] md:w-[min(32vw,18rem)] lg:w-[min(24vw,16rem)] xl:w-[280px]";
