"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

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
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onFocus,
  placeholder = "Type to search for a UK address or location...",
  className = "",
  autoFocus = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const initializeServices = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          autocompleteService.current =
            new google.maps.places.AutocompleteService();

          // Create a hidden div for PlacesService (required by Google Maps API)
          const hiddenDiv = document.createElement("div");
          document.body.appendChild(hiddenDiv);
          placesService.current = new google.maps.places.PlacesService(
            hiddenDiv
          );
        } catch (error) {
          console.error("Error initializing Google Places services:", error);
        }
      }
    };

    // Try to initialize immediately
    initializeServices();

    // Also try after a short delay in case Google Maps is still loading
    const timeout = setTimeout(initializeServices, 1000);

    return () => clearTimeout(timeout);
  }, []);

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
        autocompleteService.current.getPlacePredictions(
          {
            input: inputValue,
            types: ["geocode"], // Use geocode which includes addresses and places
            componentRestrictions: { country: ["gb"] }, // Restrict to UK only
          },
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
                }))
              );
            } else {
              setSuggestions([]);
              console.warn("Google Places API error:", status);
            }
          }
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
    onChange(suggestion.description);
    setSuggestions([]);
    setSearchQuery("");
    setIsSelected(true);

    if (onSelect && placesService.current) {
      // Get detailed place information
      placesService.current.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ["formatted_address", "geometry"],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            onSelect(
              suggestion.place_id,
              place.formatted_address || suggestion.description
            );
          } else {
            onSelect(suggestion.place_id, suggestion.description);
          }
        }
      );
    }
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setSuggestions([]);
    setIsSelected(false);
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
        autocompleteService.current.getPlacePredictions(
          {
            input: value,
            types: ["geocode"], // Use geocode which includes addresses and places
            componentRestrictions: { country: ["gb"] }, // Restrict to UK only
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
                }))
              );
            }
          }
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

  return (
    <div className={`relative w-full ${className}`}>
      <Input
        ref={inputRef}
        className={`w-full border p-2 rounded ${
          isSelected ? "bg-green-50 cursor-not-allowed" : "bg-white"
        }`}
        value={isSelected ? value : searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleInputChange(e.target.value)
        }
        onFocus={handleFocus}
        placeholder={isSelected ? "" : placeholder}
        readOnly={isSelected}
      />

      {/* Loading spinner */}
      {isSearching && !isSelected && (
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Clear button */}
      {isSelected && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-red-600 transition-colors font-bold"
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      )}

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && !isSelected && searchQuery && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">📍</span>
                <span className="text-sm text-gray-800">
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
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
            <div className="flex items-center space-x-2 text-gray-500">
              <span>🔍</span>
              <span className="text-sm">
                No UK addresses found. Try a different search term or use the
                map below to set your location manually.
              </span>
            </div>
          </div>
        )}

      {/* Google Places API not available message */}
      {searchQuery &&
        searchQuery.length >= 2 &&
        !isSearching &&
        !autocompleteService.current && (
          <div className="absolute z-50 w-full mt-1 bg-yellow-50 border border-yellow-300 rounded-md shadow-lg p-4">
            <div className="flex items-center space-x-2 text-yellow-700">
              <span>⚠️</span>
              <span className="text-sm">
                Address search is temporarily unavailable. Please use the map
                below to set your location.
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
