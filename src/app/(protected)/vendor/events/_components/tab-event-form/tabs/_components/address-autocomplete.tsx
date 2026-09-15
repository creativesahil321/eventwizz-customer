"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { FieldClearButton } from "@/components/ui/field-clear-button";
import { cn } from "@/lib/utils";
import {
  isWithinVenueArea,
  venueAreaBoundsLiteral,
  VENUE_LOCATION_RADIUS_M,
} from "@/lib/venue-location-address";

interface Suggestion {
  description: string;
  place_id: string;
  formatted_address?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect?: (placeId: string, address: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Matches vendor dark surfaces (e.g. AI event collect). Default: light input. */
  variant?: "default" | "dark";
  /**
   * Bias predictions toward the vendor’s selected city (e.g. Bristol)
   * so suggestions don’t default to London.
   */
  biasCity?: string | null;
  /** Optional parent venue coords — preferred over geocoding biasCity. */
  biasLatitude?: number | string | null;
  biasLongitude?: number | string | null;
  onResolved?: (details: {
    placeId: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onFocus,
  onBlur,
  placeholder = "Type to search for a UK address or location...",
  className = "",
  autoFocus = false,
  variant = "default",
  biasCity = null,
  biasLatitude = null,
  biasLongitude = null,
  onResolved,
}: AddressAutocompleteProps) {
  const isDark = variant === "dark";
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const biasCoordsRef = useRef<google.maps.LatLngLiteral | null>(null);

  const loadGooglePlacesScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }

      const existingScript = document.getElementById(
        "google-maps-places-script"
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Google Maps script failed to load")),
          { once: true }
        );
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
        return;
      }

