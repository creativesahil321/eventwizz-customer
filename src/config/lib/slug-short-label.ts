/** Short label from a location slug for “Back to …” links (first segment, title case). */
export function slugToShortLabel(slug: string): string {
  if (!slug?.trim()) return "Events";
  const first = slug.split("-")[0]?.trim() || slug;
  if (!first) return "Events";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
