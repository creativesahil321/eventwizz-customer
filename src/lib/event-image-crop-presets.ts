import {
  ASPECT_RATIOS,
  type CropperConfig,
} from "@/components/ui/image-cropper/types";

/** Shared vendor-facing hint for site / location hero uploads. */
export const SITE_HERO_UPLOAD_HINT =
  "Landscape 16:9 (1920×1080 recommended). Crop to the banner frame and keep faces or logos centered.";

/** Package hero image — aligned with onboarding step 4 for speed + quality balance. */
export const EVENT_PACKAGE_IMAGE_CROP: CropperConfig & { aspectRatio: number } =
  {
    aspectRatio: 4 / 3,
    maxSizeKB: 500,
    quality: 0.9,
    maxWidth: 1200,
    maxHeight: 900,
  };

/** Event gallery slots (vendor step 2 / onboarding step 4 gallery). */
export const EVENT_GALLERY_IMAGE_CROP: CropperConfig = {
  maxSizeKB: 800,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 1920,
};

/** Optional scheduler / timeline background. */
export const EVENT_SCHEDULER_BG_CROP: CropperConfig = {
  maxSizeKB: 400,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 1920,
};

/** Profile avatars (vendor / customer / admin). */
export const PROFILE_AVATAR_CROP: CropperConfig & { aspectRatio: number } = {
  aspectRatio: 1,
  maxSizeKB: 400,
  quality: 0.9,
  maxWidth: 800,
  maxHeight: 800,
};

/**
 * Site / location hero & cover backgrounds.
 * Locked to 16:9 so the crop matches the live banner band (`object-cover`).
 */
export const SITE_HERO_BACKGROUND_CROP: CropperConfig & {
  aspectRatio: number;
} = {
  aspectRatio: ASPECT_RATIOS.landscape,
  maxSizeKB: 500,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 1080,
};

/** @deprecated Use SITE_HERO_BACKGROUND_CROP. */
export const SITE_LANDING_BANNER_CROP = SITE_HERO_BACKGROUND_CROP;

/** Admin CMS home hero background — same 16:9 band as vendor heroes. */
export const ADMIN_HOME_HERO_CROP: CropperConfig & { aspectRatio: number } = {
  aspectRatio: ASPECT_RATIOS.landscape,
  maxSizeKB: 700,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 1080,
};

/** Admin CMS card / showcase images — free so full image is allowed. */
export const ADMIN_HOME_CARD_CROP: CropperConfig = {
  maxSizeKB: 500,
  quality: 0.9,
  maxWidth: 1600,
  maxHeight: 1600,
};

/** Admin showcase poster (recommended 3:2, overridable in dialog). */
export const ADMIN_SHOWCASE_POSTER_CROP: CropperConfig & {
  aspectRatio: number;
} = {
  aspectRatio: 3 / 2,
  maxSizeKB: 600,
  quality: 0.9,
  maxWidth: 1600,
  maxHeight: 1200,
};

/** Event header / cinematic banner (recommended 21:9, overridable in dialog). */
export const EVENT_BANNER_CROP: CropperConfig & { aspectRatio: number } = {
  aspectRatio: 21 / 9,
  maxSizeKB: 600,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 823,
};

/** Blog featured image — locked to 16:9 to match news cards and article heroes. */
export const BLOG_FEATURED_IMAGE_CROP: CropperConfig & {
  aspectRatio: number;
} = {
  aspectRatio: ASPECT_RATIOS.landscape,
  maxSizeKB: 800,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 1080,
};

export const BLOG_FEATURED_UPLOAD_HINT =
  "Landscape 16:9 (JPG, PNG or WebP, max 5MB). Crop, zoom, and pan to frame the image for news cards and the article header.";

/** Public article hero — reading-column width, capped height so it never fills the viewport. */
export const BLOG_ARTICLE_HERO = {
  width: 760,
  height: { mobile: 200, tablet: 240, desktop: 280 },
} as const;

