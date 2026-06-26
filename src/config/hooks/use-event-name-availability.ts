"use client";

import { useEffect, useState } from "react";
import { eventsService } from "@/services/vendor/events/events.service";

export type EventNameCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "error";

const DEBOUNCE_MS = 450;

/**
 * Debounced availability check against `GET /vendor/events/check-name`.
 */
export function useEventNameAvailability(
  eventName: string,
  options?: { minLength?: number; enabled?: boolean },
) {
  const minLength = options?.minLength ?? 2;
  const enabled = options?.enabled ?? true;
  const [status, setStatus] = useState<EventNameCheckStatus>("idle");
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setMessage(undefined);
      return;
    }

    const trimmed = eventName.trim();
    if (trimmed.length < minLength) {
      setStatus("idle");
      setMessage(undefined);
      return;
    }

    let cancelled = false;
    setStatus("checking");

    const timer = window.setTimeout(() => {
      void eventsService
        .checkEventName(trimmed)
        .then((result) => {
          if (cancelled) return;
          if (result.available) {
            setStatus("available");
            setMessage(undefined);
            return;
          }
          setStatus("taken");
          setMessage(
            result.message?.trim() || "This event name is already in use",
          );
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
  }, [enabled, eventName, minLength]);

  return {
    status,
    message,
    isChecking: status === "checking",
    isTaken: status === "taken",
    isAvailable: status === "available",
  };
}
