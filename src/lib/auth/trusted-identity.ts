import { env } from "@/env";
import { API_ENDPOINTS } from "@/services/core/endpoints";

/**
 * The three fields that are ONLY ever trusted from `GET /auth/me`, never from
 * the login / registration / impersonation request body or the browser.
 */
export interface TrustedIdentity {
  account_type?: string;
  active_role?: string;
  permissions?: string[];
}

/**
 * Fetch the trusted identity (`GET /auth/me`) with a just-issued bearer token,
 * server-side. The backend derives `account_type` / `active_role` /
 * `permissions` from the token and ignores anything the client sends.
 *
 * Called inside `authorize()` so the NextAuth session's role/account_type are
 * authoritative from the moment the session is created — the client never
 * supplies them. Returns `null` on 401 (no/invalid token) or any error; callers
 * then fall back to the login-response values for first paint only.
 */
export async function fetchTrustedIdentity(
  token: string | undefined | null,
): Promise<TrustedIdentity | null> {
  if (!token) return null;
  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}${API_ENDPOINTS.AUTH.ME}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as unknown;
    // api envelope is `{ status, message, data: {...} }`; accept a bare object too.
    const data =
      json && typeof json === "object" && "data" in json
        ? (json as { data?: unknown }).data
        : json;
    if (!data || typeof data !== "object") return null;

    const d = data as Record<string, unknown>;
    return {
      account_type:
        typeof d.account_type === "string" ? d.account_type : undefined,
      active_role: typeof d.active_role === "string" ? d.active_role : undefined,
      permissions: Array.isArray(d.permissions)
        ? d.permissions.filter((p): p is string => typeof p === "string")
        : undefined,
    };
  } catch {
    return null;
  }
}
