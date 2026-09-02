/**
 * Shared lat/lng fields for venue-location create/update payloads.
 * BE accepts both `latitude`/`longitude` and `lat`/`long`.
 */
export function parseOptionalCoordinate(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const coordinate =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

export function toLocationCoordsPayload(
  latitude?: number | string | null,
  longitude?: number | string | null,
): {
  latitude: number;
  longitude: number;
  lat: number;
  long: number;
} | null {
  const lat = parseOptionalCoordinate(latitude);
  const lng = parseOptionalCoordinate(longitude);
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng, lat, long: lng };
}

export function hasValidLocationCoordinates(
  latitude?: unknown,
  longitude?: unknown,
): boolean {
  return toLocationCoordsPayload(latitude, longitude) != null;
}

export const LOCATION_COORDINATES_REQUIRED_MESSAGE =
  "Select the address from Google suggestions so we can save latitude and longitude.";
