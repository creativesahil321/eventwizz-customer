import { headers } from "next/headers";
import { getRequestHost } from "@/lib/server-theme";

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("127.") ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  );
}

/**
 * Absolute origin (`https://host`) of the current request, used for
 * per-tenant canonical URLs, `metadataBase`, robots and sitemap.
 * Each vendor domain gets its own origin, so SEO URLs never point at
 * another tenant or at the main EventWizz domain.
 */
export async function getRequestOrigin(): Promise<string> {
  const host = await getRequestHost();
  let proto = isLocalHost(host) ? "http" : "https";
  try {
    const forwarded = (await headers()).get("x-forwarded-proto");
    if (forwarded === "http" || forwarded === "https") proto = forwarded;
  } catch {
    // headers() unavailable: keep the default protocol
  }
  return `${proto}://${host}`;
}
