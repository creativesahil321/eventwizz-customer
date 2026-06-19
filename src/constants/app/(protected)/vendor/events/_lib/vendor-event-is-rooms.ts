import { parseEventIsRoomsFlag } from "@/lib/event-form-limits";

const VENDOR_EVENT_IS_ROOMS_STORAGE_PREFIX = "vendor_event_is_rooms:";
const ONBOARDING_IS_ROOMS_SESSION_KEY = "onboarding_is_rooms";

export function vendorEventIsRoomsStorageKey(eventId: number | string): string {
  return `${VENDOR_EVENT_IS_ROOMS_STORAGE_PREFIX}${eventId}`;
}

function parseStoredRoomsFlag(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/** Venue-level flag set during onboarding when multi-space is enabled. */
export function readOnboardingIsRoomsSessionFlag(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = sessionStorage.getItem(ONBOARDING_IS_ROOMS_SESSION_KEY);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function countStepTwoRooms(rooms: unknown): number {
  if (!rooms) return 0;
  if (Array.isArray(rooms)) return rooms.length;
  if (typeof rooms === "object") return Object.keys(rooms as object).length;
  return 0;
}

/** Parse `is_rooms` from a vendor event persistence GET payload. */
export function parseIsRoomsFromEventPersistencePayload(data: unknown): 0 | 1 {
  if (!data || typeof data !== "object") return 0;
  const root = data as {
    is_rooms?: boolean | number | string;
    stepOne?: { is_rooms?: boolean | number | string };
    stepTwo?: { is_rooms?: boolean | number | string; rooms?: unknown };
  };
  if (countStepTwoRooms(root.stepTwo?.rooms) > 0) return 1;
  return parseEventIsRoomsFlag(
    root.is_rooms ?? root.stepTwo?.is_rooms ?? root.stepOne?.is_rooms,
  );
}

/**
 * Flat `/show/{id}/false` often returns `is_rooms: false` with empty stepTwo even when
 * the event was saved with per-room payloads — probe `/true` in that case.
 */
export function eventFlatPersistenceLikelyMissedRoomPayload(
  data: unknown,
): boolean {
  if (!data || typeof data !== "object") return false;
  const root = data as Record<string, unknown>;
  if (parseIsRoomsFromEventPersistencePayload(data) === 1) return false;

  const stepOne = root.stepOne as Record<string, unknown> | undefined;
  const stepTwo = root.stepTwo as Record<string, unknown> | undefined;
  if (!stepOne || !stepTwo) return false;

  const hasEvent = String(stepOne.event_name ?? "").trim().length > 0;
  const packageTitle = String(stepTwo.package_title ?? "").trim();
  const flatSaysNoRooms =
    parseEventIsRoomsFlag(stepTwo.is_rooms ?? root.is_rooms) === 0;
  const currentStep = Number(root.current_step ?? 0);

  return (
    hasEvent &&
    flatSaysNoRooms &&
    packageTitle.length === 0 &&
    countStepTwoRooms(stepTwo.rooms) === 0 &&
    currentStep >= 2
  );
}

/** True when a `/show/{id}/true` response actually contains room-scoped step data. */
export function eventRoomsPersistenceHasRoomData(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const root = data as Record<string, unknown>;
  if (parseIsRoomsFromEventPersistencePayload(data) === 1) return true;

  const stepTwo = root.stepTwo as Record<string, unknown> | undefined;
  if (!stepTwo) return false;

  if (countStepTwoRooms(stepTwo.rooms) > 0) return true;
  if (String(stepTwo.package_title ?? "").trim().length > 0) return true;

  const stepThree = root.stepThree as { rooms?: unknown } | undefined;
  const stepFour = root.stepFour as { rooms?: unknown } | undefined;
  const stepFive = root.stepFive as { rooms?: unknown } | undefined;
  const stepSix = root.stepSix as { rooms?: unknown } | undefined;

  return (
    countStepTwoRooms(stepThree?.rooms) > 0 ||
    countStepTwoRooms(stepFour?.rooms) > 0 ||
    countStepTwoRooms(stepFive?.rooms) > 0 ||
    countStepTwoRooms(stepSix?.rooms) > 0
  );
}

/** Authoritative room mode for storage + UI after a persistence GET. */
export function resolvePersistedEventIsRoomsFromPayload(data: unknown): boolean {
  return parseIsRoomsFromEventPersistencePayload(data) === 1;
}

/**
 * GET `/show/{id}/{true|false}` mode for editor + preview.
 * Returns `undefined` to probe both modes when preference is unknown.
 */
export function resolveVendorEventIsRoomsForFetch(
  eventId?: string | number | null,
): boolean | undefined {
  if (eventId == null || eventId === "") return undefined;

  const fromStorage = readVendorEventIsRoomsFlag(eventId);
  if (fromStorage === true) return true;
  if (fromStorage === false) {
    // Recover when a prior flat GET cached `false` for a room-system event.
    if (readOnboardingIsRoomsSessionFlag() === true) return true;
    return false;
  }

  if (readOnboardingIsRoomsSessionFlag() === true) return true;

  return undefined;
}

/** Shared across tabs so preview stays in sync with the editor toggle. */
export function readVendorEventIsRoomsFlag(
  eventId?: number | string,
): boolean | undefined {
  if (typeof window === "undefined" || eventId == null || eventId === "") {
    return undefined;
  }
  const key = vendorEventIsRoomsStorageKey(eventId);
  const fromLocal = parseStoredRoomsFlag(localStorage.getItem(key));
  if (typeof fromLocal === "boolean") return fromLocal;

  const fromSession = parseStoredRoomsFlag(sessionStorage.getItem(key));
  if (typeof fromSession === "boolean") {
    localStorage.setItem(key, fromSession ? "true" : "false");
    return fromSession;
  }
  return undefined;
}

export function writeVendorEventIsRoomsFlag(
  eventId: number | string,
  isRooms: boolean,
): void {
  if (typeof window === "undefined") return;
  const key = vendorEventIsRoomsStorageKey(eventId);
  const value = isRooms ? "true" : "false";
  localStorage.setItem(key, value);
  sessionStorage.setItem(key, value);
}

/** Preview tab listens for editor room-toggle updates in another tab. */
export function subscribeVendorEventIsRoomsFlag(
  eventId: number | string,
  onChange: (isRooms: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const key = vendorEventIsRoomsStorageKey(eventId);
  const handler = (event: StorageEvent) => {
    if (event.storageArea !== localStorage || event.key !== key) return;
    const next = parseStoredRoomsFlag(event.newValue);
    if (typeof next === "boolean") onChange(next);
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
