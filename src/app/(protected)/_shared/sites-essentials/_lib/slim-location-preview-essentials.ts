import type { SiteEssentials } from "@/services/common/site-essentials/type";

/**
 * CMS / policy bodies are large HTML blobs. Location preview only needs
 * banner / about / cover / events / gallery — never these pages.
 * Stripping them after fetch cuts parse cost, TanStack cache size, and
 * merge work on every location switch in `/preview/site`.
 */
const LOCATION_PREVIEW_OMITTED_KEYS = [
  "terms_and_conditions",
  "privacy_policy",
  "refund_policy",
  "cookie_policy",
  "vendor_terms",
  "about_page_content",
  "how_it_works_page_content",
  "contact_page_content",
  "info_pages",
] as const;

/**
 * Drop unused CMS HTML from a by-slug site-essentials response before it
 * enters the React Query cache / merge pipeline.
 */
export function slimSiteEssentialsForLocationPreview(
  data: SiteEssentials,
): SiteEssentials {
  const slimmed: Record<string, unknown> = { ...data };
  for (const key of LOCATION_PREVIEW_OMITTED_KEYS) {
    delete slimmed[key];
  }
  return slimmed as SiteEssentials;
}
