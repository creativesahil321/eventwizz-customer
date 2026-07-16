"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { env } from "@/env";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import {
  getAnchorColor,
  pickReadableForeground,
  relativeLuminance,
} from "@/lib/color-contrast";

interface LocationMapProps {
  locations: (VenueLocation | LocationData)[];
  onSelect: (slug: string) => void;
}

interface LocationMarker {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  eventCount: number;
  needsGeocoding?: boolean;
  address?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type MapVisualTokens = {
  primary: string;
  secondary: string;
  isDarkMap: boolean;
};

const DEFAULT_MAP_TOKENS: MapVisualTokens = {
  primary: "#0F172A",
  secondary: "#64748B",
  isDarkMap: false,
};

export default function GoogleLocationMap({
  locations,
  onSelect,
}: LocationMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const mapInitGenerationRef = useRef(0);
  const mapVisualTokensRef = useRef<MapVisualTokens>(DEFAULT_MAP_TOKENS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapVisualTokens = useMemo((): MapVisualTokens => {
    const bg = getAnchorColor(theme?.colors?.background ?? "#F8FAFC");
    return {
      primary: getAnchorColor(theme?.colors?.primary ?? "#0F172A"),
      secondary: getAnchorColor(theme?.colors?.secondary ?? "#64748B"),
      isDarkMap: relativeLuminance(bg) < 0.42,
    };
  }, [
    theme?.colors?.background,
    theme?.colors?.primary,
    theme?.colors?.secondary,
  ]);

  mapVisualTokensRef.current = mapVisualTokens;

  const headerForeground = pickReadableForeground(mapVisualTokens.primary);
  const headerMuted =
    headerForeground === "#F8FAFC"
      ? "color-mix(in srgb, #f8fafc 72%, transparent)"
      : "color-mix(in srgb, #0f172a 55%, transparent)";

  // Convert all locations to markers - ALL will be geocoded (API doesn't provide lat/lng)
  const locationMarkers: LocationMarker[] = useMemo(() => {
    return locations.map((location) => {
      const name =
        "city" in location && location.city
          ? location.city
          : "name" in location && location.name
          ? location.name
          : "Unknown";

      const slug = "slug" in location && location.slug ? location.slug : "";

      // Build address for geocoding (prefer API address; fall back to city/name)
      const rawAddress =
        "address" in location && typeof location.address === "string"
          ? location.address.trim()
          : "";
      const address =
        rawAddress ||
        (name.toLowerCase().includes("uk") ? name : `${name}, UK`);

      // All locations need geocoding - use default UK center as placeholder
      return {
        name,
        slug,
        lat: 53.0, // Default UK center - will be replaced by geocoding
        lng: -2.0,
        eventCount: 0,
        needsGeocoding: true, // All locations need geocoding
        address: address,
      };
    });
  }, [locations]);

  const initializeMap = useCallback(async (initGeneration: number) => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      if (typeof google.maps.importLibrary !== "function") {
        throw new Error(
          "Google Maps API does not support dynamic library loading"
        );
      }
      const { AdvancedMarkerElement } =
        (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

      if (!AdvancedMarkerElement) {
        throw new Error("AdvancedMarkerElement failed to load");
      }

      if (mapInitGenerationRef.current !== initGeneration || !mapRef.current) {
        return;
      }

      // Calculate map center from actual location data
      let mapCenter = { lat: 53.0, lng: -2.0 }; // Default: Center of UK
      let zoom = 6;

      if (locationMarkers.length > 0) {
        // Calculate average center from all markers
        const avgLat =
          locationMarkers.reduce((sum, m) => sum + m.lat, 0) /
          locationMarkers.length;
        const avgLng =
          locationMarkers.reduce((sum, m) => sum + m.lng, 0) /
          locationMarkers.length;
        mapCenter = { lat: avgLat, lng: avgLng };

        // Adjust zoom based on number of locations
        if (locationMarkers.length === 1) {
          zoom = 12; // Single location - zoom in
        } else if (locationMarkers.length <= 3) {
          zoom = 8; // Few locations - medium zoom
        } else {
          zoom = 6; // Many locations - zoom out
        }
      }

      const { primary, secondary, isDarkMap } = mapVisualTokensRef.current;
      const mapColorScheme = isDarkMap
        ? google.maps.ColorScheme.DARK
        : google.maps.ColorScheme.LIGHT;

      // mapId is required for Advanced Markers; use colorScheme for light/dark tiles (works with mapId).
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        mapId: "DEMO_MAP_ID",
        colorScheme: mapColorScheme,
        disableDefaultUI: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER,
        },
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT,
        },
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.TOP_LEFT,
          mapTypeIds: [
            google.maps.MapTypeId.ROADMAP,
            google.maps.MapTypeId.SATELLITE,
          ],
        },
        streetViewControl: false,
      });

      mapInstanceRef.current = mapInstance;

      // Clear existing markers
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];

      // Initialize geocoder for locations without coordinates
      const geocoder = new google.maps.Geocoder();
      const markersToGeocode: LocationMarker[] = [];

      const pinGlyphColor = pickReadableForeground(primary);

      // Create markers for each location
      locationMarkers.forEach((location) => {
        const markerDiv = document.createElement("div");
        markerDiv.className = "custom-location-marker";
        markerDiv.style.setProperty("--m-primary", primary);
        markerDiv.style.setProperty("--m-secondary", secondary);
        markerDiv.style.setProperty("--m-pin-glyph", pinGlyphColor);
        markerDiv.style.setProperty("--m-label-fg", pinGlyphColor);

        const safeName = escapeHtml(location.name);
        markerDiv.innerHTML = `
          <div class="marker-container" style="
            position: relative;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <div class="marker-pin" style="
              background: linear-gradient(135deg, var(--m-primary) 0%, var(--m-secondary) 100%);
              width: 48px;
              height: 48px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid color-mix(in srgb, var(--m-pin-glyph) 35%, white);
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px color-mix(in srgb, var(--m-pin-glyph) 12%, transparent);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.25s ease, filter 0.25s ease, box-shadow 0.25s ease;
            ">
              <div class="marker-glyph" style="
                transform: rotate(45deg);
                color: var(--m-pin-glyph);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
              ">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
            </div>
            <div class="marker-label" style="
              position: absolute;
              top: 60px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, var(--m-primary) 0%, var(--m-secondary) 100%);
              color: var(--m-label-fg);
              padding: 8px 16px;
              border-radius: 10px;
              white-space: nowrap;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.02em;
              box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22), 0 0 0 1px color-mix(in srgb, var(--m-label-fg) 14%, transparent) inset;
              border: 1px solid color-mix(in srgb, var(--m-label-fg) 22%, transparent);
              pointer-events: none;
              opacity: 0;
              transition: opacity 0.22s ease, transform 0.22s ease;
            ">${safeName}</div>
          </div>
        `;

        markerDiv.addEventListener("mouseenter", () => {
          const pin = markerDiv.querySelector(".marker-pin") as HTMLElement;
          const label = markerDiv.querySelector(".marker-label") as HTMLElement;
          if (pin) {
            pin.style.transform = "rotate(-45deg) scale(1.12)";
            pin.style.filter = "brightness(1.08) saturate(1.12)";
            pin.style.boxShadow =
              "0 14px 28px rgba(0, 0, 0, 0.32), 0 0 0 1px color-mix(in srgb, var(--m-pin-glyph) 18%, transparent)";
          }
          if (label) {
            label.style.opacity = "1";
            label.style.transform = "translateX(-50%) translateY(-4px)";
          }
        });

        markerDiv.addEventListener("mouseleave", () => {
          const pin = markerDiv.querySelector(".marker-pin") as HTMLElement;
          const label = markerDiv.querySelector(".marker-label") as HTMLElement;
          if (pin) {
            pin.style.transform = "rotate(-45deg) scale(1)";
            pin.style.filter = "";
            pin.style.boxShadow =
              "0 8px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px color-mix(in srgb, var(--m-pin-glyph) 12%, transparent)";
          }
          if (label) {
            label.style.opacity = "0";
            label.style.transform = "translateX(-50%) translateY(0)";
          }
        });

        const marker = new AdvancedMarkerElement({
          map: mapInstance,
          position: { lat: location.lat, lng: location.lng },
          content: markerDiv,
          title: location.name,
        });

        // Add click handler
        markerDiv.addEventListener("click", () => {
          onSelect(location.slug);

          const pin = markerDiv.querySelector(".marker-pin") as HTMLElement;
          if (pin) {
            pin.style.filter = "brightness(1.15) hue-rotate(-12deg)";
            pin.style.boxShadow =
              "0 0 0 3px color-mix(in srgb, var(--m-primary) 45%, transparent), 0 12px 28px rgba(0,0,0,0.3)";
            setTimeout(() => {
              pin.style.filter = "";
              pin.style.boxShadow =
                "0 8px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px color-mix(in srgb, var(--m-pin-glyph) 12%, transparent)";
            }, 650);
          }
        });

        markersRef.current.push(marker);

        // All locations need geocoding - add to queue
        if (location.address) {
          markersToGeocode.push(location);
        }
      });

      // Geocode ALL locations (API doesn't provide lat/lng)
      if (markersToGeocode.length > 0) {
        let geocodedCount = 0;
        const bounds = new google.maps.LatLngBounds();
        let hasValidLocation = false;

        markersToGeocode.forEach((location, index) => {
          // Add delay to avoid rate limiting
          setTimeout(() => {
            geocoder.geocode(
              {
                address: location.address || location.name + ", UK",
                region: "GB", // Restrict to UK
              },
              (results, status) => {
                if (
                  status === "OK" &&
                  results &&
                  results[0] &&
                  results[0].geometry
                ) {
                  const newPosition = results[0].geometry.location;
                  const newLat = newPosition.lat();
                  const newLng = newPosition.lng();

                  // Find and update the corresponding marker
                  const markerIndex = locationMarkers.findIndex(
                    (m) => m.slug === location.slug
                  );
                  if (markerIndex !== -1 && markersRef.current[markerIndex]) {
                    markersRef.current[markerIndex].position = {
                      lat: newLat,
                      lng: newLng,
                    };
                    // Extend bounds to include this marker
                    bounds.extend(newPosition);
                    hasValidLocation = true;
                  }
                } else {
                  // If geocoding fails, log but don't show error
                  console.warn(
                    `Failed to geocode location: ${location.name}`,
                    status
                  );
                }

                geocodedCount++;
                // Hide loading when all geocoding is done and fit bounds to show all locations
                if (geocodedCount === markersToGeocode.length) {
                  if (mapInitGenerationRef.current !== initGeneration) return;
                  setIsLoading(false);

                  // Auto-fit map to show all markers with proper padding
                  if (hasValidLocation && mapInstance) {
                    mapInstance.fitBounds(bounds, {
                      top: 100,
                      bottom: 100,
                      left: 100,
                      right: 100,
                    });

                    // Add a listener to limit max zoom after fitBounds
                    google.maps.event.addListenerOnce(
                      mapInstance,
                      "bounds_changed",
                      () => {
                        const currentZoom = mapInstance.getZoom();
                        // Prevent zooming in too close for single location
                        if (currentZoom && currentZoom > 12) {
                          mapInstance.setZoom(12);
                        }
                      }
                    );
                  }
                }
              }
            );
          }, index * 200); // 200ms delay between each geocode request
        });
      } else {
        if (mapInitGenerationRef.current === initGeneration) {
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error("Error initializing map:", err);
      if (mapInitGenerationRef.current !== initGeneration) return;
      setError("Failed to load map. Please refresh the page.");
      setIsLoading(false);
    }
  }, [locationMarkers, onSelect]);

  // Initialize Google Maps
  useEffect(() => {
    const initGeneration = ++mapInitGenerationRef.current;
    let removeExistingScriptListener: (() => void) | undefined;

    const loadGoogleMaps = () => {
      const existingScript = document.querySelector(
        `script[src*="maps.googleapis.com"]`
      );

      if (window.google && window.google.maps) {
        void initializeMap(initGeneration);
      } else if (existingScript) {
        const handleLoad = () => {
          void initializeMap(initGeneration);
        };
        existingScript.addEventListener("load", handleLoad);
        removeExistingScriptListener = () => {
          existingScript.removeEventListener("load", handleLoad);
        };
      } else {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          void initializeMap(initGeneration);
        };
        script.onerror = () => {
          if (mapInitGenerationRef.current !== initGeneration) return;
          setError("Failed to load Google Maps. Please check your API key.");
          setIsLoading(false);
        };
        document.head.appendChild(script);
      }
    };

    loadGoogleMaps();

    return () => {
      removeExistingScriptListener?.();
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [initializeMap]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === "undefined" || !google.maps?.ColorScheme) {
      return;
    }
    const { primary, secondary, isDarkMap } = mapVisualTokens;
    map.setOptions({
      colorScheme: isDarkMap
        ? google.maps.ColorScheme.DARK
        : google.maps.ColorScheme.LIGHT,
    });

    markersRef.current.forEach((marker) => {
      const el = marker.content as HTMLElement | null;
      if (!el?.classList.contains("custom-location-marker")) return;
      el.style.setProperty("--m-primary", primary);
      el.style.setProperty("--m-secondary", secondary);
      el.style.setProperty(
        "--m-pin-glyph",
        pickReadableForeground(primary)
      );
      el.style.setProperty(
        "--m-label-fg",
        pickReadableForeground(primary)
      );
    });
  }, [mapVisualTokens]);

  return (
    <div className="relative w-full">
      <motion.div
        className="rounded-2xl border overflow-hidden shadow-xl ring-1 ring-black/5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          minHeight: "700px",
          backgroundColor: "var(--color-surface, #ffffff)",
          borderColor:
            "color-mix(in srgb, var(--color-primary, #0f172a) 14%, transparent)",
        }}
      >
        <div
          className="py-6 px-6 sm:px-8 text-center border-b"
          style={{
            background: `linear-gradient(120deg, ${mapVisualTokens.primary} 0%, ${mapVisualTokens.secondary} 100%)`,
            borderColor:
              "color-mix(in srgb, var(--color-primary-foreground, #f8fafc) 12%, transparent)",
          }}
        >
          <h2
            className="text-2xl sm:text-3xl font-extrabold tracking-tight sm:tracking-wide drop-shadow-sm"
            style={{
              color: headerForeground,
              fontFamily: "var(--font-heading, inherit)",
            }}
          >
            Available Locations
          </h2>
          <p
            className="text-sm mt-2 font-medium max-w-lg mx-auto leading-relaxed"
            style={{ color: headerMuted }}
          >
            Tap a pin to open that location&rsquo;s events. Drag and zoom the
            map as usual.
          </p>
        </div>

        <div className="relative">
          <div
            ref={mapRef}
            className="w-full"
            style={{
              height: "600px",
              backgroundColor: "var(--color-background, #f8fafc)",
            }}
            aria-busy={isLoading}
            aria-label="Vendor locations map"
          />

          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-surface, #ffffff) 88%, transparent)",
              }}
            >
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${mapVisualTokens.primary} 18%, white), color-mix(in srgb, ${mapVisualTokens.secondary} 12%, white))`,
                    color: mapVisualTokens.primary,
                  }}
                >
                  <MapPin className="h-7 w-7" strokeWidth={2.25} />
                </div>
                <div
                  className="h-10 w-10 rounded-full border-2 border-b-transparent animate-spin"
                  style={{
                    borderColor: `color-mix(in srgb, ${mapVisualTokens.primary} 55%, transparent)`,
                    borderBottomColor: "transparent",
                  }}
                />
                <span
                  className="text-base font-medium"
                  style={{ color: "var(--color-text, #0f172a)" }}
                >
                  Preparing your map&hellip;
                </span>
                <span
                  className="text-sm max-w-xs"
                  style={{ color: "var(--color-text-dimmed, #64748b)" }}
                >
                  Resolving addresses in the UK
                </span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="absolute inset-0 flex items-center justify-center p-6"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-surface, #ffffff) 92%, transparent)",
              }}
            >
              <div
                className="text-center p-8 rounded-xl shadow-lg max-w-md border"
                style={{
                  backgroundColor: "var(--color-surface, #ffffff)",
                  borderColor:
                    "color-mix(in srgb, var(--color-primary, #0f172a) 10%, transparent)",
                }}
              >
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, #ef4444 12%, var(--color-surface, #fff))",
                  }}
                  aria-hidden
                >
                  ⚠️
                </div>
                <p
                  className="text-lg font-semibold mb-4"
                  style={{ color: "var(--color-text, #0f172a)" }}
                >
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg px-6 py-3 font-medium text-white transition-opacity hover:opacity-95"
                  style={{ backgroundColor: mapVisualTokens.primary }}
                >
                  Reload page
                </button>
              </div>
            </div>
          )}
        </div>

        {!isLoading && !error && (
          <div
            className="py-4 px-6 sm:px-8 border-t"
            style={{
              backgroundColor: "var(--color-background, #f8fafc)",
              borderColor:
                "color-mix(in srgb, var(--color-primary, #0f172a) 8%, transparent)",
            }}
          >
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-sm"
              style={{ color: "var(--color-text-dimmed, #64748b)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: mapVisualTokens.primary }}
                />
                <span
                  className="font-semibold"
                  style={{ color: "var(--color-text, #0f172a)" }}
                >
                  {locationMarkers.length} location
                  {locationMarkers.length !== 1 ? "s" : ""} on the map
                </span>
              </div>
              <span className="hidden sm:inline opacity-40">|</span>
              <span className="text-center sm:text-left">
                Pins use your site colors; map mode follows your background
                brightness.
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
