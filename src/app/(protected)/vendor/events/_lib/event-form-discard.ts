import type { EventSchemaType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import { applyVendorEventDraft } from "./vendor-event-preview-live-data";

const UI_ONLY_KEYS = new Set([
  "currentStep",
  "active_room_index",
  "activeField",
]);

/** Additive GET fields — display order is the menus array index, not this. */
const IGNORE_COMPARE_KEYS = new Set(["sort_order"]);

/** Copied onto the preview overlay only — real values live on stepOne / stepTwo. */
const ROOT_MERGE_META_KEYS = new Set([
  "is_rooms",
  "vendor_location_id",
  "is_live",
  "has_bookings",
]);

const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;

export function shouldAdoptPristineEditorAsSaved(options: {
  catchupEnabled: boolean;
  isDirty: boolean;
  hasUnsavedEdits: boolean;
}): boolean {
  return (
    options.catchupEnabled && !options.isDirty && options.hasUnsavedEdits
  );
}

function canonicalizeScalar(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    if (trimmed === "true") return 1;
    if (trimmed === "false") return 0;
    if (NUMERIC_STRING.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return numeric;
    }
    return trimmed;
  }
  return value;
}

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

function normalizeForCompare(value: unknown, depth = 0): unknown {
  if (typeof File !== "undefined" && value instanceof File) {
    return `file:${value.name}:${value.size}:${value.lastModified}`;
  }
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeForCompare(item, depth + 1))
      .filter((item) => !isEmptyNormalized(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const skipCatalogRoomName = Number(record.room_id) > 0;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (depth === 0 && ROOT_MERGE_META_KEYS.has(key)) continue;
      if (UI_ONLY_KEYS.has(key) || IGNORE_COMPARE_KEYS.has(key)) continue;
      if (key === "name" && skipCatalogRoomName) continue;
      const normalized = normalizeForCompare(record[key], depth + 1);
      if (isEmptyNormalized(normalized)) continue;
      next[key] = normalized;
    }
    return next;
  }
  return canonicalizeScalar(value);
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

/** Preview Discard: a stored draft only counts if it actually changes saved content. */
export function vendorPreviewDraftHasUnsavedEdits(
  savedForm: EventSchemaType | Partial<EventSchemaType> | null | undefined,
  draft: Partial<EventSchemaType> | null | undefined,
): boolean {
  if (!draft || !savedForm) return false;
  const live = applyVendorEventDraft(
    savedForm as unknown as Record<string, unknown>,
    draft,
  ) as EventSchemaType;
  return eventFormHasUnsavedEdits(live, savedForm);
}

export function cloneEventFormSnapshot(
  values: EventSchemaType,
): EventSchemaType {
  try {
    return structuredClone(values);
  } catch {
    return {
      ...values,
      stepOne: { ...values.stepOne },
      stepTwo: { ...values.stepTwo },
      stepThree: { ...values.stepThree },
      stepFour: { ...values.stepFour },
      stepFive: { ...values.stepFive },
      stepSix: { ...values.stepSix },
      stepSeven: { ...values.stepSeven },
      stepEight: { ...values.stepEight },
    };
  }
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
