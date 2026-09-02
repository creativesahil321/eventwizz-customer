/** Shared browser geolocation helper — on-demand only (no auto prompt). */

export type UserCoords = { lat: number; lng: number };

export type RequestUserLocationResult =
  | { ok: true; coords: UserCoords }
  | {
      ok: false;
      permissionDenied: boolean;
      message: string;
    };

const LOCATION_CACHE_KEY = "ew_user_location";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedLocation = UserCoords & { cachedAt: number };

export type RequestUserLocationOptions = {
  /**
   * Skip the 24h localStorage cache and ask the browser again.
   * Useful when testing the permission prompt.
   */
  forcePrompt?: boolean;
};

function readCache(): UserCoords | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.cachedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number): void {
  try {
    const payload: CachedLocation = { lat, lng, cachedAt: Date.now() };
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full / unavailable — non-fatal
  }
}

/** Geolocation only works on HTTPS or localhost — not http://vendor.example.com */
export function isGeolocationSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/**
 * Asks the browser for the user's coordinates (cached 24h, same key as
 * `useUserLocation`). Call only from a user gesture (e.g. "Near Me" click).
 */
export function requestUserLocation(
  options: RequestUserLocationOptions = {},
): Promise<RequestUserLocationResult> {
  if (!options.forcePrompt) {
    const cached = readCache();
    if (cached) {
      return Promise.resolve({ ok: true, coords: cached });
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      permissionDenied: false,
      message: "Location is not supported by this browser.",
    });
  }

  // Browsers silently deny geolocation on plain HTTP custom hosts
  // (e.g. http://vendor.eventwizz.com:3000) — no permission popup appears.
  if (!isGeolocationSecureContext()) {
    return Promise.resolve({
      ok: false,
      permissionDenied: true,
      message:
        "Location needs HTTPS or localhost. Open this site via https:// or http://localhost:3000 to use Near Me.",
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        writeCache(next.lat, next.lng);
        resolve({ ok: true, coords: next });
      },
      (err) => {
        const permissionDenied =
          err.code === GeolocationPositionError.PERMISSION_DENIED;
        resolve({
          ok: false,
          permissionDenied,
          message: permissionDenied
            ? "Location access was denied. Enable it in browser settings to use Near Me."
            : "Unable to get your location. Please try again.",
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        // forcePrompt → ignore browser-cached position too
        maximumAge: options.forcePrompt ? 0 : CACHE_TTL_MS,
      },
    );
  });
}
