"use client";

import React, { useState, useEffect, useRef, forwardRef } from "react";
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
  /** Optional: override input styles (e.g. dark theme) */
  inputClassName?: string;
  /** Optional: override suggestions dropdown styles (e.g. dark theme) */
  suggestionsClassName?: string;
  /** Use "dark" for dark backgrounds (e.g. review card) */
  variant?: "default" | "dark";
}

const AddressAutocomplete = forwardRef<
  HTMLInputElement,
  AddressAutocompleteProps
>(function AddressAutocomplete(
  {
    value,
    onChange,
    onSelect,
    onFocus,
    placeholder = "Type to search for a UK address or location...",
    className = "",
    autoFocus = false,
    inputClassName,
    suggestionsClassName,
    variant = "default",
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
      ? "absolute z-50 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto"
      : "absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto");
  const suggestionItemTextClass = isDark ? "text-slate-200" : "text-gray-800";
  const clearButtonClass = isDark
    ? "text-slate-400 hover:text-red-400"
    : "text-gray-400 hover:text-red-600";
  const noResultsClass = isDark
    ? "absolute z-50 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl p-4 text-slate-400 text-sm"
    : "absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-gray-500 text-sm";
  const unavailableClass = isDark
    ? "absolute z-50 w-full mt-1 bg-amber-900/30 border border-amber-500/30 rounded-lg shadow-xl p-4 text-amber-200 text-sm"
    : "absolute z-50 w-full mt-1 bg-yellow-50 border border-yellow-300 rounded-md shadow-lg p-4 text-yellow-700 text-sm";
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

  // Initialize Google Places services
  useEffect(() => {
    const initializeServices = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          autocompleteService.current =
            new google.maps.places.AutocompleteService();

          const hiddenDiv = document.createElement("div");
          document.body.appendChild(hiddenDiv);
          placesService.current = new google.maps.places.PlacesService(
            hiddenDiv,
          );
        } catch (error) {
          console.error("Error initializing Google Places services:", error);
        }
      }
    };

    initializeServices();
    const timeout = setTimeout(initializeServices, 1000);

    return () => clearTimeout(timeout);
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
            types: ["geocode"],
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

    if (onSelect && placesService.current) {
      placesService.current.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ["formatted_address", "geometry"],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            onSelect(
              suggestion.place_id,
              place.formatted_address || suggestion.description,
            );
          } else {
            onSelect(suggestion.place_id, suggestion.description);
          }
        },
      );
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
            types: ["geocode"],
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

  return (
    <div className={`relative w-full ${className}`}>
      <Input
        ref={setInputRef}
        className={
          resolvedInputClassName ??
          `w-full border p-2 rounded ${isSelected ? "bg-green-50 cursor-not-allowed" : "bg-white"}`
        }
        value={isSelected ? value : searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleInputChange(e.target.value)
        }
        onFocus={handleFocus}
        placeholder={isSelected ? "" : placeholder}
        readOnly={isSelected}
        autoFocus={autoFocus}
      />

      {isSearching && !isSelected && (
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {isSelected && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <button
            type="button"
            onClick={handleClear}
            className={`${clearButtonClass} transition-colors font-bold`}
            title="Clear selection"
          >
            ✕
          </button>
        </div>
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
                No UK addresses found. Try a different search term or use the
                map below to set your location manually.
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
                Address search is temporarily unavailable. Please use the map
                below to set your location.
              </span>
            </div>
          </div>
        )}
    </div>
  );
});

AddressAutocomplete.displayName = "AddressAutocomplete";

export default AddressAutocomplete;
