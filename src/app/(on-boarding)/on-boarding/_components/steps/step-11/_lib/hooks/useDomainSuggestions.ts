"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    location?: string,
  ) => void;
  selectedDomain: string | null;
  setSelectedDomain: (domain: string | null) => void;
}

export const DOMAIN_SUGGESTION_MIN_CHARS = 3;
export const DOMAIN_SUGGESTION_DEBOUNCE_MS = 600;

export function normalizeDomainSuggestionQuery(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Skip Space, empty, hyphen-only, and short fragments so we don't burn AI quota. */
export function shouldFetchDomainSuggestions(raw: string): boolean {
  const query = normalizeDomainSuggestionQuery(raw);
  if (query.length < DOMAIN_SUGGESTION_MIN_CHARS) return false;
  return /[a-z0-9]/.test(query);
}

export function useDomainSuggestions(): UseDomainSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastScheduledQueryRef = useRef("");
  const cooldownUntilRef = useRef(0);

  const cancelPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => () => cancelPending(), [cancelPending]);

  const generateSuggestions = useCallback(
    (venueName: string, venueType?: string, location?: string) => {
      const query = normalizeDomainSuggestionQuery(venueName);

      if (!shouldFetchDomainSuggestions(query)) {
        cancelPending();
        lastScheduledQueryRef.current = "";
        setIsLoading(false);
        return;
      }

      if (query === lastScheduledQueryRef.current) {
        return;
      }

      if (Date.now() < cooldownUntilRef.current) {
        return;
      }

      lastScheduledQueryRef.current = query;
      cancelPending();

      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch("/api/ai/domain-suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              venueName: query,
              venueType,
              location,
            }),
          });

          const data = (await response.json()) as {
            error?: string;
            details?: string;
            suggestions?: DomainSuggestion[];
            retryAfterMs?: number;
            status?: number;
          };

          if (response.status === 429 || data.status === 429) {
            const waitMs =
              typeof data.retryAfterMs === "number" && data.retryAfterMs > 0
                ? data.retryAfterMs
                : 2000;
            cooldownUntilRef.current = Date.now() + waitMs;
            setError(
              data.details ||
                "Suggestions are busy. Pause typing for a moment, then continue.",
            );
            return;
          }

          if (!response.ok || data.error) {
            setError(
              data.details ||
                data.error ||
                "Unable to generate suggestions right now.",
            );
            setSuggestions([]);
            return;
          }

          setSuggestions(data.suggestions || []);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setError("Unable to generate suggestions right now.");
          setSuggestions([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, DOMAIN_SUGGESTION_DEBOUNCE_MS);
    },
    [cancelPending],
  );

  return {
    suggestions,
    isLoading,
    error,
    generateSuggestions,
    selectedDomain,
    setSelectedDomain,
  };
}
