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
    "flex w-full max-w-full flex-col gap-2.5 sm:gap-4",
    "@max-md/preview:!gap-2.5",
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
    "@max-md/preview:!max-w-full @max-md/preview:!text-sm @max-md/preview:!leading-snug",
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
    "flex w-fit max-w-full flex-row flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/90 sm:text-[15px]",
    measureAlignClass(align, scope?.fromMd),
    !scope?.fromMd && align === "center" && "justify-center",
    !scope?.fromMd && align === "left" && "justify-start",
    !scope?.fromMd && align === "right" && "justify-end",
    scope?.fromMd && "justify-center",
    scope?.fromMd && align === "left" && "md:justify-start",
    scope?.fromMd && align === "center" && "md:justify-center",
    scope?.fromMd && align === "right" && "md:justify-end",
  );
}

/**
 * Venue address + email/phone. Shrink-wraps so centered rows share one axis
 * (live location hero). Phone/tablet: address then email+phone. `md+`: one wrapping row.
 */
export function heroBannerVenueContactClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "flex w-fit max-w-xl flex-col gap-2 text-sm text-white/90 sm:max-w-2xl",
    "md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:gap-y-2",
    "@max-md/preview:!flex-col @max-md/preview:!gap-2",
    measureAlignClass(align, scope?.fromMd),
    !scope?.fromMd && align === "center" && "items-center md:justify-center",
    !scope?.fromMd && align === "left" && "items-start md:justify-start",
    !scope?.fromMd && align === "right" && "items-end md:justify-end",
    scope?.fromMd && "items-center md:justify-center",
    scope?.fromMd && align === "left" && "md:items-center md:justify-start",
    scope?.fromMd && align === "center" && "md:items-center md:justify-center",
    scope?.fromMd && align === "right" && "md:items-center md:justify-end",
    "@max-md/preview:!items-center",
    scope?.fromMd &&
    align === "left" &&
    "@min-md/preview:!items-center @min-md/preview:!justify-start",
    scope?.fromMd &&
    align === "right" &&
    "@min-md/preview:!items-center @min-md/preview:!justify-end",
  );
}

export function heroBannerVenueContactLinksClass(
  align: BannerHeadingAlign,
  scope?: HeroAlignScope,
): string {
  return cn(
    "flex max-w-full flex-wrap items-center gap-x-5 gap-y-1.5",
    "md:contents",
    "@max-md/preview:!flex @max-md/preview:!flex-wrap",
    !scope?.fromMd && align === "center" && "justify-center",
    !scope?.fromMd && align === "left" && "justify-start",
    !scope?.fromMd && align === "right" && "justify-end",
    scope?.fromMd && "justify-center",
    "@max-md/preview:!justify-center",
    scope?.fromMd && align === "left" && "@min-md/preview:!justify-start",
    scope?.fromMd && align === "right" && "@min-md/preview:!justify-end",
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

/**
 * Wrap + 3-line cap everywhere, so a legacy long heading (pre 12-word limit)
 * can never push the hero out of shape. 80 chars fit in 3 lines at the phone size.
 */
const heroHeadingWrapClass =
  "min-w-0 max-w-full text-pretty break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-3 max-md:!leading-[1.15]";

/**
 * Fluid hero H1: 26px on phones (always above the 24px section title) up to 44px.
 * Preview device frames stay compact via `@container/preview`.
 */
export const heroBannerHeadingTypeClass = cn(
  heroHeadingWrapClass,
  "!text-[clamp(1.625rem,1rem+2.2cqi,2.75rem)] !leading-[1.2]",
);

/** Multi-location home hero — same scale as the location / event banner. */
export const heroHomeHeadingTypeClass = cn(
  heroHeadingWrapClass,
  "!text-[clamp(1.625rem,1rem+2.2cqi,2.75rem)] !leading-[1.2]",
);

/* ---- Hero band height (location page + multi-location home) ---- */

/**
 * Compact height for the 390px Mobile device frame.
 * Do not use `@max-sm/preview` here — that container is 384px, so 390px never matches.
 */
export const previewMobileHeroHeightClass =
  "!h-[32rem] !min-h-[30rem] !max-h-[36rem] @max-md/preview:!h-[32rem] @max-md/preview:!min-h-[30rem] @max-md/preview:!max-h-[36rem]";

/** ~68dvh of a 1024px-tall tablet, not the laptop window. */
export const previewTabletHeroHeightClass =
  "@md/preview:@max-5xl/preview:!h-[42rem] @md/preview:@max-5xl/preview:!min-h-[36rem] @md/preview:@max-5xl/preview:!max-h-[45rem]";

/**
 * Header clearance + reserved dock (contact + stacked search) on Mobile preview.
 * Viewport `sm:`/`md:` padding still wins inside a laptop window without `!`.
 */
export const previewMobileHeroPadClass =
  "!pt-[4.25rem] !pb-[11.5rem] @max-md/preview:!pt-[4.25rem] @max-md/preview:!pb-[11.5rem]";

/** Capped hero height — matches `HeroBanner` / location preview (not full viewport). */
export const heroBandHeightClass =
  "h-[min(68dvh,720px)] min-h-[380px] max-h-[760px] @max-md/preview:!h-[32rem] @max-md/preview:!min-h-[30rem] @max-md/preview:!max-h-[36rem]";

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

type HeroBandCopyPlacementStyle = {
  top: number | string;
  bottom: number | string;
  transform: string;
};

/**
 * Inline placement keeps the three vertical states independent from
 * responsive utility ordering in narrow preview canvases.
 */
export function heroBandCopyPlacementStyle(
  v: BannerHeadingValign,
): HeroBandCopyPlacementStyle {
  if (v === "top") {
    return { top: 0, bottom: "auto", transform: "none" };
  }
  if (v === "bottom") {
    return { top: "auto", bottom: 0, transform: "none" };
  }
  return { top: "50%", bottom: "auto", transform: "translateY(-50%)" };
}

export function heroBandCopyPlacementClass(_v: BannerHeadingValign): string {
  return "absolute inset-x-0 z-10 mx-auto w-full max-w-full overflow-visible";
}

/**
 * Vertical placement when the copy is still in-flow (home mini strips, etc.).
 */
export function heroBandVerticalClass(v: BannerHeadingValign): string {
  return cn(
    "flex-col items-stretch",
    v === "top" && "justify-start",
    v === "center" && "justify-center",
    v === "bottom" && "justify-end",
  );
}

/** Balanced hero padding keeps the chosen vertical anchor visually honest. */
export function heroBandContentPadClass(
  v: BannerHeadingValign,
  options?: { withBottomChrome?: boolean },
): string {
  const withBottomChrome = Boolean(options?.withBottomChrome);

  return cn(
    !withBottomChrome && "py-16 sm:py-20 md:py-24",
    withBottomChrome &&
      v === "top" &&
      "pt-16 pb-36 sm:pt-24 sm:pb-40 md:pt-28 md:pb-44",
    withBottomChrome &&
      v === "center" &&
      "pt-16 pb-40 sm:pt-24 sm:pb-36 md:pb-40 @max-md/preview:!pt-16 @max-md/preview:!pb-40",
    withBottomChrome &&
      v === "bottom" &&
      "pt-16 pb-40 sm:pt-[4.5rem] sm:pb-44 md:pb-48 @max-md/preview:!pt-16 @max-md/preview:!pb-40",
    withBottomChrome &&
      v === "top" &&
      "@max-md/preview:!pt-[4.25rem] @max-md/preview:!pb-[11.5rem]",
    !withBottomChrome && "@max-md/preview:!py-8",
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
