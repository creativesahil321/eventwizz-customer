"use client";

import { useState, useEffect } from "react";
import type { CachedLocation } from "@/services/customer/dashboard/type";

const LOCATION_CACHE_KEY = "ew_user_location";
/** Re-use cached coordinates for 24 hours before re-prompting */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface UserLocationState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  permissionDenied: boolean;
  error: string | null;
}

function readCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedLocation = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number): void {
  try {
    const payload: CachedLocation = { lat, lng, cachedAt: Date.now() };
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage might be full or unavailable — non-fatal
  }
}

/**
 * Detects the user's geolocation with localStorage caching (24h TTL).
 * Permission is only requested once per TTL window.
 */
export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>({
    lat: null,
    lng: null,
    loading: true,
    permissionDenied: false,
    error: null,
  });

  useEffect(() => {
    // 1. Try cache first — avoids redundant permission prompts
    const cached = readCache();
    if (cached) {
      setState({
        lat: cached.lat,
        lng: cached.lng,
        loading: false,
        permissionDenied: false,
        error: null,
      });
      return;
    }

    // 2. Geolocation not supported
    if (!navigator?.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported by your browser.",
      }));
      return;
    }

    // 3. Request precise location
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        writeCache(lat, lng);
        setState({
          lat,
          lng,
          loading: false,
          permissionDenied: false,
          error: null,
        });
      },
      (err) => {
        const permissionDenied = err.code === GeolocationPositionError.PERMISSION_DENIED;
        setState({
          lat: null,
          lng: null,
          loading: false,
          permissionDenied,
          error: permissionDenied
            ? "Location access was denied. Enable it in browser settings to see nearby events."
            : "Unable to retrieve your location. Please try again.",
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: CACHE_TTL_MS }
    );
  }, []);

  return state;
}
