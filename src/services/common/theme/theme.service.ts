import { API_ENDPOINTS } from "@/services/core/endpoints";
import { ThemeSchema } from "@/types/theme.types";
import { env } from "@/env";
import { normalizeThemePayload } from "@/lib/normalize-theme-payload";
import { useAuthStore } from "@/store/auth.store";
import {
  backendProxyHeaders,
  backendProxyUrl,
} from "@/lib/backend/backend-transport";
import { ApiResponse, ServiceResponse } from "./type";

function themeRequestHeaders(cleanDomain: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Domain": cleanDomain,
  };
}

/**
 * Signed-in customers fetch the theme authenticated (per-customer data);
 * everyone else fetches it anonymously, direct to Laravel. Authenticated
 * requests go through the same-origin proxy so the browser never holds the
 * Laravel token.
 */
function isBrowserCustomerSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const { isAuthenticated, account_type } = useAuthStore.getState();
    return isAuthenticated && account_type === "customer";
  } catch {
    // Auth store may be unavailable during early boot; guest fetch still works.
    return false;
  }
}

/**
 * Service for theme-related API requests
 */
export const themeService = {
  /**
   * Get theme settings by domain name
   * @param domainName - Domain name to fetch theme for
   * @returns Service response with theme settings
   */
  async getThemeSettingsByDomain(
    domainName: string
  ): Promise<ServiceResponse<ThemeSchema>> {
    try {
      // Remove port from domain if present (e.g., example.com:3000 -> example.com)
      const cleanDomain = domainName.split(":")[0];

      const themePath = `${API_ENDPOINTS.COMMON.THEME.SETTINGS}?domain_name=${encodeURIComponent(cleanDomain)}`;
      const viaProxy = isBrowserCustomerSession();
      const endpoint = viaProxy
        ? backendProxyUrl(themePath)
        : `${env.NEXT_PUBLIC_API_URL}${themePath}`;

      // Detect if running in a browser
      const isBrowser = typeof window !== "undefined";

      const headers = viaProxy
        ? { ...themeRequestHeaders(cleanDomain), ...backendProxyHeaders() }
        : themeRequestHeaders(cleanDomain);

      // Use different options for browser vs server
      const fetchOptions: RequestInit = {
        method: "GET",
        headers,
      };

      // Add more headers for server-side requests
      if (!isBrowser) {
        fetchOptions.headers = {
          ...headers,
          Origin: env.NEXT_PUBLIC_APP_URL || "",
          Host: cleanDomain,
        };

        // Add Next.js specific options for SSR
        fetchOptions.next = { revalidate: 60 };
      }

      const response = await fetch(endpoint, fetchOptions);

      if (!response.ok) {
        return {
          isSuccess: false,
          message: `Failed to fetch theme settings: ${response.statusText}`,
          data: null,
        };
      }

      const data = (await response.json()) as ApiResponse<ThemeSchema>;

      if (!data.status) {
        return {
          isSuccess: false,
          message: data.message || "Failed to fetch theme settings",
          data: null,
        };
      }

      return {
        isSuccess: true,
        message: "Theme settings fetched successfully",
        data: normalizeThemePayload(data.data),
      };
    } catch (error) {
      // Type error in a more specific way
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while fetching theme settings";

      return {
        isSuccess: false,
        message: errorMessage,
        data: null,
      };
    }
  },
};
