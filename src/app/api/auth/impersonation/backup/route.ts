import { NextRequest, NextResponse } from "next/server";
import { backupAdminSession } from "@/lib/auth/impersonation-cookies";
import { enforceSameOrigin } from "@/lib/security/api-guard";
import { BACKEND_PROXY_HEADER } from "@/lib/backend/backend-transport";

/** Back up the admin session (HttpOnly) before switching to a vendor. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest) {
  if (req.headers.get(BACKEND_PROXY_HEADER) !== "1") {
    return NextResponse.json({ ok: false }, { status: 403, headers: NO_STORE });
  }
  const crossOrigin = enforceSameOrigin(req);
  if (crossOrigin) return crossOrigin;

  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  const result = await backupAdminSession(req, res);
  if (result !== "ok") {
    return NextResponse.json(
      { ok: false, reason: result },
      { status: result === "no-session" ? 401 : 403, headers: NO_STORE },
    );
  }
  return res;
}
