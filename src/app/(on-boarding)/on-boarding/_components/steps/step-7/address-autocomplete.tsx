"use client";

import React, { useState, useEffect, useRef, forwardRef } from "react";
import { loadGoogleMaps } from "@/lib/load-google-maps";
import { Input } from "@/components/ui/input";
import { FieldClearButton } from "@/components/ui/field-clear-button";
import { cityFromFormattedAddress } from "@/lib/city-from-formatted-address";
import { cn } from "@/lib/utils";
import { env } from "@/env";

export { cityFromFormattedAddress } from "@/lib/city-from-formatted-address";

interface Suggestion {
  description: string;
  place_id: string;
  formatted_address?: string;
}

export function cityFromGoogleAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): string | null {
  if (!components?.length) return null;
  const pick = (...types: string[]) =>
    components.find((component) =>
      types.some((type) => component.types.includes(type)),
    )?.long_name;
  return (
    pick("postal_town", "locality") ||
    pick("administrative_area_level_2") ||
    pick("administrative_area_level_1") ||
    null
  );
}

export function cityFromGooglePlace(place: {
  address_components?: google.maps.GeocoderAddressComponent[];
  formatted_address?: string | null;
}): string | null {
  return (
    cityFromGoogleAddressComponents(place.address_components) ||
    cityFromFormattedAddress(place.formatted_address)
  );
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect?: (placeId: string, address: string) => void;
  /** Extra place bits after Google details resolve. Phone is only set for business listings. */
  onResolved?: (details: {
    placeId: string;
    address: string;
    city: string | null;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
  }) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Optional: override input styles (e.g. dark theme) */
  inputClassName?: string;
  /** Optional: override suggestions dropdown styles (e.g. dark theme) */
  suggestionsClassName?: string;
  /** Use "dark" for dark backgrounds (e.g. review card) */
  variant?: "default" | "dark";
  noResultsMessage?: string;
  unavailableMessage?: string;
  /**
   * Include businesses in suggestions (not only street addresses).
   * Needed to pick up a phone number from Google Place Details.
   */
  includeEstablishments?: boolean;
}

const AddressAutocomplete = forwardRef<
  HTMLInputElement,
  AddressAutocompleteProps
