import { cache } from "react";
import { ThemeSchema } from "@/types/theme.types";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { env } from "@/env";
import { headers } from "next/headers";
import {
  generateThemeCSS,
  getDefaultThemeCSS,
} from "@/services/common/theme/constants/theme";

/**
 * Gets the domain from environment variables
 * Used as a fallback when request headers are not available
 * @returns Domain name string
 */
export function getServerDomain(): string {
  let domain = env.NEXT_PUBLIC_WHITE_LABEL_URL || "eventwizz.com";

  if (env.NEXT_PUBLIC_APP_URL) {
    try {
      // Parse URL and extract hostname
      const url = new URL(env.NEXT_PUBLIC_APP_URL);
      domain = url.hostname;
    } catch (e) {
      // Only log errors in development mode
      if (env.NODE_ENV !== "production") {
        console.error("Invalid NEXT_PUBLIC_APP_URL:", e);
      }
    }
  }

  // Make sure to return domain without port
  return domain.split(":")[0];
}

/**
 * Gets the domain from request headers with fallback to environment variables
 * Safe to use in both server components and middleware
 * @returns Promise<string> Domain name string
 */
export async function getRequestHost(): Promise<string> {
  try {
    // Headers are available in an async context
    const headersInstance = await headers();
    const host = headersInstance.get("host") || "";

    if (host) {
      // Remove port from domain if present
      return host.split(":")[0];
    }

    // Fallback to environment variable
    return getServerDomain();
  } catch {
    // Silent fallback to environment variable on error
    return getServerDomain();
  }
}

/**
 * Extract subdomain from a domain string
 * @param domain Full domain name (e.g., vendor.example.com)
 * @returns Subdomain string or null if no subdomain
 */
export function getSubdomainFromDomain(domain: string): string | null {
  if (!domain) return null;

  // Handle localhost and IP addresses
  if (domain.includes("localhost") || domain.includes("127.0.0.1")) {
    return null;
  }

  const domainParts = domain.split(".");
  // If domain has more than 2 parts (subdomain.domain.tld), the first part is the subdomain
  return domainParts.length > 2 ? domainParts[0] : null;
}

/**
 * Fetch theme data from the API for a specific domain
 * @param domain Domain to fetch theme for
 * @returns ThemeSchema or null if error
 */
export async function fetchServerTheme(
  domain: string
): Promise<ThemeSchema | null> {
  if (!domain) {
    return null;
  }

  // Remove port from domain if present
  const cleanDomain = domain.split(":")[0];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const endpoint = `${apiUrl}${API_ENDPOINTS.COMMON.THEME.SETTINGS
      }?domain_name=${encodeURIComponent(cleanDomain)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Origin: env.NEXT_PUBLIC_APP_URL || "",
        Host: cleanDomain,
      },
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.status) {
      return null;
    }

    return data.data as ThemeSchema;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Per-request memoized version of fetchServerTheme.
 * React's cache() deduplicates calls within the same render pass so that
 * generateMetadata() and the layout body share a single fetch.
 */
export const fetchServerThemeCached = cache(fetchServerTheme);

/**
 * Generate theme CSS to avoid FOUC
 * @param theme ThemeSchema or null
 * @returns CSS string for critical rendering
 */
export function generateCriticalThemeCSS(theme: ThemeSchema | null): string {
  return theme ? generateThemeCSS(theme) : getDefaultThemeCSS();
}
