import { API_ENDPOINTS } from "@/services/core/endpoints";
import { useAuthStore } from "@/store/auth.store";
import { UserRole } from "@/services/common/notification/type";

/**
 * Get the current user role from the auth store
 * @returns The current user role, defaulting to "vendor" if not available
 */
export const getCurrentUserRole = (): UserRole => {
  const { account_type } = useAuthStore.getState();
  return account_type as UserRole;
};

/**
 * Generic function to get API endpoints based on user role and service
 * @param serviceName The service key in API_ENDPOINTS (e.g., "NOTIFICATIONS", "SITES_ESSENTIALS")
 * @param customRole Optional override for user role
 * @returns The appropriate endpoints object based on role and service
 */
export const getEndpointsByRole = <T>(
  serviceName: string,
  customRole?: UserRole
): T => {
  const role = customRole || getCurrentUserRole();

  console.log(`Getting endpoints for service: ${serviceName}, role: ${role}`);

  // Verify that the requested service exists in the endpoints for the role
  const adminEndpoints = (API_ENDPOINTS.ADMIN as Record<string, unknown>)[
    serviceName
  ];
  const vendorEndpoints = (API_ENDPOINTS.VENDOR as Record<string, unknown>)[
    serviceName
  ];
  const customerEndpoints = (API_ENDPOINTS.CUSTOMER as Record<string, unknown>)[
    serviceName
  ];

  console.log(`Available endpoints:`, {
    adminHasEndpoints: !!adminEndpoints,
    vendorHasEndpoints: !!vendorEndpoints,
    customerHasEndpoints: !!customerEndpoints,
  });

  // Use type assertions to safely access nested properties
  // and provide fallbacks to vendor endpoints when needed
  switch (role) {
    case "admin":
      return ((API_ENDPOINTS.ADMIN as Record<string, unknown>)[serviceName] ||
        (API_ENDPOINTS.VENDOR as Record<string, unknown>)[serviceName]) as T;
    case "customer":
      return ((API_ENDPOINTS.CUSTOMER as Record<string, unknown>)[
        serviceName
      ] || (API_ENDPOINTS.VENDOR as Record<string, unknown>)[serviceName]) as T;
    case "vendor":
    default:
      return (API_ENDPOINTS.VENDOR as Record<string, unknown>)[
        serviceName
      ] as T;
  }
};

/**
 * Create an endpoint URL with replaceable parameters
 * @param url URL template with {param} placeholders
 * @param params Parameters to replace in the URL
 * @returns Formatted URL with replaced parameters
 */
export const formatEndpointUrl = (
  url: string,
  params?: Record<string, string | number>
): string => {
  if (!params) return url;

  let formattedUrl = url;
  Object.entries(params).forEach(([key, value]) => {
    formattedUrl = formattedUrl.replace(`{${key}}`, value.toString());
  });

  return formattedUrl;
};

/**
 * Create a role-aware service helper that automatically selects the appropriate endpoints
 * @param serviceName The name of the service in API_ENDPOINTS
 * @returns An object with methods for common API operations
 */
export const createRoleAwareService = <T>(serviceName: string) => {
  return {
    /**
     * Get the appropriate endpoints for the current user role
     */
    getEndpoints: () => getEndpointsByRole<T>(serviceName),

    /**
     * Format an endpoint URL with parameters
     * @param endpointKey The key of the endpoint in the service
     * @param params Parameters to replace in the URL
     */
    getUrl: (
      endpointKey: keyof T & string,
      params?: Record<string, string | number>
    ) => {
      const endpoints = getEndpointsByRole<T>(serviceName);
      const url = endpoints[endpointKey] as string;
      return formatEndpointUrl(url, params);
    },
  };
};

// Utility function to validate domain access
// 🎯 KEY INSIGHT: When backend returns "Invalid domain access", it means ONLY the exact domain is allowed
// NOT subdomains. So if backend expects "eventwizz.com", then "vendor.eventwizz.com" is INVALID
export const validateDomainAccess = (
  currentHostname: string,
  expectedDomain: string
): boolean => {
  // When backend returns "Invalid domain access", it means ONLY the exact domain is allowed
  // NOT subdomains, unless explicitly configured otherwise

  // Direct domain match (exact match only)
  if (currentHostname === expectedDomain) {
    return true;
  }

  // Handle localhost development (always allow)
  if (
    currentHostname.includes("localhost") ||
    currentHostname.includes("127.0.0.1")
  ) {
    return true;
  }

  // For production: Only exact domain match is allowed
  // Subdomains like vendor.eventwizz.com are NOT valid when backend expects eventwizz.com
  return false;
};

// Function to get correct redirect URL
export const getCorrectRedirectUrl = (
  currentHostname: string,
  expectedDomain: string,
  currentPath: string,
  currentSearch: string
): string => {
  const currentProtocol = window.location.protocol;
  const currentPort = window.location.port;
  const portSuffix = currentPort ? `:${currentPort}` : "";

  // If we're on a subdomain but should be on main domain
  if (currentHostname.includes(".") && currentHostname.split(".").length > 2) {
    // Extract the current path and redirect to main domain
    let path = currentPath;
    const search = currentSearch;

    // Special handling for /welcome/ routes - these should NOT get role prefix
    // /welcome/ routes are role-agnostic and accessible on the main domain without role prefix
    // e.g., /welcome/select-location should redirect to eventwizz.com:3000/welcome/select-location
    // NOT eventwizz.com:3000/vendor/welcome/select-location
    if (path.startsWith("/welcome/")) {
      console.log(
        `[Redirect URL] Processing welcome route redirect (no role prefix):`
      );
      console.log(`  - Original path: ${path}`);
      console.log(`  - Welcome routes don't get role prefix`);

      const finalUrl = `${currentProtocol}//${expectedDomain}${portSuffix}${path}${search}`;
      console.log(`  - Final URL: ${finalUrl}`);
      return finalUrl;
    }

    // If we're on a vendor subdomain, redirect to main domain with vendor path
    if (currentHostname.startsWith("vendor.")) {
      console.log(`[Redirect URL] Processing vendor subdomain redirect:`);
      console.log(`  - Original path: ${path}`);

      // If path already starts with /vendor/, remove it to avoid duplication
      if (path.startsWith("/vendor/")) {
        path = path.substring(7); // Remove "/vendor/"
        console.log(`  - Removed /vendor/ prefix, new path: ${path}`);
      } else if (path.startsWith("/vendor")) {
        path = path.substring(8); // Remove "/vendor"
        console.log(`  - Removed /vendor prefix, new path: ${path}`);
      } else {
        console.log(`  - No vendor prefix found, keeping path: ${path}`);
      }

      const finalUrl = `${currentProtocol}//${expectedDomain}${portSuffix}/vendor${path}${search}`;
      console.log(`  - Final URL: ${finalUrl}`);
      return finalUrl;
    } else if (currentHostname.startsWith("customer.")) {
      // If path already starts with /customer/, remove it to avoid duplication
      if (path.startsWith("/customer/")) {
        path = path.substring(10); // Remove "/customer/"
      } else if (path.startsWith("/customer")) {
        path = path.substring(10); // Remove "/customer"
      }
      return `${currentProtocol}//${expectedDomain}${portSuffix}/customer${path}${search}`;
    } else {
      // Generic subdomain redirect
      return `${currentProtocol}//${expectedDomain}${portSuffix}${path}${search}`;
    }
  } else {
    // Direct domain redirect
    return `${currentProtocol}//${expectedDomain}${portSuffix}${currentPath}${currentSearch}`;
  }
};
