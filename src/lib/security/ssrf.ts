import { lookup } from "node:dns/promises";
import { isIPv4, isIPv6 } from "node:net";

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
 *
 * IP literals are parsed numerically (not by string prefix) so IPv4-mapped /
 * IPv4-compatible / NAT64 / 6to4 IPv6 forms — in both dotted
 * (`::ffff:127.0.0.1`) and hex (`::ffff:7f00:1`, which is what `new URL()`
 * normalizes to) notation — are checked against the IPv4 private ranges.
 */

const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "::", "::1"]);

const DNS_LOOKUP_TIMEOUT_MS = 3_000;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 5;

/** IPv4 [network, prefixLength] ranges that must never be fetched. */
const BLOCKED_IPV4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local + cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 3], // multicast (224/4) + reserved (240/4) + broadcast
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

const BLOCKED_IPV4_RANGES = BLOCKED_IPV4_CIDRS.map(([network, prefix]) => {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return { base: (ipv4ToInt(network)! & mask) >>> 0, mask };
});

function isPrivateIPv4Int(value: number): boolean {
  return BLOCKED_IPV4_RANGES.some(
    ({ base, mask }) => ((value & mask) >>> 0) === base,
  );
}

/** Expand a validated IPv6 literal into eight 16-bit hextets. */
function parseIPv6(ip: string): number[] | null {
  let address = ip;
  // Embedded dotted IPv4 tail (e.g. ::ffff:1.2.3.4) -> two hextets.
  const lastColon = address.lastIndexOf(":");
  const tail = address.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = ipv4ToInt(tail);
    if (v4 === null) return null;
    address = `${address.slice(0, lastColon + 1)}${(v4 >>> 16).toString(16)}:${(
      v4 & 0xffff
    ).toString(16)}`;
  }

  const halves = address.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  const hextets: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    hextets.push(parseInt(group, 16));
  }
  return hextets.length === 8 ? hextets : null;
}

function embeddedIPv4(high: number, low: number): number {
  return ((high << 16) >>> 0) + low;
}

function isPrivateIPv6(ip: string): boolean {
  const h = parseIPv6(ip);
  // Unparseable literal: fail closed.
  if (!h) return true;

  const zeroUpTo = (n: number) => h.slice(0, n).every((x) => x === 0);

  // :: and ::1
  if (zeroUpTo(7) && (h[7] === 0 || h[7] === 1)) return true;
  // IPv4-mapped ::ffff:a.b.c.d
  if (zeroUpTo(5) && h[5] === 0xffff) {
    return isPrivateIPv4Int(embeddedIPv4(h[6]!, h[7]!));
  }
  // IPv4-translated ::ffff:0:a.b.c.d
  if (zeroUpTo(4) && h[4] === 0xffff && h[5] === 0) {
    return isPrivateIPv4Int(embeddedIPv4(h[6]!, h[7]!));
  }
  // IPv4-compatible (deprecated) ::a.b.c.d
  if (zeroUpTo(6)) {
    return isPrivateIPv4Int(embeddedIPv4(h[6]!, h[7]!));
  }
  // NAT64 well-known prefix 64:ff9b::/96 -> check the embedded IPv4.
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
    return isPrivateIPv4Int(embeddedIPv4(h[6]!, h[7]!));
  }
  // NAT64 local-use 64:ff9b:1::/48 — internal by definition.
  if (h[0] === 0x64 && h[1] === 0xff9b && h[2] === 1) return true;
  // 6to4 2002::/16 embeds an IPv4 in hextets 1-2.
  if (h[0] === 0x2002) {
    return isPrivateIPv4Int(embeddedIPv4(h[1]!, h[2]!));
  }

  const first = h[0]!;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (first === 0x100 && h[1] === 0 && h[2] === 0 && h[3] === 0) return true; // 100::/64 discard
  return false;
}

