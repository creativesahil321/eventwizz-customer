"use client";

import { cn } from "@/lib/utils";
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
  className?: string;
};

const levelClass: Record<SiteHeadingLevel, string> = {
  1: "text-4xl md:text-6xl lg:text-7xl",
  2: "text-3xl md:text-4xl",
  3: "text-2xl md:text-3xl",
};

/**
 * Public-site heading that respects `typography.headingEmphasis` from theme.
 * `accent_tail` uses heading font for the lead and body font for the colored tail.
 * Use only on customer-facing routes — not dashboards or onboarding.
 */
export function SiteHeading({
  level = 1,
  title,
  accentHint,
  emphasis: emphasisProp,
  variant = "onDark",
  className,
}: SiteHeadingProps) {
  const { theme } = useTheme();
  const emphasis = normalizeHeadingEmphasis(
    emphasisProp ?? theme?.typography?.headingEmphasis,
  );

  const Tag = level === 2 ? "h2" : level === 3 ? "h3" : "h1";

  const { base, accent } = splitBannerHeading(title, accentHint);

  const baseOnDark = "text-white drop-shadow-md";
  const baseOnSurface = "text-[var(--color-text)]";

  const accentGradient =
    "bg-gradient-to-r from-[color:var(--color-primary)] via-[color:var(--color-primary)] to-[color:color-mix(in_srgb,var(--color-primary)_82%,white)] bg-clip-text text-transparent";

  const accentSolidPrimary = "text-[color:var(--color-primary)]";

  if (emphasis === "uniform" || !accent) {
    return (
      <Tag
        className={cn(
          "font-heading italic leading-tight",
          levelClass[level],
          variant === "onDark" ? baseOnDark : baseOnSurface,
          className,
        )}
      >
        {title.trim() || "\u00a0"}
      </Tag>
    );
  }

  if (emphasis === "full_primary") {
    return (
      <Tag
        className={cn(
          "font-heading italic leading-tight",
          levelClass[level],
          variant === "onDark" ? accentGradient : accentSolidPrimary,
          className,
        )}
      >
        {title.trim() || "\u00a0"}
      </Tag>
    );
  }

  /* accent_tail — base: heading font + neutral color; tail: body font + primary */
  return (
    <Tag
      className={cn(
        "italic leading-tight",
        levelClass[level],
        className,
      )}
    >
      <span
        className={cn(
          "font-heading",
          variant === "onDark" ? baseOnDark : baseOnSurface,
        )}
      >
        {base}
        {base && accent ? "\u00a0" : null}
      </span>
      {accent ? (
        <span
          className={cn(
            "font-body",
            variant === "onDark" ? accentGradient : accentSolidPrimary,
          )}
        >
          {accent}
        </span>
      ) : null}
    </Tag>
  );
}
