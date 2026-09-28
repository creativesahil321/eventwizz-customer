import { Loader } from "@googlemaps/js-api-loader";
import { env } from "@/env";

let loadPromise: Promise<void> | null = null;

/**
 * The single way to load the Google Maps JS API. Every map, address search and
 * place picker awaits this, so the API is injected exactly once per page.
 *
 * Uses the same `Loader` options as the Places inputs (`apiKey` + `places`), so
 * `@googlemaps/js-api-loader` returns its shared instance. Hand-rolled
 * `<script>` tags raced that loader and loaded Maps twice ("Geocoder is not a
 * constructor", "Loader.provide not called"), leaving maps blank.
 */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (!loadPromise) {
    loadPromise = new Loader({
      apiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      libraries: ["places"],
    })
      .load()
      .then(() => undefined)
      .catch((error: unknown) => {
        // Allow a retry (e.g. flaky network) on the next call.
        loadPromise = null;
        throw error;
      });
  }
  return loadPromise;
}
