/// <reference types="google.maps" />
"use client";

import { loadGoogleMaps as loadGoogleMapsApi } from "@/lib/load-google-maps";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion } from "framer-motion";
import { LayoutGrid, Maximize2 } from "lucide-react";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import {
  getAnchorColor,
  pickReadableForeground,
  relativeLuminance,
} from "@/lib/color-contrast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LocationMapProps {
  locations: (VenueLocation | LocationData)[];
  onSelect: (slug: string) => void;
  /** Optional: switch the parent page into grid view (Arena map sidebar CTA). */
  onSwitchToGrid?: () => void;
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
  onSwitchToGrid,
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

      const eventCount =
        "total_events" in location && typeof location.total_events === "number"
          ? location.total_events
          : 0;

      // All locations need geocoding - use default UK center as placeholder
      return {
        name,
        slug,
        lat: 53.0, // Default UK center - will be replaced by geocoding
        lng: -2.0,
        eventCount,
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
              (
                results: google.maps.GeocoderResult[] | null,
                status: google.maps.GeocoderStatus,
              ) => {
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

    loadGoogleMapsApi()
      .then(() => {
        void initializeMap(initGeneration);
      })
      .catch(() => {
        if (mapInitGenerationRef.current !== initGeneration) return;
        setError("Failed to load Google Maps. Please check your API key.");
        setIsLoading(false);
      });

    return () => {
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

  const requestFullscreen = () => {
    const el = mapRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      void el.requestFullscreen();
    }
  };

  return (
    <div className="relative w-full">
      <motion.div
        className="overflow-hidden rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] shadow-[0_20px_48px_-32px_rgba(0,0,0,0.55)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
          <div className="relative h-[360px] border-b border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] lg:h-full lg:min-h-[560px] lg:border-b-0 lg:border-r">
            <div
              ref={mapRef}
              className="h-full w-full"
              style={{ backgroundColor: "var(--color-background, #f8fafc)" }}
              aria-busy={isLoading}
              aria-label="Vendor locations map"
            />

            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--color-surface)_88%,transparent)] backdrop-blur-[2px]">
                <div className="flex w-full max-w-xs flex-col items-center gap-3 px-6">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-6">
                <div className="max-w-md rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-8 text-center shadow-lg">
                  <p className="mb-4 text-lg font-semibold text-[var(--color-text)]">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-xl px-6 py-3 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                    style={{ backgroundColor: mapVisualTokens.primary }}
                  >
                    Reload page
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error ? (
              <>
                <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                  {locationMarkers.length} location
                  {locationMarkers.length !== 1 ? "s" : ""} · Interactive
                  preview
                </div>
                <button
                  type="button"
                  onClick={requestFullscreen}
                  className="absolute bottom-4 right-4 z-10 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-black shadow-md transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                  Expand
                </button>
              </>
            ) : null}
          </div>

          <aside className="flex min-h-0 flex-col bg-[var(--color-surface)]">
            <div className="border-b border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] px-4 py-3.5 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dimmed)]">
                All locations
              </p>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2 sm:px-3">
              {locationMarkers.map((marker) => {
                const initial = (marker.name.trim()[0] || "?").toUpperCase();
                return (
                  <li key={marker.slug || marker.name}>
                    <button
                      type="button"
                      onClick={() => {
                        if (marker.slug) onSelect(marker.slug);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-200",
                        "hover:bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]",
                      )}
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_22%,var(--color-surface))] text-sm font-semibold text-[var(--color-primary)]">
                        {initial}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
                          {marker.name}
                        </span>
                        {marker.address ? (
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-dimmed)]">
                            {marker.address}
                          </span>
                        ) : null}
                      </span>
                      <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs font-semibold text-[var(--color-primary-foreground)]">
                        {marker.eventCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {onSwitchToGrid ? (
              <div className="border-t border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] p-3 sm:p-4">
                <button
                  type="button"
                  onClick={onSwitchToGrid}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)] transition-opacity duration-200 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface)]"
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                  Switch to Grid View
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </motion.div>

      <p className="mt-4 text-center text-sm text-[var(--color-text-dimmed)]">
        Showing {locationMarkers.length} of {locationMarkers.length} locations
      </p>
    </div>
  );
}
