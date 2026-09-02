import type { LocationData } from "@/types/theme.types";
import type { VenueLocation } from "@/types/api.types";

export type PreviewLocationItem = {
  id?: number;
  slug: string;
  city: string;
  total_events?: number;
};

export function previewLocationItemsToLocationData(
  locations: PreviewLocationItem[],
): LocationData[] {
  return locations.map((loc) => ({
    id: loc.id,
    slug: loc.slug,
    city: loc.city,
    total_events: loc.total_events,
  }));
}

/** Main landing grid: form/API locations first, then venue/session fallbacks. */
export function resolveMainLandingPreviewLocations(
  formLocations: LocationData[] | undefined,
  fallback: PreviewLocationItem[],
): LocationData[] {
  if (formLocations?.length) return formLocations;
  return previewLocationItemsToLocationData(fallback);
}

export function toPreviewLocationList(
  locations: LocationData[] | undefined,
): PreviewLocationItem[] {
  if (!locations?.length) return [];

  return locations
    .filter((loc) => typeof loc.slug === "string" && loc.slug.trim().length > 0)
    .map((loc) => ({
      id: loc.id,
      slug: loc.slug.trim(),
      city: loc.city?.trim() || loc.slug,
      total_events:
        typeof loc.total_events === "number" ? loc.total_events : undefined,
    }));
}

/** When site-essentials `locations` is empty, use vendor venue locations API. */
export function venueLocationsToPreviewList(
  locations: VenueLocation[] | undefined,
): PreviewLocationItem[] {
  if (!locations?.length) return [];

  return locations
    .filter((loc) => typeof loc.slug === "string" && loc.slug.trim().length > 0)
    .map((loc) => ({
      id: loc.id,
      slug: loc.slug.trim(),
      city: (loc.city?.trim() || loc.name?.trim() || loc.slug).trim(),
    }));
}

export type SessionLocationFallback = {
  vendor_location_id?: number | string | null;
  slug?: string | null;
  name?: string | null;
};

/** Last resort when site-essentials and locations API return no rows. */
export function sessionLocationToPreviewList(
  session: SessionLocationFallback | undefined,
): PreviewLocationItem[] {
  const slug = session?.slug?.trim();
  if (!slug) return [];

  const idRaw = session?.vendor_location_id;
  const id =
    idRaw != null && idRaw !== "" && idRaw !== "null"
      ? Number(idRaw)
      : undefined;

  return [
    {
      id: Number.isFinite(id) ? id : undefined,
      slug,
      city: session?.name?.trim() || slug,
    },
  ];
}

export function resolvePreviewLocationList(
  siteEssentialsLocations: LocationData[] | undefined,
  venueLocations: VenueLocation[] | undefined,
  sessionFallback?: SessionLocationFallback,
): PreviewLocationItem[] {
  const fromEssentials = toPreviewLocationList(siteEssentialsLocations);
  if (fromEssentials.length > 0) return fromEssentials;

  const fromVenue = venueLocationsToPreviewList(venueLocations);
  if (fromVenue.length > 0) return fromVenue;

  return sessionLocationToPreviewList(sessionFallback);
}

/** Match `useHasMultipleLocations`: site-essentials `locations` wins over venue list. */
export function resolvePreviewLocationCount(
  siteEssentialsLocations: LocationData[] | undefined,
  fallbackCount: number,
): number {
  const essentialsCount = siteEssentialsLocations?.length ?? 0;
  if (essentialsCount > 0) return essentialsCount;
  return fallbackCount;
}

export function previewLocationSlugsKey(
  locations: PreviewLocationItem[],
): string {
  return locations.map((loc) => loc.slug).join("|");
}

export function allPreviewLocationsApproved(
  locations: PreviewLocationItem[],
  approvedSlugs: string[],
): boolean {
  if (locations.length === 0) return false;
  return locations.every((loc) => approvedSlugs.includes(loc.slug));
}
