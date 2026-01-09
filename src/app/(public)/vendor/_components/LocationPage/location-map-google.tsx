"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion } from "framer-motion";
import { env } from "@/env";

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

export default function GoogleLocationMap({
  locations,
  onSelect,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Build address for geocoding (use address if available, otherwise use city/name)
      const address =
        ("address" in location && location.address ? location.address : name) +
        ", UK";

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

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    try {
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

      // Create map with professional styling
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        mapId: "DEMO_MAP_ID", // Required for Advanced Markers
        // Removed strict bounds restriction to allow viewing all locations
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#a8d5e5" }],
          },
          {
            featureType: "landscape",
            elementType: "geometry",
            stylers: [{ color: "#f5f5f5" }],
          },
        ],
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

      // Create markers for each location
      locationMarkers.forEach((location) => {
        // Create custom marker HTML
        const markerDiv = document.createElement("div");
        markerDiv.className = "custom-location-marker";
        markerDiv.innerHTML = `
          <div class="marker-container" style="
            position: relative;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <div class="marker-pin" style="
              background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
              width: 48px;
              height: 48px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid #ffffff;
              box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3), 0 0 20px rgba(30, 41, 59, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
            ">
              <div style="
                transform: rotate(45deg);
                color: white;
                font-weight: bold;
                font-size: 20px;
              ">📍</div>
            </div>
            <div class="marker-label" style="
              position: absolute;
              top: 60px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
              color: white;
              padding: 8px 16px;
              border-radius: 8px;
              white-space: nowrap;
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.3px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
              border: 2px solid #334155;
              pointer-events: none;
              opacity: 0;
              transition: all 0.3s ease;
            ">${location.name}</div>
          </div>
        `;

        // Hover effects
        markerDiv.addEventListener("mouseenter", () => {
          const pin = markerDiv.querySelector(".marker-pin") as HTMLElement;
          const label = markerDiv.querySelector(".marker-label") as HTMLElement;
          if (pin) {
            pin.style.transform = "rotate(-45deg) scale(1.15)";
            pin.style.boxShadow =
              "0 12px 24px rgba(0, 0, 0, 0.4), 0 0 30px rgba(59, 130, 246, 0.6)";
            pin.style.background =
              "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
          }
          if (label) {
            label.style.opacity = "1";
            label.style.transform = "translateX(-50%) translateY(-5px)";
          }
        });

        markerDiv.addEventListener("mouseleave", () => {
          const pin = markerDiv.querySelector(".marker-pin") as HTMLElement;
          const label = markerDiv.querySelector(".marker-label") as HTMLElement;
          if (pin) {
            pin.style.transform = "rotate(-45deg) scale(1)";
            pin.style.boxShadow =
              "0 8px 16px rgba(0, 0, 0, 0.3), 0 0 20px rgba(30, 41, 59, 0.4)";
            pin.style.background =
              "linear-gradient(135deg, #1e293b 0%, #334155 100%)";
          }
          if (label) {
            label.style.opacity = "0";
            label.style.transform = "translateX(-50%) translateY(0)";
          }
        });

        // Create Advanced Marker
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstance,
          position: { lat: location.lat, lng: location.lng },
          content: markerDiv,
          title: location.name,
        });

        // Add click handler
        markerDiv.addEventListener("click", () => {
          onSelect(location.slug);

          // Highlight marker
          const pin = markerDiv.querySelector(".marker-pin") as HTMLElement;
          if (pin) {
            pin.style.background =
              "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            setTimeout(() => {
              pin.style.background =
                "linear-gradient(135deg, #1e293b 0%, #334155 100%)";
            }, 2000);
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
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to load map. Please refresh the page.");
      setIsLoading(false);
    }
  }, [locationMarkers, onSelect]);

  // Initialize Google Maps
  useEffect(() => {
    let isMounted = true;

    const loadGoogleMaps = () => {
      const existingScript = document.querySelector(
        `script[src*="maps.googleapis.com"]`
      );

      if (window.google && window.google.maps) {
        initializeMap();
      } else if (existingScript) {
        const handleLoad = () => {
          if (isMounted) initializeMap();
        };
        existingScript.addEventListener("load", handleLoad);
        return () => {
          isMounted = false;
          existingScript.removeEventListener("load", handleLoad);
        };
      } else {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker&v=beta`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) initializeMap();
        };
        script.onerror = () => {
          if (isMounted) {
            setError("Failed to load Google Maps. Please check your API key.");
            setIsLoading(false);
          }
        };
        document.head.appendChild(script);
      }
    };

    loadGoogleMaps();

    return () => {
      isMounted = false;
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [initializeMap]);

  return (
    <div className="relative w-full">
      <motion.div
        className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ minHeight: "700px" }}
      >
        {/* Title */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 py-6 px-8 text-center border-b border-slate-600">
          <h2 className="text-3xl font-extrabold text-white tracking-wider drop-shadow-lg">
            Available Locations
          </h2>
          <p className="text-slate-300 text-sm mt-2 font-medium">
            Click on a location to explore events
          </p>
        </div>

        {/* Map Container */}
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full bg-gray-100"
            style={{ height: "600px" }}
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-700"></div>
                <span className="text-lg text-gray-600 font-medium">
                  Loading interactive map...
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <p className="text-lg text-red-600 font-semibold mb-4">
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!isLoading && !error && (
          <div className="bg-gray-50 py-4 px-8 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-slate-700 rounded-full animate-pulse"></div>
                <span className="font-medium">
                  {locationMarkers.length} Location
                  {locationMarkers.length !== 1 ? "s" : ""} Available
                </span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="flex items-center space-x-2">
                <span>🖱️</span>
                <span>Click any marker to view events</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
