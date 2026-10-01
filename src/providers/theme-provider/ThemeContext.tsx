"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { useThemeQuery, themeKeys } from "@/hooks/use-theme-query";
import { generateThemeCSS } from "@/services/common/theme/constants/theme";
import { syncDocumentGoogleFontLinkForTheme } from "@/lib/site-typography-google-fonts";
import {
  normalizeCustomFontStylesheetUrls,
  syncDocumentCustomFontStylesheetLinksForTheme,
} from "@/lib/site-custom-font-stylesheets";
import { useQueryClient } from "@tanstack/react-query";
import { resolveCurrencySymbol } from "@/lib/currency-format";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import {
  addCacheBusting,
  mediaUpdatedAtToVersion,
  resolveMediaUpdatedAt,
} from "@/lib/image-utils";

/**
 * Context type definition for theme data and state
 */
interface ThemeContextType {
  theme: ThemeSettings | null;
  loading: boolean;
  error: string | null;
  /**
   * DB-backed cache key from theme `media_updated_at` (ms).
   * Use with `addCacheBusting` for logo / favicon / main landing cover.
   */
  mediaVersion?: number;
}

/**
 * Default context values
 */
const defaultContext: ThemeContextType = {
  theme: null,
  loading: true,
  error: null,
  mediaVersion: undefined,
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
  headingEmphasis: "uniform",
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
 * Theme `/theme/settings` → `live_events` now sends flat `category_name`.
 * Older payloads nested it as `category.name` (or a category string).
 */
function readThemeLiveEventCategoryName(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as {
    category_name?: unknown;
    category?: { name?: unknown } | string | null;
  };
  const flat =
    typeof rec.category_name === "string" ? rec.category_name.trim() : "";
  if (flat) return flat;
  const nested = rec.category;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  if (
    nested &&
    typeof nested === "object" &&
    typeof nested.name === "string" &&
    nested.name.trim()
  ) {
    return nested.name.trim();
  }
  return null;
}

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
    customFontStylesheetUrls: normalizeCustomFontStylesheetUrls(
      schema.typography?.customFontStylesheetUrls,
    ),
    headingEmphasis: normalizeHeadingEmphasis(
      schema.typography?.headingEmphasis,
    ),
  };

  // Create properly typed contact details
  const contactDetails: ContactDetails = {
    ...createDefaultContactDetails(),
    ...(schema.contactDetails || {}),
  };

  const seo: SEO = schema.seo
    ? { ...createDefaultSEO(schema.name), ...schema.seo }
    : createDefaultSEO(schema.name);

  return {
    colors,
    typography,
    contactDetails,
    socialLinks: schema.socialLinks
      ? { ...createDefaultSocialLinks(), ...schema.socialLinks }
      : createDefaultSocialLinks(),
    seo,
    logo: schema.logo || "",
    favicon: schema.favicon || "",
    name: schema.name || "EventWizz",
    copyright: schema.copyright || "",
    domain: schema.domain || "",
    website_role: schema.website_role || "",
    currency_symbol: resolveCurrencySymbol(schema.currency_symbol),
    live_events: Array.isArray(schema.live_events)
      ? schema.live_events
          .filter(
            (e) =>
              e &&
              typeof e.title === "string" &&
              typeof e.slug === "string" &&
              typeof e.location_slug === "string",
          )
          .map((e) => ({
            title: e.title.trim(),
            slug: e.slug.trim(),
            location_slug: e.location_slug.trim(),
            location_city: (e.location_city || e.location_slug).trim(),
            category_name: readThemeLiveEventCategoryName(e),
          }))
      : [],
    locations: Array.isArray(schema.locations) ? schema.locations : [],
  };
};

/**
 * Applies theme CSS variables to document root
 * @param settings - Theme settings to apply
 * @param mediaUpdatedAt - DB `media_updated_at` (ISO) so overwritten logo/favicon
 *   at the same path are not served from browser cache
 */
const applyThemeToDOM = (
  settings: ThemeSchema,
  mediaUpdatedAt?: string | null,
): void => {
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

  syncDocumentGoogleFontLinkForTheme(settings);
  syncDocumentCustomFontStylesheetLinksForTheme(settings);

  root.setAttribute(
    "data-heading-emphasis",
    normalizeHeadingEmphasis(settings.typography?.headingEmphasis),
  );

  // Update favicon dynamically so it stays in sync with the theme
  if (settings.favicon) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const version =
      resolveMediaUpdatedAt(settings) ?? mediaUpdatedAt ?? null;
    const faviconHref = addCacheBusting(settings.favicon, version);
    if (link.getAttribute("href") !== faviconHref) {
      link.href = faviconHref;
    }
  }

  // Title is set by SSR via generateMetadata() in root layout using theme.seo.title.
  // Do NOT manipulate document.title here — it causes flash and overwrites the correct SSR value.
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

  // The customer-only `is_newsletter_subscribed` flag is synced on demand by
  // useSyncCustomerNewsletterFlag (newsletter section / dashboard card), not
  // here: refetching the whole theme on every page load cost a Laravel call.

  // DB-backed; identical on SSR + client (unlike query dataUpdatedAt).
  const mediaUpdatedAt = resolveMediaUpdatedAt(queryThemeData, initialTheme);
  const mediaVersion = mediaUpdatedAtToVersion(mediaUpdatedAt);

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

        // Apply theme to DOM (version busts favicon when storage path is reused)
        applyThemeToDOM(
          themeToApply,
          resolveMediaUpdatedAt(themeToApply),
        );

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
  }, [
    queryThemeData,
    initialTheme,
    isQueryLoading,
    isDomainLoading,
  ]);

  // Apply initial theme immediately on mount if available
  useEffect(() => {
    if (initialTheme && typeof window !== "undefined") {
      applyThemeToDOM(
        initialTheme,
        resolveMediaUpdatedAt(initialTheme),
      );

      // Pre-populate the query cache with a mutable copy so TanStack Query
      // never mutates a read-only (frozen) server object (avoids "Cannot assign to read only property 'primary'").
      queryClient.setQueryData(themeKeys.all, (current: ThemeSchema | undefined) => {
        const next = structuredClone(initialTheme);
        if (typeof current?.is_newsletter_subscribed === "boolean") {
          next.is_newsletter_subscribed = current.is_newsletter_subscribed;
        }
        return next;
      });
    }
  }, [initialTheme, queryClient]);

  // Phones: toasts at the top. Bottom toasts covered the sticky checkout /
  // "Book now" bars (e.g. "Seating confirmed" sat over the Pay button).
  const isPhone = useMediaQuery("(max-width: 767px)");

  // Provide theme context to children
  return (
    <ThemeContext.Provider
      value={{
        theme,
        loading: loading && !initialTheme, // Don't show loading if we have initialTheme
        error: queryError ? String(queryError) : error,
        mediaVersion,
      }}
    >
      {children}
      <Toaster
        closeButton
        richColors
        position={isPhone ? "top-center" : "bottom-right"}
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
