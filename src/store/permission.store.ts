import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { setLogoutInProgress } from "@/services/core/api-client";

/**
 * Enhanced isomorphic storage implementation with security features
 * - Provides fallback for missing permissions in localStorage
 * - Detects inconsistencies between auth and permission states
 * - Maintains backup in sessionStorage for redundancy
 * - Handles security-related redirects when storage is manipulated
 */
const createIsomorphicStorage = () => {
  // Memory storage for server-side or when localStorage is unavailable
  const memoryStorage: Record<string, string> = {};
  const isBrowser = typeof window !== "undefined";

  return {
    getItem: (name: string) => {
      try {
        if (isBrowser) {
          // Try to get from localStorage first
          const value = localStorage.getItem(name);

          // For permission storage, check if it's empty but we have a backup
          if (
            name === "permission-storage" &&
            (!value ||
              value === "{}" ||
              value ===
                '{"state":{"permissions":[],"isLoaded":false},"version":0}')
          ) {
            const backup = sessionStorage.getItem("permissions-backup");
            if (backup) {
              // Create proper storage format with backup data
              return JSON.stringify({
                state: {
                  permissions: JSON.parse(backup),
                  isLoaded: true,
                },
                version: 0,
              });
            }

            // Security check: If auth token exists but permissions don't, redirect to login (skip for customers – they don't use permissions)
            const authStorage = localStorage.getItem("auth-storage");
            if (authStorage) {
              try {
                const authData = JSON.parse(authStorage);
                const isCustomer =
                  authData?.state?.account_type === "customer" ||
                  authData?.state?.active_role === "customer";
                if (isCustomer) {
                  return JSON.stringify({
                    state: { permissions: [], isLoaded: true },
                    version: 0,
                  });
                }
                if (
                  authData?.state?.isAuthenticated &&
                  authData?.state?.token
                ) {
                  localStorage.clear();
                  sessionStorage.clear();
                  if (typeof window !== "undefined") {
                    window.location.href = "/auth/login";
                  }
                }
              } catch (e) {
                console.log(e);
              }
            }
          }
          return value;
        }
        return memoryStorage[name] || null;
      } catch (error) {
        console.log(error);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        if (isBrowser) {
          localStorage.setItem(name, value);

          // Keep backup in sessionStorage for permission data
          if (name === "permission-storage" && value) {
            try {
              const parsed = JSON.parse(value);
              if (
                parsed?.state?.permissions &&
                Array.isArray(parsed.state.permissions)
              ) {
                sessionStorage.setItem(
                  "permissions-backup",
                  JSON.stringify(parsed.state.permissions)
                );
              }
            } catch (e) {
              console.log(e);
              // Silent error for parsing issues
            }
          }
        } else {
          memoryStorage[name] = value;
        }
      } catch (error) {
        console.log(error);
        // Silent error - storage might be full or restricted
      }
    },
    removeItem: (name: string) => {
      try {
        if (isBrowser) {
          localStorage.removeItem(name);
          if (name === "permission-storage") {
            sessionStorage.removeItem("permissions-backup");
          }
        } else {
          delete memoryStorage[name];
        }
      } catch (error) {
        console.log(error);
        // Silent error - storage might be restricted
      }
    },
  };
};

/**
 * Permission state interface
 */
interface PermissionState {
  // State
  permissions: string[];
  isLoaded: boolean;

  // Actions
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (permissionKeys: string[]) => boolean;
  hasAllPermissions: (permissionKeys: string[]) => boolean;
  reset: () => void;
}

/**
 * Permission store with enhanced security and persistence
 */
export const usePermissionStore = create<PermissionState>()(
  persist(
    immer<PermissionState>((set, get) => ({
      // Initial state
      permissions: [],
      isLoaded: false,

      // Actions
      setPermissions: (permissions) =>
        set((state) => {
          state.permissions = permissions;
          state.isLoaded = true;

          // Create backup in sessionStorage
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(
                "permissions-backup",
                JSON.stringify(permissions)
              );
            } catch (e) {
              console.log(e);
              // Silent error - storage might be restricted
            }
          }
        }),

      hasPermission: (permissionKey) => {
        return get().permissions.includes(permissionKey);
      },

      hasAnyPermission: (permissionKeys) => {
        return permissionKeys.some((key) => get().permissions.includes(key));
      },

      hasAllPermissions: (permissionKeys) => {
        return permissionKeys.every((key) => get().permissions.includes(key));
      },

      reset: () => {
        const currentState = get();
        // Only update if there's something to reset
        if (currentState.permissions.length > 0 || currentState.isLoaded) {
          set({ permissions: [], isLoaded: false });

          // Clear backup in sessionStorage
          if (typeof window !== "undefined") {
            try {
              sessionStorage.removeItem("permissions-backup");
            } catch (e) {
              console.log(e);
              // Silent error - storage might be restricted
            }
          }
        }
      },
    })),
    {
      name: "permission-storage",
      storage: createJSONStorage(() => createIsomorphicStorage()),
      // Skip hydration if we detected an issue with missing auth or permissions
      skipHydration:
        typeof window !== "undefined" &&
        !!localStorage.getItem("auth-storage") &&
        !localStorage.getItem("permission-storage"),
    }
  )
);

