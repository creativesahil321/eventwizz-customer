import { cache } from "react";
import { env } from "@/env";
import { API_ENDPOINTS } from "@/services/core/endpoints";

/**
 * Public per-page CMS content, fetched server-side for SSR/SEO.
 *
 * Endpoint (public, no auth), tenant resolved by request domain like the theme
 * settings API:
 *   GET /{role}/info-pages?page=<key>&domain_name=<host>
 *
 * `role` is chosen by the site: "vendor" for vendor tenant sites, "admin" for
 * the main EventWizz marketing site.
 */
export type InfoPageRole = "vendor" | "admin";

export interface InfoPageContent {
  key: string;
  title: string;
  content: string;
}

function infoPagesPath(role: InfoPageRole): string {
  return role === "admin"
    ? API_ENDPOINTS.ADMIN.INFO_PAGES
    : API_ENDPOINTS.VENDOR.INFO_PAGES;
}

async function requestInfoPage(
  role: InfoPageRole,
  page: string,
  host: string,
): Promise<InfoPageContent | null> {
  if (!host) return null;

  const cleanDomain = host.split(":")[0];
  const apiUrl = env.NEXT_PUBLIC_API_URL;
  const endpoint =
    `${apiUrl}${infoPagesPath(role)}` +
    `?page=${encodeURIComponent(page)}` +
    `&domain_name=${encodeURIComponent(cleanDomain)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Origin: env.NEXT_PUBLIC_APP_URL || "",
        Host: cleanDomain,
      },
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;

    const json = await response.json();
    if (!json?.status || !json?.data) return null;

    const data = json.data as Partial<InfoPageContent>;
    return {
      key: typeof data.key === "string" ? data.key : page,
      title: typeof data.title === "string" ? data.title : "",
      content: typeof data.content === "string" ? data.content : "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Per-request memoized single-page fetch. */
export const fetchInfoPage = cache(requestInfoPage);

/**
 * Fetch several pages in parallel, returning raw HTML keyed by page key. Missing
 * or failed pages are simply absent so callers can fall back to default content.
 */
export async function fetchInfoPagesHtml(
  role: InfoPageRole,
  pages: string[],
  host: string,
): Promise<Record<string, string>> {
  const results = await Promise.all(
    pages.map((page) => fetchInfoPage(role, page, host)),
  );

  const map: Record<string, string> = {};
  pages.forEach((page, index) => {
    const content = results[index]?.content?.trim();
    if (content) map[page] = content;
  });
  return map;
}
