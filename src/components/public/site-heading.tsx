"use client";

import { cn } from "@/lib/utils";
import type { BannerHeadingAlign } from "@/lib/banner-heading-align";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import {
  normalizeHeadingEmphasis,
  splitBannerHeading,
  type HeadingEmphasis,
} from "@/lib/heading-emphasis";

type SiteHeadingLevel = 1 | 2 | 3;

type SiteHeadingVariant = "onDark" | "onSurface";

export type SiteHeadingProps = {
  /** Semantic heading level */
  level?: SiteHeadingLevel;
  /** Full line as stored in CMS (e.g. banner_heading) */
  title: string;
  /** Optional substring to highlight at end; must appear in title when set */
  accentHint?: string | null;
  /** Override theme (e.g. previews) */
  emphasis?: HeadingEmphasis;
  /** onDark: hero over imagery; onSurface: page body */
  variant?: SiteHeadingVariant;
  /**
   * Match hero column alignment (`heroBannerStackClass`). Required for `accent_tail`:
   * the heading is `inline-flex`; on narrow screens it can grow to full width, and
   * without this, flex defaults to `justify-start` so lines look left-aligned.
   */
  align?: BannerHeadingAlign;
  className?: string;
};

function headingFlexJustifyClass(align: BannerHeadingAlign | undefined) {
  if (align === "right") return "justify-end";
  if (align === "left") return "justify-start";
  if (align === "center") return "justify-center";
  return "justify-start";
}

const levelClass: Record<SiteHeadingLevel, string> = {
  1: "text-4xl font-semibold tracking-tight md:text-6xl lg:text-7xl",
  2: "text-3xl font-semibold tracking-tight md:text-4xl",
  3: "text-2xl font-semibold tracking-tight md:text-3xl",
};

/** Script/display fonts exceed tight metrics; bg-clip-text clips glyph swashes. */
const headingLine =
  "leading-[1.22] md:leading-[1.18] overflow-visible max-w-full";
const headingBox = "inline-block max-w-full overflow-visible";
/** Extra right padding: script tails (e.g. “UK”) often extend past the em-box; bg-clip-text clips without it. */
const accentTailScriptPad =
  "inline-block align-baseline tracking-normal pl-[0.06em] pr-[0.5em] pb-[0.2em] pt-[0.14em]";

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
  className,
}: SiteHeadingProps) {
  const { theme } = useTheme();
  const emphasis = normalizeHeadingEmphasis(
    emphasisProp ?? theme?.typography?.headingEmphasis,
  );

  const Tag = level === 2 ? "h2" : level === 3 ? "h3" : "h1";

  const { base, accent } = splitBannerHeading(title, accentHint);

  const baseOnDark =
    "text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.55),0_1px_3px_rgba(0,0,0,0.4)]";
  const baseOnSurface = "text-[var(--color-text)]";

  const accentGradient =
    "bg-gradient-to-r from-[color:var(--color-primary)] via-[color:var(--color-primary)] to-[color:color-mix(in_srgb,var(--color-primary)_82%,white)] bg-clip-text text-transparent";

  const accentSolidPrimary = "text-[color:var(--color-primary)]";

  const headingFamily = "var(--font-heading)";
  const bodyFamily = "var(--font-body)";

  if (emphasis === "uniform" || !accent) {
    return (
      <Tag
        className={cn(
          headingBox,
          "italic",
          headingLine,
          levelClass[level],
          variant === "onDark" ? baseOnDark : baseOnSurface,
          "px-[0.12em] py-[0.08em]",
          className,
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
          headingBox,
          "italic",
          headingLine,
          levelClass[level],
          variant === "onDark" ? accentGradient : accentSolidPrimary,
          "px-[0.2em] py-[0.1em]",
          className,
        )}
        style={{ fontFamily: headingFamily }}
      >
        {title.trim() || "\u00a0"}
      </Tag>
    );
  }

  /* accent_tail — lead: body + neutral; tail: heading + primary (display/script
   * only on the tail). Flex + items-baseline aligns sans lead with script tail;
   * tail padding avoids bg-clip-text slicing swashes (e.g. “K” in “UK”). */

  return (
    <Tag
      className={cn(
        "inline-flex max-w-full flex-wrap items-baseline gap-x-[0.2em] overflow-visible",
        headingFlexJustifyClass(align),
        headingLine,
        levelClass[level],
        "px-[0.12em] py-[0.12em]",
        className,
      )}
      style={{ fontFamily: bodyFamily }}
    >
      <span
        className={cn(
          "italic",
          variant === "onDark" ? baseOnDark : baseOnSurface,
        )}
        style={{ fontFamily: bodyFamily }}
      >
        {base}
      </span>
      {accent ? (
        <span
          className={cn(
            "italic",
            accentTailScriptPad,
            variant === "onDark" ? accentGradient : accentSolidPrimary,
          )}
          style={{ fontFamily: headingFamily }}
        >
          {accent}
        </span>
      ) : null}
    </Tag>
  );
}
