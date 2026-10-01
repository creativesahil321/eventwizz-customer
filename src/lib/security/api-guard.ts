import { NextResponse } from "next/server";

/**
 * Lightweight abuse guards for Next.js route handlers.
 *
 * The AI routes are effectively open proxies to the platform's LLM provider.
 * These guards cut off the cheapest abuse vectors (cross-site invocation and
 * naive flooding) WITHOUT requiring a login, so first-party onboarding/vendor
 * flows keep working regardless of auth state.
 *
 * NOTE: the in-memory limiter is per-serverless-instance and best-effort. It
 * is a speed bump, not a substitute for edge/WAF rate limiting or backend
 * enforcement — see SECURITY-AUDIT.md.
 */

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Reject cross-site requests. Returns a 403 NextResponse if the request's
 * Origin/Referer does not match the app's own host; null if allowed.
 */
export function enforceSameOrigin(req: Request): NextResponse | null {
  const selfHost = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    hostOf(req.url) ||
    ""
  ).toLowerCase();

  const originHost = hostOf(req.headers.get("origin"));
  const refererHost = hostOf(req.headers.get("referer"));

  // Must present at least one, and it must match our own host.
  if (originHost && originHost === selfHost) return null;
  if (!originHost && refererHost && refererHost === selfHost) return null;

  return NextResponse.json(
    { status: false, message: "Cross-origin request rejected." },
    { status: 403 },
  );
}

// --- Best-effort in-memory rate limiter -----------------------------------

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Combined guard: same-origin + per-IP rate limit for a named route.
 * Returns a NextResponse to short-circuit, or null to proceed.
 */
export function guardPublicApi(
  req: Request,
  routeKey: string,
  opts: { limit?: number; windowMs?: number } = {},
): NextResponse | null {
  const sameOrigin = enforceSameOrigin(req);
  if (sameOrigin) return sameOrigin;

  const { limit = 20, windowMs = 60_000 } = opts;
  const rl = rateLimit(`${routeKey}:${clientIp(req)}`, limit, windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { status: false, message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  return null;
}
