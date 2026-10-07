import { backendProxyHeaders } from "@/lib/backend/backend-transport";
import { clearClientSession } from "@/lib/auth/client-session";

/**
 * End impersonation by swapping the admin's backed-up session cookie back in
 * (server-side, HttpOnly), then dropping all of the vendor's client state.
 *
 * The admin's role and permissions are NOT restored from browser storage: the
 * caller hard-navigates afterwards, so the session (whose role came from
 * `/auth/me` at the admin's login) and the permission API rebuild them.
 *
 * Returns false when there is no restorable admin session.
 */
export async function restoreAdminAfterImpersonation(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/impersonation/restore", {
      method: "POST",
      credentials: "same-origin",
      headers: backendProxyHeaders(),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  await clearClientSession();
  return true;
}
