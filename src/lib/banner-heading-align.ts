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

export type HeroAlignScope = {
  /**
   * Phone stays centered (current compact layout). Desktop (`md+`) uses `align`
   * from Site Essentials / theme — location + event heroes only.
   */
  fromMd?: boolean;
};

function stackAlignClass(
  align: BannerHeadingAlign,
  fromMd?: boolean,
): string {
  if (!fromMd) {
    return cn(
      align === "left" && "items-start text-left",
      align === "center" && "items-center text-center",
      align === "right" && "items-end text-right",
    );
  }
  return cn(
    "items-center text-center",
    align === "left" && "md:items-start md:text-left",
    align === "center" && "md:items-center md:text-center",
    align === "right" && "md:items-end md:text-right",
  );
}

function measureAlignClass(
  align: BannerHeadingAlign,
  fromMd?: boolean,
): string {
  if (!fromMd) {
    return cn(
      align === "center" && "mx-auto",
      align === "left" && "mr-auto",
      align === "right" && "ml-auto",
    );
  }
  return cn(
    "mx-auto",
    align === "left" && "md:ml-0 md:mr-auto",
    align === "center" && "md:mx-auto",
    align === "right" && "md:ml-auto md:mr-0",
  );
}

/** Hero block: heading + subheading share alignment. */
export function heroBannerStackClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "flex w-full max-w-full flex-col gap-3 sm:gap-4",
    stackAlignClass(align, scope?.fromMd),
  );
}

export function heroBannerSubheadingClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "w-full max-w-2xl overflow-visible break-words text-pretty [overflow-wrap:anywhere]",
    measureAlignClass(align, scope?.fromMd),
  );
}

/** Small-caps line above the hero title (cities / region). */
export function heroBannerEyebrowClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs",
    measureAlignClass(align, scope?.fromMd),
    !scope?.fromMd && align === "center" && "text-center",
    !scope?.fromMd && align === "left" && "text-left",
    !scope?.fromMd && align === "right" && "text-right",
    scope?.fromMd && "text-center",
    scope?.fromMd && align === "left" && "md:text-left",
    scope?.fromMd && align === "center" && "md:text-center",
    scope?.fromMd && align === "right" && "md:text-right",
  );
}

/** Hero description under the title — readable sentence case, not small caps. */
export function heroBannerBodyClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "w-full max-w-xl overflow-visible break-words text-pretty text-sm leading-relaxed text-white/85 [overflow-wrap:anywhere] sm:max-w-2xl sm:text-base sm:leading-relaxed",
    measureAlignClass(align, scope?.fromMd),
    !scope?.fromMd && align === "center" && "text-center",
    !scope?.fromMd && align === "left" && "text-left",
    !scope?.fromMd && align === "right" && "text-right",
    scope?.fromMd && "text-center",
    scope?.fromMd && align === "left" && "md:text-left",
    scope?.fromMd && align === "center" && "md:text-center",
    scope?.fromMd && align === "right" && "md:text-right",
  );
}

export function heroBannerContactRowClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "flex max-w-2xl flex-wrap items-start gap-x-6 gap-y-2 text-sm text-white/90",
    measureAlignClass(align, scope?.fromMd),
    !scope?.fromMd && align === "center" && "justify-center text-center",
    !scope?.fromMd && align === "left" && "justify-start text-left",
    !scope?.fromMd && align === "right" && "justify-end text-right",
    scope?.fromMd && "justify-center text-center",
    scope?.fromMd && align === "left" && "md:justify-start md:text-left",
    scope?.fromMd && align === "center" && "md:justify-center md:text-center",
    scope?.fromMd && align === "right" && "md:justify-end md:text-right",
  );
}

/** Search dock at the bottom of a location hero — follows heading align from `md`. */
export function heroFooterDockClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "pointer-events-auto w-full max-w-3xl",
    measureAlignClass(align, scope?.fromMd ?? true),
  );
}

