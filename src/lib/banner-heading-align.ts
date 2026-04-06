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
    "flex flex-wrap gap-3 md:gap-4",
    align === "center" && "justify-center",
    align === "left" && "justify-start",
    align === "right" && "justify-end",
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
 * Flex placement for full-width hero sections (single main content column).
 * Top/bottom: row flex + cross-axis align (horizontal center via parent `justify-center`).
 * Center: `flex-col` + `justify-center` so vertical centering runs in the band *below* the
 * fixed header — row + `items-center` alone centers in full 100vh, which sits too low
 * visually when a `fixed top-0` nav overlays the top of the hero.
 */
export function heroBandVerticalClass(v: BannerHeadingValign): string {
  return cn(
    v === "top" &&
    "items-start pt-16 pb-10 sm:pt-20 sm:pb-12 md:pt-24 md:pb-14",
    v === "center" &&
    "flex-col justify-center items-center pt-16 sm:pt-20 md:pt-24 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
    v === "bottom" &&
    "items-end pb-16 pt-10 sm:pb-20 sm:pt-12 md:pb-24 md:pt-14",
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
