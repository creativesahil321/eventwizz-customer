"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  /** Opaque dark panel + light text (onboarding / dark cards). Matches step-8 AddressAutocomplete. */
  variant?: "default" | "dark";
};

declare global {
  interface Window {
    google: any;
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
  variant = "default",
}) => {
  const isDark = variant === "dark";
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const autocompleteService =
    useRef<any | null>(null);
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
            predictions: any[] | null,
            status: any,
          ) => {
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current);
              safetyTimeoutRef.current = null;
            }
            setIsSearching(false);
            if (
              status === (window.google.maps.places.PlacesServiceStatus as any)?.OK &&
              predictions
            ) {
              setSuggestions(
                predictions.map((p: any) => ({
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

  const inputClassName = isDark
    ? cn(
        "h-10 w-full border-white/10 text-slate-100 placeholder:text-slate-500",
        isSelected
          ? "cursor-default bg-emerald-950/40 text-slate-100 ring-1 ring-emerald-500/30"
          : "bg-white/5",
      )
    : cn(
        "h-10 w-full border-white/10",
        isSelected
          ? "cursor-default bg-green-50 dark:bg-green-950/30"
          : "bg-white/5",
      );

  const listClassName = isDark
    ? "absolute z-[300] mt-1.5 w-full max-h-60 overflow-auto rounded-lg border border-white/10 bg-slate-800 py-1 shadow-xl"
    : "absolute z-[300] mt-1.5 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-2xl ring-1 ring-black/10 dark:border-slate-500/90 dark:bg-slate-950 dark:ring-black/50";

  const rowClassName = isDark
    ? "flex cursor-pointer items-start gap-3 border-b border-white/5 px-3 py-2.5 text-left last:border-b-0 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
    : "flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:border-slate-700/90 dark:hover:bg-slate-800 dark:focus:bg-slate-800";

  const pinClassName = isDark
    ? "mt-0.5 shrink-0 text-sky-400"
    : "mt-0.5 shrink-0 text-sky-600 dark:text-sky-400";

  const suggestionTextClassName = isDark
    ? "min-w-0 flex-1 text-sm font-medium leading-snug text-slate-200"
    : "min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900 dark:text-slate-50";

  const clearBtnClassName = isDark
    ? "text-slate-400 hover:text-red-400"
    : "text-muted-foreground hover:text-destructive";

  const noResultsClassName = isDark
    ? "absolute z-[300] mt-1 w-full rounded-lg border border-white/10 bg-slate-800 p-4 shadow-xl"
    : "absolute z-50 mt-1 w-full rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30";

  const noResultsTextClassName = isDark
    ? "text-sm text-slate-300"
    : "text-sm text-amber-800 dark:text-amber-200";

  return (
    <div
      className={cn("relative z-20 w-full", className)}
      style={isDark ? { colorScheme: "dark" } : undefined}
    >
      <Input
        ref={inputRef}
        className={inputClassName}
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
              (predictions: any[] | null, status: any) => {
                setIsSearching(false);
                if (
                  status === (window.google.maps.places.PlacesServiceStatus as any)?.OK &&
                  predictions
                ) {
                  setSuggestions(
                    predictions.map((p: any) => ({
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
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 font-bold transition-colors",
            clearBtnClassName,
          )}
          title="Clear selection"
          aria-label="Clear selection"
        >
          ✕
        </button>
      )}

      {suggestions.length > 0 && !isSelected && (
        <ul className={listClassName} role="listbox">
          {suggestions.map((sug) => (
            <li
              key={sug.place_id}
              role="option"
              onClick={() => handleSuggestionSelect(sug)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSuggestionSelect(sug);
                }
              }}
              tabIndex={0}
              className={rowClassName}
            >
              <span className={pinClassName} aria-hidden>
                📍
              </span>
              <span className={suggestionTextClassName}>
                {sug.description}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showNoResults && (
        <div className={noResultsClassName}>
          <p className={noResultsTextClassName}>
            Google didn&apos;t find that location. Please select from the
            suggestions above.
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleLocationSearch;
