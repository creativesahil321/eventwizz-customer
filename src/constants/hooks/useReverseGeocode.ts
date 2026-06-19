"use client";

import { useState, useEffect } from "react";

const GEOCODE_CACHE_KEY_PREFIX = "ew_geocode_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Round to ~1.1km grid to avoid too many cache keys */
function roundCoord(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

interface CachedGeocode {
  city: string | null;
  country: string | null;
  cachedAt: number;
}

interface ReverseGeocodeState {
  city: string | null;
  country: string | null;
  loading: boolean;
  error: string | null;
}

function cacheKey(lat: number, lng: number): string {
  return `${GEOCODE_CACHE_KEY_PREFIX}${roundCoord(lat)}_${roundCoord(lng)}`;
}

function readGeocodeCache(lat: number, lng: number): CachedGeocode | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const parsed: CachedGeocode = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(lat, lng));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeGeocodeCache(
  lat: number,
  lng: number,
  city: string | null,
  country: string | null
): void {
  try {
    localStorage.setItem(
      cacheKey(lat, lng),
      JSON.stringify({
        city,
        country,
        cachedAt: Date.now(),
      } as CachedGeocode)
    );
  } catch {
    // ignore
  }
}

/**
 * Reverse geocode lat/lng to nearest city and country using OSM Nominatim (no API key).
 * Result is cached in localStorage by rounded coordinates (24h TTL).
 */
export function useReverseGeocode(
  lat: number | null,
  lng: number | null
): ReverseGeocodeState {
  const [state, setState] = useState<ReverseGeocodeState>({
    city: null,
    country: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (lat === null || lng === null) {
      setState({ city: null, country: null, loading: false, error: null });
      return;
    }

    const cached = readGeocodeCache(lat, lng);
    if (cached) {
      setState({
        city: cached.city,
        country: cached.country,
        loading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const controller = new AbortController();
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");

    fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "EventWizz/1.0 (https://eventwizz.com; contact@eventwizz.com)",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Geocode request failed");
        return res.json();
      })
      .then((data: { address?: Record<string, string> }) => {
        const addr = data?.address ?? {};
        const city =
          addr.city ??
          addr.town ??
          addr.village ??
          addr.municipality ??
          addr.county ??
          null;
        const country = addr.country ?? null;
        writeGeocodeCache(lat, lng, city, country);
        setState({ city, country, loading: false, error: null });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({
          city: null,
          country: null,
          loading: false,
          error: "Could not resolve location name.",
        });
      });

    return () => controller.abort();
  }, [lat, lng]);

  return state;
}
