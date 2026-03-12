"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import {
  ThemeSettings,
  ThemeColors,
  ThemeTypography,
  ContactDetails,
  SocialLinks,
  SEO,
  ThemeSchema,
} from "@/types/theme.types";
import { Toaster } from "@/components/ui/sonner";
import { useThemeQuery, themeKeys } from "@/hooks/use-theme-query";
import { generateThemeCSS } from "@/services/common/theme/constants/theme";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Context type definition for theme data and state
 */
interface ThemeContextType {
  theme: ThemeSettings | null;
  loading: boolean;
  error: string | null;
}

/**
 * Default context values
 */
const defaultContext: ThemeContextType = {
  theme: null,
  loading: true,
  error: null,
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

/**
 * Hook to access theme context
 * @returns ThemeContextType
 */
export const useTheme = (): ThemeContextType => useContext(ThemeContext);

/**
 * Create default theme colors with all required properties
 */
const createDefaultColors = (): ThemeColors => ({
  primary: "#0F172A",
  secondary: "#64748B",
  header: "#FFFFFF",
  footer: "#0F172A",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  textDimmed: "#64748B",
  socialLogin: {
    google: "#DB4437",
    microsoft: "#F25022",
  },
});

/**
 * Create default typography with all required properties
 */
const createDefaultTypography = (): ThemeTypography => ({
  fontFamily: {
    heading: "Montserrat",
    body: "Inter",
  },
});

/**
 * Create default contact details with all required properties
 */
const createDefaultContactDetails = (): ContactDetails => ({
  email: "",
  phone: "",
  alternativeEmail: "",
  alternativePhone: "",
  address: "",
});

/**
 * Create default social links with all required properties
 */
const createDefaultSocialLinks = (): SocialLinks => ({
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
  youtube: "",
});

/**
 * Create default SEO with all required properties
 */
const createDefaultSEO = (title: string = "EventWizz"): SEO => ({
  title: title,
  description: "",
  keywords: "",
});

/**
 * Converts domain theme schema to application theme settings
 * @param schema - Domain theme schema or null
 * @returns Properly formatted ThemeSettings object
 */
const mapSchemaToSettings = (
  schema: ThemeSchema | null,
): ThemeSettings | null => {
  if (!schema) return null;

  // Create properly typed theme colors by merging defaults with schema colors
  const colors: ThemeColors = {
    ...createDefaultColors(),
    ...(schema.colors || {}),
  };

  // Create properly typed typography by merging defaults with schema typography
  const typography: ThemeTypography = {
    fontFamily: {
      ...createDefaultTypography().fontFamily,
      ...(schema.typography?.fontFamily || {}),
    },
  };

  // Create properly typed contact details
  const contactDetails: ContactDetails = {
    ...createDefaultContactDetails(),
    ...(schema.contactDetails || {}),
  };

  return {
    colors,
    typography,
    contactDetails,
    socialLinks: createDefaultSocialLinks(),
    seo: createDefaultSEO(schema.name),
    logo: schema.logo || "",
    favicon: schema.favicon || "",
    name: schema.name || "EventWizz",
    copyright: "",
    domain: "",
    website_role: "",
  };
};

/**
 * Applies theme CSS variables to document root
 * @param settings - Theme settings to apply
 */
const applyThemeToDOM = (settings: ThemeSchema): void => {
  if (!settings) return;

  // Generate CSS using the shared utility
  const css = generateThemeCSS(settings);

  // Apply CSS to document root
  const root = document.documentElement;
  const cssVars = css.match(/--[^:]+:[^;]+;/g) || [];

  cssVars.forEach((varDecl) => {
    const [name, value] = varDecl.replace(";", "").split(":");
    if (name && value) {
      root.style.setProperty(name.trim(), value.trim());
    }
  });

  // Update favicon dynamically so it stays in sync with the theme
  if (settings.favicon) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (link.href !== settings.favicon) {
      link.href = settings.favicon;
    }
  }

  // Title: use same format as SSR generateMetadata so no flash when both have theme.
  // When SSR doesn't get theme (e.g. wrong host), client still applies vendor name.
  if (settings.name) {
    const title = `${settings.name} | Event Management`;
    if (document.title !== title) document.title = title;
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeSchema | null;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = null,
}) => {
  const [theme, setTheme] = useState<ThemeSettings | null>(
    initialTheme ? mapSchemaToSettings(initialTheme) : null,
  );
  const [loading, setLoading] = useState<boolean>(initialTheme ? false : true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Use domain context for theme settings
  const { domain, isLoading: isDomainLoading } = useDomain();

  // Use TanStack Query for theme data
  const {
    data: queryThemeData,
    isLoading: isQueryLoading,
    error: queryError,
  } = useThemeQuery(domain, initialTheme);

  // Apply theme from either initialTheme (SSR) or query result (CSR)
  useEffect(() => {
    // If we have domain loading or query running, keep the existing theme
    if (isDomainLoading || isQueryLoading) {
      return;
    }

    // Prioritize query theme data over initial theme
    const themeToApply = queryThemeData || initialTheme;

    if (themeToApply) {
      try {
        // Map domain settings to theme settings
        const themeSettings = mapSchemaToSettings(themeToApply);
        setTheme(themeSettings);

        // Apply theme to DOM
        applyThemeToDOM(themeToApply);

        setLoading(false);
      } catch (err) {
        console.error("Error processing theme settings:", err);
        setError("Failed to process theme settings");
        setLoading(false);
      }
    } else if (!isQueryLoading && !isDomainLoading && !initialTheme) {
      // If everything is done loading but we still don't have theme data
      setError("Theme settings not available");
      setLoading(false);
    }
  }, [queryThemeData, initialTheme, isQueryLoading, isDomainLoading]);

  // Apply initial theme immediately on mount if available
  useEffect(() => {
    if (initialTheme && typeof window !== "undefined") {
      applyThemeToDOM(initialTheme);

      // Pre-populate the query cache with initial theme to avoid duplicate requests
      queryClient.setQueryData(themeKeys.all, initialTheme);
    }
  }, [initialTheme, queryClient]);

  // Provide theme context to children
  return (
    <ThemeContext.Provider
      value={{
        theme,
        loading: loading && !initialTheme, // Don't show loading if we have initialTheme
        error: queryError ? String(queryError) : error,
      }}
    >
      {children}
      <Toaster
        closeButton
        richColors
        style={
          {
            "--normal-bg": "var(--color-surface, white)",
            "--normal-border": "var(--border, #e2e8f0)",
            "--normal-text": "var(--color-text, black)",
            "--success-bg": "var(--color-success, #4caf50)",
            "--success-border": "var(--color-success, #4caf50)",
            "--success-text": "white",
            "--error-bg": "var(--color-error, #f44336)",
            "--error-border": "var(--color-error, #f44336)",
            "--error-text": "white",
            "--warning-bg": "var(--color-warning, #ff9800)",
            "--warning-border": "var(--color-warning, #ff9800)",
            "--warning-text": "white",
            "--info-bg": "var(--color-info, #2196f3)",
            "--info-border": "var(--color-info, #2196f3)",
            "--info-text": "white",
            "--radius": "var(--radius, 0.5rem)",
          } as React.CSSProperties
        }
      />
    </ThemeContext.Provider>
  );
};
