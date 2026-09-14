export type MapLatLng = { lat: number; lng: number };

/** Country-level UK centroids — never treat these as a confirmed venue pin. */
const UK_FALLBACK_PINS: MapLatLng[] = [
  { lat: 54.7024, lng: -3.2766 },
  { lat: 55.378005, lng: -3.435973 },
];

export function isFiniteLatLng(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export function normalizeMapAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

export function coordsAlreadyApplied(
  next: MapLatLng,
  last: MapLatLng | null,
  epsilon = 1e-5,
): boolean {
  if (!last) return false;
  return (
    Math.abs(last.lat - next.lat) < epsilon &&
    Math.abs(last.lng - next.lng) < epsilon
  );
}

export function isCoarseUkFallbackPin(lat: number, lng: number): boolean {
  return UK_FALLBACK_PINS.some(
    (pin) =>
      Math.abs(pin.lat - lat) < 0.08 && Math.abs(pin.lng - lng) < 0.08,
  );
}

export function isCountryOnlyAddress(address: string): boolean {
  const next = normalizeMapAddress(address).replace(/,+$/g, "");
  return (
    next === "united kingdom" ||
    next === "uk" ||
    next === "great britain" ||
    next === "britain" ||
    next === "england" ||
    next === "scotland" ||
    next === "wales" ||
    next === "northern ireland"
  );
}

export function isUnusableMapPin(
  lat: number,
  lng: number,
  types?: readonly string[] | null,
  formattedAddress?: string | null,
): boolean {
  if (isCoarseUkFallbackPin(lat, lng)) return true;
  if (types?.includes("country")) return true;
  return Boolean(formattedAddress && isCountryOnlyAddress(formattedAddress));
}

/** Prefer new autocomplete coords over a stale pin. Never apply a UK centroid. */
export function shouldApplyMapCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
  last: MapLatLng | null,
): MapLatLng | null {
  if (!isFiniteLatLng(lat, lng)) return null;
  if (isCoarseUkFallbackPin(lat, lng)) return null;
  const next = { lat, lng };
  return coordsAlreadyApplied(next, last) ? null : next;
}

/**
 * Geocode whenever the address text changes. Stale parent coords must not
 * block a new street from moving the pin and rewriting lat/lng.
 */
export function shouldGeocodeMapAddress(
  address: string,
  lastAppliedAddress: string,
): boolean {
  const next = normalizeMapAddress(address);
  if (!next || isCountryOnlyAddress(address)) return false;
  return next !== normalizeMapAddress(lastAppliedAddress);
}

/**
 * Keep geocoding while the pin is still the UK country blob, even if we
 * already recorded this address text. That is the Salisbury → Saffron Walden
 * failure: lastAppliedAddress updates, the pin does not.
 */
export function shouldRefreshMapForAddress(input: {
  address: string;
  lastAppliedAddress: string;
  pinLat?: number | null;
  pinLng?: number | null;
}): boolean {
  const { address, lastAppliedAddress, pinLat, pinLng } = input;
  if (!normalizeMapAddress(address) || isCountryOnlyAddress(address)) {
    return false;
  }
  if (isFiniteLatLng(pinLat, pinLng) && isCoarseUkFallbackPin(pinLat, pinLng)) {
    return true;
  }
  return shouldGeocodeMapAddress(address, lastAppliedAddress);
}
