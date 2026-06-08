/**
 * Utilities for handling user-uploaded images with cache busting
 */

import { isNextImageRemoteHostname } from "@/lib/next-image-remote-patterns";

/** Hosts where the browser can load assets but the Next.js image optimizer often cannot. */
export function isPrivateOrLocalImageHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/**
 * Use Next.js image optimizer for this `src` (`unoptimized={false}`) only when the host is
 * listed in `nextImageRemotePatterns` (same list as `next.config` `images.remotePatterns`).
 * Private/LAN hosts stay unoptimized so the browser loads them directly (the optimizer runs
 * on the Next server and often cannot reach 192.168.x.x).
 */
export function shouldUseNextImageOptimization(src: string): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
    return false;
  }
  if (!/^https?:\/\//i.test(src)) {
    return true;
  }
  try {
    const hostname = new URL(src).hostname;
    if (isPrivateOrLocalImageHostname(hostname)) {
      return false;
    }
    return isNextImageRemoteHostname(hostname);
  } catch {
    return false;
  }
}

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
