const VENDOR_EVENT_IS_ROOMS_STORAGE_PREFIX = "vendor_event_is_rooms:";

export function vendorEventIsRoomsStorageKey(eventId: number | string): string {
  return `${VENDOR_EVENT_IS_ROOMS_STORAGE_PREFIX}${eventId}`;
}

function parseStoredRoomsFlag(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/**
 * GET `/show/{id}/{true|false}` mode for editor + preview.
 * Prefer persisted editor choice; default flat (`false`) — never probe `/true` first.
 */
export function resolveVendorEventIsRoomsForFetch(
  eventId?: string | number | null,
): boolean {
  if (eventId == null || eventId === "") return false;
  const fromStorage = readVendorEventIsRoomsFlag(eventId);
  return fromStorage === true;
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
