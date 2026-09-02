import { toTitleCase } from "@/lib/utils";

/**
 * Human label from a location slug for “Back to …” and breadcrumbs.
 * `great-yarmouth` → `Great Yarmouth`.
 */
export function slugToShortLabel(slug: string): string {
  if (!slug?.trim()) return "Events";
  const label = toTitleCase(slug.replace(/[-_]+/g, " "));
  return label || "Events";
}

/** Title-case a venue city from the API, or fall back to the slug label. */
export function locationDisplayName(
  city: string | null | undefined,
  slug?: string | null,
): string {
  const fromCity = city?.trim();
  if (fromCity) return toTitleCase(fromCity);
  if (slug?.trim()) return slugToShortLabel(slug);
  return "Events";
}
