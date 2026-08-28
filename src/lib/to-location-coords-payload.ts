/**
 * Shared lat/lng fields for venue-location create/update payloads.
 * BE accepts both `latitude`/`longitude` and `lat`/`long`.
 */
export function toLocationCoordsPayload(
  latitude?: number | string | null,
  longitude?: number | string | null,
): {
  latitude: number;
  longitude: number;
  lat: number;
  long: number;
} | null {
  if (latitude == null || latitude === "" || longitude == null || longitude === "") {
    return null;
  }
  const lat = typeof latitude === "number" ? latitude : Number.parseFloat(String(latitude));
  const lng =
    typeof longitude === "number" ? longitude : Number.parseFloat(String(longitude));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng, lat, long: lng };
}
