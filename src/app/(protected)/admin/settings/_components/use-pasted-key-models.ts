"use client";

import { useEffect, useState } from "react";
import type { AiModelOption, AiProviderType } from "@/lib/ai/providers";

/**
 * Fetch the current model list from the provider using a pasted API key.
 * Switching provider/base URL clears the list; clearing the key after a
 * successful fetch keeps the last catalog so Save can empty the input.
 */
export function usePastedKeyModels(args: {
  providerType: AiProviderType;
  baseUrl: string;
  apiKey: string;
}) {
  const { providerType, baseUrl, apiKey } = args;
  const [models, setModels] = useState<AiModelOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setModels(null);
    setError(null);
    setIsLoading(false);
  }, [providerType, baseUrl]);

  useEffect(() => {
    const key = apiKey.trim();
    const url = baseUrl.trim();
    if (key.length < 16 || url.length < 8) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);
      void fetch("/api/ai/list-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_type: providerType,
          base_url: url,
          api_key: key,
        }),
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (res) => {
          const json = (await res.json()) as {
            models?: AiModelOption[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(json.error || "Could not load models.");
          }
          const next = json.models ?? [];
          if (next.length === 0) {
            throw new Error("This key returned no chat models.");
          }
          setModels(next);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setModels(null);
          setError(
            err instanceof Error ? err.message : "Could not load models.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [apiKey, baseUrl, providerType]);

  return { models, isLoading, error };
}
