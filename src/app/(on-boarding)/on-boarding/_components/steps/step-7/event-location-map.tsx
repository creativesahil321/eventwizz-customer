"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { env } from "@/env";
import {
  isGoogleMapsApiReady,
  resolveGoogleMapsLoadAction,
} from "@/lib/google-maps-ready";
import {
  isCoarseUkFallbackPin,
  isCountryOnlyAddress,
  isUnusableMapPin,
  shouldApplyMapCoords,
  shouldRefreshMapForAddress,
  type MapLatLng,
} from "@/lib/sync-event-location-map";

interface EventLocationMapProps {
  initialAddress?: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onLocationChange: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  onAddressSearch?: (searchFunction: (address: string) => void) => void;
  className?: string;
  /** Tailwind height for the map canvas. Step 1 uses a compact size. */
  heightClass?: string;
  /** Pixel min-height so Google Maps has a real layout box. */
  minHeightPx?: number;
  /** Tighter canvas + one-line selected-address row (AI collect / step 1). */
  compact?: boolean;
}

interface MapLocation {
  address: string;
  latitude: number;
  longitude: number;
}

function isFiniteCoord(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export default function EventLocationMap({
  initialAddress = "",
  initialLatitude,
  initialLongitude,
  onLocationChange,
  onAddressSearch,
  className = "",
  heightClass = "h-64",
  minHeightPx = 256,
  compact = false,
}: EventLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const geocoderRef = useRef<any | null>(null);
  const lastAppliedAddressRef = useRef("");
  const lastAppliedCoordsRef = useRef<MapLatLng | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeGenerationRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rememberApplied = (center: MapLatLng, address: string) => {
    lastAppliedCoordsRef.current = center;
    lastAppliedAddressRef.current = address.trim();
  };

  const refreshMapViewport = (center: MapLatLng) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const maps = window.google?.maps as
      | { event?: { trigger?: (instance: unknown, name: string) => void } }
      | undefined;
    maps?.event?.trigger?.(map, "resize");
    map.setCenter(center);
    map.setZoom(15);
  };

  const applyExistingMapPin = useCallback(
    (
      center: MapLatLng,
      address: string,
      options?: { commit?: boolean },
    ) => {
      const map = mapInstanceRef.current;
      const marker = markerRef.current;
      if (!map || !marker) return false;
      if (isUnusableMapPin(center.lat, center.lng, null, address)) return false;
      const shouldCommit = options?.commit !== false;
      refreshMapViewport(center);
      marker.setPosition(center);
      const next: MapLocation = {
        address: address || "Selected Location",
        latitude: center.lat,
        longitude: center.lng,
      };
      setError(null);
      setIsLoading(false);
      if (shouldCommit) {
        rememberApplied(center, address);
        setCurrentLocation(next);
        onLocationChange(next);
      } else {
        lastAppliedCoordsRef.current = center;
      }
      return true;
    },
    [onLocationChange],
  );

  const geocodeAddressOntoMap = useCallback(
    (address: string) => {
      const geocoder =
        geocoderRef.current ||
        (window.google?.maps
          ? new (window.google.maps as any).Geocoder()
          : null);
      if (!geocoder || !address.trim()) return;
      geocoderRef.current = geocoder;
      const generation = ++geocodeGenerationRef.current;
      setIsLoading(true);
      setError(null);
      geocoder.geocode(
        { address, componentRestrictions: { country: "GB" } },
        (results: any, status: any) => {
          if (generation !== geocodeGenerationRef.current) return;
          if (status === "OK" && results?.[0]) {
            const location = results[0].geometry.location;
            const center = { lat: location.lat(), lng: location.lng() };
            const types = Array.isArray(results[0].types)
              ? results[0].types
              : [];
            const formatted = results[0].formatted_address || address;
            if (isUnusableMapPin(center.lat, center.lng, types, formatted)) {
              setIsLoading(false);
              setError(
                "Couldn’t place that address on the map. Search again or drag the pin.",
              );
              return;
            }
            applyExistingMapPin(center, formatted, { commit: true });
          } else {
            setIsLoading(false);
            setError(
              "Address not found. Please try a different address or drag the pin.",
            );
          }
        },
      );
    },
    [applyExistingMapPin],
  );

  const handleAddressSearch = useCallback(
    (address: string) => {
      geocodeAddressOntoMap(address);
    },
    [geocodeAddressOntoMap],
  );

  // Expose handleAddressSearch to parent component
  useEffect(() => {
    if (onAddressSearch) {
      onAddressSearch(handleAddressSearch);
    }
  }, [onAddressSearch, handleAddressSearch]);

  const initializeMapWithCenter = useCallback(
    (
      center: { lat: number; lng: number },
      address: string,
      options?: { commit?: boolean },
    ) => {
      if (!mapRef.current || !window.google) return;
      const shouldCommit = options?.commit !== false;

      if (mapInstanceRef.current && markerRef.current) {
        applyExistingMapPin(center, address, options);
        return;
      }

      try {
        // Initialize geocoder
        const geocoderInstance = new (window.google.maps as any).Geocoder();
        geocoderRef.current = geocoderInstance;

        // Create map
        const mapInstance = new (window.google.maps as any).Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeId: (window.google.maps as any).MapTypeId.ROADMAP,
          restriction: {
            latLngBounds: {
              north: 60.9, // Northern Scotland
              south: 49.8, // Southern England
              east: 1.8, // Eastern England
              west: -8.2, // Western Ireland (includes Northern Ireland)
            },
            strictBounds: true, // Prevent panning outside bounds
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
            position: (window.google.maps as any).ControlPosition.RIGHT_CENTER,
          },
          fullscreenControl: true,
          fullscreenControlOptions: {
            position: (window.google.maps as any).ControlPosition.TOP_RIGHT,
          },
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: (window.google.maps as any).MapTypeControlStyle.HORIZONTAL_BAR,
            position: (window.google.maps as any).ControlPosition.TOP_CENTER,
            mapTypeIds: [
              (window.google.maps as any).MapTypeId.ROADMAP,
              (window.google.maps as any).MapTypeId.SATELLITE,
              (window.google.maps as any).MapTypeId.HYBRID,
            ],
          },
          streetViewControl: false,
        });

        mapInstanceRef.current = mapInstance;

        // Add bounds checking to prevent dragging outside UK
        const ukBounds = new (window.google.maps as any).LatLngBounds(
          { lat: 49.8, lng: -8.2 }, // Southwest corner
          { lat: 60.9, lng: 1.8 } // Northeast corner
        );

        // Prevent map from being dragged outside UK bounds
        mapInstance.addListener("dragend", () => {
          const center = mapInstance.getCenter();
          if (center && !ukBounds.contains(center)) {
            // If center is outside UK, move it back to closest UK point
            const lat = Math.max(49.8, Math.min(60.9, center.lat()));
            const lng = Math.max(-8.2, Math.min(1.8, center.lng()));
            mapInstance.setCenter({ lat, lng });
          }
        });

        // Create draggable marker with custom icon for better visibility
        const markerInstance = new (window.google.maps as any)  .Marker({
          position: center,
          map: mapInstance,
          draggable: true,
          title: "Event Location - Drag me!",
          animation: (window.google.maps as any).Animation.DROP,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new (window.google.maps as any).Size(40, 40),
          },
        });

        markerRef.current = markerInstance;

        // Set initial location — don't save UK overview centre as event coords.
        const initialLocation: MapLocation = {
          address: address || "Selected Location",
          latitude: center.lat,
          longitude: center.lng,
        };
        setMapReady(true);
        requestAnimationFrame(() => {
          refreshMapViewport(center);
        });
        if (shouldCommit && !isUnusableMapPin(center.lat, center.lng)) {
          rememberApplied(center, address);
          setCurrentLocation(initialLocation);
          onLocationChange(initialLocation);
        } else {
          lastAppliedCoordsRef.current = center;
          setCurrentLocation(null);
        }

        // Handle marker drag events
        markerInstance.addListener("dragend", () => {
          const position = markerInstance.getPosition();
          if (position) {
            // Check if marker is within UK bounds
            const lat = position.lat();
            const lng = position.lng();

            if (lat < 49.8 || lat > 60.9 || lng < -8.2 || lng > 1.8) {
              // Marker is outside UK bounds, move it to closest UK point
              const constrainedLat = Math.max(49.8, Math.min(60.9, lat));
              const constrainedLng = Math.max(-8.2, Math.min(1.8, lng));
              markerInstance.setPosition({
                lat: constrainedLat,
                lng: constrainedLng,
              });
              return; // Exit early, position will be updated on next drag
            }

            if (geocoderRef.current) {
              geocoderRef.current.geocode(
                { location: position },
                (results: any, status: any) => {
                  if (status === "OK" && results && results[0]) {
                    const newLocation: MapLocation = {
                      address: results[0].formatted_address,
                      latitude: position.lat(),
                      longitude: position.lng(),
                    };
                    if (
                      !isUnusableMapPin(
                        newLocation.latitude,
                        newLocation.longitude,
                        results[0].types,
                        newLocation.address,
                      )
                    ) {
                      rememberApplied(
                        { lat: newLocation.latitude, lng: newLocation.longitude },
                        newLocation.address,
                      );
                      setCurrentLocation(newLocation);
                      onLocationChange(newLocation);
                    }
                  } else {
                    // If reverse geocoding fails, still update coordinates
                    const newLocation: MapLocation = {
                      address: `Location (${position
                        .lat()
                        .toFixed(6)}, ${position.lng().toFixed(6)})`,
                      latitude: position.lat(),
                      longitude: position.lng(),
                    };
                    if (
                      !isUnusableMapPin(
                        newLocation.latitude,
                        newLocation.longitude,
                        null,
                        newLocation.address,
                      )
                    ) {
                      rememberApplied(
                        { lat: newLocation.latitude, lng: newLocation.longitude },
                        newLocation.address,
                      );
                      setCurrentLocation(newLocation);
                      onLocationChange(newLocation);
                    }
                  }
                }
              );
            }
          }
        });

        // Handle map click events
        mapInstance.addListener("click", (event: any) => {
          const latLng = event.latLng;
          if (latLng && markerRef.current) {
            // Check if click is within UK bounds
            const lat = latLng.lat();
            const lng = latLng.lng();

            if (lat < 49.8 || lat > 60.9 || lng < -8.2 || lng > 1.8) {
              // Click is outside UK bounds, don't place marker
              return;
            }

            markerRef.current.setPosition(latLng);

            if (geocoderRef.current) {
              geocoderRef.current.geocode(
                { location: latLng },
                (results: any, status: any) => {
                  if (status === "OK" && results && results[0]) {
                    const newLocation: MapLocation = {
                      address: results[0].formatted_address,
                      latitude: latLng.lat(),
                      longitude: latLng.lng(),
                    };
                    if (
                      isUnusableMapPin(
                        newLocation.latitude,
                        newLocation.longitude,
                        results[0].types,
                        newLocation.address,
                      )
                    ) {
                      return;
                    }
                    rememberApplied(
                      { lat: newLocation.latitude, lng: newLocation.longitude },
                      newLocation.address,
                    );
                    setCurrentLocation(newLocation);
                    onLocationChange(newLocation);
                  } else {
                    const newLocation: MapLocation = {
                      address: `Location (${latLng.lat().toFixed(6)}, ${latLng
                        .lng()
                        .toFixed(6)})`,
                      latitude: latLng.lat(),
                      longitude: latLng.lng(),
                    };
                    if (
                      isUnusableMapPin(
                        newLocation.latitude,
                        newLocation.longitude,
                        null,
                        newLocation.address,
                      )
                    ) {
                      return;
                    }
                    rememberApplied(
                      { lat: newLocation.latitude, lng: newLocation.longitude },
                      newLocation.address,
                    );
                    setCurrentLocation(newLocation);
                    onLocationChange(newLocation);
                  }
                }
              );
            }
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error creating map:", err);
        setError("Failed to create map. Please try again.");
        setIsLoading(false);
      }
    },
    [applyExistingMapPin, onLocationChange]
  );

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    setIsLoading(true);
    setError(null);

    try {
      const ukOverviewCenter = { lat: 54.7024, lng: -3.2766 };
      const address = initialAddress.trim();
      const hasStoredCoords =
        isFiniteCoord(initialLatitude) &&
        isFiniteCoord(initialLongitude) &&
        !isCoarseUkFallbackPin(initialLatitude, initialLongitude);

      if (hasStoredCoords) {
        initializeMapWithCenter(
          { lat: initialLatitude, lng: initialLongitude },
          address || "Selected Location",
          { commit: true },
        );
        return;
      }

      if (address) {
        const geocoderInstance = new (window.google.maps as any).Geocoder();
        geocoderInstance.geocode(
          { address, componentRestrictions: { country: "GB" } },
          (results: any, status: any) => {
            if (status === "OK" && results && results[0]) {
              const location = results[0].geometry.location;
              const center = { lat: location.lat(), lng: location.lng() };
              const formatted = results[0].formatted_address || address;
              if (
                isUnusableMapPin(
                  center.lat,
                  center.lng,
                  results[0].types,
                  formatted,
                )
              ) {
                initializeMapWithCenter(ukOverviewCenter, address, {
                  commit: false,
                });
                return;
              }
              initializeMapWithCenter(center, formatted, { commit: true });
            } else {
              initializeMapWithCenter(ukOverviewCenter, address, {
                commit: false,
              });
              setError(
                "Couldn’t place that address on the map. Search again or drag the pin.",
              );
              setIsLoading(false);
            }
          },
        );
      } else {
        initializeMapWithCenter(ukOverviewCenter, "", { commit: false });
      }
    } catch (err) {
      console.error("Error initializing map:", err);
      setError(
        "Failed to initialise map. Please check your internet connection.",
      );
      setIsLoading(false);
    }
  }, [
    initialAddress,
    initialLatitude,
    initialLongitude,
    initializeMapWithCenter,
  ]);

  // Initialize map when component mounts
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Check if script is already being loaded or exists
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );

    const initializeMapCallback = () => {
      if (!isMounted) return;

      // Wait for mapRef to be ready with retries
      const tryInitialize = (attempts = 0) => {
        if (!isMounted) return;

        if (mapRef.current && window.google && window.google.maps) {
          initializeMap();
        } else if (attempts < 10) {
          // Retry up to 10 times (2 seconds total)
          timeoutId = setTimeout(() => tryInitialize(attempts + 1), 200);
        } else {
          setError("Map container not ready. Please refresh the page.");
          setIsLoading(false);
        }
      };

      tryInitialize();
    };

    const loadAction = resolveGoogleMapsLoadAction({
      hasMapsApi: isGoogleMapsApiReady(),
      scriptExists: Boolean(existingScript),
      scriptMarkedLoaded:
        existingScript?.getAttribute("data-loaded") === "true",
    });

    if (loadAction === "init") {
      initializeMapCallback();
    } else if (loadAction === "wait-script" && existingScript) {
      const handleLoad = () => {
        existingScript.setAttribute("data-loaded", "true");
        if (isMounted) initializeMapCallback();
      };
      existingScript.addEventListener("load", handleLoad);
      const pollId = window.setInterval(() => {
        if (!isGoogleMapsApiReady()) return;
        window.clearInterval(pollId);
        existingScript.setAttribute("data-loaded", "true");
        if (isMounted) initializeMapCallback();
      }, 150);
      return () => {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
        window.clearInterval(pollId);
        existingScript.removeEventListener("load", handleLoad);
      };
    } else {
      // Load Google Maps API script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        if (isMounted) {
          initializeMapCallback();
        }
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
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // Create the map once — address/coord updates sync onto this instance.

  const applyPinRef = useRef(applyExistingMapPin);
  const geocodeAddressRef = useRef(geocodeAddressOntoMap);
  applyPinRef.current = applyExistingMapPin;
  geocodeAddressRef.current = geocodeAddressOntoMap;

  useEffect(() => {
    if (!mapReady) return;

    const address = initialAddress.trim();
    if (isCountryOnlyAddress(address)) return;

    const nextCoords = shouldApplyMapCoords(
      initialLatitude,
      initialLongitude,
      lastAppliedCoordsRef.current,
    );

    if (nextCoords) {
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = null;
      }
      geocodeGenerationRef.current += 1;
      applyPinRef.current(nextCoords, address || "Selected Location", {
        commit: true,
      });
      return;
    }

    const pinLat =
      lastAppliedCoordsRef.current?.lat ??
      (isFiniteCoord(initialLatitude) ? initialLatitude : null);
    const pinLng =
      lastAppliedCoordsRef.current?.lng ??
      (isFiniteCoord(initialLongitude) ? initialLongitude : null);

    if (
      !shouldRefreshMapForAddress({
        address,
        lastAppliedAddress: lastAppliedAddressRef.current,
        pinLat,
        pinLng,
      })
    ) {
      return;
    }

    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      geocodeAddressRef.current(address);
    }, 50);

    return () => {
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = null;
      }
    };
  }, [initialAddress, initialLatitude, initialLongitude, mapReady]);

  // Cleanup marker only on component unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (geocoderRef.current) {
        geocoderRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on unmount

  return (
    <div className={`${compact ? "space-y-1.5" : "space-y-3"} ${className}`}>
      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapRef}
          className={`${heightClass} w-full overflow-hidden rounded-lg border border-white/20`}
          style={{ minHeight: minHeightPx }}
        />

        {/* Street View Button - Only show when location is selected */}
        {currentLocation && (
          <button
            type="button"
            onClick={() => {
              const lat = currentLocation.latitude;
              const lng = currentLocation.longitude;

              // Open Google Street View
              const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
              window.open(streetViewUrl, "_blank", "noopener,noreferrer");
            }}
            className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-700 text-white rounded-md p-2 shadow-md transition-colors z-20 group"
            title="View street view of this location"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </button>
        )}

        {isLoading && !mapReady && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/80 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-primary,#38bdf8)]" />
              <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={initializeMap}
            className="shrink-0 rounded bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Location Info */}
      {currentLocation && !isLoading && !compact && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="mb-1 font-medium text-foreground">
                Selected Location:
              </p>
              <p className="mb-1 text-muted-foreground">{currentLocation.address}</p>
              <p className="text-muted-foreground/90">
                Coordinates: {currentLocation.latitude.toFixed(6)},{" "}
                {currentLocation.longitude.toFixed(6)}
              </p>
            </div>
            <div className="ml-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
