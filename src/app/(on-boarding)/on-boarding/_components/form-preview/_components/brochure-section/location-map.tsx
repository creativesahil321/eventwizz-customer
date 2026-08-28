"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation } from "lucide-react";
import { env } from "@/env";
import { Button } from "@/components/ui";
import { isLondonDefaultPin } from "@/lib/london-default-coords";

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
  const [mapLoaded, setMapLoaded] = useState(showMapImmediately);
  const globalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

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

    console.log("🗺️ Initializing map with:", { address, latitude, longitude });
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

      setError("Map loading timed out. Please refresh the page.");
      setIsLoading(false);
    }, 10000);

    try {
      // Default center — geographic centre of the UK (not central London).
      const defaultCenter = { lat: 54.7024, lng: -3.2766 };
      let mapCenter = defaultCenter;
      let mapAddress = "";
      const vendorAddress = address.trim();

      // Classic platform placeholder pin must not override a real venue address.
      const trustStoredCoords =
        Boolean(latitude && longitude) &&
        !isLondonDefaultPin(latitude, longitude);

      // Prefer trustworthy coords; otherwise geocode the written address.
      if (trustStoredCoords) {
        const lat =
          typeof latitude === "string" ? parseFloat(latitude) : Number(latitude);
        const lng =
          typeof longitude === "string"
            ? parseFloat(longitude)
            : Number(longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          mapCenter = { lat, lng };
          mapAddress =
            vendorAddress ||
            `Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;

          console.log("🗺️ Using coordinates:", {
            lat,
            lng,
            address: mapAddress,
          });

          // Keep the venue's written address; reverse-geocode only fills a gap.
          if (vendorAddress) {
            initializeMapWithCenter(mapCenter, vendorAddress);
            return;
          }

          const geocoderInstance = new google.maps.Geocoder();
          const geocodeTimeout = setTimeout(() => {
            console.log("🗺️ Geocoding timeout, using fallback address");
            initializeMapWithCenter(mapCenter, mapAddress);
          }, 3000);

          geocoderInstance.geocode(
            { location: mapCenter },
            (results, status) => {
              clearTimeout(geocodeTimeout);
              if (status === "OK" && results && results[0]) {
                mapAddress = results[0].formatted_address;
              }
              initializeMapWithCenter(mapCenter, mapAddress);
            },
          );
          return;
        }
      }

      // No trustworthy coords (missing, invalid, or London placeholder) — geocode address
      if (vendorAddress) {
        console.log("🗺️ Geocoding address:", address);
        const geocoderInstance = new google.maps.Geocoder();

        // Add timeout for address geocoding too
        const addressTimeout = setTimeout(() => {
          console.log("🗺️ Address geocoding timeout, using default center");
          initializeMapWithCenter(mapCenter, address);
        }, 3000);

        geocoderInstance.geocode({ address: address }, (results, status) => {
          clearTimeout(addressTimeout);
          console.log("🗺️ Address geocoding result:", {
            status,
            results: results?.length,
          });

          if (status === "OK" && results && results[0]) {
            const location = results[0].geometry.location;
            mapCenter = { lat: location.lat(), lng: location.lng() };
            console.log(
              "🗺️ Address geocoded successfully:",
              results[0].formatted_address,
            );
            initializeMapWithCenter(mapCenter, results[0].formatted_address);
          } else {
            console.log("🗺️ Address geocoding failed, using default center");
            // If geocoding fails, use default center
            initializeMapWithCenter(mapCenter, address);
          }
        });
      } else {
        console.log("🗺️ No address provided, using default center");
        initializeMapWithCenter(mapCenter, "");
      }
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
  }, [address, latitude, longitude, initializeMapWithCenter]);

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
    if (mapInstanceRef.current && (address.trim() || latitude || longitude)) {
      initializeMap();
    }
  }, [address, latitude, longitude, initializeMap]);

  return (
    <div
      className={`relative ${className} overflow-hidden text-[var(--color-text)] `}
    >
      {/* Event Location Header */}
      {/* Address Overlay - Only show when map is loaded and location exists */}
      {mapLoaded && currentLocation && !isLoading && !error && (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-[var(--color-text-dimmed)] mt-1">
            Event location
          </p>
          <p className="text-xs text-[var(--color-text-primary)] font-medium truncate">
            {currentLocation?.address}
          </p>
        </div>
      )}
      {/* Map Container */}
      <div className="relative">
        {!mapLoaded ? (
          <div
            className="w-full h-full rounded-md overflow-hidden bg-[var(--color-primary)] flex items-center justify-center"
            style={{ minHeight: "200px" }}
          >
            <div className="text-center">
              <MapPin className="text-[var(--color-primary-foreground)] mx-auto " size={24} />
              <h2 className="text-base sm:text-lg font-bold py-2 sm:py-3 uppercase text-[var(--color-primary-foreground)]">
                EVENT LOCATION
              </h2>
              <p className="text-sm pb-2 text-[var(--color-primary-foreground)]">{address}</p>

              <Button
                variant="event-outline"
                type="button"
                onClick={() => setMapLoaded(true)}
              >
                Get directions
              </Button>
            </div>
          </div>
        ) : (
          <div
            ref={mapRef}
            className="w-full h-full rounded-md overflow-hidden"
            style={{ minHeight: "200px" }}
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

        {/* Error Overlay - Only show when map is loaded */}
        {mapLoaded && error && (
          <div className="absolute inset-0 bg-[var(--color-primary)] bg-opacity-75 flex items-center justify-center rounded-md">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <MapPin className="h-8 w-8 text-[var(--color-primary-foreground)]" />
              <p className="text-[var(--color-primary-foreground)] text-sm">{error}</p>
              <p className="text-[var(--color-primary-foreground)] text-xs">
                {address || "No address provided"}
              </p>
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
                const lat = currentLocation.latitude;
                const lng = currentLocation.longitude;

                // Open Google Maps with directions
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`;
                window.open(directionsUrl, "_blank", "noopener,noreferrer");
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
            <div className="flex flex-col items-center gap-2 ">
              <MapPin className="h-8 w-8" />
              <p className="text-sm font-medium text-[var(--color-primary-foreground)]">
                EVENT LOCATION
              </p>
              <p className="text-xs text-center px-4 text-[var(--color-primary-foreground)]">
                {address ||
                  "Enter your event address in the form to display here"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