>(function AddressAutocomplete(
  {
    value,
    onChange,
    onSelect,
    onResolved,
    onFocus,
    placeholder = "Type to search for a UK address or location...",
    className = "",
    autoFocus = false,
    inputClassName,
    suggestionsClassName,
    variant = "default",
    noResultsMessage,
    unavailableMessage,
    includeEstablishments = false,
  },
  ref,
) {
  const isDark = variant === "dark";
  const resolvedInputClassName =
    inputClassName ??
    (isDark
      ? "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
      : undefined);
  const resolvedSuggestionsClassName =
    suggestionsClassName ??
    (isDark
      ? "absolute z-[100] w-full mt-1 bg-slate-900 border border-white/15 rounded-lg shadow-2xl shadow-black/50 max-h-60 overflow-y-auto"
      : "absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto");
  const suggestionItemTextClass = isDark ? "text-slate-200" : "text-gray-800";
  const noResultsClass = isDark
    ? "absolute z-[100] w-full mt-1 bg-slate-900 border border-white/15 rounded-lg shadow-2xl shadow-black/50 p-4 text-slate-400 text-sm"
    : "absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-gray-500 text-sm";
  const unavailableClass = isDark
    ? "absolute z-[100] w-full mt-1 bg-amber-950 border border-amber-500/30 rounded-lg shadow-2xl p-4 text-amber-200 text-sm"
    : "absolute z-[100] w-full mt-1 bg-yellow-50 border border-yellow-300 rounded-md shadow-lg p-4 text-yellow-700 text-sm";
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setInputRef = (node: HTMLInputElement | null) => {
    localInputRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // Handle autofocus (prop or RHF shouldFocus via ref)
  useEffect(() => {
    if (autoFocus && localInputRef.current) {
      const timer = setTimeout(() => {
        localInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Load Places if another field has not already (brand-mode step 1 has no venue search).
  useEffect(() => {
    let cancelled = false;

    const attachServices = () => {
      if (!window.google?.maps?.places) return false;
      try {
        autocompleteService.current =
          new google.maps.places.AutocompleteService();
        const hiddenDiv = document.createElement("div");
        document.body.appendChild(hiddenDiv);
        placesService.current = new google.maps.places.PlacesService(hiddenDiv);
        return true;
      } catch (error) {
        console.error("Error initializing Google Places services:", error);
        return false;
      }
    };

    if (attachServices()) return;

    const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    // Shared loader — same apiKey + "places" options, injected once per page.
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) attachServices();
      })
      .catch((error) => {
        console.error("Failed to load Google Maps Places:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (value && !searchQuery) {
      setIsSelected(true);
    }
  }, [value, searchQuery]);

  const handleInputChange = (inputValue: string) => {
    if (isSelected) return;

    setSearchQuery(inputValue);
    onChange(inputValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

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

    safetyTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
      console.warn("Search timeout - stopping loading state");
    }, 5000);

    timeoutRef.current = setTimeout(() => {
      if (autocompleteService.current && inputValue.trim()) {
        autocompleteService.current.getPlacePredictions(
          {
            input: inputValue,
            ...(includeEstablishments ? {} : { types: ["geocode"] }),
            componentRestrictions: { country: ["gb"] },
          },
          (predictions, status) => {
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
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }

        setIsSearching(false);
        setSuggestions([]);
        console.warn("Google Places services not initialized");
      }
    }, 300);
  };

  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setSearchQuery("");
    setIsSelected(true);

    if (onSelect || onResolved) {
      const finish = (
        address: string,
        city: string | null,
        phone: string | null = null,
        latitude: number | null = null,
        longitude: number | null = null,
      ) => {
        onSelect?.(suggestion.place_id, address);
        onResolved?.({
          placeId: suggestion.place_id,
          address,
          city,
          phone,
          latitude,
          longitude,
        });
      };

      if (placesService.current) {
        placesService.current.getDetails(
          {
            placeId: suggestion.place_id,
            fields: [
              "formatted_address",
              "geometry",
              "address_components",
              "formatted_phone_number",
              "international_phone_number",
            ],
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              const phone =
                place.international_phone_number?.trim() ||
                place.formatted_phone_number?.trim() ||
                null;
              const loc = place.geometry?.location;
              finish(
                place.formatted_address || suggestion.description,
                cityFromGooglePlace({
                  address_components: place.address_components,
                  formatted_address: place.formatted_address,
                }),
                phone,
                loc ? loc.lat() : null,
                loc ? loc.lng() : null,
              );
            } else {
              finish(suggestion.description, null, null, null, null);
            }
          },
        );
      } else {
        finish(suggestion.description, null);
      }
    }
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setSuggestions([]);
    setIsSelected(false);
    localInputRef.current?.focus();
  };

  const handleFocus = () => {
    onFocus?.();

    if (isSelected) {
      if (value && autocompleteService.current) {
        setIsSearching(true);
        autocompleteService.current.getPlacePredictions(
          {
            input: value,
            ...(includeEstablishments ? {} : { types: ["geocode"] }),
            componentRestrictions: { country: ["gb"] },
          },
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

  const displayValue = isSelected ? value : searchQuery;
  const showClear = Boolean(displayValue?.trim() || (isSelected && value?.trim()));

  return (
    <div className={`relative w-full ${className}`}>
      <Input
        ref={setInputRef}
        className={cn(
          resolvedInputClassName ??
            `w-full border p-2 rounded ${isSelected ? "bg-green-50 cursor-not-allowed" : "bg-white"}`,
          showClear && "pr-12",
        )}
        value={displayValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleInputChange(e.target.value)
        }
        onFocus={handleFocus}
        placeholder={isSelected ? "" : placeholder}
        readOnly={isSelected}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        name="head-office-address-search"
        data-1p-ignore
        data-lpignore="true"
      />

      {isSearching && !isSelected && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${showClear ? "right-11" : "right-3"}`}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {showClear && (
        <FieldClearButton
          variant={isDark ? "dark" : "default"}
          onClick={handleClear}
        />
      )}

      {suggestions.length > 0 && !isSelected && searchQuery && (
        <div className={resolvedSuggestionsClassName}>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className={`px-4 py-3 cursor-pointer border-b last:border-b-0 hover:bg-white/10 ${isDark ? "border-white/5" : "border-gray-100"}`}
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-center space-x-2">
                <span className={isDark ? "text-slate-500" : "text-gray-400"}>
                  📍
                </span>
                <span className={`text-sm ${suggestionItemTextClass}`}>
                  {suggestion.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchQuery &&
        suggestions.length === 0 &&
        !isSearching &&
        !isSelected &&
        searchQuery.length >= 2 && (
          <div className={noResultsClass}>
            <div className="flex items-center space-x-2">
              <span>🔍</span>
              <span className="text-sm">
                {noResultsMessage ??
                  "No UK addresses found. Try a different search term or use the map below to set your location manually."}
              </span>
            </div>
          </div>
        )}

      {searchQuery &&
        searchQuery.length >= 2 &&
        !isSearching &&
        !autocompleteService.current && (
          <div className={unavailableClass}>
            <div className="flex items-center space-x-2">
              <span>⚠️</span>
              <span className="text-sm">
                {unavailableMessage ??
                  "Address search is temporarily unavailable. Please use the map below to set your location."}
              </span>
            </div>
          </div>
        )}
    </div>
  );
});

AddressAutocomplete.displayName = "AddressAutocomplete";

export default AddressAutocomplete;
