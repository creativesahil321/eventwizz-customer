"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { env } from "@/env";
import {
  isWithinVenueArea,
  venueAreaBoundsLiteral,
  VENUE_LOCATION_RADIUS_M,
  type LatLngLiteral,
} from "@/lib/venue-location-address";

interface EventLocationMapProps {
  initialAddress?: string;
  /** When set with longitude, map opens on these coords (edit hydrate). */
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  /** Parent venue pin — map pan + pin clicks stay inside this area. */
  restrictLatitude?: number | null;
  restrictLongitude?: number | null;
  /** Shown in “outside area” errors (e.g. Bristol). */
  restrictLabel?: string | null;
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

const UK_BOUNDS = {
  north: 60.9,
  south: 49.8,
  east: 1.8,
  west: -8.2,
};

function isFiniteCoord(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export default function EventLocationMap({
  initialAddress = "",
  initialLatitude,
  initialLongitude,
  restrictLatitude,
  restrictLongitude,
  restrictLabel = null,
  onLocationChange,
  onAddressSearch,
  className = "",
}: EventLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const lastValidPositionRef = useRef<LatLngLiteral | null>(null);
  const restrictCenterRef = useRef<LatLngLiteral | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaWarning, setAreaWarning] = useState<string | null>(null);

  const areaLabel = restrictLabel?.trim() || "your selected location";

  useEffect(() => {
    if (
      isFiniteCoord(restrictLatitude) &&
      isFiniteCoord(restrictLongitude)
    ) {
      restrictCenterRef.current = {
        lat: restrictLatitude,
        lng: restrictLongitude,
      };
    } else {
      restrictCenterRef.current = null;
    }
  }, [restrictLatitude, restrictLongitude]);

  const outsideAreaMessage = useCallback(
    () =>
      `Choose a pin within ${areaLabel} (about ${Math.round(VENUE_LOCATION_RADIUS_M / 1000)}km of the venue).`,
    [areaLabel],
  );

  const acceptPoint = useCallback(
    (point: LatLngLiteral): boolean => {
      const center = restrictCenterRef.current;
      if (!isWithinVenueArea(point, center)) {
        setAreaWarning(outsideAreaMessage());
        return false;
      }
      setAreaWarning(null);
      lastValidPositionRef.current = point;
      return true;
    },
    [outsideAreaMessage],
  );

  const reverseGeocodeAndCommit = useCallback(
    (point: LatLngLiteral) => {
      if (!geocoderRef.current) return;
      geocoderRef.current.geocode(
        { location: point },
        (results, status) => {
          if (status === "OK" && results?.[0]) {
            const newLocation: MapLocation = {
              address: results[0].formatted_address,
              latitude: point.lat,
              longitude: point.lng,
            };
            setCurrentLocation(newLocation);
            onLocationChange(newLocation);
          } else {
            const newLocation: MapLocation = {
              address: `Location (${point.lat.toFixed(6)}, ${point.lng.toFixed(6)})`,
              latitude: point.lat,
              longitude: point.lng,
            };
            setCurrentLocation(newLocation);
            onLocationChange(newLocation);
          }
        },
      );
    },
    [onLocationChange],
  );

  const handleAddressSearch = useCallback(
    (address: string) => {
      if (!geocoderRef.current || !mapInstanceRef.current || !markerRef.current)
        return;

      setIsLoading(true);
      setError(null);
      setAreaWarning(null);

      geocoderRef.current.geocode({ address }, (results, status) => {
        setIsLoading(false);

        if (status === "OK" && results?.[0]) {
          const location = results[0].geometry.location;
          const newCenter = { lat: location.lat(), lng: location.lng() };

          if (!acceptPoint(newCenter)) {
            const fallback = lastValidPositionRef.current || restrictCenterRef.current;
            if (fallback && markerRef.current) {
              markerRef.current.setPosition(fallback);
              mapInstanceRef.current?.setCenter(fallback);
            }
            return;
          }

          mapInstanceRef.current?.setCenter(newCenter);
          mapInstanceRef.current?.setZoom(15);
          markerRef.current?.setPosition(newCenter);

          const newLocation: MapLocation = {
            address: results[0].formatted_address,
            latitude: newCenter.lat,
            longitude: newCenter.lng,
          };
          setCurrentLocation(newLocation);
          onLocationChange(newLocation);
        } else {
          setError(
            "Address not found. Please try a different address or manually select the location on the map.",
          );
        }
      });
    },
    [acceptPoint, onLocationChange],
  );

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
      const restrictCenter =
        isFiniteCoord(restrictLatitude) && isFiniteCoord(restrictLongitude)
          ? { lat: restrictLatitude, lng: restrictLongitude }
          : null;
      restrictCenterRef.current = restrictCenter;

      const mapBounds = restrictCenter
        ? venueAreaBoundsLiteral(restrictCenter)
        : UK_BOUNDS;

      try {
        const geocoderInstance = new google.maps.Geocoder();
        geocoderRef.current = geocoderInstance;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: restrictCenter ? 12 : 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          restriction: {
            latLngBounds: mapBounds,
            strictBounds: true,
          },
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
          disableDefaultUI: true,
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

        const allowedBounds = new google.maps.LatLngBounds(
          { lat: mapBounds.south, lng: mapBounds.west },
          { lat: mapBounds.north, lng: mapBounds.east },
        );

        mapInstance.addListener("dragend", () => {
          const mapCenter = mapInstance.getCenter();
          if (mapCenter && !allowedBounds.contains(mapCenter)) {
            mapInstance.setCenter({
              lat: Math.max(
                mapBounds.south,
                Math.min(mapBounds.north, mapCenter.lat()),
              ),
              lng: Math.max(
                mapBounds.west,
                Math.min(mapBounds.east, mapCenter.lng()),
              ),
            });
          }
        });

        const startPoint = acceptPoint(center)
          ? center
          : restrictCenter || center;
        lastValidPositionRef.current = startPoint;

        const markerInstance = new google.maps.Marker({
          position: startPoint,
          map: mapInstance,
          draggable: true,
          title: restrictCenter
            ? `Event location — stay within ${areaLabel}`
            : "Event location — drag the pin to adjust",
          animation: google.maps.Animation.DROP,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new google.maps.Size(40, 40),
          },
        });

        markerRef.current = markerInstance;

        const initialLocation: MapLocation = {
          address: address || "Selected location",
          latitude: startPoint.lat,
          longitude: startPoint.lng,
        };
        setCurrentLocation(shouldCommit ? initialLocation : null);
        if (shouldCommit && acceptPoint(startPoint)) {
          onLocationChange(initialLocation);
        }

        markerInstance.addListener("dragend", () => {
          const position = markerInstance.getPosition();
          if (!position) return;
          const point = { lat: position.lat(), lng: position.lng() };

          if (!acceptPoint(point)) {
            const fallback =
              lastValidPositionRef.current || restrictCenter || startPoint;
            markerInstance.setPosition(fallback);
            return;
          }

          reverseGeocodeAndCommit(point);
        });

        mapInstance.addListener("click", (event: google.maps.MapMouseEvent) => {
          const latLng = event.latLng;
          if (!latLng || !markerRef.current) return;
          const point = { lat: latLng.lat(), lng: latLng.lng() };

          if (!acceptPoint(point)) {
            return;
          }

          markerRef.current.setPosition(latLng);
          reverseGeocodeAndCommit(point);
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error creating map:", err);
        setError("Failed to create map. Please try again.");
        setIsLoading(false);
      }
    },
    [
      acceptPoint,
      areaLabel,
      onLocationChange,
      restrictLatitude,
      restrictLongitude,
      reverseGeocodeAndCommit,
    ],
  );

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    setIsLoading(true);
    setError(null);

