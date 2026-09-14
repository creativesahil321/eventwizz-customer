import { EVENT_GALLERY_MAX_IMAGES } from "@/lib/event-form-limits";

/** If the vendor starts a gallery, they must reach this count (or clear it). */
export const EVENT_GALLERY_MIN_IMAGES_WHEN_USED = 3;

export const EVENT_GALLERY_PARTIAL_COUNT_MESSAGE = `Add at least ${EVENT_GALLERY_MIN_IMAGES_WHEN_USED} gallery images, or remove them to skip the gallery.`;

export function isEventGalleryCountValid(count: number): boolean {
  if (!Number.isFinite(count) || count < 0) return false;
  if (count === 0) return true;
  if (count > EVENT_GALLERY_MAX_IMAGES) return false;
  return count >= EVENT_GALLERY_MIN_IMAGES_WHEN_USED;
}
