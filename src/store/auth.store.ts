import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService } from "@/services/common/auth/auth.service";
import { UserType, StaffRole } from "@/types/auth.types";
import type { Session } from "next-auth";
import { setLogoutInProgress } from "@/services/core/api-client";
import { AI_COLLECT_DRAFT_STORAGE_KEY } from "@/app/(on-boarding)/on-boarding/_lib/ai-collect-draft-cache";

/**
 * User data interface with properly typed fields to avoid 'any'
 */
export interface AuthUser {
  uuid?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string | null;
  status: string;
  active_role?: string; // Renamed from role
  account_type?: UserType; // Renamed from user_type/type
}

/**
 * Auth Store State Interface
 * Defines the shape of authentication state and available actions
 */
interface AuthState {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  account_type: UserType | null; // Renamed from userType
  active_role: StaffRole | string | null; // Renamed from userRole
  /** Mirrors NextAuth session `user.vendor_location_id` for API headers (no per-request getSession). */
  vendor_location_id: number | null;
  /** Mirrors NextAuth session `user.isOnboarded` for public chrome without useSession. */
  isOnboarded: boolean;
  loading: boolean;
  error: string | null;
  isSessionChecked: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  markSessionChecked: () => void;
  login: (userData: AuthUser) => void;
  logout: (securityViolation?: boolean) => Promise<void>;
  clearError: () => void;
  verifySession: () => Promise<boolean>;
  updateUser: (userData: Partial<AuthUser>) => void;
}

// Constants
const AUTH_STORE_NAME = "auth-storage";
/** Session/local key used by onboarding to persist AI vs manual choice — cleared on logout */
const ONBOARDING_MODE_STORAGE_KEY = "onboarding_mode";
/**
 * The Laravel token is intentionally NOT kept in this store (or any browser
 * storage). It lives only in the HttpOnly NextAuth cookie; browser API calls go
 * through the same-origin `/api/backend` proxy. See backend-transport.ts.
 */
const AUTH_STORE_VERSION = 1;
/** Legacy keys that used to hold the raw bearer token. */
const LEGACY_TOKEN_KEYS = ["token"];

// Check if code is running in browser environment
const isBrowser = typeof window !== "undefined";

/**
 * Custom storage implementation with error handling that works in both
 * client and server environments
 */
const createIsomorphicStorage = () => {
  // Memory storage for server-side or when localStorage is unavailable
  const memoryStorage: Record<string, string> = {};

  return {
    getItem: (name: string) => {
      try {
        // Use localStorage in browser, memory storage on server
        if (isBrowser) {
          return localStorage.getItem(name);
        }
        return memoryStorage[name] || null;
      } catch (error) {
        console.error(`Error reading from ${name}:`, error);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        if (isBrowser) {
          localStorage.setItem(name, value);
        } else {
          memoryStorage[name] = value;
        }
      } catch (error) {
        console.error(`Error storing to ${name}:`, error);
        if (error instanceof DOMException) {
          if (error.name === "QuotaExceededError" || error.code === 22) {
            console.error("Storage quota exceeded");
          } else if (error.name === "SecurityError") {
            console.error("Storage blocked by browser settings");
          }
        }
      }
    },
    removeItem: (name: string) => {
      try {
        if (isBrowser) {
          localStorage.removeItem(name);
        } else {
          delete memoryStorage[name];
        }
      } catch (error) {
        console.error(`Error removing ${name}:`, error);
      }
    },
  };
};

