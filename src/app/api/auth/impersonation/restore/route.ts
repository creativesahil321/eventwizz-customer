import { NextRequest, NextResponse } from "next/server";
import { restoreAdminSession } from "@/lib/auth/impersonation-cookies";
import { enforceSameOrigin } from "@/lib/security/api-guard";
import { BACKEND_PROXY_HEADER } from "@/lib/backend/backend-transport";

/** Restore the backed-up admin session when impersonation ends. */

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
  const result = await restoreAdminSession(req, res);
  if (result === "ok") return res;

  // Invalid backups were expired on `res`; carry those cookie deletions over.
  const fail = NextResponse.json(
    { ok: false, reason: result },
    { status: result === "no-backup" ? 404 : 403, headers: NO_STORE },
  );
  for (const c of res.cookies.getAll()) fail.cookies.set(c);
  return fail;
}
