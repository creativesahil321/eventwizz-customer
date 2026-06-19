import { VenueLocation } from "@/types/api.types";

/** Minimal location fields kept in the JWT to avoid cookie size limits (4096 bytes). */
export type SessionVenueLocation = Pick<
  VenueLocation,
  "id" | "name" | "slug" | "city" | "is_default"
>;

export function slimVenueLocationForSession(
  location: VenueLocation | undefined | null,
): SessionVenueLocation | undefined {
  if (!location?.id) return undefined;

  return {
    id: location.id,
    name: location.name,
    slug: location.slug,
    city: location.city,
    is_default: Boolean(location.is_default),
  };
}

export function slimVenueLocationsForSession(
  locations: VenueLocation[] | undefined | null,
): SessionVenueLocation[] | undefined {
  if (!locations?.length) return undefined;

  return locations
    .map(slimVenueLocationForSession)
    .filter((loc): loc is SessionVenueLocation => loc !== undefined);
}

export function resolveDefaultVenueLocation(
  locations: SessionVenueLocation[] | undefined,
  explicitDefault?: SessionVenueLocation,
): SessionVenueLocation | undefined {
  if (explicitDefault) return explicitDefault;
  return locations?.find((loc) => loc.is_default) ?? locations?.[0];
}
