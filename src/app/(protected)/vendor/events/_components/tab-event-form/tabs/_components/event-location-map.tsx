"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { env } from "@/env";
import {
  isCoarseUkFallbackPin,
  isUnusableMapPin,
  shouldApplyMapCoords,
  shouldRefreshMapForAddress,
  type MapLatLng,
} from "@/lib/sync-event-location-map";
import {
  isGoogleMapsApiReady,
  resolveGoogleMapsLoadAction,
} from "@/lib/google-maps-ready";
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
  variant?: "default" | "dark";
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
  variant = "default",
}: EventLocationMapProps) {
  const isDark = variant === "dark";
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const lastValidPositionRef = useRef<LatLngLiteral | null>(null);
  const restrictCenterRef = useRef<LatLngLiteral | null>(null);
  const lastAppliedAddressRef = useRef("");
  const lastAppliedCoordsRef = useRef<MapLatLng | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaWarning, setAreaWarning] = useState<string | null>(null);

  const rememberApplied = (center: MapLatLng, address: string) => {
    lastAppliedCoordsRef.current = center;
    lastAppliedAddressRef.current = address.trim();
  };

  const refreshMapViewport = (center: MapLatLng) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
    map.setZoom(15);
  };

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
          rememberApplied(point, newLocation.address);
          setCurrentLocation(newLocation);
          onLocationChange(newLocation);
        } else {
          const newLocation: MapLocation = {
            address: `Location (${point.lat.toFixed(6)}, ${point.lng.toFixed(6)})`,
            latitude: point.lat,
            longitude: point.lng,
          };
          rememberApplied(point, newLocation.address);
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
          const types = Array.isArray(results[0].types) ? results[0].types : [];
          if (isUnusableMapPin(newCenter.lat, newCenter.lng, types)) {
            setError(
              "Couldn’t place that address on the map. Search again or drag the pin.",
            );
            return;
          }

          if (!acceptPoint(newCenter)) {
            const fallback = lastValidPositionRef.current || restrictCenterRef.current;
            if (fallback && markerRef.current) {
              markerRef.current.setPosition(fallback);
              mapInstanceRef.current?.setCenter(fallback);
            }
            return;
          }

          refreshMapViewport(newCenter);
          markerRef.current?.setPosition(newCenter);

          const newLocation: MapLocation = {
            address: results[0].formatted_address,
            latitude: newCenter.lat,
            longitude: newCenter.lng,
          };
          rememberApplied(newCenter, newLocation.address);
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

      const startPoint = acceptPoint(center)
        ? center
        : restrictCenter || center;

      if (mapInstanceRef.current && markerRef.current) {
        lastValidPositionRef.current = startPoint;
        refreshMapViewport(startPoint);
        markerRef.current.setPosition(startPoint);
        setMapReady(true);
        setIsLoading(false);
        if (shouldCommit && acceptPoint(startPoint) && !isUnusableMapPin(startPoint.lat, startPoint.lng)) {
          const next = {
            address: address || "Selected location",
            latitude: startPoint.lat,
            longitude: startPoint.lng,
          };
          rememberApplied(startPoint, address);
          setCurrentLocation(next);
          onLocationChange(next);
        }
        return;
      }

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
        setMapReady(true);
        if (
          shouldCommit &&
          acceptPoint(startPoint) &&
          !isUnusableMapPin(startPoint.lat, startPoint.lng)
        ) {
          rememberApplied(startPoint, address);
          setCurrentLocation(initialLocation);
          onLocationChange(initialLocation);
        } else {
          lastAppliedCoordsRef.current = startPoint;
          setCurrentLocation(null);
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
        isFiniteCoord(initialLatitude) &&
        isFiniteCoord(initialLongitude) &&
        !isCoarseUkFallbackPin(initialLatitude, initialLongitude);
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
          commit: false,
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

  const handleAddressSearchRef = useRef(handleAddressSearch);
  const acceptPointRef = useRef(acceptPoint);
  const onLocationChangeRef = useRef(onLocationChange);
  handleAddressSearchRef.current = handleAddressSearch;
  acceptPointRef.current = acceptPoint;
  onLocationChangeRef.current = onLocationChange;

  useEffect(() => {
    if (!mapReady) return;

    const address = initialAddress.trim();
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
      if (acceptPointRef.current(nextCoords)) {
        refreshMapViewport(nextCoords);
        markerRef.current?.setPosition(nextCoords);
        const next = {
          address: address || "Selected location",
          latitude: nextCoords.lat,
          longitude: nextCoords.lng,
        };
        rememberApplied(nextCoords, address);
        setCurrentLocation(next);
        setError(null);
        onLocationChangeRef.current(next);
      }
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
      handleAddressSearchRef.current(address);
    }, 50);

    return () => {
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = null;
      }
    };
  }, [initialAddress, initialLatitude, initialLongitude, mapReady]);

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
          className={
            isDark
              ? "h-64 w-full overflow-hidden rounded-lg border border-white/20"
              : "h-64 w-full overflow-hidden rounded-lg border border-gray-300"
          }
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

        {isLoading && !mapReady && (
          <div
            className={
              isDark
                ? "absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/80 backdrop-blur-sm"
                : "absolute inset-0 flex items-center justify-center rounded-lg bg-white/75"
            }
          >
            <div className="flex items-center space-x-2">
              <div
                className={
                  isDark
                    ? "h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-primary,#38bdf8)]"
                    : "h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"
                }
              />
              <span
                className={
                  isDark ? "text-sm text-slate-400" : "text-sm text-gray-600"
                }
              >
                Loading map...
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          className={
            isDark
              ? "flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              : "flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          }
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={initializeMap}
            className={
              isDark
                ? "shrink-0 rounded bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30"
                : "shrink-0 rounded bg-red-100 px-2 py-1 text-red-700 hover:bg-red-200"
            }
          >
            Retry
          </button>
        </div>
      )}

      {areaWarning && !error && (
        <p
          className={
            isDark
              ? "rounded-md border border-amber-500/25 bg-amber-950/60 px-3 py-2 text-xs text-amber-100/90"
              : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
          }
        >
          {areaWarning}
        </p>
      )}

      {currentLocation && (
        <div
          className={
            isDark
              ? "rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs"
              : "rounded-lg bg-gray-50 p-3 text-xs"
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p
                className={
                  isDark
                    ? "mb-1 font-medium text-slate-200"
                    : "mb-1 font-medium text-gray-700"
                }
              >
                Selected location:
              </p>
              <p
                className={
                  isDark ? "mb-1 text-slate-400" : "mb-1 text-gray-600"
                }
              >
                {currentLocation.address}
              </p>
              <p className={isDark ? "text-slate-500" : "text-gray-500"}>
                Coordinates: {currentLocation.latitude.toFixed(6)},{" "}
                {currentLocation.longitude.toFixed(6)}
              </p>
            </div>
            <div className="ml-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
