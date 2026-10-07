import type { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/authOptions";
import {
  SESSION_COOKIE_NAME,
  getSessionJwtFromRequest,
} from "@/lib/auth/server-token";
import { env } from "@/env";
import { getToken } from "next-auth/jwt";

/**
 * Server-side admin session backup for vendor impersonation.
 *
 * Previously the admin's Laravel token was copied into sessionStorage so the
 * session could be restored after impersonation (readable by any script).
 * Now the admin's already-encrypted NextAuth session cookie (every chunk) is
 * copied into an HttpOnly backup cookie, and copied back on exit.
 */

export const ADMIN_BACKUP_COOKIE = "ew-imp-admin-session";

function cookieOptions() {
  const opts = authOptions.cookies?.sessionToken?.options ?? {};
  return {
    httpOnly: true,
    sameSite: (opts.sameSite as "lax" | "strict" | "none" | undefined) ?? "lax",
    path: opts.path ?? "/",
    secure: Boolean(opts.secure),
    ...(opts.domain ? { domain: opts.domain } : {}),
    maxAge: typeof opts.maxAge === "number" ? opts.maxAge : 7 * 24 * 60 * 60,
  };
}

/** `next-auth.session-token` and its `.0`, `.1`… chunks. */
function chunksOf(req: NextRequest, prefix: string) {
  return req.cookies
    .getAll()
    .filter((c) => c.name === prefix || c.name.startsWith(`${prefix}.`));
}

function expire(res: NextResponse, name: string) {
  res.cookies.set(name, "", { ...cookieOptions(), maxAge: 0 });
}

/** Copy the current (admin) session cookie into the backup cookie. */
export async function backupAdminSession(
  req: NextRequest,
  res: NextResponse,
): Promise<"ok" | "no-session" | "not-admin"> {
  const session = chunksOf(req, SESSION_COOKIE_NAME);
  if (!session.length) return "no-session";

  const jwt = await getSessionJwtFromRequest(req);
  if (!jwt || jwt.account_type !== "admin") return "not-admin";

  const opts = cookieOptions();
  const nextNames = new Set<string>();
  for (const c of session) {
    const name = `${ADMIN_BACKUP_COOKIE}${c.name.slice(SESSION_COOKIE_NAME.length)}`;
    nextNames.add(name);
    res.cookies.set(name, c.value, opts);
  }
  for (const old of chunksOf(req, ADMIN_BACKUP_COOKIE)) {
    if (!nextNames.has(old.name)) expire(res, old.name);
  }
  return "ok";
}

function decodeAdminBackup(req: NextRequest) {
  return getToken({
    req,
    secret: env.NEXTAUTH_SECRET,
    cookieName: ADMIN_BACKUP_COOKIE,
  }).catch(() => null);
}

/** The admin's Laravel token held in the backup cookie (for revocation). */
export async function getAdminBackupToken(
  req: NextRequest,
): Promise<string | null> {
  const backupJwt = await decodeAdminBackup(req);
  const token = backupJwt?.token;
  return typeof token === "string" && token ? token : null;
}

/** Swap the backed-up admin session back in and delete the backup. */
export async function restoreAdminSession(
  req: NextRequest,
  res: NextResponse,
): Promise<"ok" | "no-backup" | "no-session" | "invalid-backup"> {
  const backup = chunksOf(req, ADMIN_BACKUP_COOKIE);
  if (!backup.length) return "no-backup";

  // Only an ongoing (impersonation) session can be swapped back. Without this,
  // a backup that outlived a logout could resurrect the admin session.
  if (!(await getSessionJwtFromRequest(req))) {
    for (const c of backup) expire(res, c.name);
    return "no-session";
  }

  // The backup is encrypted with NEXTAUTH_SECRET, so it cannot be forged —
  // still, only ever restore a session that decrypts to an admin.
  const backupJwt = await decodeAdminBackup(req);
  if (!backupJwt || backupJwt.account_type !== "admin") {
    for (const c of backup) expire(res, c.name);
    return "invalid-backup";
  }

  const opts = cookieOptions();
  const restoredNames = new Set<string>();
  for (const c of backup) {
    const name = `${SESSION_COOKIE_NAME}${c.name.slice(ADMIN_BACKUP_COOKIE.length)}`;
    restoredNames.add(name);
    res.cookies.set(name, c.value, opts);
    expire(res, c.name);
  }
  for (const current of chunksOf(req, SESSION_COOKIE_NAME)) {
    if (!restoredNames.has(current.name)) expire(res, current.name);
  }
  return "ok";
}

/**
 * Expire every HttpOnly auth cookie on logout: the session (all chunks) and
 * the impersonation admin backup. Browser JS cannot clear these.
 */
export function clearAuthCookies(req: NextRequest, res: NextResponse): void {
  for (const prefix of [SESSION_COOKIE_NAME, ADMIN_BACKUP_COOKIE]) {
    for (const c of chunksOf(req, prefix)) expire(res, c.name);
  }
}
