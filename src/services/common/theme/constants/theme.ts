import { ThemeSchema } from "@/types/theme.types";
import { normalizeThemeTypography } from "@/lib/normalize-theme-payload";
import {
  getAnchorColor,
  normalizeHex,
  pickHeroOverlayColor,
  pickReadableForeground,
} from "@/lib/color-contrast";
import { logoContrastCssProperties } from "@/lib/logo/chrome-contrast";

/**
 * Default theme constants used throughout the application
 * This serves as a single source of truth for default theme values
 */
export const defaultThemeConstants = {
  colors: {
    primary: "#0F172A", // Slate 900
    secondary: "#64748B", // Slate 500
    header: "#FFFFFF", // White
    footer: "#0F172A", // Slate 900
    background: "#F8FAFC", // Slate 50
    surface: "#FFFFFF", // White
    text: "#0F172A", // Slate 900
    textDimmed: "#64748B", // Slate 500
    socialLogin: {
      google: "#DB4437",
      microsoft: "#0078D4", // Microsoft blue
    },
  },
  typography: {
    fontFamily: {
      heading: "var(--font-tiempos-headline)",
      body: "var(--font-inter)",
    },
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function darkenHex(hexColor: string, amount = 0.12): string {
  const hex = normalizeHex(getAnchorColor(hexColor));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const darkenChannel = (channel: number) =>
    clamp(Math.round(channel * (1 - amount)), 0, 255);

  const nr = darkenChannel(r);
  const ng = darkenChannel(g);
  const nb = darkenChannel(b);

  return `#${nr.toString(16).padStart(2, "0")}${ng
    .toString(16)
    .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

/**
 * Generates CSS variables string for theme
 * Shared between server-side and client-side rendering
 * @param theme - Theme schema or null
 * @returns CSS string with variables
 */
export function generateThemeCSS(theme: ThemeSchema | null): string {
  if (!theme || !theme.colors) {
    return ""; // No theme, no CSS
  }

  const normalized = normalizeThemeTypography(theme);

  let css = ":root {";

  // Add color variables
  if (theme.colors) {
    // Add primary colors
    css += `--color-primary: ${
      theme.colors.primary || defaultThemeConstants.colors.primary
    };`;
    css += `--color-secondary: ${
      theme.colors.secondary || defaultThemeConstants.colors.secondary
    };`;

    // Add layout colors
    const headerColor =
      theme.colors.header || defaultThemeConstants.colors.header;
    const footerColor =
      theme.colors.footer || defaultThemeConstants.colors.footer;
    css += `--color-header: ${headerColor};`;
    css += `--color-footer: ${footerColor};`;
    css += `--color-hero-overlay: ${pickHeroOverlayColor(headerColor, footerColor)};`;

    // Add dimmed text color
    css += `--color-text-dimmed: ${
      theme.colors.textDimmed || defaultThemeConstants.colors.textDimmed
    };`;

    // Add other colors
    css += `--color-background: ${
      theme.colors.background || defaultThemeConstants.colors.background
    };`;
    css += `--color-surface: ${
      theme.colors.surface || defaultThemeConstants.colors.surface
    };`;
    css += `--color-text: ${
      theme.colors.text || defaultThemeConstants.colors.text
    };`;

    // For primary and secondary colors, create hover and focus variants
    const primaryColor =
      theme.colors.primary || defaultThemeConstants.colors.primary;
    const secondaryColor =
      theme.colors.secondary || defaultThemeConstants.colors.secondary;

    // Create slightly darker hover variants
    const primaryHover = darkenHex(primaryColor);
    const secondaryHover = darkenHex(secondaryColor);

    css += `--color-primary-hover: ${primaryHover};`;
    css += `--color-primary-focus: ${primaryColor};`;
    css += `--color-primary-foreground: ${pickReadableForeground(primaryColor)};`;

    css += `--color-secondary-hover: ${secondaryHover};`;
    css += `--color-secondary-focus: ${secondaryColor};`;
    css += `--color-secondary-foreground: ${pickReadableForeground(secondaryColor)};`;

    const surfaceColor = theme.colors.surface || defaultThemeConstants.colors.surface;
    const backgroundColor =
      theme.colors.background || defaultThemeConstants.colors.background;

    css += `--color-on-header: ${pickReadableForeground(headerColor)};`;
    css += `--color-on-footer: ${pickReadableForeground(footerColor)};`;
    css += `--color-on-surface: ${pickReadableForeground(surfaceColor)};`;
    css += `--color-on-background: ${pickReadableForeground(backgroundColor)};`;

    const logoFilters = logoContrastCssProperties(headerColor, footerColor);
    for (const [name, value] of Object.entries(logoFilters)) {
      css += `${name}: ${value};`;
    }

    // Add social login button colors
    if (theme.colors.socialLogin) {
      // Google colors
      if (theme.colors.socialLogin.google) {
        css += `--color-socialLogin-google: ${theme.colors.socialLogin.google};`;
        // Define hover variant as a darker version of selected color
        const googleHover = darkenHex(theme.colors.socialLogin.google);
        css += `--color-socialLogin-google-hover: ${googleHover};`;
      } else if (defaultThemeConstants.colors.socialLogin?.google) {
        css += `--color-socialLogin-google: ${defaultThemeConstants.colors.socialLogin.google};`;
        css += `--color-socialLogin-google-hover: ${darkenHex(defaultThemeConstants.colors.socialLogin.google)};`;
      }

      // Microsoft colors
      if (theme.colors.socialLogin.microsoft) {
        css += `--color-socialLogin-microsoft: ${theme.colors.socialLogin.microsoft};`;
        // Define hover variant as a darker version of selected color
        const microsoftHover = darkenHex(theme.colors.socialLogin.microsoft);
        css += `--color-socialLogin-microsoft-hover: ${microsoftHover};`;
      } else if (defaultThemeConstants.colors.socialLogin?.microsoft) {
        css += `--color-socialLogin-microsoft: ${defaultThemeConstants.colors.socialLogin.microsoft};`;
        css += `--color-socialLogin-microsoft-hover: ${darkenHex(defaultThemeConstants.colors.socialLogin.microsoft)};`;
      }
    }
  }

  const headingFont =
    normalized.typography?.fontFamily?.heading ||
    defaultThemeConstants.typography.fontFamily.heading;
  const bodyFont =
    normalized.typography?.fontFamily?.body ||
    defaultThemeConstants.typography.fontFamily.body;
  css += `--font-heading: ${headingFont};`;
  css += `--font-body: ${bodyFont};`;

  css += "}";
  return css;
}

/**
 * Generates default theme CSS when no theme is available
 * @returns CSS string with default theme variables
 */
export function getDefaultThemeCSS(): string {
  const logoFilters = logoContrastCssProperties(
    defaultThemeConstants.colors.header,
    defaultThemeConstants.colors.footer,
  );
  const logoFilterCss = Object.entries(logoFilters)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  return `
:root {
  --color-primary: ${defaultThemeConstants.colors.primary};
  --color-secondary: ${defaultThemeConstants.colors.secondary};
  --color-header: ${defaultThemeConstants.colors.header};
  --color-footer: ${defaultThemeConstants.colors.footer};
  --color-hero-overlay: ${pickHeroOverlayColor(
    defaultThemeConstants.colors.header,
    defaultThemeConstants.colors.footer,
  )};
  --color-background: ${defaultThemeConstants.colors.background};
  --color-surface: ${defaultThemeConstants.colors.surface};
  --color-text: ${defaultThemeConstants.colors.text};
  --color-text-dimmed: ${defaultThemeConstants.colors.textDimmed};
  --font-heading: ${defaultThemeConstants.typography.fontFamily.heading};
  --font-body: ${defaultThemeConstants.typography.fontFamily.body};
  --color-primary-hover: ${
    defaultThemeConstants.colors.primary === "#0EA5E9"
      ? "#0284C7"
      : defaultThemeConstants.colors.primary
  };
  --color-primary-focus: ${defaultThemeConstants.colors.primary};
  --color-primary-foreground: ${pickReadableForeground(defaultThemeConstants.colors.primary)};
  --color-secondary-hover: ${
    defaultThemeConstants.colors.secondary === "#1E293B"
      ? "#0F172A"
      : defaultThemeConstants.colors.secondary
  };
  --color-secondary-focus: ${defaultThemeConstants.colors.secondary};
  --color-secondary-foreground: ${pickReadableForeground(defaultThemeConstants.colors.secondary)};
  --color-on-header: ${pickReadableForeground(defaultThemeConstants.colors.header)};
  --color-on-footer: ${pickReadableForeground(defaultThemeConstants.colors.footer)};
  --color-on-surface: ${pickReadableForeground(defaultThemeConstants.colors.surface)};
  --color-on-background: ${pickReadableForeground(defaultThemeConstants.colors.background)};
${logoFilterCss}
  --color-socialLogin-google: ${
    defaultThemeConstants.colors.socialLogin?.google || "#DB4437"
  };
  --color-socialLogin-google-hover: ${darkenHex(defaultThemeConstants.colors.socialLogin?.google || "#DB4437")};
  --color-socialLogin-microsoft: ${
    defaultThemeConstants.colors.socialLogin?.microsoft || "#0078D4"
  };
  --color-socialLogin-microsoft-hover: ${darkenHex(defaultThemeConstants.colors.socialLogin?.microsoft || "#0078D4")};
}
`;
}
