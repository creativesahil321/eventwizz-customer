import { getToken, type JWT } from "next-auth/jwt";
import { cookies } from "next/headers";
import { env } from "@/env";

/**
 * SERVER-ONLY helpers for reading the Laravel API token.
 *
 * The Laravel bearer token lives inside the encrypted, HttpOnly NextAuth JWT
 * cookie and is intentionally NOT exposed through `/api/auth/session`, the
 * client session object, or browser storage. Server code (route handlers,
 * server components, the `/api/backend` proxy) reads it from the cookie here.
 *
 * Never import this from a client component.
 */

/**
 * Must match `authOptions.cookies.sessionToken.name`. Passed explicitly
 * because `getToken` otherwise defaults to the `__Secure-` prefixed name on
 * Vercel/HTTPS, which this app does not use. NextAuth may split a large JWT
 * into `.0`, `.1`… chunks; `getToken` reassembles them by this prefix.
 */
export const SESSION_COOKIE_NAME = "next-auth.session-token";

type CookieSource = Parameters<typeof getToken>[0]["req"];

/** Decode the NextAuth JWT from any request-like object (route handlers). */
export async function getSessionJwtFromRequest(
  req: CookieSource,
): Promise<JWT | null> {
  try {
    return await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
      cookieName: SESSION_COOKIE_NAME,
    });
  } catch {
    return null;
  }
}

/** Laravel bearer token for a request, or null when there is no session. */
export async function getBackendTokenFromRequest(
  req: CookieSource,
): Promise<string | null> {
  const jwt = await getSessionJwtFromRequest(req);
  const token = jwt?.token;
  return typeof token === "string" && token ? token : null;
}

/** Laravel bearer token for the current request (server components/actions). */
export async function getServerBackendToken(): Promise<string | null> {
  const store = await cookies();
  return getBackendTokenFromRequest({
    cookies: store,
    headers: new Headers(),
  } as unknown as CookieSource);
}
