import { cn } from "@/lib/utils";

export const BANNER_HEADING_ALIGN_VALUES = ["left", "center", "right"] as const;

export type BannerHeadingAlign = (typeof BANNER_HEADING_ALIGN_VALUES)[number];

export function isBannerHeadingAlign(v: unknown): v is BannerHeadingAlign {
  return (
    typeof v === "string" &&
    (BANNER_HEADING_ALIGN_VALUES as readonly string[]).includes(v)
  );
}

/** Missing / legacy API → center (previous default layout). */
export function normalizeBannerHeadingAlign(v: unknown): BannerHeadingAlign {
  return isBannerHeadingAlign(v) ? v : "center";
}

/** Hero block: heading + subheading share alignment. */
export function heroBannerStackClass(align: BannerHeadingAlign): string {
  return cn(
    "flex w-full max-w-full flex-col",
    align === "left" && "items-start text-left",
    align === "center" && "items-center text-center",
    align === "right" && "items-end text-right",
  );
}

export function heroBannerSubheadingClass(align: BannerHeadingAlign): string {
  return cn(
    "w-full max-w-2xl overflow-visible break-words text-pretty [overflow-wrap:anywhere]",
    align === "center" && "mx-auto",
    align === "left" && "mr-auto",
    align === "right" && "ml-auto",
  );
}

export function vendorHomeSubheroClass(align: BannerHeadingAlign): string {
  return cn(
    "mb-10 w-full max-w-2xl overflow-visible break-words text-pretty text-base leading-relaxed text-white/85 [overflow-wrap:anywhere] md:text-lg",
    align === "center" && "mx-auto",
    align === "left" && "mr-auto",
    align === "right" && "ml-auto",
  );
}

export function vendorHomeTrustRowClass(align: BannerHeadingAlign): string {
  return cn(
    /* Narrow: single column so pills don’t wrap 2+1; sm+: row + wrap */
    "flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap md:gap-4",
    align === "center" &&
      "mx-auto max-w-md items-stretch sm:max-w-none sm:items-center sm:justify-center",
    align === "left" && "items-stretch sm:items-center sm:justify-start",
    align === "right" && "items-stretch sm:items-center sm:justify-end",
  );
}

/* ---- Vertical placement (hero band) ---- */

export const BANNER_HEADING_VALIGN_VALUES = ["top", "center", "bottom"] as const;

export type BannerHeadingValign = (typeof BANNER_HEADING_VALIGN_VALUES)[number];

export function isBannerHeadingValign(v: unknown): v is BannerHeadingValign {
  return (
    typeof v === "string" &&
    (BANNER_HEADING_VALIGN_VALUES as readonly string[]).includes(v)
  );
}

export function normalizeBannerHeadingValign(v: unknown): BannerHeadingValign {
  return isBannerHeadingValign(v) ? v : "center";
}

/**
 * Flex placement for full-width hero sections — alignment ONLY, NO padding.
 * Each hero component adds `heroBandContentPadClass(v)` to its inner content
 * wrapper. This guarantees the heading always clears the fixed header (~72 px)
 * regardless of flex axis or alignment direction.
 */
export function heroBandVerticalClass(v: BannerHeadingValign): string {
  return cn(
    v === "top" && "items-start",
    v === "center" && "flex-col items-center justify-center",
    v === "bottom" && "items-end",
  );
}

/**
 * Padding for the INNER content wrapper inside any hero section.
 * Always clears the fixed header (~72 px, "pt-[4.5rem]") and adds
 * appropriate breathing room per valign position.
 * Apply this alongside "relative z-* max-w-7xl mx-auto w-full px-4".
 */
export function heroBandContentPadClass(v: BannerHeadingValign): string {
  return cn(
    v === "top" && "pt-20 pb-10 sm:pt-24 sm:pb-12 md:pt-28 md:pb-14",
    // Center: modest top so section justify-center handles visual centering.
    // Too much padding would push the perceived center downward.
    v === "center" && "pt-20 pb-8 sm:pt-24 sm:pb-10",
    v === "bottom" && "pt-[4.5rem] pb-16 sm:pb-20 md:pb-24",
  );
}

/** Live preview strip in Theme presets (flex column + SiteHeading). */
export function heroPreviewMiniVerticalClass(v: BannerHeadingValign): string {
  return cn(
    "flex min-h-[8.5rem] w-full flex-col px-4 py-5 sm:min-h-[10rem] sm:px-5 sm:py-6",
    v === "top" && "items-stretch justify-start",
    v === "center" && "items-stretch justify-center",
    v === "bottom" && "items-stretch justify-end",
  );
}
