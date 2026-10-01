import type { MetadataRoute } from "next";
import {
  fetchServerThemeCached,
  getRequestHost,
  getSubdomainFromDomain,
} from "@/lib/server-theme";
import { isVendorPublicSite } from "@/lib/vendor-cms-content";
import { fetchPublishedBlogs } from "@/lib/blogs/public-api";
import { blogPublicPaths } from "@/lib/blogs/constants";
import { getRequestOrigin } from "@/lib/seo/request-origin";

const ADMIN_SITE_PATHS = ["", "/about", "/how-it-works", "/blog", "/contact", "/policies"];
const VENDOR_SITE_PATHS = ["", "/contact", "/policies"];
const MAX_BLOG_URLS = 50;

/**
 * Host-aware sitemap. Vendor tenants list their own locations and live
 * events (from the theme payload the site already loads); the main site
 * lists its marketing pages and published blog posts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getRequestOrigin();
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);

  if (!theme) {
    return [{ url: origin }];
  }

  const paths = new Set<string>();

  if (isVendorPublicSite(getSubdomainFromDomain(host), theme)) {
    VENDOR_SITE_PATHS.forEach((p) => paths.add(p));
    for (const location of theme.locations ?? []) {
      if (location?.slug) paths.add(`/${encodeURIComponent(location.slug)}`);
    }
    for (const event of theme.live_events ?? []) {
      if (event?.slug && event.location_slug) {
        paths.add(
          `/${encodeURIComponent(event.location_slug)}/events/${encodeURIComponent(event.slug)}`,
        );
      }
    }
  } else {
    ADMIN_SITE_PATHS.forEach((p) => paths.add(p));
    try {
      const posts = await fetchPublishedBlogs(host, MAX_BLOG_URLS, 1);
      for (const post of posts) {
        if (post.slug) paths.add(blogPublicPaths.article(post.slug));
      }
    } catch {
      // Blog API unavailable: keep the static pages only.
    }
  }

  return Array.from(paths).map((path) => ({ url: `${origin}${path}` }));
}
