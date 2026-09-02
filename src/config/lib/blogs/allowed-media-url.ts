import { env } from "@/env";
import { isNextImageRemoteHostname } from "@/lib/next-image-remote-patterns";

export function assertAllowedBlogMediaUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid image URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Image URL must use http or https.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isNextImageRemoteHostname(hostname)) {
    return parsed;
  }

  try {
    const apiHost = new URL(env.NEXT_PUBLIC_API_URL).hostname.toLowerCase();
    if (hostname === apiHost) return parsed;
  } catch {
    // ignore invalid API base
  }

  throw new Error("Image host is not allowed.");
}
