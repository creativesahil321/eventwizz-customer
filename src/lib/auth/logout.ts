import { signOut } from "next-auth/react";
import { backendProxyHeaders } from "@/lib/backend/backend-transport";
import { clearClientSession } from "@/lib/auth/client-session";
import { setLogoutInProgress } from "@/lib/auth/logout-state";

/**
 * THE logout for the whole app (every tenant: admin, vendor, staff, customer,
 * Door Scan). Nothing else may call `signOut()` or clear auth state directly.
 *
 *   1. Server   POST /api/auth/logout — revoke the Laravel token(s), expire all
 *               HttpOnly auth cookies (session + impersonation backup).
 *   2. NextAuth signOut()             — end the client session and notify the
 *               app's other open tabs.
 *   3. Browser  clearClientSession()  — query cache, stores, storage.
 *   4. Navigate (replace, so Back cannot return to a protected page).
 *
 * Idempotent: concurrent calls (a burst of 401s, a watchdog and a click) share
 * one run. Never throws — each step is best effort and the redirect always
 * happens, so a user can never be left half signed in.
 */

export type LogoutReason =
  /** User clicked "Log out". */
  | "user"
  /** The backend rejected the session (401). */
  | "session_expired"
  /** Tampering / repeated auth failures — also wipes all localStorage. */
  | "security_violation";

export interface LogoutOptions {
  reason?: LogoutReason;
  /**
   * Where to go afterwards. Defaults to this tenant's sign-in page for the
   * reason. `false` stays on the current page (it renders its own sign-in).
   */
  redirectTo?: string | false;
}

/** Login-page `?error=` codes; `url-utils` maps them to friendly messages. */
const LOGOUT_ERROR_CODES = {
  session_expired: "session_expired",
  security_violation: "security_violation",
} as const;

let inFlight: Promise<void> | null = null;

export function logout(options: LogoutOptions = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  inFlight ??= runLogout(options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runLogout({
  reason = "user",
  redirectTo,
}: LogoutOptions): Promise<void> {
  setLogoutInProgress(true);

  await attempt("server", () =>
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: backendProxyHeaders(),
    }),
  );
  await attempt("nextauth", () => signOut({ redirect: false }));
  await attempt("client", () =>
    clearClientSession({ wipeAllStorage: reason === "security_violation" }),
  );

  const destination =
    redirectTo === undefined ? defaultDestination(reason) : redirectTo;
  if (destination) {
    window.location.replace(destination);
    return;
  }
  // Staying on the page: it must work normally again.
  setLogoutInProgress(false);
}

/**
 * `/auth/login` is the sign-in page on every tenant domain (it adapts to the
 * domain's website role). Door Scan signs staff in on its own page.
 */
function defaultDestination(reason: LogoutReason): string {
  if (window.location.pathname.startsWith("/vendor/door-scan")) {
    return "/vendor/door-scan";
  }
  return reason === "user"
    ? "/auth/login"
    : `/auth/login?error=${LOGOUT_ERROR_CODES[reason]}`;
}

async function attempt(step: string, fn: () => unknown): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[logout] ${step} step failed:`, error);
  }
}
