"use client";

import { Input } from "@/components/ui/input";
import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

type Suggestion = {
  description: string;
  place_id: string;
};

type Props = {
  apiKey: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (placeId: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

declare global {
  interface Window {
    google: typeof google;
  }
}

const GoogleLocationSearch: React.FC<Props> = ({
  apiKey,
  value,
  onChange,
  onSelect,
  onClear,
  placeholder = "Search for a location...",
  disabled = false,
  className = "",
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey,
      libraries: ["places"],
    });

    loader.load().then(() => {
      if (window.google?.maps?.places) {
        autocompleteService.current =
          new window.google.maps.places.AutocompleteService();
      }
    });
  }, [apiKey]);

  useEffect(() => {
    if (value && !searchQuery && !isSelected) {
      setIsSelected(true);
    }
  }, [value, searchQuery, isSelected]);

  const handleInputChange = (inputValue: string) => {
    if (isSelected) return;

    setSearchQuery(inputValue);
    onChange(inputValue);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
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
    }, 5000);

    debounceTimeout.current = setTimeout(() => {
      if (autocompleteService.current && inputValue.trim()) {
        autocompleteService.current.getPlacePredictions(
          {
            input: inputValue,
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "GB" },
          },
          (
            predictions: google.maps.places.AutocompletePrediction[] | null,
            status: google.maps.places.PlacesServiceStatus,
          ) => {
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
                predictions.map((p) => ({
                  description: p.description,
                  place_id: p.place_id,
                })),
              );
            } else {
              setSuggestions([]);
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
      }
    }, 300);
  };

  const handleSuggestionSelect = (sug: Suggestion) => {
    onChange(sug.description);
    setSuggestions([]);
    setSearchQuery("");
    setIsSelected(true);
    onSelect(sug.place_id);
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setSuggestions([]);
    setIsSelected(false);
    onClear?.();
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  const showNoResults =
    searchQuery.length >= 2 &&
    !isSearching &&
    suggestions.length === 0 &&
    !isSelected;

  return (
    <div className={`relative w-full ${className}`.trim()}>
      <Input
        ref={inputRef}
        className={`w-full h-10 border-white/10 ${
          isSelected
            ? "bg-green-50 dark:bg-green-950/30 cursor-default"
            : "bg-white/5"
        }`}
        value={isSelected ? value : searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleInputChange(e.target.value)
        }
        onFocus={() => {
          if (isSelected && value && autocompleteService.current) {
            setIsSearching(true);
            autocompleteService.current.getPlacePredictions(
              {
                input: value,
                types: ["geocode", "establishment"],
                componentRestrictions: { country: "GB" },
              },
              (predictions, status) => {
                setIsSearching(false);
                if (
                  status === google.maps.places.PlacesServiceStatus.OK &&
                  predictions
                ) {
                  setSuggestions(
                    predictions.map((p) => ({
                      description: p.description,
                      place_id: p.place_id,
                    })),
                  );
                }
              },
            );
          }
        }}
        placeholder={isSelected ? "" : placeholder}
        readOnly={isSelected}
        disabled={disabled}
      />

      {isSearching && !isSelected && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {isSelected && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive font-bold transition-colors"
          title="Clear selection"
          aria-label="Clear selection"
        >
          ✕
        </button>
      )}

      {suggestions.length > 0 && !isSelected && (
        <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-white/10 bg-background shadow-lg">
          {suggestions.map((sug) => (
            <li
              key={sug.place_id}
              onClick={() => handleSuggestionSelect(sug)}
              className="flex cursor-pointer items-center gap-2 border-b border-white/10 px-4 py-3 last:border-b-0 hover:bg-muted/50"
            >
              <span className="text-muted-foreground">📍</span>
              <span className="text-sm text-foreground">{sug.description}</span>
            </li>
          ))}
        </ul>
      )}

      {showNoResults && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Google didn&apos;t find that location. Please select from the
            suggestions above.
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleLocationSearch;
