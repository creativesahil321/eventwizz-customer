import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { toast } from "sonner";
import { ApiError } from "@/types/api.types";
import { env } from "@/env";
import { useAuthStore } from "@/store/auth.store";
import { useDomainStore } from "@/store/domain.store";
import { getImpersonationStatus } from "@/store/impersonation.store";
import { useLocationStore } from "@/store/location.store";
import {
  getCorrectRedirectUrl,
  validateDomainAccess,
} from "@/lib/utils/api-endpoints";
// Browser environment check
const isBrowser = typeof window !== "undefined";

// Safe toast wrapper for client/server environments
const safeToast = {
  success: (message: string) => {
    if (isBrowser) {
      toast.success(message);
    }
  },
  error: (message: string) => {
    if (isBrowser) {
      toast.error(message);
    } else {
      console.error(message);
    }
  },
  warning: (message: string) => {
    if (isBrowser) {
      toast.warning(message);
    } else {
      console.warn(message);
    }
  },
};

// Auth store state interface
interface AuthStoreState {
  token: string | null;
  user: Record<string, unknown>;
  login: (token: string, user: Record<string, unknown>) => void;
  logout: (securityViolation?: boolean) => Promise<void>;
}

// API error response interface
interface ApiErrorResponse {
  message?: string;
  errors?: string[];
  data?: {
    domain: string;
  };
}

// Security constants
const SECURITY_VIOLATION_KEY = "security_violation_count";
const MAX_SECURITY_VIOLATIONS = 3;

// Logout state tracking
let isLogoutInProgress = false;

// Function to set logout status
export const setLogoutInProgress = (status: boolean): void => {
  isLogoutInProgress = status;
};

// Function to check if logout is in progress
export const getLogoutInProgress = (): boolean => isLogoutInProgress;

// Security violation tracking functions
const recordSecurityViolation = (): number => {
  if (!isBrowser) return 0;

  try {
    // Get current violation count
    const currentCount = parseInt(
      sessionStorage.getItem(SECURITY_VIOLATION_KEY) || "0",
      10
    );
    const newCount = currentCount + 1;

    // Store updated count
    sessionStorage.setItem(SECURITY_VIOLATION_KEY, newCount.toString());

    // Log for security monitoring
    safeToast.warning(
      `[Security] Potential security violation detected (${newCount}/${MAX_SECURITY_VIOLATIONS})`
    );

    return newCount;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return 0;
  }
};

const clearSecurityViolations = (): void => {
  if (!isBrowser) return;

  try {
    sessionStorage.removeItem(SECURITY_VIOLATION_KEY);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    // Ignore errors
  }
};

// Function to get session token from NextAuth
// Safe function to get token that works on both client and server
const getToken = async (): Promise<string | null> => {
  // Only try to access Zustand/localStorage in browser environment
  if (isBrowser) {
    try {
      // Try Zustand store (memory)
      const store = useAuthStore.getState();
      const tokenExpiry = store.tokenExpiry;
      const token = store.token;
      if (token && (!tokenExpiry || Date.now() < tokenExpiry)) return token;

      // Fall back to localStorage if needed (for backward compatibility)
      const legacyToken = localStorage.getItem("token");
      if (legacyToken) return legacyToken;

      // Final fallback - check auth-storage in localStorage
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          if (parsed.state && parsed.state.token) {
            // Manually check expiration if available
            if (
              parsed.state.tokenExpiry &&
              Date.now() < parsed.state.tokenExpiry
            ) {
              return parsed.state.token;
            } else if (!parsed.state.tokenExpiry) {
              // No expiry info, assume token is valid
              return parsed.state.token;
            }
          }
        } catch (e) {
          console.error("Error parsing auth-storage:", e);
        }
      }

      return null;
    } catch (e) {
      console.error("Error accessing token:", e);
      return null;
    }
  }

  // In server context, we can't access localStorage or zustand store
  return null;
};

// Define ApiResponse type directly in this file
export interface ApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface RequestOptions extends AxiosRequestConfig {
  returnFullResponse?: boolean;
  /** Skip global error toasts — caller shows inline validation instead. */
  suppressErrorToast?: boolean;
  /** Skip global success toasts — used for silent checkout cart saves on Pay. */
  suppressSuccessToast?: boolean;
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000, // 15 seconds instead of 30 seconds
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Skip authorization for social auth endpoint (OAuth flow)
    const isSocialAuthEndpoint = config.url?.includes(
      "/social-auth/login/callback"
    );

