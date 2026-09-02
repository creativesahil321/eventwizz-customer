import {
  addCacheBustingSSR,
  resolveMediaUpdatedAt,
} from "@/lib/image-utils";

const DEFAULT_VENDOR_HERO = "/assets/images/Homepage/Homepage-Banner.png";

type ThemeHeroSource = {
  main_landing_cover_image?: string | null;
  cover_image?: string | null;
  media_updated_at?: string | null;
} | null | undefined;

/**
 * Vendor main-landing hero URL — same precedence as `vendor/page.tsx`.
 * SSR-safe (`addCacheBustingSSR`) for `<link rel="preload">` in root layout.
 */
export function resolveVendorMainLandingHeroSrc(
  ...sources: ThemeHeroSource[]
): string {
  const mediaUpdatedAt = resolveMediaUpdatedAt(...sources);

  for (const source of sources) {
    const cover =
      source?.main_landing_cover_image ?? source?.cover_image ?? null;
    if (typeof cover === "string" && cover.trim().length > 0) {
      return addCacheBustingSSR(cover.trim(), mediaUpdatedAt);
    }
  }

  return DEFAULT_VENDOR_HERO;
}

/** Location listing hero cover when the API returns a URL. */
export function resolveLocationCoverHeroSrc(
  coverImage: string | null | undefined,
  mediaUpdatedAt?: string | null,
): string | null {
  if (typeof coverImage !== "string" || coverImage.trim().length === 0) {
    return null;
  }
  return addCacheBustingSSR(coverImage.trim(), mediaUpdatedAt);
}

/** Event detail banner when the API returns a URL. */
export function resolveEventBannerHeroSrc(
  bannerImage: string | null | undefined,
): string | null {
  if (typeof bannerImage !== "string" || bannerImage.trim().length === 0) {
    return null;
  }
  return bannerImage.trim();
}
