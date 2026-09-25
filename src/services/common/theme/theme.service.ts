import { API_ENDPOINTS } from "@/services/core/endpoints";
import { ThemeSchema } from "@/types/theme.types";
import { env } from "@/env";
import { normalizeThemePayload } from "@/lib/normalize-theme-payload";
import { useAuthStore } from "@/store/auth.store";
import { ApiResponse, ServiceResponse } from "./type";

function themeRequestHeaders(cleanDomain: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Domain": cleanDomain,
  };

  if (typeof window === "undefined") {
    return headers;
  }

  try {
    const { token, tokenExpiry, account_type } = useAuthStore.getState();
    const validToken = Boolean(token) && (!tokenExpiry || Date.now() < tokenExpiry);
    if (validToken && account_type === "customer") {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Auth store may be unavailable during early boot; guest fetch still works.
  }

  return headers;
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

      const apiUrl = env.NEXT_PUBLIC_API_URL;
      const endpoint = `${apiUrl}${
        API_ENDPOINTS.COMMON.THEME.SETTINGS
      }?domain_name=${encodeURIComponent(cleanDomain)}`;

      // Detect if running in a browser
      const isBrowser = typeof window !== "undefined";

      const headers = themeRequestHeaders(cleanDomain);

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
