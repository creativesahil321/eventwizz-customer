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
 *
 * Private/LAN hosts (e.g. `192.168.1.100`) are optimized when allowlisted +
 * `images.dangerouslyAllowLocalIP` is enabled in `next.config` — so local Laravel
 * covers get AVIF/WebP the same as production.
 */
export function shouldUseNextImageOptimization(src: string): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
    return false;
  }
  if (!/^https?:\/\//i.test(src)) {
    return true;
  }
  try {
    const { hostname } = new URL(src);
    if (!isNextImageRemoteHostname(hostname)) {
      return false;
    }
    // Private/LAN origins (e.g. 192.168.x, localhost) are only reachable by the
    // image optimizer when it runs on the same machine — i.e. `npm run dev`.
    // On a deployed build (Vercel/remote) the optimizer runs off-network and
    // cannot fetch a LAN address, so routing the hero through it stalls until
    // timeout (the "banner loads very late" symptom). Serve the original
    // directly in production instead of optimizing an unreachable origin.
    if (
      isPrivateOrLocalImageHostname(hostname) &&
      process.env.NODE_ENV === "production"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer API `media_updated_at` (ISO UTC) from theme/settings sources.
 * Same value on SSR + client — safe for hero/logo/favicon without hydration flash.
 */
export function resolveMediaUpdatedAt(
  ...sources: Array<
    { media_updated_at?: string | null } | null | undefined
  >
): string | null {
  for (const source of sources) {
    const value = source?.media_updated_at;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/** Convert `media_updated_at` ISO string to a numeric cache key for context consumers. */
export function mediaUpdatedAtToVersion(
  mediaUpdatedAt?: string | null,
): number | undefined {
  if (!mediaUpdatedAt) return undefined;
  const ms = new Date(mediaUpdatedAt).getTime();
  return Number.isFinite(ms) ? ms : undefined;
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