    try {
      const ukOverviewCenter = { lat: 54.7024, lng: -3.2766 };
      const hasStoredCoords =
        isFiniteCoord(initialLatitude) && isFiniteCoord(initialLongitude);
      const address = initialAddress.trim();
      const restrictCenter =
        isFiniteCoord(restrictLatitude) && isFiniteCoord(restrictLongitude)
          ? { lat: restrictLatitude, lng: restrictLongitude }
          : null;

      if (hasStoredCoords) {
        const stored = { lat: initialLatitude, lng: initialLongitude };
        // If saved pin is outside the parent area, open on the venue pin instead.
        if (restrictCenter && !isWithinVenueArea(stored, restrictCenter)) {
          initializeMapWithCenter(
            restrictCenter,
            address || "Selected location",
            { commit: false },
          );
          setAreaWarning(outsideAreaMessage());
          return;
        }
        initializeMapWithCenter(stored, address || "Selected location", {
          commit: true,
        });
        return;
      }

      if (address) {
        const geocoderInstance = new google.maps.Geocoder();
        geocoderInstance.geocode(
          { address, componentRestrictions: { country: "GB" } },
          (results, status) => {
            if (status === "OK" && results?.[0]) {
              const location = results[0].geometry.location;
              const point = { lat: location.lat(), lng: location.lng() };
              if (restrictCenter && !isWithinVenueArea(point, restrictCenter)) {
                initializeMapWithCenter(
                  restrictCenter,
                  address,
                  { commit: false },
                );
                setAreaWarning(outsideAreaMessage());
                return;
              }
              initializeMapWithCenter(
                point,
                results[0].formatted_address,
                { commit: true },
              );
            } else if (restrictCenter) {
              initializeMapWithCenter(restrictCenter, address, {
                commit: false,
              });
              setError(
                "Couldn’t place that address on the map. Search again or drag the pin.",
              );
              setIsLoading(false);
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
        return;
      }

      if (restrictCenter) {
        initializeMapWithCenter(restrictCenter, "", { commit: false });
        return;
      }

      initializeMapWithCenter(ukOverviewCenter, "", { commit: false });
    } catch (err) {
      console.error("Error initializing map:", err);
      setError(
        "Could not load the map. Please check your internet connection.",
      );
      setIsLoading(false);
    }
  }, [
    initialAddress,
    initialLatitude,
    initialLongitude,
    initializeMapWithCenter,
    outsideAreaMessage,
    restrictLatitude,
    restrictLongitude,
  ]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`,
    );

    const initializeMapCallback = () => {
      if (!isMounted) return;

      const tryInitialize = (attempts = 0) => {
        if (!isMounted) return;

        if (mapRef.current && window.google?.maps) {
          initializeMap();
        } else if (attempts < 10) {
          timeoutId = setTimeout(() => tryInitialize(attempts + 1), 200);
        } else {
          setError("Map container not ready. Please refresh the page.");
          setIsLoading(false);
        }
      };

      tryInitialize();
    };

    if (window.google?.maps?.places) {
      initializeMapCallback();
    } else if (existingScript) {
      const handleLoad = () => {
        if (isMounted) initializeMapCallback();
      };

      if (existingScript.getAttribute("data-loaded") === "true") {
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
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
      geocoderRef.current = null;
    };
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-64 rounded-lg border border-gray-300 overflow-hidden"
          style={{ minHeight: "256px" }}
        />

        {currentLocation && (
          <button
            type="button"
            onClick={() => {
              const lat = currentLocation.latitude;
              const lng = currentLocation.longitude;
              const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
              window.open(streetViewUrl, "_blank", "noopener,noreferrer");
            }}
            className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-700 text-white rounded-md p-2 shadow-md transition-colors z-20 group"
            title="View Street View for this location"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </button>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Loading map...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center rounded-lg">
            <div className="text-center p-4">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                type="button"
                onClick={initializeMap}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {areaWarning && !error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {areaWarning}
        </p>
      )}

      {currentLocation && !isLoading && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-gray-700 mb-1">
                Selected location:
              </p>
              <p className="text-gray-600 mb-1">{currentLocation.address}</p>
              <p className="text-gray-500">
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
