import { ThemeSchema } from "@/types/theme.types";
import { UserType } from "@/types/auth.types";
import { themeService } from "@/services/common/theme/theme.service";

// Interface for processed tenant data
export interface TenantData {
  tenantId: string;
  website_role: UserType | null;
  parentDomain: string | null;
  settings: ThemeSchema;
}

export const getDomain = () => {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  // Local development case - use domain query param
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const params = new URLSearchParams(window.location.search);
    return params.get("domain") || null;
  }

  return hostname;
};

// Get just the subdomain part for internal use
export const getSubdomain = () => {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  const parts = hostname.split(".");

  if (parts.length <= 2) {
    return null;
  }

  return parts.slice(0, -2).join(".");
};

export const isDomainRequest = () => {
  return !!getDomain();
};

// Returns null as we rely on API for website role
export const getWebsiteRoleFromDomain = () => {
  return null;
};

// Returns null as we rely on API for parent-child relationships
export const getParentDomainFromNestedDomain = () => {
  return null;
};

// Create a request cache to prevent duplicate API calls
const domainRequestCache = new Map();

export const getTenantIdFromDomain = async (
  domain: string
): Promise<TenantData | null> => {
  // Check cache first
  if (domainRequestCache.has(domain)) {
    return domainRequestCache.get(domain);
  }

  // Create a promise for this request
  const requestPromise = new Promise<TenantData | null>(async (resolve) => {
    try {
      const response = await themeService.getThemeSettingsByDomain(domain);

      if (!response.isSuccess) {
        resolve(null);
        return;
      }

      const themeData = response.data;

      const result: TenantData = {
        tenantId: domain,
        website_role: (themeData?.website_role as UserType) || null,
        parentDomain: null,
        settings: {
          colors: themeData?.colors || {
            primary: "#019ead",
            secondary: "#2D2D2D",
          },
          typography: themeData?.typography || {
            fontFamily: {
              heading: "Montserrat",
              body: "Inter",
            },
          },
          contactDetails: themeData?.contactDetails || {},
          logo: themeData?.logo || "",
          favicon: themeData?.favicon || "",
          name: themeData?.name || "EventWizz",
          website_role: themeData?.website_role || "",
          locations: themeData?.locations || [],
        },
      };

      resolve(result);
    } catch (error) {
      console.error("Error fetching tenant theme settings:", error);

      // Fallback when API call fails
      const fallbackResult: TenantData = {
        tenantId: getSubdomain() || domain,
        website_role: null,
        parentDomain: getParentDomainFromNestedDomain(),
        settings: {
          colors: {
            primary: "#019ead",
            secondary: "#2D2D2D",
          },
          typography: {
            fontFamily: {
              heading: "Montserrat",
              body: "Inter",
            },
          },
          contactDetails: {},
          logo: "",
          favicon: "",
          name: "EventWizz",
        },
      };

      // Remove from cache on error to allow retry
      domainRequestCache.delete(domain);
      resolve(fallbackResult);
    }
  });

  // Store the promise in the cache
  domainRequestCache.set(domain, requestPromise);
  return requestPromise;
};
