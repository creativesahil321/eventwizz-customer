import type { EventSchemaType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";

const UI_ONLY_KEYS = new Set([
  "currentStep",
  "active_room_index",
  "activeField",
]);

function isEmptyNormalized(value: unknown): boolean {
  if (value === "" || value == null) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return true;
  }
  return false;
}

function normalizeForCompare(value: unknown): unknown {
  if (typeof File !== "undefined" && value instanceof File) {
    return `file:${value.name}:${value.size}:${value.lastModified}`;
  }
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeForCompare(item))
      .filter((item) => !isEmptyNormalized(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (UI_ONLY_KEYS.has(key)) continue;
      const normalized = normalizeForCompare(record[key]);
      if (isEmptyNormalized(normalized)) continue;
      next[key] = normalized;
    }
    return next;
  }
  return String(value);
}

export function serializeEventFormForCompare(
  values: EventSchemaType | Partial<EventSchemaType> | null | undefined,
): string {
  if (!values) return "";
  return JSON.stringify(normalizeForCompare(values));
}

export function eventFormHasUnsavedEdits(
  current: EventSchemaType | Partial<EventSchemaType> | null | undefined,
  baseline: EventSchemaType | Partial<EventSchemaType> | null | undefined,
): boolean {
  if (!current || !baseline) return false;
  return (
    serializeEventFormForCompare(current) !==
    serializeEventFormForCompare(baseline)
  );
}

export const VENDOR_EVENT_DISCARD_REQUESTED = "vendor-event-discard-requested";

export function requestVendorEventDiscard(eventId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(VENDOR_EVENT_DISCARD_REQUESTED, {
      detail: { eventId: String(eventId) },
    }),
  );
  try {
    localStorage.setItem(
      `vendor-event-discard-ping:${eventId}`,
      String(Date.now()),
    );
  } catch {
    // private mode
  }
}
