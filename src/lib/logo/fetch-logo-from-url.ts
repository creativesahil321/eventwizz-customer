import { LOGO_PROCESS_MAX_BYTES } from "./constants";
import { safeFetch } from "@/lib/security/ssrf";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "::",
]);

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(lower)) return true;
  if (lower.endsWith(".local")) return true;
  if (lower.startsWith("::ffff:")) {
    return isPrivateOrLocalHost(lower.slice("::ffff:".length));
  }
  if (lower.includes(":")) {
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
  if (/^(0|127)\./.test(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  if (/^100\.(6[4-9]|[7-9]\d)\./.test(lower)) return true;
  if (/^198\.(18|19)\./.test(lower)) return true;
  if (/^(22[4-9]|23\d|24\d|25[0-5])\./.test(lower)) return true;
  return false;
}

export function assertSafeLogoUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid logo URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Logo URL must use http or https.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Logo URL credentials are not allowed.");
  }

  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error("Logo URL host is not allowed.");
  }

  return parsed;
}

export async function fetchLogoBufferFromUrl(rawUrl: string): Promise<Buffer> {
  const url = assertSafeLogoUrl(rawUrl);
  // safeFetch re-validates host + DNS on every redirect hop (SSRF-safe).
  const response = await safeFetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not fetch logo (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error("Logo URL did not return an image.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Logo file is empty.");
  }
  if (buffer.length > LOGO_PROCESS_MAX_BYTES) {
    throw new Error("Logo file is too large (max 5 MB).");
  }

  return buffer;
}
