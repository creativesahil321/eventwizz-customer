import { lookup } from "node:dns/promises";

/**
 * SSRF protection for any server-side fetch of a user-supplied URL
 * (AI website/theme import, logo fetch, blog media proxy, model listing).
 *
 * Two layers the older host-only guard lacked:
 *  1. DNS resolution — a public hostname that resolves to a private/internal
 *     IP (or cloud metadata 169.254.169.254) is rejected. Closes DNS-based
 *     SSRF and most DNS-rebinding.
 *  2. Per-hop redirect re-validation — we follow redirects manually and
 *     re-check every `Location`, so a 30x to an internal host is blocked.
 */

const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "::", "::1"]);

/** True for loopback / private / link-local / CGNAT / multicast / reserved IPs. */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!lower) return true;
  if (BLOCKED_HOSTS.has(lower)) return true;
  if (lower.endsWith(".local") || lower.endsWith(".internal")) return true;

  if (lower.startsWith("::ffff:")) {
    return isPrivateOrLocalHost(lower.slice("::ffff:".length));
  }
  if (lower.includes(":")) {
    // IPv6
    return (
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    );
  }
  // IPv4 ranges
  if (/^(0|127|10)\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true; // link-local + cloud metadata
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower)) return true; // CGNAT
  if (/^198\.(18|19)\./.test(lower)) return true;
  if (/^(22[4-9]|23\d|24\d|25[0-5])\./.test(lower)) return true; // multicast/reserved
  return false;
}

/** Synchronous structural + host-literal validation. Throws on unsafe URL. */
export function assertPublicUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must use http or https.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URL credentials are not allowed.");
  }
  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error("URL host is not allowed.");
  }
  return parsed;
}

/** Resolve DNS and reject if ANY resolved address is private/internal. */
export async function assertResolvesToPublic(hostname: string): Promise<void> {
  // If it's already an IP literal, assertPublicUrl handled it; lookup still safe.
  let results: { address: string }[];
  try {
    results = await lookup(hostname, { all: true });
  } catch {
    throw new Error("URL host could not be resolved.");
  }
  if (!results.length) throw new Error("URL host could not be resolved.");
  for (const { address } of results) {
    if (isPrivateOrLocalHost(address)) {
      throw new Error("URL resolves to a non-public address.");
    }
  }
}

export interface SafeFetchOptions extends RequestInit {
  /** Max redirects to follow (each re-validated). Default 3. */
  maxRedirects?: number;
}

/**
 * SSRF-safe fetch. Validates the URL (structure + host + DNS) and follows
 * redirects manually, re-validating every hop. Use this instead of
 * `fetch(userUrl, { redirect: "follow" })` for any user-supplied URL.
 */
export async function safeFetch(
  rawUrl: string,
  init: SafeFetchOptions = {},
): Promise<Response> {
  const { maxRedirects = 3, ...rest } = init;
  let current = assertPublicUrl(rawUrl);
  await assertResolvesToPublic(current.hostname);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(current.toString(), {
      ...rest,
      redirect: "manual",
    });

    const status = response.status;
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      if (hop === maxRedirects) {
        throw new Error("Too many redirects.");
      }
      const next = assertPublicUrl(new URL(location, current).toString());
      await assertResolvesToPublic(next.hostname);
      current = next;
      continue;
    }
    return response;
  }
  throw new Error("Too many redirects.");
}
