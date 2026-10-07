import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { getBackendTokenFromRequest } from "@/lib/auth/server-token";
import {
  clearAuthCookies,
  getAdminBackupToken,
} from "@/lib/auth/impersonation-cookies";
import { enforceSameOrigin } from "@/lib/security/api-guard";
import { BACKEND_PROXY_HEADER } from "@/lib/backend/backend-transport";

/**
 * Server half of logout (the client half is `src/lib/auth/logout.ts`):
 * 1. revoke the Laravel token(s) so a copied token stops working immediately;
 * 2. expire every HttpOnly auth cookie, which browser JS cannot clear.
 *
 * Always succeeds: logout must never leave the user signed in because the
 * backend was slow or unreachable.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const REVOKE_TIMEOUT_MS = 5_000;

async function revokeBackendToken(token: string): Promise<void> {
  try {
    await fetch(
      `${env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}${API_ENDPOINTS.AUTH.LOGOUT}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REVOKE_TIMEOUT_MS),
      },
    );
  } catch {
    // Best effort — the cookies are cleared regardless.
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get(BACKEND_PROXY_HEADER) !== "1") {
    return NextResponse.json({ ok: false }, { status: 403, headers: NO_STORE });
  }
  const crossOrigin = enforceSameOrigin(req);
  if (crossOrigin) return crossOrigin;

  // Current session token, plus the admin's own token if this logout happens
  // mid-impersonation (logging out ends both sessions).
  const tokens = new Set(
    [
      await getBackendTokenFromRequest(req),
      await getAdminBackupToken(req),
    ].filter((t): t is string => Boolean(t)),
  );
  await Promise.all([...tokens].map(revokeBackendToken));

  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  clearAuthCookies(req, res);
  return res;
}
