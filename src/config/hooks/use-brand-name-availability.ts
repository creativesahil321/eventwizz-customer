"use client";

import { useEffect, useState } from "react";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";

export type BrandNameCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "error";

const DEBOUNCE_MS = 450;

/**
 * Debounced availability check against `GET /vendor/onboarding/check-brand-name`.
 * Used for onboarding brand name (multi-location) and venue name (single location).
 */
export function useBrandNameAvailability(
  name: string,
  options?: {
    minLength?: number;
    enabled?: boolean;
    takenFallback?: string;
  },
) {
  const minLength = options?.minLength ?? 2;
  const enabled = options?.enabled ?? true;
  const takenFallback =
    options?.takenFallback ?? "This name is already in use";
  const [status, setStatus] = useState<BrandNameCheckStatus>("idle");
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setMessage(undefined);
      return;
    }

    const trimmed = name.trim();
    if (trimmed.length < minLength) {
      setStatus("idle");
      setMessage(undefined);
      return;
    }

    let cancelled = false;
    setStatus("checking");

    const timer = window.setTimeout(() => {
      void onboardingService
        .checkBrandName(trimmed)
        .then((result) => {
          if (cancelled) return;
          if (result.available) {
            setStatus("available");
            setMessage(undefined);
            return;
          }
          setStatus("taken");
          setMessage(result.message?.trim() || takenFallback);
        })
        .catch(() => {
          if (cancelled) return;
          setStatus("error");
          setMessage(undefined);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, name, minLength, takenFallback]);

  return {
    status,
    message,
    isChecking: status === "checking",
    isTaken: status === "taken",
    isAvailable: status === "available",
  };
}
