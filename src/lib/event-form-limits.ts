/**
 * Shared limits for event flows: vendor editor, onboarding, and AI review.
 * Keep Zod schemas and UI (maxLength / counters) aligned with these values.
 */
import {
  booleanFlagToFormDataValue,
  coerceApiFlag,
} from "@/lib/coerce-api-boolean";

export { RICH_DESCRIPTION_MAX_CHARS } from "./plain-text-length";

/** Main package block heading (vendor step 2 / onboarding step 4). */
export const EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS = 40;
/** Sub-heading under the package block. */
export const EVENT_PACKAGE_SUB_HEADING_MAX_CHARS = 160;
/** CTA button under package image. */
export const PACKAGE_BUTTON_NAME_MAX_CHARS = 18;
/** One bullet line in package details. */
export const PACKAGE_DETAIL_LINE_MAX_CHARS = 40;

/** Menu item field label (1-based): "Item title 1", "Item title 2", … */
export function menuItemTitleLabel(itemIndex: number): string {
  return `Item title ${itemIndex + 1}`;
}

/**
 * Placeholder shows an example dish, not the label — a value like "Item title 1"
 * pre-filled into the input reads as saved copy and gets published as-is.
 */
export function menuItemTitlePlaceholder(_itemIndex: number): string {
  return "e.g. Honey glazed ham";
}

/** Default row when adding an item under Starters, Main Courses, Desserts, etc. */
export function createDefaultMenuItemRow(_itemIndex: number): {
  title: string;
  description: string;
} {
  return {
    title: "",
    description: "",
  };
}

/** Package detail line label (1-based): "Package 1", "Package 2", … */
export function packageDetailLabel(index: number): string {
  return `Package ${index + 1}`;
}

export function packageDetailPlaceholder(index: number): string {
  return packageDetailLabel(index);
}

export function createDefaultPackageDetailRow(index: number): { title: string } {
  return { title: packageDetailLabel(index) };
}

/** Max gallery images on onboarding Step 4 (package). */
export const EVENT_GALLERY_MAX_IMAGES = 4;

/** Room system: minimum and maximum rooms per event (vendor + onboarding). */
export const EVENT_ROOM_MIN_COUNT = 2;
export const EVENT_ROOM_MAX_COUNT = 3;

/** Normalizes API / form `is_rooms` flags to `0` | `1`. */
export function parseEventIsRoomsFlag(
  value: boolean | number | string | null | undefined,
): 0 | 1 {
  return coerceApiFlag(value);
}

/** FormData value for Laravel `boolean` rules (multipart has no native bool type). */
export function isRoomsToFormDataValue(flag: 0 | 1): "true" | "false" {
  return booleanFlagToFormDataValue(flag);
}

/** Vendor event editor: one room row in `stepTwo.rooms` (form array shape). */
export type VendorStepTwoRoomForm = {
  room_id?: number;
  name?: string;
  package_image?: string | File | null;
  package_title?: string;
  package_description?: string;
  package_button_link?: string;
  package_details?: Array<{ title?: string }>;
  gallery?: Array<File | { id: number; url: string }>;
  event_schedular_title?: string;
  event_schedule_subtitle?: string;
  event_schedular_background_image?: string | File | null;
  event_schedular?: Array<{ title?: string; time?: string }>;
};

function mapApiRoomPayloadToFormRoom(
  roomName: string,
  payload: Record<string, unknown>,
): VendorStepTwoRoomForm {
  const details = Array.isArray(payload.package_details)
    ? payload.package_details
      .map((item) => ({
        title: String((item as { title?: string }).title || ""),
      }))
      .filter((item) => item.title.trim().length > 0)
    : [];
  const schedulers = Array.isArray(payload.event_schedular)
    ? payload.event_schedular.map((item) => ({
      title: String((item as { title?: string }).title || ""),
      time: String((item as { time?: string }).time || ""),
    }))
    : [];

  return {
    room_id:
      typeof payload.room_id === "number"
        ? payload.room_id
        : typeof payload.room_id === "string"
          ? Number(payload.room_id)
          : undefined,
    name: String(payload.name || roomName || "").trim() || roomName,
    package_image:
      typeof payload.package_image === "string"
        ? payload.package_image.trim() || null
        : payload.package_image instanceof File
          ? payload.package_image
          : null,
    package_title: String(payload.package_title || ""),
    package_description: String(payload.package_description || ""),
    package_button_link: String(payload.package_button_link || ""),
    package_details: details.length > 0 ? details : [{ title: "" }],
    gallery: Array.isArray(payload.gallery)
      ? (payload.gallery as VendorStepTwoRoomForm["gallery"])
      : [],
    event_schedular_title: String(payload.event_schedular_title || ""),
    event_schedule_subtitle: String(payload.event_schedule_subtitle || ""),
    event_schedular_background_image:
      typeof payload.event_schedular_background_image === "string"
        ? payload.event_schedular_background_image.trim() || null
        : payload.event_schedular_background_image instanceof File
          ? payload.event_schedular_background_image
          : null,
    event_schedular:
      schedulers.length > 0 ? schedulers : [{ title: "", time: "" }],
  };
}

