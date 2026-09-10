/**
 * About section photo: dedicated `about_event_image`, else the event banner.
 */
export function resolveAboutEventImage(
  aboutImage?: unknown,
  bannerImage?: unknown,
): string | null {
  return mediaToDisplaySrc(aboutImage) ?? mediaToDisplaySrc(bannerImage);
}

function mediaToDisplaySrc(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
    return trimmed;
  }
  if (typeof File !== "undefined" && value instanceof File) {
    const preview = (value as File & { preview?: string }).preview;
    return typeof preview === "string" && preview.trim() ? preview.trim() : null;
  }
  if (
    typeof value === "object" &&
    "preview" in value &&
    typeof (value as { preview?: string }).preview === "string"
  ) {
    const preview = (value as { preview: string }).preview.trim();
    return preview || null;
  }
  return null;
}
