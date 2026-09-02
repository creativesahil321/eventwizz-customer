/**
 * Single source of truth for `next/image` remote URLs.
 * - `next.config.ts` → `images.remotePatterns`
 * - `shouldUseNextImageOptimization()` → hostname allowlist (must match patterns)
 *
 * If you add a host for optimized images, define it here only.
 */
export const nextImageRemotePatterns: {
  protocol: "http" | "https";
  hostname: string;
}[] = [
  { protocol: "https", hostname: "loremflickr.com" },
  { protocol: "https", hostname: "pixelway.com" },
  { protocol: "https", hostname: "picsum.photos" },
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "cdn.jsdelivr.net" },
  { protocol: "http", hostname: "eventwizz.local" },
  { protocol: "https", hostname: "eventwizz-admin.socreativesupport.com" },
  { protocol: "http", hostname: "eventwizz-admin.socreativesupport.com" },
  { protocol: "http", hostname: "eventwizz.socreativesupport.com" },
  { protocol: "https", hostname: "eventwizz.socreativesupport.com" },
  { protocol: "http", hostname: "vendor.eventwizz.socreativesupport.com" },
  { protocol: "https", hostname: "vendor.eventwizz.socreativesupport.com" },
  { protocol: "http", hostname: "customer.eventwizz.socreativesupport.com" },
  { protocol: "https", hostname: "customer.eventwizz.socreativesupport.com" },
  { protocol: "https", hostname: "avatar-placeholder.iran.liara.run" },
  { protocol: "https", hostname: "avatar.iran.liara.run" },
  // Local Laravel storage (dev) — also needs images.dangerouslyAllowLocalIP
  { protocol: "http", hostname: "192.168.1.100" },
  { protocol: "http", hostname: "192.168.1.14" },
  { protocol: "http", hostname: "127.0.0.1" },
  { protocol: "http", hostname: "localhost" },
];

const nextImageRemoteHostnameSet = new Set(
  nextImageRemotePatterns.map((p) => p.hostname.toLowerCase()),
);

/** True when this hostname appears in `nextImageRemotePatterns` (any protocol). */
export function isNextImageRemoteHostname(hostname: string): boolean {
  return nextImageRemoteHostnameSet.has(hostname.toLowerCase());
}