    if (!isSocialAuthEndpoint) {
      // Get token safely using our isomorphic helper
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add location header if available (skip for social auth)
    if (isBrowser && !isSocialAuthEndpoint) {
      try {
        // Always set domain header when available
        const domain = useDomainStore.getState().domain;
        if (domain) {
          config.headers["X-Domain"] = domain;
          console.log(`[API Client] Setting X-Domain header: ${domain}`);
        } else {
          console.warn(`[API Client] No domain available in domain store`);
        }

        // Location ID should not require a NextAuth session request per Axios call.
        // Order: location store (explicit selection) → auth store (synced from NextAuth in SessionValidator) → legacy localStorage.
        const locationIdFromStore = useLocationStore.getState().getLocationId();
        const locationIdFromAuth =
          useAuthStore.getState().vendor_location_id ?? null;
        const locationId =
          locationIdFromStore ??
          locationIdFromAuth ??
          (() => {
            try {
              const legacy = localStorage.getItem("vendor_location_id");
              const n = legacy ? Number(legacy) : NaN;
              return Number.isFinite(n) ? n : null;
            } catch {
              return null;
            }
          })();

        if (locationId) {
          config.headers["X-Venue-Location-Id"] = String(locationId);
        }

        // Attach impersonation header so backend can tag audit logs
        try {
          const impersonation = getImpersonationStatus();
          if (impersonation.isImpersonating) {
            config.headers["X-Impersonating"] = "true";
          }
        } catch {
          // Non-critical — impersonation store may not be hydrated yet
        }
      } catch (e) {
        console.error("Error accessing session location data:", e);
      }
    }

    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Function to handle unauthorized access
const handleUnauthorizedAccess = async (
  message: string,
  isSecurityViolation: boolean = false
): Promise<void> => {
  if (isBrowser && !isLogoutInProgress) {
    // During impersonation, a 401 on the vendor token means the impersonation
    // token expired. Restore admin session instead of a full destructive logout.
    try {
      const impersonation = getImpersonationStatus();
      if (impersonation.isImpersonating) {
        safeToast.warning(
          "Impersonation session expired. Restoring admin session…"
        );
        // Dynamic import to avoid circular deps
        const { useImpersonationStore } = await import(
          "@/store/impersonation.store"
        );
        const store = useImpersonationStore.getState();
        const admin = store.originalAdmin;
        if (admin) {
          const { signIn } = await import("next-auth/react");
          await signIn("credentials", {
            redirect: false,
            email: admin.email,
            token: admin.token,
            account_type: admin.account_type,
            active_role: admin.active_role ?? "",
            uuid: admin.uuid ?? "",
            first_name: admin.first_name ?? "",
            last_name: admin.last_name ?? "",
            avatar: admin.avatar ?? "",
            status: admin.status ?? "active",
            permissions: JSON.stringify(admin.permissions),
          });
          const authStore =
            useAuthStore.getState() as unknown as AuthStoreState;
          authStore.login(admin.token, {
            uuid: admin.uuid,
            email: admin.email,
            first_name: admin.first_name,
            last_name: admin.last_name,
            avatar: admin.avatar,
            status: admin.status ?? "active",
            account_type: admin.account_type,
            active_role: admin.active_role,
          } as Record<string, unknown>);

          const { usePermissionStore } = await import(
            "@/store/permission.store"
          );
          usePermissionStore.getState().setPermissions(admin.permissions);
          store.endImpersonation();
          window.location.href = "/admin/dashboard";
          return;
        }
        // If no admin backup, fall through to standard logout
        store.endImpersonation();
      }
    } catch {
      // Fall through to standard logout
    }

    // Set logout in progress to prevent further 401 toasts
    setLogoutInProgress(true);

    // Record security violation if applicable
    if (isSecurityViolation) {
      const violationCount = recordSecurityViolation();

      // If max violations reached, perform aggressive cleanup
      if (violationCount >= MAX_SECURITY_VIOLATIONS) {
        safeToast.error(
          "[Security] Maximum security violations reached. Performing aggressive cleanup."
        );

        try {
          const store = useAuthStore.getState() as unknown as AuthStoreState;
          await store.logout(true); // Pass true to indicate security violation
          return;
        } catch (e) {
          console.error(
            "[Security] Error during security violation logout:",
            e
          );
          // Fall through to standard logout as backup
        }
      }
    } else {
      // Clear security violations on normal unauthorized responses
      clearSecurityViolations();
    }

    try {
      const store = useAuthStore.getState() as unknown as AuthStoreState;
      await store.logout();
    } catch (e) {
      console.error("Error during logout:", e);
      // Force redirect as fallback
      window.location.href = "/auth/login";
    }
  }
};

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Handle successful responses
    if (response.data.status === false) {
      const message = response.data.message || "";

      // Check for different types of error messages
      const isDomainUnauthorized =
        message.toLowerCase().includes("unauthorized domain") ||
        message.toLowerCase().includes("coming from an unauthorized domain");

      const isUnauthorizedMessage =
        message.toLowerCase().includes("not authorized") ||
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("unauthenticated") ||
        message.toLowerCase().includes("permission denied");

      const isSecurityViolation =
        message.toLowerCase().includes("invalid token") ||
        message.toLowerCase().includes("token mismatch") ||
        message.toLowerCase().includes("token manipulation");

      // Handle domain authorization errors - show error without logout
      if (isDomainUnauthorized) {
        safeToast.error(message);
        return Promise.reject(response.data);
      }

      // Handle unauthorized responses - trigger logout
      if (isUnauthorizedMessage) {
        handleUnauthorizedAccess(message, isSecurityViolation);
        return Promise.reject(response.data);
      }

      const suppressErrorToast = (
        response.config as RequestOptions | undefined
      )?.suppressErrorToast;

      if (suppressErrorToast) {
        return response;
      }

      // For other status:false responses, show error toast
      safeToast.error(response.data.message || "Something went wrong");
      return Promise.reject(response.data);
    }

    // Show success toast for data modification operations only
    const method = response.config.method?.toUpperCase();
    if (
      response.data.status === true &&
      response.data.message &&
      method &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    ) {
      safeToast.success(response.data.message);
    }

    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const message = error.response.data?.message || "Something went wrong";
      const responseData = error.response.data as unknown as Record<
        string,
        unknown
      >;

      // Check for security violation indicators in error response
      const isSecurityViolation =
        (typeof message === "string" &&
          (message.toLowerCase().includes("invalid token") ||
            message.toLowerCase().includes("token mismatch") ||
            message.toLowerCase().includes("token manipulation"))) ||
        (responseData?.status === false &&
          responseData?.message ===
          "You are not authorized to perform this action.");

      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Handle unauthorized
          handleUnauthorizedAccess(message, isSecurityViolation);
          break;
        case 403: {
          const requestUrl403 = error.config?.url || "";
          const isCustomerOnlyRoute =
            requestUrl403.includes("/customer/") &&
            !requestUrl403.includes("/vendor/");
          if (isCustomerOnlyRoute && isBrowser) {
            const authStore = useAuthStore.getState();
            const at = authStore.account_type;
            if (at && at !== "customer") {
              console.warn(
                `[API Client] 403 on customer-only route for non-customer (${at}); not a session violation: ${requestUrl403}`
              );
              return Promise.reject(error);
            }
          }

          // Handle forbidden - could also be a security issue
          if (isSecurityViolation) {
            handleUnauthorizedAccess(message, true);
          } else {
            // Check if this is a vendor endpoint access by non-vendor user
            // This should not be treated as a security violation
            const requestUrl = error.config?.url || "";
            const isVendorEndpoint = requestUrl.includes("/vendor/");

            if (isVendorEndpoint && isBrowser) {
              // Get current user role from auth store
              const authStore = useAuthStore.getState();
              const userAccountType = authStore.account_type;
              const isVendor = userAccountType === "vendor";

              // If user is not a vendor trying to access vendor endpoints,
              // this is expected behavior - don't treat as security violation
              if (!isVendor) {
                console.warn(
                  `[API Client] Non-vendor user (${userAccountType}) attempted to access vendor endpoint: ${requestUrl}. This is expected and not a security violation.`
                );
                // Silently reject without triggering logout
                return Promise.reject(error);
              }
            }

            // 🛡️ DOMAIN ACCESS VALIDATION: Handle "Invalid domain access" errors from backend
            // This happens when the backend detects the user is on the wrong domain
            // We extract the correct domain from the response and redirect the user
            // Check for "Invalid domain access" error from backend
            const errorData = error.response.data as ApiErrorResponse;
            if (
              errorData?.message === "Invalid domain access" &&
              errorData?.data?.domain
            ) {
              const correctDomain = errorData.data.domain;
              const currentHostname = window.location.hostname;

              console.log(
                `[Domain Access] Backend expects domain: ${correctDomain}`
              );
              console.log(
                `[Domain Access] Current hostname: ${currentHostname}`
              );
              console.log(`[Domain Access] Error response:`, errorData);

              // Check if current domain is valid according to backend requirements
              const isDomainValid = validateDomainAccess(
                currentHostname,
                correctDomain
              );
              console.log(
                `[Domain Access] Domain validation result: ${isDomainValid}`
              );

              // If we're on the wrong domain, redirect to the correct one
              if (!isDomainValid) {
                const currentPath = window.location.pathname;
                const currentSearch = window.location.search;
                const correctUrl = getCorrectRedirectUrl(
                  currentHostname,
                  correctDomain,
                  currentPath,
                  currentSearch
                );

                console.log(`[Domain Access] Path transformation:`);
                console.log(`  - Original path: ${currentPath}`);
                console.log(`  - Current hostname: ${currentHostname}`);
                console.log(`  - Expected domain: ${correctDomain}`);
                console.log(`  - Final redirect URL: ${correctUrl}`);

                console.log(
                  `[Domain Access] Domain INVALID - Redirecting from ${currentHostname} to ${correctUrl}`
                );

                safeToast.error(
                  `Invalid domain access. Redirecting to: ${correctDomain}`
                );

                // Redirect after a short delay to show the toast
                setTimeout(() => {
                  console.log(
                    `[Domain Access] Executing redirect to: ${correctUrl}`
                  );
                  window.location.href = correctUrl;
                }, 2000);

                return; // Don't show additional error toasts
              } else {
                console.log(
                  `[Domain Access] Domain appears correct, but backend still rejects. This might be a backend configuration issue.`
                );
              }
            }
          }
          break;
        }
        case 404:
          // Handle not found - show error toast with message from response
          const notFoundData = error.response.data as ApiErrorResponse;
          if (notFoundData?.message && !isLogoutInProgress) {
            safeToast.error(notFoundData.message);
          } else if (!isLogoutInProgress) {
            safeToast.error("Resource not found");
          }
          break;
        case 422:
          // Handle validation errors
          const errorData = error.response.data as ApiErrorResponse;
          if (
            errorData?.errors &&
            Array.isArray(errorData.errors) &&
            errorData.errors.length > 0
          ) {
            errorData.errors.forEach((errorMessage: string) => {
              if (!isLogoutInProgress) {
                safeToast.error(errorMessage);
              }
            });
          } else if (errorData?.message) {
            // Handle single error message
            if (!isLogoutInProgress) {
              safeToast.error(errorData.message);
            }
          }
          break;
        case 409: {
          const conflictData = error.response.data as ApiErrorResponse;
          if (
            conflictData?.errors &&
            Array.isArray(conflictData.errors) &&
            conflictData.errors.length > 0
          ) {
            conflictData.errors.forEach((errorMessage: string) => {
              if (!isLogoutInProgress) {
                safeToast.error(errorMessage);
              }
            });
          } else if (conflictData?.message && !isLogoutInProgress) {
            safeToast.error(conflictData.message);
          } else if (!isLogoutInProgress) {
            safeToast.error(
              "This action conflicts with the current booking state. Refresh the page and try again.",
            );
          }
          break;
        }
        default:
          // Handle other errors - show toast for non-422 errors
          if (!isLogoutInProgress && error.response.status !== 422) {
            safeToast.error(message);
          }
          break;
      }
    } else if (error.request) {
      // The request was made but no response was received
      // More specific error message for connection refused
      if (error.code === "ERR_NETWORK") {
        safeToast.error(
          "Unable to connect to the server. Please ensure the server is running and accessible."
        );
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("timeout")
      ) {
        // Handle timeout specifically
        safeToast.error(
          "Request timed out. The server is taking too long to respond."
        );

        // For vendor locations API specifically, provide a better message
        if (error.config?.url?.includes("vendor/locations")) {
          safeToast.error(
            "Location data could not be loaded. Please refresh or try again later."
          );
        }
      } else {
        safeToast.error(
          "Unable to connect to the server. Please check your internet connection and try again."
        );
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      safeToast.error("Error setting up the request");
    }

    return Promise.reject(error);
  }
);