/** API may return `stepTwo.rooms` as an array or as a name-keyed object. */
export function normalizeVendorStepTwoRooms(
  raw: unknown,
): VendorStepTwoRoomForm[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((room, index) => {
      const source = (room || {}) as Record<string, unknown>;
      const fallbackName = `Room ${index + 1}`;
      const resolvedName =
        String(source.name || "").trim() ||
        (typeof room === "object" && room !== null ? fallbackName : fallbackName);
      return mapApiRoomPayloadToFormRoom(resolvedName, source);
    });
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, Record<string, unknown>>).map(
      ([roomName, payload]) => {
        const mapped = mapApiRoomPayloadToFormRoom(roomName, payload || {});
        const keyName = String(roomName || "").trim();
        if (keyName && !String(mapped.name || "").trim()) {
          mapped.name = keyName;
        }
        return mapped;
      },
    );
  }
  return [];
}

export function capEventRoomList(
  rooms: VendorStepTwoRoomForm[] | Record<string, unknown> | null | undefined,
): VendorStepTwoRoomForm[] {
  const list = Array.isArray(rooms)
    ? normalizeVendorStepTwoRooms(rooms)
    : normalizeVendorStepTwoRooms(rooms ?? []);
  return list.slice(0, EVENT_ROOM_MAX_COUNT);
}

type StepTwoRoomsRaw =
  | VendorStepTwoRoomForm[]
  | Record<string, unknown>
  | null
  | undefined;

/** `room_id` values from API `stepTwo.rooms` (object or array shape). */
export function extractRoomIdsFromStepTwoRooms(raw: StepTwoRoomsRaw): number[] {
  return capEventRoomList(raw)
    .map((room) => Number(room.room_id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/** `room_id` from any step's name-keyed or array `rooms` payload. */
export function extractRoomIdsFromKeyedStepRooms(raw: unknown): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => Number((item as { room_id?: unknown }).room_id))
      .filter((id) => Number.isFinite(id) && id > 0);
  }
  if (typeof raw === "object") {
    return Object.values(raw as Record<string, { room_id?: unknown }>)
      .map((item) => Number(item?.room_id))
      .filter((id) => Number.isFinite(id) && id > 0);
  }
  return [];
}

/** All venue room ids currently stored on the event (incl. stale step 3+ keys). */
export function collectPersistedEventRoomIds(data: {
  stepTwo?: { rooms?: unknown };
  stepThree?: { rooms?: unknown };
  stepFour?: { rooms?: unknown };
  stepFive?: { rooms?: unknown };
  stepSix?: { rooms?: unknown };
}): number[] {
  const ids = new Set<number>();
  for (const step of [
    data.stepTwo,
    data.stepThree,
    data.stepFour,
    data.stepFive,
    data.stepSix,
  ]) {
    extractRoomIdsFromKeyedStepRooms(step?.rooms).forEach((id) => ids.add(id));
  }
  return [...ids];
}

/** Room ids that were on the event but are no longer selected in the Package tab. */
export function computeRemovedRoomIds(
  persistedIds: number[],
  selectedIds: number[],
): number[] {
  const selected = new Set(
    selectedIds.filter((id) => Number.isFinite(id) && id > 0),
  );
  return persistedIds.filter((id) => id > 0 && !selected.has(id));
}

/** True when the label was auto-generated from a stale `room_id` (e.g. "Room 496"). */
export function isRoomNameDerivedFromId(
  name: string | undefined,
  roomId: number | undefined,
): boolean {
  const id = Number(roomId);
  if (!Number.isFinite(id) || id <= 0) return false;
  return String(name ?? "").trim() === `Room ${id}`;
}

/**
 * Bind display names (and stale ids) from the venue room catalog API.
 * Never surfaces database ids as labels.
 */
export function enrichStepTwoRoomsFromVenueCatalog(
  rooms: VendorStepTwoRoomForm[],
  catalog: Array<{ id: number; name: string }>,
): VendorStepTwoRoomForm[] {
  if (!catalog.length) return capEventRoomList(rooms);

  const byId = new Map(
    catalog.map((entry) => [entry.id, String(entry.name || "").trim()]),
  );
  const claimedCatalogIds = new Set<number>();

  return capEventRoomList(rooms).map((room, index) => {
    let roomId = Number(room.room_id);
    let name = String(room.name ?? "").trim();
    const idBasedLabel = isRoomNameDerivedFromId(name, roomId);

    if (roomId > 0 && byId.has(roomId)) {
      name = byId.get(roomId)!;
      claimedCatalogIds.add(roomId);
      return { ...room, room_id: roomId, name };
    }

    if (name && !idBasedLabel) {
      const byName = catalog.find(
        (entry) =>
          !claimedCatalogIds.has(entry.id) &&
          entry.name.trim().toLowerCase() === name.toLowerCase(),
      );
      if (byName) {
        roomId = byName.id;
        name = byName.name.trim();
        claimedCatalogIds.add(roomId);
        return { ...room, room_id: roomId, name };
      }
    }

    if (roomId <= 0 || !byId.has(roomId) || idBasedLabel || !name) {
      const next = catalog.find((entry) => !claimedCatalogIds.has(entry.id));
      if (next) {
        roomId = next.id;
        name = next.name.trim();
        claimedCatalogIds.add(roomId);
        return { ...room, room_id: roomId, name };
      }
    }

    return {
      ...room,
      room_id: roomId > 0 ? roomId : room.room_id,
      name: name || `Room ${index + 1}`,
    };
  });
}

