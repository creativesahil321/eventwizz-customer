/**
 * Section header scale for the public vendor site and the onboarding preview.
 * Pair with `<SiteHeading level={2}>` for the title — eyebrow above, subtitle
 * below — so every section header reads the same on every page and device.
 */

/** Small uppercase label above a section title ("BOOK YOUR SPACE"). */
export const SECTION_EYEBROW_CLASS =
  "text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]";

/** Supporting line under a section title: 14px → 16px, compact in phone frames. */
export const SECTION_SUBTITLE_CLASS =
  "text-sm leading-relaxed text-[var(--color-text-dimmed)] sm:text-base @max-md/preview:!text-sm";
