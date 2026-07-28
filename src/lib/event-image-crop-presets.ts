import type { CropperConfig } from "@/components/ui/image-cropper/types";

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
 * Site / location hero & cover backgrounds (object-cover on the site).
 * Free crop so the full upload can be kept; users can still pick 16:9 in the dialog.
 */
export const SITE_HERO_BACKGROUND_CROP: CropperConfig = {
  maxSizeKB: 500,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 1920,
};

/** @deprecated Use SITE_HERO_BACKGROUND_CROP — free crop for full-bleed covers. */
export const SITE_LANDING_BANNER_CROP = SITE_HERO_BACKGROUND_CROP;

/** Admin CMS home hero background. */
export const ADMIN_HOME_HERO_CROP: CropperConfig = {
  maxSizeKB: 700,
  quality: 0.9,
  maxWidth: 1920,
  maxHeight: 1920,
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
