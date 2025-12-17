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
  placeholder?: string;
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
  placeholder = "Search for a location...",
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      if (inputValue && autocompleteService.current) {
        autocompleteService.current.getPlacePredictions(
          {
            input: inputValue,
            types: ["geocode", "establishment"],
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
          }
        );
      } else {
        setSuggestions([]);
      }
    }, 300);
  };

  return (
    <div className="relative w-full">
      <Input
        className="w-full h-10 bg-[#F9FAFB] border-[#E5E7EB]"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleInputChange(e.target.value)
        }
        placeholder={placeholder}
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 bg-background border rounded w-full mt-1 max-h-60 overflow-auto shadow">
          {suggestions.map((sug, i) => (
            <li
              key={i}
              onClick={() => {
                onChange(sug.description);
                setSuggestions([]);
                onSelect(sug.place_id);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer"
            >
              {sug.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GoogleLocationSearch;
