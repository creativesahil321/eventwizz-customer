import { notFound } from "next/navigation";
import {
  fetchServerThemeCached,
  getRequestHost,
  getSubdomainFromDomain,
} from "@/lib/server-theme";
import { isVendorPublicSite } from "@/lib/vendor-cms-content";

/**
 * Admin marketing pages (/about, /how-it-works, /blog, …) must never render
 * on vendor storefront hosts. Returns the request host for further CMS fetches.
 */
export async function assertAdminPublicSite(): Promise<string> {
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);
  const theme = await fetchServerThemeCached(host);

  if (isVendorPublicSite(subdomain, theme)) {
    notFound();
  }

  return host;
}
