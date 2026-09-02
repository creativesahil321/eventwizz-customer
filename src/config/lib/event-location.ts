export type EventLocationSource = {
  event_address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
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

function readAddress(source: EventLocationSource): string {
  return typeof source.event_address === "string"
    ? source.event_address.trim()
    : "";
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

/**
 * Resolves only event-specific sources. Callers must not pass parent venue data.
 * Address and coordinates retain source priority independently so a legacy
 * event can still use its address when only its newer coordinate fields exist.
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
