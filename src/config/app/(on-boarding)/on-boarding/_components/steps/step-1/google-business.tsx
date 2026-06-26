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
};

declare global {
  interface Window {
    google: typeof google;
  }
}

const GoogleBusinessSearch: React.FC<Props> = ({
  apiKey,
  value,
  onChange,
  onSelect,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

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
    // If value exists and is not from search query, it's a pre-filled value
    if (value && !searchQuery) {
      setIsSelected(true);
    }
  }, [value, searchQuery]);

  const handleInputChange = (inputValue: string) => {
    // If venue is already selected, prevent any changes
    if (isSelected) {
      return;
    }

    setSearchQuery(inputValue);

    if (!inputValue) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      if (inputValue && autocompleteService.current) {
        autocompleteService.current.getPlacePredictions(
          {
            input: inputValue,
            types: ["establishment"],
            componentRestrictions: { country: "GB" },
          },
          (
            predictions: google.maps.places.AutocompletePrediction[] | null,
            status: google.maps.places.PlacesServiceStatus
          ) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              setSuggestions(
                predictions.map((p) => ({
                  description: p.description,
                  place_id: p.place_id,
                }))
              );
            } else {
              setSuggestions([]);
            }
            setIsSearching(false);
          }
        );
      } else {
        setSuggestions([]);
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    // Update value and mark as selected from Google Places
    onChange(suggestion.description);
    setSuggestions([]);
    setSearchQuery("");
    setIsSelected(true);
    onSelect(suggestion.place_id);
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setSuggestions([]);
    setIsSelected(false);
  };

  return (
    <div className="relative w-full">
      <Input
        className={`w-full border p-2 rounded ${
          isSelected ? "bg-emerald-500/10 cursor-not-allowed" : "bg-white/5"
        }`}
        value={isSelected ? value : searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleInputChange(e.target.value)
        }
        placeholder={
          isSelected ? "" : "Type to search for a venue from Google Places..."
        }
        readOnly={isSelected}
      />
      {isSearching && !isSelected && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
      {suggestions.length > 0 && !isSelected && searchQuery && (
        <ul className="absolute z-50 bg-slate-900 border border-white/10 rounded-md w-full mt-1 max-h-60 overflow-auto shadow-2xl">
          {suggestions.map((sug, i) => (
            <li
              key={i}
              onClick={() => handleSuggestionSelect(sug)}
              className="p-3 hover:bg-white/10 cursor-pointer border-b last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-blue-600 mt-1">📍</span>
                <span className="text-sm text-white">{sug.description}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {searchQuery &&
        suggestions.length === 0 &&
        !isSearching &&
        !isSelected && (
          <div className="absolute z-50 bg-slate-900 border border-white/10 rounded-md w-full mt-1 p-3 shadow-2xl">
            <p className="text-sm text-slate-400 text-center">
              No venues found. Try a different search term.
            </p>
          </div>
        )}
      {isSelected && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-500 hover:text-red-400 transition-colors font-bold"
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleBusinessSearch;
