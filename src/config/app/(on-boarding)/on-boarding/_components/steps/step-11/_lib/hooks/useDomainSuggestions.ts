import { useState } from "react";

export interface DomainSuggestion {
  domain: string;
  reasoning: string;
}

export interface UseDomainSuggestionsReturn {
  suggestions: DomainSuggestion[];
  isLoading: boolean;
  error: string | null;
  generateSuggestions: (
    venueName: string,
    venueType?: string,
    location?: string
  ) => Promise<void>;
  selectedDomain: string | null;
  setSelectedDomain: (domain: string | null) => void;
}

export function useDomainSuggestions(): UseDomainSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const generateSuggestions = async (
    venueName: string,
    venueType?: string,
    location?: string
  ) => {
    if (!venueName.trim()) {
      setError("Venue name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/domain-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          venueName: venueName.trim(),
          venueType,
          location,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If the response has an error message, use it; otherwise use the status
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("Domain suggestions error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate suggestions"
      );
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    suggestions,
    isLoading,
    error,
    generateSuggestions,
    selectedDomain,
    setSelectedDomain,
  };
}
