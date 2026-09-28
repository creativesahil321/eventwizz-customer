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
 * Legacy Embla `CarouselItem` basis — prefer `mobileEventRowPeekScrollItemClass`.
 */
export const mobileEventRowPeekItemClass =
  "basis-[min(85%,19.5rem)] sm:basis-[min(85%,20.5rem)]";

/**
 * Mobile peek strip for 2–4 events: one main card + sliver of the next.
 * Uses `--event-scroll-slot` from EventListingHorizontalScroll (measured track
 * width) so one full card fits — never `vw`, which ignored arrow padding.
 */
export const mobileEventRowPeekScrollItemClass =
  "shrink-0 snap-center w-[min(19.5rem,calc(var(--event-scroll-slot,100%)-0.75rem))] sm:w-[min(20.5rem,calc(var(--event-scroll-slot,100%)-1rem))]";

/**
 * Many-event rows: phone keeps the one-card peek; from `sm` the cards divide
 * the measured track (`--event-scroll-slot`) so only whole cards show — 2 / 3 / 4
 * across. A fixed `xl:w-[280px]` left a half card clipped through its "View"
 * button beside the arrow. Container queries (the track is `@container`) so the
 * count follows the real track width — live, and inside preview device frames.
 * Gap math matches the track (`gap-4 sm:gap-5`).
 */
export const eventListingManyScrollItemClass =
  "shrink-0 snap-start w-[min(19.5rem,calc(var(--event-scroll-slot,100%)-0.75rem))] @lg:w-[calc((var(--event-scroll-slot,100%)-1.25rem)/2)] @3xl:w-[calc((var(--event-scroll-slot,100%)-2.5rem)/3)] @5xl:w-[calc((var(--event-scroll-slot,100%)-3.75rem)/4)]";

/** Centered carousel-slide width for single-event hero sections (~65–70% of container). */
export const singleEventShowcaseSlideClass =
  "mx-auto w-full max-w-[min(100%,42rem)] md:max-w-[min(70vw,52rem)]";

/** Centered frame for two standard cards side-by-side (same carousel family as single). */
export const dualEventShowcaseFrameClass =
  "mx-auto w-full max-w-[min(100%,36rem)] sm:max-w-[min(94vw,44rem)] md:max-w-[min(88vw,56rem)]";
