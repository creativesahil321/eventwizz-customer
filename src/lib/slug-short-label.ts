import { cityFromFormattedAddress } from "@/lib/city-from-formatted-address";
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

/**
 * Hero crumb city — never a street. Prefers stored city, then address parse, then slug.
 * Street-looking `city` values (commas) are treated as addresses.
 */
export function eventBreadcrumbCityLabel(options: {
  city?: string | null;
  slug?: string | null;
  address?: string | null;
}): string {
  const rawCity = options.city?.trim() ?? "";
  if (rawCity && !rawCity.includes(",")) {
    return toTitleCase(rawCity);
  }
  const address =
    options.address?.trim() || (rawCity.includes(",") ? rawCity : "");
  const fromAddress = cityFromFormattedAddress(address);
  if (fromAddress) return toTitleCase(fromAddress);
  if (options.slug?.trim()) return slugToShortLabel(options.slug);
  return "";
}
