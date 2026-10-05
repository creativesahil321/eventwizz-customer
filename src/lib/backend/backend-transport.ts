import { env } from "@/env";

/**
 * Browser ⇄ Laravel transport (BFF).
 *
 * The Laravel bearer token never reaches browser JavaScript. Authenticated
 * browser requests go to the same-origin proxy at `/api/backend/*`, which reads
 * the token from the HttpOnly NextAuth cookie and forwards to Laravel.
 *
 * Exception — large multipart uploads (event videos up to 30 MB, galleries):
 * Vercel caps function request bodies at ~4.5 MB, so those still go directly to
 * Laravel with a token fetched just-in-time from `/api/auth/transfer-token`.
 * That token is held only in a local variable for the request (never stored).
 * When the backend issues short-lived, upload-scoped tokens, only the
 * transfer-token route changes — see SECURITY-BACKEND-REQUIREMENTS.md (B8).
 */

/** Same-origin proxy prefix. `/api/backend/<path>` → `${API_URL}/<path>`. */
export const BACKEND_PROXY_BASE = "/api/backend";

/**
 * Required on every proxy request. Cross-site pages cannot set custom headers
 * without a CORS preflight (which the proxy never approves), so this blocks
 * CSRF now that the proxy authenticates via the ambient session cookie.
 */
export const BACKEND_PROXY_HEADER = "x-ew-proxy";

/** Ask the proxy NOT to attach the session token (e.g. social-auth callback). */
export const BACKEND_NO_AUTH_HEADER = "x-ew-no-auth";

const TRANSFER_TOKEN_ROUTE = "/api/auth/transfer-token";

function withLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** Same-origin proxy URL for a Laravel endpoint path (e.g. `/vendor/events`). */
export function backendProxyUrl(endpoint: string): string {
  return `${BACKEND_PROXY_BASE}${withLeadingSlash(endpoint)}`;
}

/** Direct Laravel URL (server-side code, unauthenticated calls, uploads). */
export function directBackendUrl(endpoint: string): string {
  return `${env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}${withLeadingSlash(endpoint)}`;
}

/** Headers every proxy request must carry. */
export function backendProxyHeaders(): Record<string, string> {
  return { [BACKEND_PROXY_HEADER]: "1" };
}

/**
 * Fetch the Laravel token just-in-time for a direct (large) upload. Returns
 * null when there is no session. Callers must not store the result.
 */
export async function fetchTransferToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(TRANSFER_TOKEN_ROUTE, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: backendProxyHeaders(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { token?: unknown };
    return typeof json.token === "string" && json.token ? json.token : null;
  } catch {
    return null;
  }
}
