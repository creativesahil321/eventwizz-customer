"use client";

import { cn } from "@/lib/utils";
import type { BannerHeadingAlign } from "@/lib/banner-heading-align";
import { heroHeadingAlignClass } from "@/lib/banner-heading-align";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { usePreviewDeviceStore } from "@/store/preview-device.store";
import { useHeadingEmphasisOverride } from "@/components/public/heading-emphasis-override";
import {
  normalizeHeadingEmphasis,
  splitBannerHeading,
  type HeadingEmphasis,
} from "@/lib/heading-emphasis";

type SiteHeadingLevel = 1 | 2 | 3;

type SiteHeadingVariant = "onDark" | "onSurface" | "onLight";

export type SiteHeadingProps = {
  /** Semantic heading level */
  level?: SiteHeadingLevel;
  /** Full line as stored in CMS (e.g. banner_heading) */
  title: string;
  /** Optional substring to highlight at end; must appear in title when set */
  accentHint?: string | null;
  /** Override theme (e.g. previews) */
  emphasis?: HeadingEmphasis;
  /**
   * onDark: white, for hero over dark imagery.
   * onLight: near-black, for hero over light imagery (image-driven auto-contrast).
   * onSurface: theme body text, for page content.
   */
  variant?: SiteHeadingVariant;
  /**
   * Match hero column alignment (`heroBannerStackClass`). Used for `accent_tail`
   * via `text-left` / `text-center` / `text-right` so wrapped lines align with the hero.
   */
  align?: BannerHeadingAlign;
  /**
   * Phone stays `text-center`; `md+` uses `align`.
   * Location / event heroes only — home stays fully centered.
   */
  alignFromMd?: boolean;
  className?: string;
};

/**
 * The public-site type scale. Sections pass no size / weight / leading classes —
 * every heading of a level renders identically across location, event, home
 * and onboarding preview.
 *
 * 1 hero:    heroes pass the fluid `hero*HeadingTypeClass` (max 44px, bold)
 * 2 section: fluid 24px → 36px, bold. Container-relative like the hero, so it
 *            stays below the hero in narrow preview frames as well as on the live site.
 * 3 card:    20px → 24px, semibold
 */
const levelClass: Record<SiteHeadingLevel, string> = {
  1: "text-4xl font-bold tracking-tight md:text-5xl",
  2: "text-[clamp(1.5rem,0.75rem+2cqi,2.25rem)] font-bold !leading-[1.15] tracking-tight",
  3: "text-xl font-semibold !leading-snug tracking-tight md:text-2xl",
};

/** Phone / tablet device frames — sizes match a real handset, not the desktop window.
 * Each size is repeated at sm/md/lg/xl as literals so Tailwind emits them and they
 * win while the preview sits in a wide monitor. Same scale as `levelClass`. */
const compactLevelClass = {
  mobile: {
    // 1 & 2 are container-fluid (cqi), so the preview frame computes the same
    // size as a real device of that width — no override, exact live parity.
    1: "",
    2: "",
    3: "font-semibold tracking-tight !text-xl !leading-snug sm:!text-xl sm:!leading-snug md:!text-xl md:!leading-snug lg:!text-xl lg:!leading-snug xl:!text-xl xl:!leading-snug",
  },
  tablet: {
    1: "",
    2: "",
    3: "font-semibold tracking-tight !text-[1.375rem] !leading-snug sm:!text-[1.375rem] sm:!leading-snug md:!text-[1.375rem] md:!leading-snug lg:!text-[1.375rem] lg:!leading-snug xl:!text-[1.375rem] xl:!leading-snug",
  },
} as const satisfies Record<
  "mobile" | "tablet",
  Record<SiteHeadingLevel, string>
>;

/** Script/display fonts exceed tight metrics; keep overflow visible so glyphs aren't sliced. */
const headingLine =
  "leading-[1.22] overflow-visible min-w-0 max-w-full break-words [overflow-wrap:anywhere]";
const headingBox = "inline-block max-w-full overflow-visible";
/** Breathing room for display swashes without forcing an unbreakable inline-block. */
const accentTailScriptPad = "pl-[0.04em] pr-[0.12em] py-[0.08em]";

/**
 * Public-site marketing heading (`typography.headingEmphasis`).
 * Applies `--font-heading` here only — not on every page `h1`–`h6` (those default to body).
 * `accent_tail`: lead = body + neutral; tail = heading + brand color.
 *
 * Script/display tails: native text selection highlights the **line box**, not full glyph
 * ink — swashes may extend past the blue highlight; that is normal browser behavior.
 */