/** SiteHeading text alignment; `fromMd` keeps phones centered. */
export function heroHeadingAlignClass(
  align: BannerHeadingAlign | undefined,
  scope?: HeroAlignScope,
): string {
  if (!align) return "";
  if (!scope?.fromMd) {
    return cn(
      align === "center" && "text-center",
      align === "right" && "text-right",
      align === "left" && "text-left",
    );
  }
  return cn(
    "text-center",
    align === "left" && "md:text-left",
    align === "center" && "md:text-center",
    align === "right" && "md:text-right",
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

/**
 * Query container for hero type. `cqi` tracks this box (phone width, laptop
 * window, preview frame) instead of jumping at Tailwind `sm`/`md`/`lg`.
 */
export const heroHeadingMeasureClass = "@container/hero min-w-0 w-full";

const heroHeadingWrapClass =
  "min-w-0 max-w-full text-pretty break-words [overflow-wrap:anywhere] [word-break:break-word]";

/**
 * Fluid hero H1 — phones stay compact, then scale with the hero container.
 * Preview device frames stay compact via `@container/preview`.
 */
export const heroBannerHeadingTypeClass = cn(
  heroHeadingWrapClass,
  "!leading-[1.28] sm:!leading-[1.24] lg:!leading-[1.22]",
  "!text-[clamp(1.3rem,0.45rem+6.2cqi,1.7rem)]",
  "sm:!text-[clamp(1.5rem,0.5rem+5.2cqi,2.35rem)]",
  "lg:!text-[clamp(1.85rem,0.4rem+4.4cqi,3.25rem)]",
  "@max-lg/preview:!text-[1.65rem] @max-lg/preview:!leading-[1.28]",
);

/** Multi-location home hero — slightly smaller cap than the location banner. */
export const heroHomeHeadingTypeClass = cn(
  heroHeadingWrapClass,
  "!leading-[1.28] sm:!leading-[1.24] lg:!leading-[1.22]",
  "!text-[clamp(1.3rem,0.45rem+6cqi,1.65rem)]",
  "sm:!text-[clamp(1.5rem,0.5rem+4.8cqi,2.15rem)]",
  "lg:!text-[clamp(1.75rem,0.4rem+4cqi,3rem)]",
  "@max-lg/preview:!text-[1.65rem] @max-lg/preview:!leading-[1.28]",
);

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

/**
 * Theme-tinted photo wash — same idea as Lovable `bg-maroon/70`
 * (`color-mix(in oklab, var(--maroon) 70%, transparent)`).
 * `--color-hero-overlay` is the darker of header/footer from the vendor theme.
 */
export const heroBandMediaOverlayClass =
  "bg-[color:color-mix(in_oklab,var(--color-hero-overlay)_70%,transparent)]";

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
 * Multi-location hero — soft opacity image band + content (search on-page).
 * Auto-height so stacked search never clips; no fixed dark media band.
 */
export const heroBandHeightCompactMobileClass =
  "min-h-[520px] h-auto max-h-none sm:min-h-[560px]";

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
 * Vertical placement inside a column flex hero (`flex flex-col` on the section).
 * Always column + `justify-*` so top/bottom are the same on phone and desktop.
 * Mixing row `items-start/end` with center `flex-col` inverted Top/Bottom on
 * narrow screens (wrapped copy + padding overflow).
 *
 * Horizontal alignment stays on the inner stack. Do not also put
 * `justify-center` on the section — that would fight top/bottom.
 */
export function heroBandVerticalClass(v: BannerHeadingValign): string {
  return cn(
    "flex-col items-stretch",
    v === "top" && "justify-start",
    v === "center" && "justify-center",
    v === "bottom" && "justify-end",
  );
}

/**
 * Padding for the INNER content wrapper inside any hero section.
 * Always clears the fixed header (~72 px, "pt-[4.5rem]") and adds
 * appropriate breathing room per valign position.
 * Apply this alongside "relative z-* max-w-7xl mx-auto w-full px-4".
 */
export function heroBandContentPadClass(
  v: BannerHeadingValign,
  options?: { withBottomChrome?: boolean },
): string {
  const withBottomChrome = Boolean(options?.withBottomChrome);

  return cn(
    v === "top" &&
    (withBottomChrome
      ? "pt-16 pb-24 sm:pt-24 sm:pb-32 md:pt-28 md:pb-36"
      : "pt-16 pb-8 sm:pt-24 sm:pb-12 md:pt-28 md:pb-14"),
    v === "center" &&
    (withBottomChrome
      ? "pt-16 pb-24 sm:pt-24 sm:pb-32"
      : "pt-16 pb-8 sm:pt-24 sm:pb-10"),
    v === "bottom" &&
    (withBottomChrome
      ? "pt-16 pb-24 sm:pt-[4.5rem] sm:pb-36 md:pb-40"
      : "pt-16 pb-12 sm:pt-[4.5rem] sm:pb-20 md:pb-24"),
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
