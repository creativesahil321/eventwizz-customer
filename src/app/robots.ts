import type { MetadataRoute } from "next";
import { getRequestOrigin } from "@/lib/seo/request-origin";

/**
 * Internal / transactional sections that should never be crawled.
 * Each base is matched exactly (`$`) and as a folder (`/`), so location
 * slugs that merely start with the same letters stay crawlable.
 */
const DISALLOWED_SECTIONS = [
  "/admin",
  "/vendor",
  "/customer",
  "/auth",
  "/checkout",
  "/payment",
  "/preview",
  "/api",
  "/on-boarding",
  "/welcome",
  "/entry",
  "/newsletter",
  "/unauthorized",
];

/**
 * Host-aware robots.txt: every tenant domain points crawlers at its own
 * sitemap instead of the main EventWizz domain.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getRequestOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_SECTIONS.flatMap((path) => [`${path}$`, `${path}/`]),
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
