import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";

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