/**
 * Auth Store Implementation
 * Provides authentication state management with persistent storage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    immer<AuthState>((set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      account_type: null, // Renamed from userType
      active_role: null, // Renamed from userRole
      vendor_location_id: null,
      isOnboarded: false,
      loading: false,
      error: null,
      isSessionChecked: false,

      /**
       * Sets the session from NextAuth
       */
      setSession: (session: Session | null) => {
        if (!session) {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.account_type = null; // Renamed from userType
            state.active_role = null; // Renamed from userRole
            state.vendor_location_id = null;
            state.isOnboarded = false;
          });
          return;
        }

        // Safely transform session user data to our AuthUser format
        // Handle both active_role and account_type, with appropriate fallbacks
        const userData: AuthUser | null = session.user
          ? {
              uuid: session.user.uuid || undefined,
              email: session.user.email || undefined,
              avatar: session.user.avatar || undefined,
              status: session.user.status || "active",
              // Handle standardized naming - with fallbacks for backward compatibility
              active_role: (session.user as AuthUser).active_role || undefined,
              account_type:
                (session.user.account_type as UserType) || undefined,
            }
          : null;

        const rawLocId = session.user?.vendor_location_id;
        const parsedLocId =
          rawLocId !== undefined && rawLocId !== null && rawLocId !== ""
            ? Number(rawLocId)
            : NaN;
        const vendorLocationId = Number.isFinite(parsedLocId)
          ? parsedLocId
          : null;

        set((state) => {
          state.user = userData;
          state.isAuthenticated = !!session.user;
          // Use type assertion to access properties that might not exist in the type definition yet
          state.account_type =
            ((session.user as AuthUser).account_type as UserType) || null;
          // Safely access role using type assertion
          state.active_role = (session.user as AuthUser).active_role || null;
          state.vendor_location_id = vendorLocationId;
          state.isOnboarded = Boolean(session.user?.isOnboarded);
        });

        if (
          typeof window !== "undefined" &&
          vendorLocationId !== null
        ) {
          try {
            localStorage.setItem(
              "vendor_location_id",
              String(vendorLocationId),
            );
          } catch {
            // ignore
          }
        }
      },

      /**
       * Marks the session as checked
       */
      markSessionChecked: () => {
        set((state) => {
          state.isSessionChecked = true;
        });
      },

      /**
       * Marks the user as logged in with the given profile data. The Laravel
       * token is NOT accepted here — NextAuth holds it in the HttpOnly cookie.
       */
      login: (userData: AuthUser) => {
        // Extract account_type and active_role from userData with backward compatibility
        const account_type = userData?.account_type || null;
        const active_role = userData?.active_role || null;

        set((state) => {
          state.user = userData;
          state.isAuthenticated = true;
          state.account_type = account_type as UserType | null;
          state.active_role = active_role;
          state.loading = false;
          state.error = null;
        });
      },

      /**
       * Returns whether the user is currently signed in.
       */
      verifySession: async () => {
        // Session validity/expiry is owned by NextAuth (HttpOnly cookie); this
        // only mirrors whether the app currently considers the user signed in.
        return get().isAuthenticated;
      },

      /**
       * Logs out a user and clears all authentication and permission data
       * Performs comprehensive cleanup to ensure complete session termination
       *
       * @param securityViolation - If true, performs a more aggressive cleanup for security concerns
       * @returns Promise that resolves when logout process completes
       */
      logout: async (securityViolation = false): Promise<void> => {
        // Set logout in progress to prevent unauthorized toasts
        setLogoutInProgress(true);

        // Clear onboarding mode from storage so next login starts fresh at mode selection
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(ONBOARDING_MODE_STORAGE_KEY);
            localStorage.removeItem(ONBOARDING_MODE_STORAGE_KEY);
            sessionStorage.removeItem(AI_COLLECT_DRAFT_STORAGE_KEY);
          } catch {
            // ignore
          }
        }

        // Clear backend auth data through service
        try {
          await authService.clearAuthData();
        } catch (error) {
          console.error("[Auth Store] Error clearing auth data:", error);
        }

        // For security violations, perform complete storage cleanup
        if (securityViolation && typeof window !== "undefined") {
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

            console.warn(
              "[Auth Store] Security violation: Performed complete storage cleanup"
            );
          } catch (error) {
            console.error("[Auth Store] Error during security cleanup:", error);
          }
        }

        // Clear React Query cache
        try {
          // Prefer the live client registered by RootQueryProvider; fall back
          // to the legacy module singleton if no provider has mounted.
          const { getActiveQueryClient } = await import(
            "@/providers/query-provider/active-query-client"
          );
          const queryClient =
            getActiveQueryClient() ??
            (await import("@/providers/query-provider/queryClient")).default;
          if (queryClient) {
            // Reset all query cache data
            queryClient.clear();
          }
        } catch (importError) {
          console.error(
            "[Auth Store] Error importing query client:",
            importError
          );
        }

        // Reset all Zustand stores using the centralized utility
        try {
          const { resetAllStores } = await import("@/lib/utils");
          await resetAllStores();
        } catch (error) {
          console.error("[Auth Store] Error resetting stores:", error);
        }

        // Reset auth state
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.account_type = null;
          state.active_role = null;
          state.vendor_location_id = null;
          state.isOnboarded = false;
          state.loading = false;
          state.error = null;
        });

        // Persist middleware rewrites auth-storage after set() — wipe again so
        // the next account does not inherit onboarding_mode / rooms / location.
        try {
          const { clearVendorBrowserSession } = await import(
            "@/lib/clear-vendor-browser-session"
          );
          clearVendorBrowserSession();
        } catch (error) {
          console.error("[Auth Store] Error clearing browser session:", error);
        }

        // For security violations, hard redirect to login
        if (securityViolation && typeof window !== "undefined") {
          window.location.href = "/auth/login?error=security_violation";
        } else if (typeof window !== "undefined") {
          // Add redirect for normal logouts too
          window.location.href = "/auth/login";
        }
      },

      /**
       * Clears any authentication error
       */
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      /**
       * Updates user data in the store
       */
      updateUser: (userData: Partial<AuthUser>) => {
        set((state) => {
          if (state.user) {
            state.user = { ...state.user, ...userData };
          }
        });
      },
    })),
    {
      name: AUTH_STORE_NAME,
      storage: createJSONStorage(() => createIsomorphicStorage()),
      version: AUTH_STORE_VERSION,
      // v0 persisted the raw Laravel token; drop it from existing browsers.
      migrate: (persisted) => {
        if (persisted && typeof persisted === "object") {
          const legacy = persisted as Record<string, unknown>;
          delete legacy.token;
          delete legacy.tokenExpiry;
        }
        return persisted as AuthState;
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        account_type: state.account_type, // Renamed from userType
        active_role: state.active_role, // Renamed from userRole
        vendor_location_id: state.vendor_location_id,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);

/**
 * Helper function to get auth store state information
 * for debugging and status checks
 */
export const getAuthStatus = () => {
  const state = useAuthStore.getState();
  return {
    isAuthenticated: state.isAuthenticated,
    account_type: state.account_type, // Renamed from userType
    active_role: state.active_role, // Renamed from userRole
  };
};

/** Remove legacy bearer-token keys left in browsers by older builds. */
export function purgeLegacyTokenStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_TOKEN_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

purgeLegacyTokenStorage();
