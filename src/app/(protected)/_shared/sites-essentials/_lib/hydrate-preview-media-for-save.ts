import type { SiteEssentialsFormValues } from "./schema";
import { isUnsavedPreviewMedia } from "./merge-preview-with-api";

const MEDIA_KEYS = [
  "logo",
  "favicon",
  "cover_image",
  "cover_video",
  "main_landing_cover_image",
] as const satisfies ReadonlyArray<keyof SiteEssentialsFormValues>;

/**
 * Preview persistence turns File uploads into `blob:` URLs. Convert them back
 * to File objects before PATCH so the save API actually uploads media.
 */
export async function hydratePreviewMediaForSave<
  T extends Partial<SiteEssentialsFormValues>,
>(values: T): Promise<T> {
  const next: Record<string, unknown> = { ...values };

  await Promise.all(
    MEDIA_KEYS.map(async (key) => {
      const value = next[key];
      if (!isUnsavedPreviewMedia(value) || typeof value !== "string") return;

      try {
        const res = await fetch(value);
        if (!res.ok) {
          delete next[key];
          return;
        }
        const blob = await res.blob();
        if (!blob.size) {
          delete next[key];
          return;
        }
        const ext =
          blob.type.split("/")[1]?.split("+")[0] ||
          (key.includes("video") ? "mp4" : "jpg");
        next[key] = new File([blob], `${key}.${ext}`, {
          type: blob.type || (key.includes("video") ? "video/mp4" : "image/jpeg"),
        });
      } catch {
        // Drop dead blob URLs — never send `blob:` strings to the API.
        delete next[key];
      }
    }),
  );

  return next as T;
}
