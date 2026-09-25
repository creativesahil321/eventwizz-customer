/** Shared normalizers for vendor event step 2 (package tab + hydration mappers). */

import { createDefaultPackageDetailRow } from "@/lib/event-form-limits";
import { coerceGalleryImageId } from "@/lib/event-gallery-count";

/** API often returns `""` for unset media; Zod `.url()` rejects empty strings. */
export function normalizePersistedMediaUrl(
  value: unknown,
): string | File | null | undefined {
  if (value === "" || value === undefined) return null;
  if (value instanceof File) return value;
  if (typeof value === "string") return value;
  return null;
}

export function normalizeGalleryEntries(
  raw: unknown,
): Array<File | { id: number; url: string } | string> {
  if (!Array.isArray(raw)) return [];
  const entries: Array<File | { id: number; url: string } | string> = [];
  for (const item of raw) {
    if (typeof File !== "undefined" && item instanceof File) {
      entries.push(item);
      continue;
    }
    if (typeof item === "string" && item.trim()) {
      entries.push(item.trim());
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; url?: unknown; preview?: unknown };
    const url = String(record.url ?? record.preview ?? "").trim();
    if (!url) continue;
    const id = coerceGalleryImageId(record.id);
    entries.push(id !== undefined ? { id, url } : url);
  }
  return entries;
}

export function normalizePackageDetails(
  details: Array<{ title?: string } | undefined> | undefined,
) {
  const normalized = (details || [])
    .map((detail) => ({ title: String(detail?.title || "") }))
    .filter((detail) => detail.title.trim().length > 0);
  return normalized.length > 0
    ? normalized
    : [createDefaultPackageDetailRow(0)];
}

/** Laravel `H:i` (e.g. 06:00, 23:59). */
export const EVENT_SCHEDULER_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeSchedulerTimeForApi(time: string): string {
  const trimmed = String(time || "").trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** Drop empty UI placeholder rows before multipart submit. */
export function filterSchedulerRowsForApi(
  schedules:
    | Array<{ title?: string | null; time?: string | null } | undefined>
    | undefined
    | null,
): Array<{ title: string; time: string }> {
  return (schedules || [])
    .map((item) => ({
      title: String(item?.title || "").trim(),
      time: normalizeSchedulerTimeForApi(String(item?.time || "")),
    }))
    .filter(
      (item) =>
        item.title.length > 0 && EVENT_SCHEDULER_TIME_REGEX.test(item.time),
    );
}

export function hasPersistedPackageImageValue(image: unknown): boolean {
  return (
    !!image &&
    (image instanceof File ||
      (typeof image === "string" && image.trim().length > 0))
  );
}

/** True when a room has all package-tab fields needed before "Apply to all rooms". */
export function isVendorRoomPackageStepComplete(room: {
  package_title?: string;
  package_description?: string;
  package_details?: Array<{ title?: string }>;
  package_image?: unknown;
  event_schedular_title?: string;
  event_schedular?: Array<{ title?: string; time?: string }>;
}): boolean {
  const hasTitle = String(room.package_title || "").trim().length > 0;
  const hasDescription =
    String(room.package_description || "").trim().length > 0;
  const hasDetails = Array.isArray(room.package_details)
    ? room.package_details.some(
        (detail) => String(detail?.title || "").trim().length > 0,
      )
    : false;
  const hasSchedularTitle =
    String(room.event_schedular_title || "").trim().length > 0;
  const hasValidSchedular =
    filterSchedulerRowsForApi(room.event_schedular).length > 0;

  return (
    hasTitle &&
    hasDescription &&
    hasDetails &&
    hasPersistedPackageImageValue(room.package_image) &&
    hasSchedularTitle &&
    hasValidSchedular
  );
}

export function normalizeSchedulerRows(
  schedules:
    | Array<{ title?: string | null; time?: string | null } | undefined>
    | undefined
    | null,
) {
  const normalized = filterSchedulerRowsForApi(schedules);

  return normalized.length > 0 ? normalized : [{ title: "", time: "" }];
}