/** True for loopback / private / link-local / CGNAT / multicast / reserved IPs. */
export function isPrivateOrLocalHost(hostname: string): boolean {
  let lower = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");
  // Strip an IPv6 zone id (fe80::1%eth0) and a trailing FQDN dot.
  const zoneIndex = lower.indexOf("%");
  if (zoneIndex !== -1) lower = lower.slice(0, zoneIndex);
  lower = lower.replace(/\.+$/, "");
  if (!lower) return true;
  if (BLOCKED_HOSTS.has(lower)) return true;
  if (
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost")
  ) {
    return true;
  }

  if (isIPv4(lower)) {
    const value = ipv4ToInt(lower);
    return value === null || isPrivateIPv4Int(value);
  }
  if (isIPv6(lower)) return isPrivateIPv6(lower);
  // Anything else containing ':' is not a valid host; fail closed.
  if (lower.includes(":")) return true;
  // Regular DNS name — validated after resolution by assertResolvesToPublic.
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

async function lookupWithTimeout(
  hostname: string,
): Promise<{ address: string }[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("DNS lookup timed out.")),
      DNS_LOOKUP_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([lookup(hostname, { all: true }), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Resolve DNS and reject if ANY resolved address is private/internal. */
export async function assertResolvesToPublic(hostname: string): Promise<void> {
  // `URL.hostname` keeps brackets around IPv6 literals; dns.lookup does not
  // accept them.
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isPrivateOrLocalHost(host)) {
    throw new Error("URL resolves to a non-public address.");
  }
  let results: { address: string }[];
  try {
    results = await lookupWithTimeout(host);
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
  /** Max redirects to follow (each re-validated). Default 5. */
  maxRedirects?: number;
  /**
   * Overall timeout in ms covering every hop and the body read. Default 10s.
   * Combined with any caller-provided `signal`. Aborts with an `AbortError`.
   */
  timeoutMs?: number;
}

function combineSignals(
  a: AbortSignal | null | undefined,
  b: AbortSignal,
): AbortSignal {
  if (!a) return b;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([a, b]);
  // Fallback for runtimes without AbortSignal.any.
  const controller = new AbortController();
  const forward = (source: AbortSignal) => () => controller.abort(source.reason);
  if (a.aborted) controller.abort(a.reason);
  else if (b.aborted) controller.abort(b.reason);
  else {
    a.addEventListener("abort", forward(a), { once: true });
    b.addEventListener("abort", forward(b), { once: true });
  }
  return controller.signal;
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
  const {
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    signal: callerSignal,
    ...rest
  } = init;

  // abort() with no reason rejects with a DOMException named "AbortError",
  // which existing callers already map to their "timeout" errors.
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  // Don't keep the process alive just for this timer.
  (timer as { unref?: () => void }).unref?.();
  const signal = combineSignals(callerSignal, timeoutController.signal);

  try {
    let current = assertPublicUrl(rawUrl);
    await assertResolvesToPublic(current.hostname);

    for (let hop = 0; hop <= maxRedirects; hop++) {
      const response = await fetch(current.toString(), {
        ...rest,
        signal,
        redirect: "manual",
      });

      const status = response.status;
      if (status >= 300 && status < 400) {
        const location = response.headers.get("location");
        if (!location) return response;
        // Release the redirect response's socket.
        await response.body?.cancel().catch(() => undefined);
        if (hop === maxRedirects) {
          throw new Error("Too many redirects.");
        }
        const next = assertPublicUrl(new URL(location, current).toString());
        await assertResolvesToPublic(next.hostname);
        current = next;
        continue;
      }
      // The timer intentionally keeps running so it also bounds the caller's
      // body read; it is unref'd and aborting a consumed body is a no-op.
      return response;
    }
    throw new Error("Too many redirects.");
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

export class ResponseTooLargeError extends Error {
  constructor(message = "Response body is too large.") {
    super(message);
    this.name = "ResponseTooLargeError";
  }
}

/**
 * Read a response body into a Buffer without ever holding more than
 * `maxBytes`. Checks `content-length` first, then streams with a byte
 * counter. Above the cap it cancels the stream and throws
 * `ResponseTooLargeError` — or, with `truncate: true`, returns the first
 * `maxBytes` bytes instead.
 */
export async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
  options: { truncate?: boolean } = {},
): Promise<Buffer> {
  const { truncate = false } = options;
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (!truncate && Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new ResponseTooLargeError();
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      if (truncate) return buffer.subarray(0, maxBytes);
      throw new ResponseTooLargeError();
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = Buffer.from(next.value);
      if (total + chunk.length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        if (truncate) {
          chunks.push(chunk.subarray(0, maxBytes - total));
          total = maxBytes;
          break;
        }
        throw new ResponseTooLargeError();
      }
      chunks.push(chunk);
      total += chunk.length;
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}
