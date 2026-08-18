import { cache } from "react";
import { env } from "@/env";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { BLOG_HOME_PER_PAGE } from "./constants";
import { mapApiBlogPost } from "./map-api-post";
import type { BlogApiPost, BlogPost } from "./types";
import { getRequestHost } from "@/lib/server-theme";

interface PublicBlogListJson {
  status?: boolean;
  data?: BlogApiPost[];
}

interface PublicBlogDetailJson {
  status?: boolean;
  data?: BlogApiPost | null;
}

async function fetchPublicJson<T>(
  path: string,
  host: string,
): Promise<T | null> {
  if (!host) return null;

  const cleanDomain = host.split(":")[0];
  const endpoint = `${env.NEXT_PUBLIC_API_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-Domain": cleanDomain,
        Origin: env.NEXT_PUBLIC_APP_URL || "",
        Host: cleanDomain,
      },
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestPublishedBlogs(
  host: string,
  perPage = BLOG_HOME_PER_PAGE,
  page = 1,
): Promise<BlogPost[]> {
  const path = `${API_ENDPOINTS.COMMON.BLOGS.LIST}?per_page=${perPage}&page=${page}`;
  const json = await fetchPublicJson<PublicBlogListJson>(path, host);
  if (!json?.status || !Array.isArray(json.data)) return [];
  return json.data.map(mapApiBlogPost);
}

async function requestPublishedBlogBySlug(
  host: string,
  slug: string,
): Promise<BlogPost | null> {
  const path = API_ENDPOINTS.COMMON.BLOGS.SHOW.replace(
    "{slug}",
    encodeURIComponent(slug),
  );
  const json = await fetchPublicJson<PublicBlogDetailJson>(path, host);
  if (!json?.status || !json.data) return null;
  return mapApiBlogPost(json.data);
}

export const fetchPublishedBlogs = cache(requestPublishedBlogs);
export const fetchPublishedBlogBySlug = cache(requestPublishedBlogBySlug);

export async function getPublishedBlogsForRequest(
  perPage = BLOG_HOME_PER_PAGE,
  page = 1,
): Promise<BlogPost[]> {
  const host = await getRequestHost();
  return fetchPublishedBlogs(host, perPage, page);
}

export async function getPublishedBlogBySlugForRequest(
  slug: string,
): Promise<BlogPost | null> {
  const host = await getRequestHost();
  return fetchPublishedBlogBySlug(host, slug);
}
