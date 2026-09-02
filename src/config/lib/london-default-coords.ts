/**
 * Known placeholder pin used when events were created without real coordinates
 * (Trafalgar Square / central London). Prefer geocoding `event_address` instead.
 */
export const LONDON_DEFAULT_LAT = 51.5074;
export const LONDON_DEFAULT_LNG = -0.1278;

const COORD_EPSILON = 0.00015;

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** True when lat/lng match the platform London placeholder pin. */
export function isLondonDefaultPin(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): boolean {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat == null || lng == null) return false;
  return (
    Math.abs(lat - LONDON_DEFAULT_LAT) < COORD_EPSILON &&
    Math.abs(lng - LONDON_DEFAULT_LNG) < COORD_EPSILON
  );
}
