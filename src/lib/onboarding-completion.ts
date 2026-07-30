/**
 * Single client recovery path when the backend reports onboarding is already done
 * but the NextAuth JWT may still have `isOnboarded: false`.
 *
 * Route access itself is gated only in `(on-boarding)/layout.tsx` via the JWT.
 * This module only syncs the JWT and leaves the form — do not add parallel exits.
 */

export const ONBOARDING_COMPLETED_REDIRECT =
  "/welcome/select-location?onboarded=true";

const COMPLETED_MESSAGE = /onboarding is already completed/i;

const VENDOR_ONBOARDED_COOKIE =
  "vendor_onboarded=1; path=/; max-age=31536000; SameSite=Lax";

let recoveryInFlight: Promise<void> | null = null;

export function isOnboardingAlreadyCompletedMessage(
  message?: string | null,
): boolean {
  return typeof message === "string" && COMPLETED_MESSAGE.test(message.trim());
}

/** Update the NextAuth JWT from outside React (mirrors `useSession().update`). */
export async function updateNextAuthSession(
  data: Record<string, unknown>,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const { getCsrfToken } = await import("next-auth/react");
    const csrfToken = await getCsrfToken();
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrfToken, data }),
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to update NextAuth session:", error);
    return false;
  }
}

export type OnboardingRecoveryOptions = {
  redirectTo?: string;
  /** Extra JWT fields to persist alongside `isOnboarded: true`. */
  session?: Record<string, unknown>;
};

/**
 * Mark onboarded in the JWT and leave `/on-boarding`.
 * Concurrent callers share one promise (interceptor + hooks).
 */
export function recoverFromOnboardingAlreadyCompleted(
  options: OnboardingRecoveryOptions = {},
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (recoveryInFlight) return recoveryInFlight;

  const redirectTo = options.redirectTo ?? ONBOARDING_COMPLETED_REDIRECT;

  recoveryInFlight = (async () => {
    try {
      await updateNextAuthSession({
        isOnboarded: true,
        ...options.session,
      });
      document.cookie = VENDOR_ONBOARDED_COOKIE;
      try {
        sessionStorage.removeItem("onboarding_mode");
        sessionStorage.removeItem("onboarding_is_rooms");
      } catch {
        // ignore unavailable storage
      }
    } catch (error) {
      console.error("Onboarding completion recovery failed:", error);
      document.cookie = VENDOR_ONBOARDED_COOKIE;
    } finally {
      window.location.replace(redirectTo);
    }
  })();

  return recoveryInFlight;
}