// Generic request method with type safety
export const request = async <T>(config: RequestOptions): Promise<T> => {
  try {
    const response = await apiClient.request<ApiResponse<T> | T>(config);

    // Return full response or just data based on options
    if (config.returnFullResponse) {
      return response.data as unknown as T;
    }

    // Check if response.data has the expected ApiResponse structure
    const apiResponse = response.data as Record<string, unknown>;
    if (
      apiResponse &&
      typeof apiResponse === "object" &&
      "data" in apiResponse
    ) {
      return apiResponse.data as T;
    }

    // If response doesn't have the standard structure, return the data directly
    return response.data as T;
  } catch (error) {
    throw error;
  }
};

// Export typed methods with better type safety
export const api = {
  get: <T>(url: string, config?: RequestOptions) =>
    request<T>({ ...config, method: "GET", url }),
  post: <T, D = unknown>(url: string, data?: D, config?: RequestOptions) =>
    request<T>({ ...config, method: "POST", url, data }),
  put: <T, D = unknown>(url: string, data?: D, config?: RequestOptions) =>
    request<T>({ ...config, method: "PUT", url, data }),
  delete: <T>(url: string, config?: RequestOptions) =>
    request<T>({ ...config, method: "DELETE", url }),
  patch: <T, D = unknown>(url: string, data?: D, config?: RequestOptions) =>
    request<T>({ ...config, method: "PATCH", url, data }),
};
