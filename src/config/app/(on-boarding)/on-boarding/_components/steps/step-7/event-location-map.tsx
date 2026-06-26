"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { env } from "@/env";

interface EventLocationMapProps {
  initialAddress?: string;
  onLocationChange: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  onAddressSearch?: (searchFunction: (address: string) => void) => void;
  className?: string;
}

interface MapLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export default function EventLocationMap({
  initialAddress = "",
  onLocationChange,
  onAddressSearch,
  className = "",
}: EventLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSearch = useCallback(
    (address: string) => {
      if (!geocoderRef.current || !mapInstanceRef.current || !markerRef.current)
        return;

      setIsLoading(true);
      setError(null);

      geocoderRef.current.geocode({ address }, (results, status) => {
        setIsLoading(false);

        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location;
          const newCenter = { lat: location.lat(), lng: location.lng() };

          // Update map center
          mapInstanceRef.current?.setCenter(newCenter);
          mapInstanceRef.current?.setZoom(15);

          // Update marker position
          markerRef.current?.setPosition(newCenter);

          // Update location data
          const newLocation: MapLocation = {
            address: results[0].formatted_address,
            latitude: location.lat(),
            longitude: location.lng(),
          };
          setCurrentLocation(newLocation);
          onLocationChange(newLocation);
        } else {
          setError(
            "Address not found. Please try a different address or manually select the location on the map."
          );
        }
      });
    },
    [onLocationChange]
  );

  // Expose handleAddressSearch to parent component
  useEffect(() => {
    if (onAddressSearch) {
      onAddressSearch(handleAddressSearch);
    }
  }, [onAddressSearch, handleAddressSearch]);

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
        });

        mapInstanceRef.current = mapInstance;

        // Add bounds checking to prevent dragging outside UK
        const ukBounds = new google.maps.LatLngBounds(
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
        const markerInstance = new google.maps.Marker({
          position: center,
          map: mapInstance,
          draggable: true,
          title: "Event Location - Drag me!",
          animation: google.maps.Animation.DROP,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new google.maps.Size(40, 40),
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
        onLocationChange(initialLocation);

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
                (results, status) => {
                  if (status === "OK" && results && results[0]) {
                    const newLocation: MapLocation = {
                      address: results[0].formatted_address,
                      latitude: position.lat(),
                      longitude: position.lng(),
                    };
                    setCurrentLocation(newLocation);
                    onLocationChange(newLocation);
                  } else {
                    // If reverse geocoding fails, still update coordinates
                    const newLocation: MapLocation = {
                      address: `Location (${position
                        .lat()
                        .toFixed(6)}, ${position.lng().toFixed(6)})`,
                      latitude: position.lat(),
                      longitude: position.lng(),
                    };
                    setCurrentLocation(newLocation);
                    onLocationChange(newLocation);
                  }
                }
              );
            }
          }
        });

        // Handle map click events
        mapInstance.addListener("click", (event: google.maps.MapMouseEvent) => {
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
                (results, status) => {
                  if (status === "OK" && results && results[0]) {
                    const newLocation: MapLocation = {
                      address: results[0].formatted_address,
                      latitude: latLng.lat(),
                      longitude: latLng.lng(),
                    };
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
    [onLocationChange]
  );

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    setIsLoading(true);
    setError(null);

    try {
      // Default center (London, UK) - center of UK
      const defaultCenter = { lat: 54.7024, lng: -3.2766 }; // Geographic center of UK
      let mapCenter = defaultCenter;

      // If we have an initial address, try to geocode it
      if (initialAddress.trim()) {
        const geocoderInstance = new google.maps.Geocoder();
        geocoderInstance.geocode(
          { address: initialAddress },
          (results, status) => {
            if (status === "OK" && results && results[0]) {
              const location = results[0].geometry.location;
              mapCenter = { lat: location.lat(), lng: location.lng() };
              initializeMapWithCenter(mapCenter, results[0].formatted_address);
            } else {
              // If geocoding fails, use default center
              initializeMapWithCenter(mapCenter, initialAddress);
            }
          }
        );
      } else {
        initializeMapWithCenter(mapCenter, "");
      }
    } catch (err) {
      console.error("Error initializing map:", err);
      setError(
        "Failed to initialize map. Please check your internet connection."
      );
      setIsLoading(false);
    }
  }, [initialAddress, initializeMapWithCenter]);

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

    // If Google Maps API is already loaded, initialize immediately
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeMapCallback();
    } else if (existingScript) {
      // Script is already being loaded, wait for it
      const handleLoad = () => {
        if (isMounted) {
          initializeMapCallback();
        }
      };

      if (existingScript.getAttribute("data-loaded") === "true") {
        // Script already loaded
        initializeMapCallback();
      } else {
        existingScript.addEventListener("load", handleLoad);
        return () => {
          isMounted = false;
          if (timeoutId) clearTimeout(timeoutId);
          existingScript.removeEventListener("load", handleLoad);
        };
      }
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
  }, []); // Empty dependency array - only run once on mount

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
    <div className={`space-y-3 ${className}`}>
      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="h-64 w-full overflow-hidden rounded-lg border border-white/20"
          style={{ minHeight: "256px" }}
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

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/80 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-primary,#38bdf8)]" />
              <span className="text-sm text-muted-foreground">Loading map...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center rounded-lg">
            <div className="text-center p-4">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                onClick={initializeMap}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Location Info */}
      {currentLocation && !isLoading && (
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
