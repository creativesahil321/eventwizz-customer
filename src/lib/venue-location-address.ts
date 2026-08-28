import type { VenueLocation } from "@/types/api.types";

/**
 * Best address string for prefilling event location from the header
 * location switcher (e.g. Bristol → "…Bristol…" / "Bristol, UK").
 */
export function resolveVenueLocationAddress(
  location: Pick<VenueLocation, "address" | "city" | "name"> | null | undefined,
): string {
  if (!location) return "";
  const address = location.address?.trim() ?? "";
  if (address) return address;
  const city = location.city?.trim() ?? "";
  if (city) return `${city}, UK`;
  const name = location.name?.trim() ?? "";
  return name;
}

function toFiniteCoord(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parent venue pin from location APIs.
 * Accepts latitude/longitude or common aliases (lat / long / lng).
 */
export function resolveVenueLocationCoords(
  location:
    | (Pick<VenueLocation, "latitude" | "longitude"> &
        Record<string, unknown>)
    | null
    | undefined,
): { latitude: number; longitude: number } | null {
  if (!location) return null;
  const lat = toFiniteCoord(
    location.latitude ?? location.lat ?? location.Lat,
  );
  const lng = toFiniteCoord(
    location.longitude ?? location.long ?? location.lng ?? location.Lng,
  );
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng };
}

/** Max distance from parent venue for event pin / address picks (~50km). */
export const VENUE_LOCATION_RADIUS_M = 50_000;

export type LatLngLiteral = { lat: number; lng: number };

/** Approximate bounding box around a center for map / Places strictBounds. */
export function venueAreaBoundsLiteral(
  center: LatLngLiteral,
  radiusM: number = VENUE_LOCATION_RADIUS_M,
): { north: number; south: number; east: number; west: number } {
  const latDelta = radiusM / 111_320;
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const lngDelta = radiusM / (111_320 * Math.max(cosLat, 0.2));
  return {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta,
  };
}

/** Haversine distance in metres. */
export function distanceMetersBetween(
  a: LatLngLiteral,
  b: LatLngLiteral,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinVenueArea(
  point: LatLngLiteral,
  center: LatLngLiteral | null | undefined,
  radiusM: number = VENUE_LOCATION_RADIUS_M,
): boolean {
  if (!center) return true;
  return distanceMetersBetween(point, center) <= radiusM;
}