      const script = document.createElement("script");
      script.id = "google-maps-places-script";
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Google Maps script failed to load"));
      document.head.appendChild(script);
    });
  };

  // Handle autofocus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Initialize Google Places services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await loadGooglePlacesScript();
        autocompleteService.current = new google.maps.places.AutocompleteService();

        // Create a hidden div for PlacesService (required by Google Maps API)
        const hiddenDiv = document.createElement("div");
        document.body.appendChild(hiddenDiv);
        placesService.current = new google.maps.places.PlacesService(hiddenDiv);
      } catch (error) {
        console.error("Error initializing Google Places services:", error);
      }
    };

    void initializeServices();
  }, []);

  // Prefer parent venue lat/lng; otherwise geocode the selected city once.
  useEffect(() => {
    const lat =
      biasLatitude == null || biasLatitude === ""
        ? null
        : Number(biasLatitude);
    const lng =
      biasLongitude == null || biasLongitude === ""
        ? null
        : Number(biasLongitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      biasCoordsRef.current = { lat: lat as number, lng: lng as number };
      return;
    }

    const city = biasCity?.trim();
    if (!city) {
      biasCoordsRef.current = null;
      return;
    }
    let cancelled = false;
    const resolveBias = async () => {
      try {
        await loadGooglePlacesScript();
        if (!window.google?.maps || cancelled) return;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { address: `${city}, UK`, componentRestrictions: { country: "GB" } },
          (results, status) => {
            if (cancelled) return;
            if (status === "OK" && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              biasCoordsRef.current = { lat: loc.lat(), lng: loc.lng() };
            }
          },
        );
      } catch {
        biasCoordsRef.current = null;
      }
    };
    void resolveBias();
    return () => {
      cancelled = true;
    };
  }, [biasCity, biasLatitude, biasLongitude]);

  // Check if we have a selected value
  useEffect(() => {
    if (value && !searchQuery) {
      setIsSelected(true);
    }
  }, [value, searchQuery]);

  const handleInputChange = (inputValue: string) => {
    if (isSelected) return; // Prevent changes if already selected

    setSearchQuery(inputValue);
    onChange(inputValue);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear previous safety timeout
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    if (inputValue.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Safety timeout to prevent infinite loading (5 seconds)
    safetyTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
      console.warn("Search timeout - stopping loading state");
    }, 5000);

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      if (autocompleteService.current && inputValue.trim()) {
        const city = biasCity?.trim();
        const bias = biasCoordsRef.current;
        const request: google.maps.places.AutocompletionRequest & {
          strictBounds?: boolean;
        } = {
          input: inputValue,
          types: ["geocode"],
          componentRestrictions: { country: ["gb"] },
        };
        if (bias) {
          const box = venueAreaBoundsLiteral(bias);
          request.location = new google.maps.LatLng(bias.lat, bias.lng);
          request.radius = VENUE_LOCATION_RADIUS_M;
          request.bounds = new google.maps.LatLngBounds(
            { lat: box.south, lng: box.west },
            { lat: box.north, lng: box.east },
          );
          request.strictBounds = true;
        }
        // Nudge ranking when the query doesn't already name the city.
        if (
          city &&
          !inputValue.toLowerCase().includes(city.toLowerCase())
        ) {
          request.input = `${inputValue} ${city}`;
        }

        autocompleteService.current.getPlacePredictions(
          request,
          (predictions, status) => {
            // Clear safety timeout
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current);
              safetyTimeoutRef.current = null;
            }

            setIsSearching(false);
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              setSuggestions(
                predictions.map((prediction) => ({
                  description: prediction.description,
                  place_id: prediction.place_id,
                })),
              );
            } else {
              setSuggestions([]);
              console.warn("Google Places API error:", status);
            }
          },
        );
      } else {
        // Clear safety timeout
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }

        // If services are not ready, stop loading
        setIsSearching(false);
        setSuggestions([]);
        console.warn("Google Places services not initialized");
      }
    }, 300);
  };

  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    setAreaError(null);

    const finishSelect = (
      address: string,
      latitude: number | null = null,
      longitude: number | null = null,
    ) => {
      onChange(address);
      setSuggestions([]);
      setSearchQuery("");
      setIsSelected(true);
      onSelect?.(suggestion.place_id, address);
      onResolved?.({
        placeId: suggestion.place_id,
        address,
        latitude,
        longitude,
      });
    };

    const rejectOutside = () => {
      setAreaError(
        `That address is outside ${biasCity?.trim() || "your selected location"} (about ${Math.round(VENUE_LOCATION_RADIUS_M / 1000)}km). Pick somewhere nearer.`,
      );
      setSuggestions([]);
      setIsSelected(false);
    };

    if (placesService.current) {
      placesService.current.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ["formatted_address", "geometry"],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const loc = place.geometry?.location;
            const bias = biasCoordsRef.current;
            if (loc && bias) {
              const point = { lat: loc.lat(), lng: loc.lng() };
              if (!isWithinVenueArea(point, bias)) {
                rejectOutside();
                return;
              }
            }
            finishSelect(
              place.formatted_address || suggestion.description,
              loc ? loc.lat() : null,
              loc ? loc.lng() : null,
            );
          } else {
            finishSelect(suggestion.description);
          }
        },
      );
      return;
    }

    finishSelect(suggestion.description);
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setSuggestions([]);
    setIsSelected(false);
    setAreaError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleFocus = () => {
    // Call the onFocus prop if provided
    if (onFocus) {
      onFocus();
    }

    if (isSelected) {
      // If already selected, show suggestions for the current value
      if (value && autocompleteService.current) {
        setIsSearching(true);
        const city = biasCity?.trim();
        const bias = biasCoordsRef.current;
        const request: google.maps.places.AutocompletionRequest & {
          strictBounds?: boolean;
        } = {
          input: value,
          types: ["geocode"],
          componentRestrictions: { country: ["gb"] },
        };
        if (bias) {
          const box = venueAreaBoundsLiteral(bias);
          request.location = new google.maps.LatLng(bias.lat, bias.lng);
          request.radius = VENUE_LOCATION_RADIUS_M;
          request.bounds = new google.maps.LatLngBounds(
            { lat: box.south, lng: box.west },
            { lat: box.north, lng: box.east },
          );
          request.strictBounds = true;
        }
        if (city && !value.toLowerCase().includes(city.toLowerCase())) {
          request.input = `${value} ${city}`;
        }
        autocompleteService.current.getPlacePredictions(
          request,
          (predictions, status) => {
            setIsSearching(false);
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              setSuggestions(
                predictions.map((prediction) => ({
                  description: prediction.description,
                  place_id: prediction.place_id,
                })),
              );
            }
          },
        );
      }
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, []);

  const inputClassName = cn(
    isDark
      ? `h-10 w-full rounded-md border px-3 text-sm shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#3b82f6)]/40 focus-visible:ring-offset-0 ${
          isSelected
            ? "border-emerald-500/35 bg-emerald-950/25 text-slate-100 cursor-default"
            : "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
        }`
      : `w-full border p-2 rounded ${
          isSelected ? "bg-green-50 cursor-not-allowed" : "bg-white"
        }`,
    (isSelected || Boolean(value?.trim()) || Boolean(searchQuery.trim())) &&
      "pr-12",
  );

  const displayValue = isSelected ? value : searchQuery;
  const showClear = Boolean(
    displayValue?.trim() || (isSelected && value?.trim()),
  );

  return (
    <div className={`relative w-full ${className}`}>
      <Input
        ref={inputRef}
        className={inputClassName}
        value={displayValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleInputChange(e.target.value)
        }
        onFocus={handleFocus}
        onBlur={onBlur}
        placeholder={isSelected ? "" : placeholder}
        readOnly={isSelected}
      />

      {areaError && (
        <p
          className={
            isDark
              ? "mt-1.5 text-xs text-amber-200/90"
              : "mt-1.5 text-xs text-amber-700"
          }
        >
          {areaError}
        </p>
      )}

      {isSearching && !isSelected && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${showClear ? "right-11" : "right-3"}`}
        >
          <div
            className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
              isDark ? "border-[var(--color-primary,#3b82f6)]" : "border-blue-600"
            }`}
          />
        </div>
      )}

      {showClear && (
        <FieldClearButton
          variant={isDark ? "dark" : "default"}
          onClick={handleClear}
        />
      )}

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && !isSelected && searchQuery && (
        <div
          className={
            isDark
              ? "absolute z-[100] w-full mt-1 rounded-lg border border-white/15 bg-slate-900 shadow-2xl shadow-black/50 max-h-60 overflow-y-auto"
              : "absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          }
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className={
                isDark
                  ? "px-3 py-2.5 cursor-pointer border-b border-white/5 last:border-b-0 hover:bg-white/[0.06] text-left"
                  : "px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              }
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-start gap-2">
                <span className={isDark ? "text-slate-500 shrink-0" : "text-gray-400"}>
                  📍
                </span>
                <span
                  className={
                    isDark ? "text-sm text-slate-200 leading-snug" : "text-sm text-gray-800"
                  }
                >
                  {suggestion.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {searchQuery &&
        suggestions.length === 0 &&
        !isSearching &&
        !isSelected &&
        searchQuery.length >= 2 && (
          <div
            className={
              isDark
                ? "absolute z-[100] w-full mt-1 rounded-lg border border-amber-500/25 bg-amber-950 p-3 shadow-lg"
                : "absolute z-[100] w-full mt-1 rounded-md border border-amber-200 bg-amber-50 p-4 shadow-lg dark:border-amber-800 dark:bg-amber-950"
            }
          >
            <p
              className={
                isDark ? "text-xs text-amber-100/90 leading-relaxed" : "text-sm text-amber-800 dark:text-amber-200"
              }
            >
              Google didn&apos;t find that location. Try a different search or
              pick a suggestion from the list.
            </p>
          </div>
        )}

      {/* Google Places API not available message */}
      {searchQuery &&
        searchQuery.length >= 2 &&
        !isSearching &&
        !autocompleteService.current && (
          <div
            className={
              isDark
                ? "absolute z-[100] w-full mt-1 rounded-lg border border-yellow-500/30 bg-yellow-950 p-3 shadow-lg"
                : "absolute z-[100] w-full mt-1 bg-yellow-50 border border-yellow-300 rounded-md shadow-lg p-4"
            }
          >
            <div
              className={`flex items-start gap-2 ${isDark ? "text-yellow-100/90 text-xs" : "text-yellow-700"}`}
            >
              <span>⚠️</span>
              <span className={isDark ? "" : "text-sm"}>
                Address search is unavailable. Please check your connection or
                try again shortly.
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
