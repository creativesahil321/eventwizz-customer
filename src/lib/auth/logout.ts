/**
 * Centralized logout utility for the application
 * Provides a single function to handle all logout operations across the app
 */

import { resetAllStores } from "@/lib/utils";
import { setLogoutInProgress } from "@/services/core/api-client";
import { clearVendorBrowserSession } from "@/lib/clear-vendor-browser-session";

/**
 * Performs a complete logout with proper cleanup of all application state
 * @param {Object} options Logout options
 * @param {boolean} options.securityViolation Whether the logout is due to a security violation
 * @param {boolean} options.redirectToLogin Whether to redirect to login page after logout
 * @returns {Promise<void>}
 */
export async function logout({
  securityViolation = false,
  redirectToLogin = true,
}: {
  securityViolation?: boolean;
  redirectToLogin?: boolean;
} = {}): Promise<void> {
  try {
    // Set logout in progress to prevent unauthorized toasts during logout
    setLogoutInProgress(true);

    // 1. Import auth store dynamically to avoid circular dependencies
    const authStore = await import("@/store/auth.store");

    // 2. Call the auth store logout method (which already has complete logic)
    await authStore.useAuthStore.getState().logout(securityViolation);

    // 3. If redirect is disabled in options but enabled in the function call,
    // we need to prevent the automatic redirect that happens in the auth store
    if (!redirectToLogin && typeof window !== "undefined") {
      // Prevent the redirect by intercepting navigation
      window.history.pushState(null, "", window.location.href);

      // This is a last resort if the auth store's logout has already initiated a redirect
      window.addEventListener("popstate", function preventRedirect(e) {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
        window.removeEventListener("popstate", preventRedirect);
      });
    }

    return Promise.resolve();
  } catch (error) {
    console.error("[Logout Utility] Error during logout:", error);

    // Fallback manual logout if the auth store method fails
    try {
      // Reset all Zustand stores
      await resetAllStores();

      // Clear storage
      if (typeof window !== "undefined") {
        clearVendorBrowserSession();
        localStorage.clear();
        sessionStorage.clear();

        // Clear cookies
        document.cookie.split(";").forEach((cookie) => {
          const eqPos = cookie.indexOf("=");
          const name =
            eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });

        // Redirect to login if enabled
        if (redirectToLogin) {
          const redirectUrl = securityViolation
            ? "/auth/login?error=security_violation"
            : "/auth/login";
          window.location.href = redirectUrl;
        }
      }
    } catch (fallbackError) {
      console.error("[Logout Utility] Fallback logout failed:", fallbackError);

      // Last resort redirect
      if (redirectToLogin && typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  }
}
