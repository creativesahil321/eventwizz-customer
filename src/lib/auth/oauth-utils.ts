// OAuth utility functions for error handling and tenant management

export interface OAuthTenantInfo {
  domain: string;
  website_role: string;
  account_type: string;
  parentDomain: string;
}

// Extend global to include OAuth data
declare global {
  var __OAUTH_TENANT_INFO: OAuthTenantInfo | undefined;
  var __OAUTH_ERROR_MESSAGE: string | undefined;
}

/**
 * Store OAuth tenant information globally for cross-callback access
 */
export const storeOAuthTenantInfo = (tenantInfo: OAuthTenantInfo): void => {
  if (typeof global !== "undefined") {
    global.__OAUTH_TENANT_INFO = tenantInfo;
  }
};

/**
 * Store OAuth error message globally for cross-callback access
 */
export const storeOAuthErrorMessage = (errorMessage: string): void => {
  if (typeof global !== "undefined" && global.__OAUTH_TENANT_INFO) {
    global.__OAUTH_ERROR_MESSAGE = errorMessage;
  }
};

/**
 * Get stored OAuth tenant information
 */
export const getOAuthTenantInfo = (): OAuthTenantInfo | undefined => {
  if (typeof global !== "undefined") {
    return global.__OAUTH_TENANT_INFO;
  }
  return undefined;
};

/**
 * Get stored OAuth error message
 */
export const getOAuthErrorMessage = (): string | undefined => {
  if (typeof global !== "undefined" && global.__OAUTH_TENANT_INFO) {
    return global.__OAUTH_ERROR_MESSAGE;
  }
  return undefined;
};

/**
 * Clear stored OAuth data
 */
export const clearOAuthData = (): void => {
  if (typeof global !== "undefined") {
    global.__OAUTH_TENANT_INFO = undefined;
    global.__OAUTH_ERROR_MESSAGE = undefined;
  }
};

/**
 * Build redirect URL for OAuth errors
 */
export const buildOAuthErrorRedirectUrl = (
  originalDomain: string,
  protocol: string,
  port: string,
  errorMessage: string
): string => {
  return `${protocol}//${originalDomain}${port}/auth/login?error=${encodeURIComponent(
    errorMessage
  )}`;
};

/**
 * Extract error message from AxiosError or other error types
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    } else if (axiosError.message) {
      return axiosError.message;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return "Social authentication failed";
};
