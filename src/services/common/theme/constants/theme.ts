import { ThemeSchema } from "@/types/theme.types";

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
    css += `--color-header: ${
      theme.colors.header || defaultThemeConstants.colors.header
    };`;
    css += `--color-footer: ${
      theme.colors.footer || defaultThemeConstants.colors.footer
    };`;

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
    const primaryHover = primaryColor === "#0EA5E9" ? "#0284C7" : primaryColor;
    const secondaryHover =
      secondaryColor === "#1E293B" ? "#0F172A" : secondaryColor;

    css += `--color-primary-hover: ${primaryHover};`;
    css += `--color-primary-focus: ${primaryColor};`;
    css += `--color-primary-foreground: #ffffff;`;

    css += `--color-secondary-hover: ${secondaryHover};`;
    css += `--color-secondary-focus: ${secondaryColor};`;
    css += `--color-secondary-foreground: #ffffff;`;

    // Add social login button colors
    if (theme.colors.socialLogin) {
      // Google colors
      if (theme.colors.socialLogin.google) {
        css += `--color-socialLogin-google: ${theme.colors.socialLogin.google};`;
        // Define hover variant (slightly darker)
        const googleHover =
          theme.colors.socialLogin.google === "#DB4437" ? "#C53929" : "#1765cc";
        css += `--color-socialLogin-google-hover: ${googleHover};`;
      } else if (defaultThemeConstants.colors.socialLogin?.google) {
        css += `--color-socialLogin-google: ${defaultThemeConstants.colors.socialLogin.google};`;
        css += `--color-socialLogin-google-hover: #C53929;`;
      }

      // Microsoft colors
      if (theme.colors.socialLogin.microsoft) {
        css += `--color-socialLogin-microsoft: ${theme.colors.socialLogin.microsoft};`;
        // Define hover variant (slightly darker)
        const microsoftHover =
          theme.colors.socialLogin.microsoft === "#0078D4"
            ? "#006BBF"
            : "#3d3d3d";
        css += `--color-socialLogin-microsoft-hover: ${microsoftHover};`;
      } else if (defaultThemeConstants.colors.socialLogin?.microsoft) {
        css += `--color-socialLogin-microsoft: ${defaultThemeConstants.colors.socialLogin.microsoft};`;
        css += `--color-socialLogin-microsoft-hover: #006BBF;`;
      }
    }
  }

  // Add typography variables if available
  if (theme.typography?.fontFamily) {
    if (theme.typography.fontFamily.heading) {
      css += `--font-heading: ${theme.typography.fontFamily.heading};`;
    } else if (defaultThemeConstants.typography.fontFamily.heading) {
      css += `--font-heading: ${defaultThemeConstants.typography.fontFamily.heading};`;
    }

    if (theme.typography.fontFamily.body) {
      css += `--font-body: ${theme.typography.fontFamily.body};`;
    } else if (defaultThemeConstants.typography.fontFamily.body) {
      css += `--font-body: ${defaultThemeConstants.typography.fontFamily.body};`;
    }
  }

  css += "}";
  return css;
}

/**
 * Generates default theme CSS when no theme is available
 * @returns CSS string with default theme variables
 */
export function getDefaultThemeCSS(): string {
  return `
:root {
  --color-primary: ${defaultThemeConstants.colors.primary};
  --color-secondary: ${defaultThemeConstants.colors.secondary};
  --color-header: ${defaultThemeConstants.colors.header};
  --color-footer: ${defaultThemeConstants.colors.footer};
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
  --color-primary-foreground: #ffffff;
  --color-secondary-hover: ${
    defaultThemeConstants.colors.secondary === "#1E293B"
      ? "#0F172A"
      : defaultThemeConstants.colors.secondary
  };
  --color-secondary-focus: ${defaultThemeConstants.colors.secondary};
  --color-secondary-foreground: #ffffff;
  --color-socialLogin-google: ${
    defaultThemeConstants.colors.socialLogin?.google || "#DB4437"
  };
  --color-socialLogin-google-hover: #C53929;
  --color-socialLogin-microsoft: ${
    defaultThemeConstants.colors.socialLogin?.microsoft || "#0078D4"
  };
  --color-socialLogin-microsoft-hover: #006BBF;
}
`;
}
