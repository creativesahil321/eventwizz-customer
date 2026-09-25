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

export function coerceGalleryImageId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

/** Same items the gallery grid can render — do not drop these before counting. */
export function isDisplayableGalleryItem(item: unknown): boolean {
  if (typeof File !== "undefined" && item instanceof File) return true;
  if (typeof Blob !== "undefined" && item instanceof Blob) return true;
  if (typeof item === "string") return item.trim().length > 0;
  if (!item || typeof item !== "object") return false;
  const record = item as { url?: unknown; preview?: unknown };
  return (
    String(record.url ?? "").trim().length > 0 ||
    String(record.preview ?? "").trim().length > 0
  );
}

export function countEventGalleryItems(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  return raw.filter(isDisplayableGalleryItem).length;
}
