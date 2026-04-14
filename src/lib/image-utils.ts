/**
 * Utilities for handling user-uploaded images with cache busting
 */

/**
 * Adds a `v` query param for cache busting when `updated_at` is provided.
 * Without `updated_at`, returns `url` unchanged so image `src` stays stable across renders.
 */
export function addCacheBusting(url: string | null | undefined, updated_at?: string | number | null): string {
  if (!url) return "";

  try {
    // If URL is a data URL or blob, return as-is (local preview)
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }

    // Without a version, keep the URL stable. Using Date.now() here ran on every React
    // render and forced constant image reloads (layout shift / flicker in headers, etc.).
    if (updated_at == null || updated_at === "") {
      return url;
    }

    const urlObj = new URL(url, window.location.origin);
    const cacheValue =
      typeof updated_at === "number"
        ? updated_at.toString()
        : new Date(updated_at).getTime().toString();
    urlObj.searchParams.set("v", cacheValue);
    return urlObj.toString();
  } catch {
    if (updated_at == null || updated_at === "") {
      return url;
    }
    const separator = url.includes("?") ? "&" : "?";
    const cacheValue =
      typeof updated_at === "number"
        ? updated_at
        : new Date(updated_at).getTime();
    return `${url}${separator}v=${cacheValue}`;
  }
}

/**
 * Gets cache busted URL for user-uploaded images
 * For SSR/SSG contexts where window is not available
 */
export function addCacheBustingSSR(url: string | null | undefined, updated_at?: string | number | null): string {
  if (!url) return "";

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  if (updated_at == null || updated_at === "") {
    return url;
  }

  const cacheValue =
    typeof updated_at === "number"
      ? updated_at.toString()
      : new Date(updated_at).getTime().toString();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${cacheValue}`;
}
