import { NextRequest, NextResponse } from "next/server";
import { getBackendTokenFromRequest } from "@/lib/auth/server-token";
import { enforceSameOrigin } from "@/lib/security/api-guard";
import { BACKEND_PROXY_HEADER } from "@/lib/backend/backend-transport";

/**
 * Just-in-time Laravel token for LARGE direct uploads only (event videos and
 * galleries exceed the ~4.5 MB proxy body limit). The caller holds it in a
 * local variable for one request and never stores it.
 *
 * Interim: this returns the session's Laravel token. Once the backend can mint
 * short-lived, upload-scoped tokens (SECURITY-BACKEND-REQUIREMENTS.md, B8),
 * swap the body of this handler to request one — no client changes needed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest) {
  if (req.headers.get(BACKEND_PROXY_HEADER) !== "1") {
    return NextResponse.json({ token: null }, { status: 403, headers: NO_STORE });
  }
  const crossOrigin = enforceSameOrigin(req);
  if (crossOrigin) return crossOrigin;

  const token = await getBackendTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json({ token }, { headers: NO_STORE });
}