/**
 * Helper function to get permission status anywhere in the app
 */
export const getPermissionStatus = () => {
  const state = usePermissionStore.getState();
  return {
    isLoaded: state.isLoaded,
    permissionCount: state.permissions.length,
    hasPermissions: state.permissions.length > 0,
  };
};

/**
 * Performs a secure logout by using auth store's security violation logout
 *
 * @returns A promise that resolves when the logout process completes
 */
async function secureLogout(): Promise<void> {
  console.warn("[Permission Store] Security violation detected");

  // Set logout in progress to prevent unauthorized toasts
  setLogoutInProgress(true);

  // Use the centralized logout utility with security violation flag
  try {
    const { logout } = await import("@/lib/auth/logout");
    await logout({ securityViolation: true });
  } catch (error) {
    console.error("[Permission Store] Error during secure logout:", error);

    // Fallback if the logout utility is not available
    if (typeof window !== "undefined") {
      try {
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear all cookies
        document.cookie.split(";").forEach((cookie) => {
          const eqPos = cookie.indexOf("=");
          const name =
            eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });

        console.warn("[Permission Store] Applied fallback storage cleanup");

        // Redirect to login
        setTimeout(() => {
          window.location.href = "/auth/login?error=security_violation";
        }, 100);
      } catch (fallbackError) {
        console.error(
          "[Permission Store] Fallback cleanup failed:",
          fallbackError
        );
        // Last resort - direct redirect
        window.location.href = "/auth/login?error=security_violation";
      }
    }
  }
}

/**
 * Hydrates permissions synchronously on page load
 * Includes security checks for inconsistent storage states
 *
 * @returns A promise that resolves when the hydration process completes
 */
export async function hydratePermissionsSync(): Promise<void> {
  // Only run in browser
  if (typeof window === "undefined") return;

  try {
    // Check for authentication state first
    const authData = localStorage.getItem("auth-storage");
    if (!authData) {
      // No auth data, don't try to hydrate permissions
      return;
    }

    // Verify auth data integrity
    let isAuthenticated = false;
    let isCustomer = false;
    try {
      const parsedAuth = JSON.parse(authData);
      if (!parsedAuth?.state?.isAuthenticated || !parsedAuth?.state?.token) {
        return;
      }
      isAuthenticated = true;
      isCustomer =
        parsedAuth?.state?.account_type === "customer" ||
        parsedAuth?.state?.active_role === "customer";
    } catch (error) {
      console.error("[Permission Store] Error parsing auth data:", error);
      return;
    }

    // Customers do not use permissions; mark as loaded and skip rest
    if (isCustomer) {
      usePermissionStore.setState({ permissions: [], isLoaded: true });
      return;
    }

    // Try to get permissions from sessionStorage first (faster)
    const backupData = sessionStorage.getItem("permissions-backup");
    if (backupData) {
      try {
        const permissions = JSON.parse(backupData);
        if (Array.isArray(permissions)) {
          usePermissionStore.setState({
            permissions,
            isLoaded: true,
          });
          return;
        }
      } catch (error) {
        console.warn(
          "[Permission Store] Failed to parse backup permissions:",
          error
        );
        // Invalid backup data - security issue if authenticated
        if (isAuthenticated) {
          await secureLogout();
          return;
        }
      }
    }

    // Fall back to localStorage if needed
    const persistedData = localStorage.getItem("permission-storage");
    if (persistedData) {
      try {
        const data = JSON.parse(persistedData);
        if (data?.state?.permissions && Array.isArray(data.state.permissions)) {
          usePermissionStore.setState({
            permissions: data.state.permissions,
            isLoaded: data.state.isLoaded || true,
          });
        } else if (isAuthenticated) {
          // Security issue: Permission storage exists but doesn't have valid permissions
          await secureLogout();
        }
      } catch (error) {
        console.warn(
          "[Permission Store] Failed to parse localStorage permissions:",
          error
        );
        // Error parsing permission data - security issue if authenticated
        if (isAuthenticated && !isCustomer) {
          await secureLogout();
        }
      }
    } else if (isAuthenticated && !isCustomer) {
      console.warn(
        "[Permission Store] Auth data exists but no permission data found"
      );
      await secureLogout();
    }
  } catch (error) {
    console.error(
      "[Permission Store] Error during permission hydration:",
      error
    );
    // Silent error for hydration issues
  }
}

// Start hydration asynchronously
if (typeof window !== "undefined") {
  hydratePermissionsSync().catch((error) => {
    console.error("Error hydrating permissions:", error);
  });
}
