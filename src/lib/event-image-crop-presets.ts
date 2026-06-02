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

/** Site Essentials landing banner (16:9). */
export const SITE_LANDING_BANNER_CROP: CropperConfig & { aspectRatio: number } =
  {
    aspectRatio: 16 / 9,
    maxSizeKB: 500,
    quality: 0.9,
    maxWidth: 1920,
    maxHeight: 1080,
  };