export function SiteHeading({
  level = 1,
  title,
  accentHint,
  emphasis: emphasisProp,
  variant = "onDark",
  align,
  alignFromMd = false,
  className,
}: SiteHeadingProps) {
  const { theme } = useTheme();
  const emphasisOverride = useHeadingEmphasisOverride();
  const narrowPreview = usePreviewNarrowLayout();
  const previewDevice = usePreviewDeviceStore((s) => s.device);
  const emphasis = normalizeHeadingEmphasis(
    emphasisProp ?? emphasisOverride ?? theme?.typography?.headingEmphasis,
  );
  const compactType =
    narrowPreview && previewDevice !== "desktop"
      ? compactLevelClass[previewDevice][level] || null
      : null;

  const Tag = level === 2 ? "h2" : level === 3 ? "h3" : "h1";

  const { base, accent } = splitBannerHeading(title, accentHint);

  const baseOnDark =
    "text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.55),0_1px_3px_rgba(0,0,0,0.4)]";
  const baseOnSurface = "text-[var(--color-text)]";
  /** Literal near-black (not theme token) so it stays readable on any light image. */
  const baseOnLight =
    "text-[#0c0d10] [text-shadow:0_1px_12px_rgba(255,255,255,0.55),0_1px_2px_rgba(255,255,255,0.65)]";

  /** Base text color for the current variant (accent tail keeps brand color). */
  const baseColorClass =
    variant === "onDark"
      ? baseOnDark
      : variant === "onLight"
        ? baseOnLight
        : baseOnSurface;

  /**
   * Hero photos: lift primary toward white so emerald/burgundy still brand
   * but stay readable. Page body: solid primary on cream/surface.
   */
  const accentOnPhoto =
    "text-[color:color-mix(in_srgb,var(--color-primary)_38%,white)] [text-shadow:0_2px_18px_rgba(0,0,0,0.55),0_1px_3px_rgba(0,0,0,0.4)]";
  const accentSolidPrimary = "text-[color:var(--color-primary)]";

  const headingFamily = "var(--font-heading)";
  const bodyFamily = "var(--font-body)";

  /** When align is set, force block so siblings (e.g. CTAs) don't sit inline beside the title. */
  const alignBox =
    align === "center" || align === "right" || align === "left"
      ? cn(
          "block w-full max-w-full",
          heroHeadingAlignClass(align, { fromMd: alignFromMd }),
        )
      : headingBox;

  if (emphasis === "uniform" || !accent) {
    return (
      <Tag
        className={cn(
          alignBox,
          headingLine,
          !compactType && levelClass[level],
          baseColorClass,
          "px-[0.12em] py-[0.08em]",
          // The glyph-safety padding pushed left-aligned titles ~3px right of
          // their eyebrow / body text; pull back so the left edges line up.
          align === "left" &&
            (alignFromMd ? "md:-ml-[0.12em]" : "-ml-[0.12em]"),
          className,
          compactType,
        )}
        style={{ fontFamily: headingFamily }}
      >
        {title.trim() || "\u00a0"}
      </Tag>
    );
  }

  if (emphasis === "full_primary") {
    return (
      <Tag
        className={cn(
          alignBox,
          headingLine,
          !compactType && levelClass[level],
          variant === "onDark" || variant === "onLight"
            ? accentOnPhoto
            : accentSolidPrimary,
          "px-[0.2em] py-[0.1em]",
          align === "left" &&
            (alignFromMd ? "md:-ml-[0.2em]" : "-ml-[0.2em]"),
          className,
          compactType,
        )}
        style={{ fontFamily: headingFamily }}
      >
        {title.trim() || "\u00a0"}
      </Tag>
    );
  }

  /* accent_tail — lead: body + neutral; tail: heading + primary. Keep both spans
   * `inline` so the tail wraps with the sentence (inline-block + max-w-full was
   * overflowing the remaining line width and clipping “Club”). Inherit line-height
   * so display fonts aren't sliced by leading-none. */

  return (
    <Tag
      className={cn(
        "block w-full min-w-0 max-w-full overflow-visible",
        heroHeadingAlignClass(align ?? "left", { fromMd: alignFromMd }),
        headingLine,
        !compactType && levelClass[level],
        "py-[0.14em] pl-[0.12em] pr-[0.4em]",
        (align ?? "left") === "left" &&
          (alignFromMd ? "md:-ml-[0.12em]" : "-ml-[0.12em]"),
        className,
        compactType,
      )}
      style={{ fontFamily: bodyFamily }}
    >
        <span
          className={cn(
            "break-words [overflow-wrap:anywhere] leading-[inherit]",
            baseColorClass,
          )}
          style={{ fontFamily: bodyFamily }}
        >
          {base}
        </span>
      {accent ? (
        <>
          {" "}
          <span className="inline min-w-0 break-words [overflow-wrap:anywhere] align-baseline">
            <span
              className={cn(
                "inline font-black align-baseline break-words [overflow-wrap:anywhere] leading-[inherit]",
                accentTailScriptPad,
                variant === "onDark" || variant === "onLight"
                  ? accentOnPhoto
                  : accentSolidPrimary,
              )}
              style={{ fontFamily: headingFamily }}
            >
              {accent}
            </span>
          </span>
        </>
      ) : null}
    </Tag>
  );
}