export function stepTwoRoomsDifferFromCatalogEnrichment(
  current: VendorStepTwoRoomForm[],
  enriched: VendorStepTwoRoomForm[],
): boolean {
  if (current.length !== enriched.length) return true;
  return enriched.some((room, index) => {
    const prev = current[index];
    return (
      Number(prev?.room_id) !== Number(room.room_id) ||
      String(prev?.name ?? "").trim() !== String(room.name ?? "").trim()
    );
  });
}

/** Prefer hydrated form rooms; fall back to persistence GET `stepTwo.rooms`. */
export function resolveStepTwoRoomsForEditor(
  formRoomsRaw: StepTwoRoomsRaw,
  apiRoomsRaw: StepTwoRoomsRaw,
  catalog?: Array<{ id: number; name: string }>,
): VendorStepTwoRoomForm[] {
  const formRooms = capEventRoomList(formRoomsRaw);
  const apiRooms = capEventRoomList(apiRoomsRaw);
  const formHasIds = formRooms.some((room) => Number(room.room_id) > 0);
  let resolved = formHasIds ? formRooms : apiRooms.length > 0 ? apiRooms : formRooms;
  if (catalog && catalog.length > 0) {
    resolved = enrichStepTwoRoomsFromVenueCatalog(resolved, catalog);
  }
  return resolved;
}

/** Keeps package data for rooms still selected; adds empty shells for newly selected venue rooms. */
export function syncStepTwoRoomsFromCatalogSelection(
  selectedIds: number[],
  catalog: Array<{ id: number; name: string }>,
  existingRooms: VendorStepTwoRoomForm[],
): VendorStepTwoRoomForm[] {
  const cappedIds = selectedIds
    .filter((id) => Number.isFinite(id) && id > 0)
    .slice(0, EVENT_ROOM_MAX_COUNT);

  return cappedIds.map((id, index) => {
    const existing = existingRooms.find((room) => Number(room.room_id) === id);
    const fromCatalog = catalog.find((room) => room.id === id);
    const catalogName = String(fromCatalog?.name ?? "").trim();
    const existingName = String(existing?.name ?? "").trim();
    const name =
      catalogName ||
      (existingName && !isRoomNameDerivedFromId(existingName, Number(existing?.room_id))
        ? existingName
        : "");

    if (existing) {
      return {
        ...existing,
        room_id: id,
        name: name || catalogName || `Room ${index + 1}`,
      };
    }

    return {
      room_id: id,
      name: name || catalogName || `Room ${index + 1}`,
      package_title: "",
      package_description: "",
      package_button_link: "",
      package_details: [{ title: "" }],
    };
  });
}

/** Default empty scheduler row shown on Step 4 before the user adds more. */
export const DEFAULT_EVENT_SCHEDULER_ITEMS: Array<{
  title: string;
  time: string;
}> = [{ title: "", time: "" }];

export function resolveEventSchedulerItems(
  items?: Array<{ title: string; time: string }> | null,
): Array<{ title: string; time: string }> {
  if (Array.isArray(items) && items.length > 0) return items;
  return DEFAULT_EVENT_SCHEDULER_ITEMS;
}

/** "Other packages" / drinks section title. */
export const DRINK_SECTION_TITLE_MAX_CHARS = 40;
export const DRINK_SECTION_DESCRIPTION_MAX_CHARS = 160;
/** Single add-on package row heading (stricter than section title). */
export const DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS = 25;

export const DRINK_PACKAGE_PRICE_MIN = 1;
export const DRINK_PACKAGE_PRICE_MAX = 999999;
export const DRINK_PACKAGE_QTY_MIN = 1;
export const DRINK_PACKAGE_QTY_MAX = 500;

export function clampDrinkPackageQuantity(raw: number): number {
  if (!Number.isFinite(raw)) return DRINK_PACKAGE_QTY_MIN;
  return Math.min(
    DRINK_PACKAGE_QTY_MAX,
    Math.max(DRINK_PACKAGE_QTY_MIN, Math.trunc(raw))
  );
}

export function clampDrinkPackagePrice(raw: number): number {
  if (!Number.isFinite(raw)) return DRINK_PACKAGE_PRICE_MIN;
  const rounded = Math.round(raw * 100) / 100;
  return Math.min(
    DRINK_PACKAGE_PRICE_MAX,
    Math.max(DRINK_PACKAGE_PRICE_MIN, rounded)
  );
}
