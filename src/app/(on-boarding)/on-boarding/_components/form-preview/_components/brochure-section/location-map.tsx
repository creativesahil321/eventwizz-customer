"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation } from "lucide-react";
import { env } from "@/env";
import { Button } from "@/components/ui";
import {
  buildEventDirectionsUrl,
  hasPublicEventMapCoordinates,
} from "@/lib/event-location";
import { buildMapsDirectionsUrl } from "@/lib/resolve-venue-contact";
import { cn } from "@/lib/utils";

/** Height for the Google Map canvas only — not the collapsed “EVENT LOCATION” card. */
const MAP_CANVAS_MIN_HEIGHT_CLASS = "min-h-[280px] sm:min-h-[360px]";

interface LocationMapProps {
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  className?: string;
  /** Public event pages: show the map immediately. Onboarding preview: false so the map lazy-loads after "Get directions". */
  showMapImmediately?: boolean;
}

interface MapLocation {
  address: string;
  latitude: number;
  longitude: number;
}

const PLACEHOLDER_ADDRESS_RE =
  /^(event location will be displayed here|enter your event address in the form to display here|add an event address to enable directions)$/i;

function parseCoordinate(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const coordinate =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(coordinate) ? coordinate : null;
}

/** Real venue address only — ignore UI placeholder copy. */
function resolveDisplayAddress(address?: string): string {
  const trimmed = address?.trim() ?? "";
  if (!trimmed || PLACEHOLDER_ADDRESS_RE.test(trimmed)) return "";
  return trimmed;
}

function openDirections(address: string, lat?: number | null, lng?: number | null) {
  const directionsUrl = buildEventDirectionsUrl({
    address,
    latitude: lat ?? null,
    longitude: lng ?? null,
  });
  if (directionsUrl) {
    window.open(directionsUrl, "_blank", "noopener,noreferrer");
    return;
  }
  if (address.trim()) {
    window.open(
      buildMapsDirectionsUrl(address),
      "_blank",
      "noopener,noreferrer",
    );
  }
}

