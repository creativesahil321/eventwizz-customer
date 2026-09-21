import { isDarkSurface } from "../color-contrast";

/** Flips a dark wordmark to light (and the reverse) without flattening brand hues to pure white. */
export const LOGO_CONTRAST_FLIP_FILTER = "invert(1)";

export type LogoMarkTone = "light" | "dark" | "unknown";

export type LogoChromeFilters = {
  header: string;
  footer: string;
  darkPanel: string;
  lightPanel: string;
};

/**
 * Stored logos are processed against the header. When the mark tone is unknown,
 * flip it on any other surface whose luminance polarity differs from the header
 * (white header + dark footer, the usual hospitality split).
 *
 * When tone is known, flip whenever the mark would disappear on that surface —
 * including dark header + dark footer + a black wordmark.
 */
export function logoFilterForSurface(options: {
  surfaceIsDark: boolean;
  headerIsDark: boolean;
  tone?: LogoMarkTone;
}): string {
  const tone = options.tone ?? "unknown";
  if (tone === "dark") {
    return options.surfaceIsDark ? LOGO_CONTRAST_FLIP_FILTER : "none";
  }
  if (tone === "light") {
    return options.surfaceIsDark ? "none" : LOGO_CONTRAST_FLIP_FILTER;
  }
  return options.surfaceIsDark !== options.headerIsDark
    ? LOGO_CONTRAST_FLIP_FILTER
    : "none";
}

export function logoContrastFilters(
  headerBackground: string,
  footerBackground: string,
  tone: LogoMarkTone = "unknown",
): LogoChromeFilters {
  const headerIsDark = isDarkSurface(headerBackground);
  const footerIsDark = isDarkSurface(footerBackground);
  return {
    header: logoFilterForSurface({
      surfaceIsDark: headerIsDark,
      headerIsDark,
      tone,
    }),
    footer: logoFilterForSurface({
      surfaceIsDark: footerIsDark,
      headerIsDark,
      tone,
    }),
    darkPanel: logoFilterForSurface({
      surfaceIsDark: true,
      headerIsDark,
      tone,
    }),
    lightPanel: logoFilterForSurface({
      surfaceIsDark: false,
      headerIsDark,
      tone,
    }),
  };
}

/** CSS custom properties consumed by `BrandLogoImage`. */
export function logoContrastCssProperties(
  headerBackground: string,
  footerBackground: string,
  tone: LogoMarkTone = "unknown",
): Record<string, string> {
  const filters = logoContrastFilters(headerBackground, footerBackground, tone);
  return {
    "--logo-on-header-filter": filters.header,
    "--logo-on-footer-filter": filters.footer,
    "--logo-on-dark-panel-filter": filters.darkPanel,
    "--logo-on-light-panel-filter": filters.lightPanel,
  };
}
