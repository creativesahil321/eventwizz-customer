import { isLondonDefaultPin } from "./london-default-coords";

export type EventLocationSource = {
  event_address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  long?: unknown;
};

/** Public EventPayload pin — `event.event_address || event.address` and `event.lat` / `event.long` only. */
export type PublicEventMapSource = {
  event_address?: unknown;
  address?: unknown;
  lat?: unknown;
  long?: unknown;
};

export type ResolvedEventLocation = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  label: string;
};

const DEFAULT_EVENT_LOCATION_LABEL_LENGTH = 44;

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readAddress(source: EventLocationSource): string {
  return readTrimmedString(source.event_address);
}

function readCoordinate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const coordinate =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(coordinate) ? coordinate : null;
}

function readCoordinatePair(
  source: EventLocationSource,
): { latitude: number; longitude: number } | null {
  const latitude = readCoordinate(source.latitude ?? source.lat);
  const longitude = readCoordinate(source.longitude ?? source.long);
  return latitude == null || longitude == null
    ? null
    : { latitude, longitude };
}

export function formatEventLocationLabel(
  address: string,
  maxLength = DEFAULT_EVENT_LOCATION_LABEL_LENGTH,
): string {
  const normalized = address.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two WGS84 points. */
export function kmBetweenCoords(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Stored pins farther than this from a geocoded address are treated as stale
 * (e.g. venue default coords left on an event with a different address).
 */
export const MAP_PIN_ADDRESS_MISMATCH_KM = 50;

export function shouldReplaceMapPinWithGeocode(
  stored: { latitude: number; longitude: number },
  geocoded: { latitude: number; longitude: number },
  thresholdKm = MAP_PIN_ADDRESS_MISMATCH_KM,
): boolean {
  return kmBetweenCoords(stored, geocoded) > thresholdKm;
}

/**
 * Resolves only event-specific sources. Callers must not pass parent venue data.
 * Address and coordinates retain source priority independently so a legacy
 * event can still use its address when only its newer coordinate fields exist.
 *
 * Vendor form / step payloads only. Public EventPayload consumers must use
 * `resolvePublicEventMapLocation` (never room `event_address` / lat / long).
 */
export function resolveEventLocation(
  ...sources: Array<EventLocationSource | null | undefined>
): ResolvedEventLocation {
  const candidates = sources.filter(
    (source): source is EventLocationSource => source != null,
  );
  const address =
    candidates.map(readAddress).find((value) => value.length > 0) ?? "";
  const coordinates =
    candidates.map(readCoordinatePair).find((value) => value != null) ?? null;

  return {
    address,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    label: formatEventLocationLabel(address),
  };
}

/** True when the public event payload includes a usable map pin (not the London placeholder). */
export function hasPublicEventMapCoordinates(
  event: PublicEventMapSource | null | undefined,
): boolean {
  if (!event) return false;
  const latitude = readCoordinate(event.lat);
  const longitude = readCoordinate(event.long);
  if (latitude == null || longitude == null) return false;
  return !isLondonDefaultPin(latitude, longitude);
}

/**
 * Shared map target for GET /domain/{domain}/events/{slug} `data` and
 * site-essentials `data.event`. Never reads `rooms.*` or `locations[]`.
 */
export function resolvePublicEventMapLocation(
  event: PublicEventMapSource | null | undefined,
): ResolvedEventLocation {
  const address =
    readTrimmedString(event?.event_address) ||
    readTrimmedString(event?.address);
  if (!hasPublicEventMapCoordinates(event)) {
    return {
      address,
      latitude: null,
      longitude: null,
      label: formatEventLocationLabel(address),
    };
  }

  return {
    address,
    latitude: readCoordinate(event?.lat),
    longitude: readCoordinate(event?.long),
    label: formatEventLocationLabel(address),
  };
}

export function buildEventDirectionsUrl(
  location: Pick<
    ResolvedEventLocation,
    "address" | "latitude" | "longitude"
  >,
): string | null {
  const hasCoordinates =
    location.latitude != null && location.longitude != null;
  const destination = hasCoordinates
    ? `${location.latitude},${location.longitude}`
    : location.address.trim();

  if (!destination) return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}
