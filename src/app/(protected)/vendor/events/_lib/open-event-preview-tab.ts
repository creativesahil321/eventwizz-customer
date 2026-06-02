import { readVendorEventIsRoomsFlag } from "./vendor-event-is-rooms";

/** Standalone vendor event preview URL (opens in a new browser tab). */
export function getEventPreviewUrl(
  eventId: number | string,
  isRooms: boolean,
): string {
  return `/preview/event?id=${eventId}&rooms=${isRooms ? "true" : "false"}`;
}

export function openEventPreviewTab(
  eventId: number | string,
  isRooms: boolean,
): boolean {
  if (typeof window === "undefined") return false;
  const url = getEventPreviewUrl(eventId, isRooms);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return opened != null;
}

export function parsePreviewRoomsSearchParam(
  value: string | null,
): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Preview fetch mode: editor localStorage wins over a stale `rooms=` URL so
 * toggling Yes/No in the editor updates preview on refresh (and via storage events).
 */
export function resolvePreviewRoomsForFetch(
  eventId: string | number | null | undefined,
  urlRoomsParam: string | null,
): boolean | undefined {
  if (eventId == null || eventId === "") return undefined;
  const id = String(eventId);
  if (!/^\d+$/.test(id)) return undefined;

  const fromStorage = readVendorEventIsRoomsFlag(id);
  if (typeof fromStorage === "boolean") return fromStorage;

  return parsePreviewRoomsSearchParam(urlRoomsParam);
}
