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

/* ---- Hero band height (location page + multi-location home) ---- */

/**
 * Capped hero height — matches `HeroBanner` / location preview (not full viewport).
 * Use on any full-width marketing hero section.
 */
export const heroBandHeightClass =
  "h-[min(68dvh,720px)] min-h-[380px] max-h-[760px]";

/**
 * Slightly shorter than the location hero — room for search without eating the fold.
 */
export const heroBandHeightCompactClass =
  "h-[min(62dvh,660px)] min-h-[340px] max-h-[700px]";

export const heroBandMediaOverlayClass =
  "bg-gradient-to-b from-black/60 via-black/30 to-black/85";

/**
 * Soft hero dissolve: keep the image solid through the search, then ease
 * into the page background (lighter than before so the bar isn’t washed out).
 */
export const heroBandMediaMaskClass =
  "[mask-image:linear-gradient(to_bottom,black_0%,black_72%,rgba(0,0,0,0.88)_90%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_72%,rgba(0,0,0,0.88)_90%,transparent_100%)]";

/** Theme-aware fog that blends the hero into `--color-background`. */
export const heroBandBottomFadeClass =
  "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[22%] bg-gradient-to-t from-[var(--color-background)] from-[12%] via-[color:color-mix(in_srgb,var(--color-background)_40%,transparent)] via-[55%] to-transparent";

/** Soft vignette for centered hero copy (edges darker, center clearer). */
export const heroBandVignetteClass =
  "pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_78%_70%_at_50%_36%,transparent_0%,rgba(0,0,0,0.18)_60%,rgba(0,0,0,0.5)_100%)]";

/**
 * Mild pull into the empty fade only — never large enough to cover the CTA.
 * Use with extra hero bottom padding when the toggle is visible.
 */
export const heroBandViewToggleOffsetClass = "relative z-20 -mt-4 xl:-mt-6";

/**
 * Multi-location hero — auto-height on small screens so stacked search
 * doesn’t clip; fixed band from sm+ for a stable banner.
 */
export const heroBandHeightCompactMobileClass =
  "min-h-[360px] h-auto max-h-none sm:h-[min(60dvh,600px)] sm:min-h-[360px] sm:max-h-[640px] xl:h-[min(62dvh,660px)] xl:min-h-[380px] xl:max-h-[700px]";

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