export default function LocationMap({
  address = "",
  latitude,
  longitude,
  className = "",
  showMapImmediately = false,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const globalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;
  const parsedLatitude = parseCoordinate(latitude);
  const parsedLongitude = parseCoordinate(longitude);
  const displayAddress = resolveDisplayAddress(address);
  const hasMapCoordinates = hasPublicEventMapCoordinates({
    lat: parsedLatitude,
    long: parsedLongitude,
  });
  const hasEventLocationTarget = Boolean(displayAddress || hasMapCoordinates);
  const [mapLoaded, setMapLoaded] = useState(
    showMapImmediately && hasMapCoordinates,
  );

  const initializeMapWithCenter = useCallback(
    (center: { lat: number; lng: number }, address: string) => {
      if (!mapRef.current || !window.google) return;

      try {
        // Initialize geocoder
        const geocoderInstance = new google.maps.Geocoder();
        geocoderRef.current = geocoderInstance;

        // Create map
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          restriction: {
            latLngBounds: {
              north: 60.9, // Northern Scotland
              south: 49.8, // Southern England
              east: 1.8, // Eastern England
              west: -8.2, // Western Ireland (includes Northern Ireland)
            },
            strictBounds: true,
          },
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
          // Disable default UI and manually enable only what we want
          disableDefaultUI: true,
          // Re-enable only the controls we want
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
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_CENTER,
            mapTypeIds: [
              google.maps.MapTypeId.ROADMAP,
              google.maps.MapTypeId.SATELLITE,
              google.maps.MapTypeId.HYBRID,
            ],
          },
          streetViewControl: false,
          clickableIcons: false,
        });

        mapInstanceRef.current = mapInstance;

        // Create marker with custom icon for better visibility
        const markerInstance = new google.maps.Marker({
          position: center,
          map: mapInstance,
          draggable: false, // Don't allow dragging in preview mode
          title: "Event Location",
          animation: google.maps.Animation.DROP,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new google.maps.Size(32, 32),
          },
        });

        markerRef.current = markerInstance;

        // Set initial location
        const initialLocation: MapLocation = {
          address: address || "Selected Location",
          latitude: center.lat,
          longitude: center.lng,
        };
        setCurrentLocation(initialLocation);
        console.log("🗺️ Map initialized successfully with:", initialLocation);

        // Clear the global timeout since map loaded successfully
        if (globalTimeoutRef.current) {
          clearTimeout(globalTimeoutRef.current);
          globalTimeoutRef.current = null;
        }

        // Reset retry count on successful initialization
        retryCountRef.current = 0;

        setIsLoading(false);
      } catch (err) {
        console.error("🗺️ Error creating map:", err);

        // Clear the global timeout since we're handling the error
        if (globalTimeoutRef.current) {
          clearTimeout(globalTimeoutRef.current);
          globalTimeoutRef.current = null;
        }

        setError("Failed to create map. Please try again.");
        setIsLoading(false);
      }
    },
    [],
  );

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) {
      console.log("🗺️ Map ref or Google Maps not ready, retrying in 500ms...");
      setTimeout(() => {
        if (mapRef.current && window.google) {
          initializeMap();
        } else {
          console.error("🗺️ Google Maps API failed to load");
          setError("Google Maps failed to load. Please refresh the page.");
          setIsLoading(false);
        }
      }, 500);
      return;
    }

    console.log("🗺️ Initializing map with:", { address: displayAddress, latitude, longitude });
    setIsLoading(true);
    setError(null);

    // Clear any existing global timeout
    if (globalTimeoutRef.current) {
      clearTimeout(globalTimeoutRef.current);
    }

    // Set a global timeout to prevent infinite loading (10 seconds)
    globalTimeoutRef.current = setTimeout(() => {
      console.error("🗺️ Map initialization timeout after 10 seconds");

      // Try to retry if we haven't exceeded max retries
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(
          `🗺️ Retrying map initialization (attempt ${retryCountRef.current}/${maxRetries})`,
        );
        setTimeout(() => {
          initializeMap();
        }, 1000);
        return;
      }

      setError("Map loading timed out. You can still open directions below.");
      setIsLoading(false);
    }, 10000);

    try {
      const eventAddress = displayAddress;
      const pinLatitude = parseCoordinate(latitude);
      const pinLongitude = parseCoordinate(longitude);
      const canDropPin = hasPublicEventMapCoordinates({
        lat: pinLatitude,
        long: pinLongitude,
      });

      if (!canDropPin) {
        setCurrentLocation(null);
        setError(
          eventAddress
            ? "Map pin is not available for this event."
            : "Event location is not available yet.",
        );
        setIsLoading(false);
        return;
      }

      if (pinLatitude == null || pinLongitude == null) {
        setCurrentLocation(null);
        setError("Event location is not available yet.");
        setIsLoading(false);
        return;
      }

      const mapCenter = { lat: pinLatitude, lng: pinLongitude };
      const mapAddress =
        eventAddress ||
        `Location (${pinLatitude.toFixed(6)}, ${pinLongitude.toFixed(6)})`;
      initializeMapWithCenter(mapCenter, mapAddress);
    } catch (err) {
      console.error("🗺️ Error initializing map:", err);

      // Clear the global timeout since we're handling the error
      if (globalTimeoutRef.current) {
        clearTimeout(globalTimeoutRef.current);
        globalTimeoutRef.current = null;
      }

      setError(
        "Failed to initialize map. Please check your internet connection.",
      );
      setIsLoading(false);
    }
  }, [displayAddress, latitude, longitude, initializeMapWithCenter]);

  // Initialize map only when mapLoaded is true.
  // Important: when the Maps script is already on window (e.g. after client navigation), we must still
  // call initializeMap — the old logic only ran when ref OR google was missing, which skipped init forever.
  useEffect(() => {
    if (!mapLoaded) return;

    let isMounted = true;
    let retryTimeoutId: NodeJS.Timeout | null = null;
    let onExistingScriptLoad: (() => void) | null = null;
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src*="maps.googleapis.com/maps/api/js"]`,
    );

    const initializeMapCallback = () => {
      if (!isMounted) return;

      const tryInitialize = (attempts = 0) => {
        if (!isMounted) return;

        if (mapRef.current && window.google?.maps) {
          initializeMap();
        } else if (attempts < 15) {
          retryTimeoutId = setTimeout(() => tryInitialize(attempts + 1), 200);
        } else {
          setError("Map container not ready. Please refresh the page.");
          setIsLoading(false);
        }
      };

      tryInitialize();
    };

    if (window.google?.maps) {
      initializeMapCallback();
    } else if (existingScript) {
      if (existingScript.getAttribute("data-loaded") === "true") {
        initializeMapCallback();
      } else {
        onExistingScriptLoad = () => {
          if (isMounted) initializeMapCallback();
        };
        existingScript.addEventListener("load", onExistingScriptLoad);
      }
    } else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        if (isMounted) initializeMapCallback();
      };
      script.onerror = () => {
        if (isMounted) {
          setError("Failed to load Google Maps. Please refresh the page.");
          setIsLoading(false);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (onExistingScriptLoad && existingScript) {
        existingScript.removeEventListener("load", onExistingScriptLoad);
      }
      if (globalTimeoutRef.current) {
        clearTimeout(globalTimeoutRef.current);
        globalTimeoutRef.current = null;
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
      if (geocoderRef.current) {
        geocoderRef.current = null;
      }
    };
  }, [initializeMap, mapLoaded]);

  // Re-initialize map when address or coordinates change
  useEffect(() => {
    if (!hasEventLocationTarget) {
      setCurrentLocation(null);
      setError("Event location is not available yet.");
      setIsLoading(false);
      return;
    }
    if (mapInstanceRef.current) {
      initializeMap();
    }
  }, [
    displayAddress,
    latitude,
    longitude,
    hasEventLocationTarget,
    initializeMap,
  ]);

  const fallbackDirectionsTarget =
    displayAddress ||
    (currentLocation?.address ? resolveDisplayAddress(currentLocation.address) : "");

  return (
    <div
      className={cn(
        "relative overflow-hidden text-[var(--color-text)]",
        className,
      )}
    >
      {/* Address Overlay - Only show when map is loaded and location exists */}
      {mapLoaded && currentLocation && !isLoading && !error && (
        <div className="flex min-w-0 items-start gap-2 pb-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-text-dimmed)]">
              Event location
            </p>
            <p
              className="max-w-full break-words text-xs font-medium leading-relaxed text-[var(--color-text-primary)] [overflow-wrap:anywhere]"
              title={currentLocation.address}
            >
              {currentLocation.address}
            </p>
          </div>
        </div>
      )}
      {/* Map Container */}
      <div className="relative">
        {!mapLoaded ? (
          <div className="flex w-full items-center justify-center overflow-hidden rounded-md bg-[var(--color-primary)] px-4 py-8">
            <div className="text-center">
              <MapPin className="text-[var(--color-primary-foreground)] mx-auto " size={24} />
              <h2 className="text-base sm:text-lg font-bold py-2 sm:py-3 uppercase text-[var(--color-primary-foreground)]">
                EVENT LOCATION
              </h2>
              <p
                className="max-w-full break-words px-2 pb-2 text-sm leading-relaxed text-[var(--color-primary-foreground)] [overflow-wrap:anywhere]"
                title={displayAddress || undefined}
              >
                {displayAddress || "Add an event address to enable directions"}
              </p>

              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                {displayAddress ? (
                  <Button
                    variant="event-outline"
                    type="button"
                    onClick={() => openDirections(displayAddress)}
                  >
                    <Navigation className="mr-1.5 h-3.5 w-3.5" />
                    Get directions
                  </Button>
                ) : null}
                <Button
                  variant="event-outline"
                  type="button"
                  onClick={() => setMapLoaded(true)}
                  disabled={!hasMapCoordinates}
                >
                  {hasMapCoordinates ? "View map" : "Map unavailable"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={mapRef}
            className={cn(
              "w-full overflow-hidden rounded-md",
              MAP_CANVAS_MIN_HEIGHT_CLASS,
            )}
          />
        )}

        {/* Loading Overlay - Only show when map is loaded */}
        {mapLoaded && isLoading && (
          <div className="absolute inset-0 bg-[var(--color-surface)]/80 flex items-center justify-center rounded-md">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-text)]"></div>
              <p className="text-[var(--color-text)] text-sm">Loading map...</p>
            </div>
          </div>
        )}

        {/* Error / no-map fallback — always surface address + directions when we have one */}
        {mapLoaded && error && (
          <div className="absolute inset-0 bg-[var(--color-primary)] flex items-center justify-center rounded-md p-4">
            <div className="flex w-full max-w-md flex-col items-center gap-3 text-center text-[var(--color-primary-foreground)]">
              <MapPin className="h-8 w-8 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {fallbackDirectionsTarget
                    ? "Map unavailable — use the address below"
                    : "Event location is not available yet"}
                </p>
                {error !== "Event location is not available yet." ? (
                  <p className="text-xs opacity-90">{error}</p>
                ) : null}
              </div>

              {fallbackDirectionsTarget ? (
                <>
                  <div className="w-full rounded-md bg-black/20 px-3 py-2.5 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                      Event location
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-relaxed [overflow-wrap:anywhere]">
                      {fallbackDirectionsTarget}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button
                      type="button"
                      variant="event-outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        openDirections(
                          fallbackDirectionsTarget,
                          parsedLatitude,
                          parsedLongitude,
                        )
                      }
                    >
                      <Navigation className="mr-1.5 h-3.5 w-3.5" />
                      Get directions
                    </Button>
                    <Button
                      type="button"
                      variant="event-outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        window.open(
                          buildMapsDirectionsUrl(fallbackDirectionsTarget),
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <MapPin className="mr-1.5 h-3.5 w-3.5" />
                      Open in Google Maps
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs opacity-90">
                  Add an event address so guests can find this venue.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Custom Control Buttons - Only show when map is loaded */}
        {mapLoaded && currentLocation && !isLoading && !error && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-2">
            {/* Get Directions Button */}
            <button
              type="button"
              onClick={() => {
                openDirections(
                  currentLocation.address,
                  currentLocation.latitude,
                  currentLocation.longitude,
                );
              }}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md shadow-lg text-xs font-medium transition-colors"
              title="Get directions to this location"
            >
              <Navigation className="h-3 w-3" />
              <span className="hidden sm:inline">Directions</span>
            </button>

            {/* Street View Button */}
            <button
              type="button"
              onClick={() => {
                const lat = currentLocation.latitude;
                const lng = currentLocation.longitude;

                // Open Google Street View
                const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
                window.open(streetViewUrl, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-lg text-xs font-medium transition-colors"
              title="View street view of this location"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <span className="hidden sm:inline">Street View</span>
            </button>

            {/* View on Google Maps Button */}
            <button
              type="button"
              onClick={() => {
                const lat = currentLocation.latitude;
                const lng = currentLocation.longitude;

                // Open Google Maps with the location
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=`;
                window.open(mapsUrl, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-lg text-xs font-medium transition-colors"
              title="View on Google Maps"
            >
              <MapPin className="h-3 w-3" />
              <span className="hidden sm:inline">View Map</span>
            </button>
          </div>
        )}

        {/* Map Pin Icon Overlay (when no address) */}
        {mapLoaded && !currentLocation && !isLoading && !error && (
          <div className="absolute inset-0 bg-[var(--color-primary)] flex items-center justify-center rounded-md text-[var(--color-primary-foreground)]">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <MapPin className="h-8 w-8" />
              <p className="text-sm font-medium text-[var(--color-primary-foreground)]">
                EVENT LOCATION
              </p>
              <p className="max-w-full break-words text-center text-xs text-[var(--color-primary-foreground)] [overflow-wrap:anywhere]">
                {displayAddress ||
                  "Enter your event address in the form to display here"}
              </p>
              {displayAddress ? (
                <Button
                  type="button"
                  variant="event-outline"
                  onClick={() => openDirections(displayAddress)}
                >
                  <Navigation className="mr-1.5 h-3.5 w-3.5" />
                  Get directions
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
