import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { getBackendTokenFromRequest } from "@/lib/auth/server-token";
import { enforceSameOrigin } from "@/lib/security/api-guard";
import {
  BACKEND_NO_AUTH_HEADER,
  BACKEND_PROXY_HEADER,
} from "@/lib/backend/backend-transport";

/**
 * Same-origin BFF proxy: browser → `/api/backend/<path>` → Laravel.
 *
 * Attaches the Laravel bearer token from the HttpOnly NextAuth cookie so the
 * token never reaches browser JavaScript. Bodies are capped by the platform
 * (~4.5 MB on Vercel); large multipart uploads bypass this route — see
 * `src/lib/backend/backend-transport.ts`.
 *
 * Set the Vercel Functions region near the Laravel server (Project Settings →
 * Functions) to keep the extra hop fast.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UPSTREAM_TIMEOUT_MS = 55_000;

/** Request headers relayed to Laravel. Everything else is dropped. */
const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "user-agent",
  "x-domain",
  "x-venue-location-id",
  "x-impersonating",
  "x-requested-with",
  "x-forwarded-for",
];

/** Response headers relayed to the browser. */
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-language",
  "location",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
];

function jsonError(status: number, message: string) {
  return NextResponse.json(
    { status: false, message, data: null, errors: [] },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

/** Build the Laravel URL, refusing anything that could escape the API base. */
function buildTargetUrl(segments: string[], search: string): URL | null {
  let base: URL;
  try {
    base = new URL(env.NEXT_PUBLIC_API_URL);
  } catch {
    return null;
  }
  if (!segments.length) return null;
  for (const seg of segments) {
    if (
      !seg ||
      seg === "." ||
      seg === ".." ||
      seg.includes("/") ||
      seg.includes("\\")
    ) {
      return null;
    }
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  const target = new URL(base.origin);
  target.pathname = `${basePath}/${segments.map(encodeURIComponent).join("/")}`;
  target.search = search;

  if (
    target.origin !== base.origin ||
    !target.pathname.startsWith(`${basePath}/`)
  ) {
    return null;
  }
  return target;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  // CSRF: the proxy authenticates with an ambient cookie, so require a custom
  // header (impossible cross-site without CORS) AND a same-origin Origin/Referer.
  if (req.headers.get(BACKEND_PROXY_HEADER) !== "1") {
    return jsonError(403, "Request rejected.");
  }
  const crossOrigin = enforceSameOrigin(req);
  if (crossOrigin) return crossOrigin;

  const { path = [] } = await ctx.params;
  const target = buildTargetUrl(path, req.nextUrl.search);
  if (!target) return jsonError(400, "Invalid API path.");

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Laravel previously received the browser's app Origin on every (cross-
  // origin) call; keep that contract for its domain checks.
  headers.set("origin", req.headers.get("origin") || req.nextUrl.origin);
  const referer = req.headers.get("referer");
  if (referer) headers.set("referer", referer);

  if (req.headers.get(BACKEND_NO_AUTH_HEADER) !== "1") {
    const token = await getBackendTokenFromRequest(req);
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return jsonError(
      timedOut ? 504 : 502,
      timedOut
        ? "The server took too long to respond."
        : "Unable to reach the server.",
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // Authenticated, tenant-scoped data must never be stored by a shared cache.
  responseHeaders.set("Cache-Control", "private, no-store");

  const noBody =
    method === "HEAD" || upstream.status === 204 || upstream.status === 304;
  return new Response(noBody ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
