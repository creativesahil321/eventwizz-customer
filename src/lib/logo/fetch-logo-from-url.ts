import { LOGO_PROCESS_MAX_BYTES } from "./constants";
import {
  isPrivateOrLocalHost,
  readBodyWithLimit,
  ResponseTooLargeError,
  safeFetch,
} from "@/lib/security/ssrf";

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
    timeoutMs: 15_000,
  });

  if (!response.ok) {
    throw new Error(`Could not fetch logo (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error("Logo URL did not return an image.");
  }

  // Stream with a byte cap so an oversized/unbounded body is never buffered.
  let buffer: Buffer;
  try {
    buffer = await readBodyWithLimit(response, LOGO_PROCESS_MAX_BYTES);
  } catch (error) {
    if (error instanceof ResponseTooLargeError) {
      throw new Error("Logo file is too large (max 5 MB).");
    }
    throw error;
  }
  if (buffer.length === 0) {
    throw new Error("Logo file is empty.");
  }
  if (buffer.length > LOGO_PROCESS_MAX_BYTES) {
    throw new Error("Logo file is too large (max 5 MB).");
  }

  return buffer;
}
