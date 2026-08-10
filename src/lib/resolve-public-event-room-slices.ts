import type { DatesSectionType } from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import { parseEventIsRoomsFlag } from "@/lib/event-form-limits";
import type { EventDetail, EventDetailRoom } from "@/services/common/events/type";
import {
  lowestPositivePrice,
  pickRoomHighlights,
  type EventRoomChooserItem,
} from "@/lib/event-room-chooser-item";

export type PublicEventRoomRef = {
  room_id: number;
  name: string;
  /** True when the room has no bookable dates — shown but not selectable. */
  disabled?: boolean;
};

/** @deprecated Prefer `EventRoomChooserItem` — kept as an alias for public callers. */
export type PublicEventRoomSummary = EventRoomChooserItem;

export type PublicEventActiveSlices = {
  roomMode: boolean;
  rooms: PublicEventRoomRef[];
  activeRoom: PublicEventRoomRef | null;
  event_schedular_title: string;
  event_schedular: Array<{ time: string; title: string }>;
  event_schedular_background_image: string | null;
  package_title: string;
  package_description: string;
  package_image: string;
  package_details: Array<{ title: string }>;
  package_button_name: string;
  dates: DatesSectionType | undefined;
  event_galley: Array<{ url: string }>;
  menu_title: string;
  menu_description: string;
  menus: EventDetailRoom["menus"];
  menu_background_image: string | null;
  drink_title: string;
  drink_description: string;
  packages: EventDetailRoom["packages"];
  brochure_pdf: string | null;
  brochure_pdf_2: string | null;
  event_address: string | null;
  lat: string | number | null;
  long: string | number | null;
};

/** Empty `{}` room shells from the API still count as rooms when `is_rooms` is on. */
type PublicRoomPayload = Partial<EventDetailRoom>;

function roomHasBookableDates(payload: PublicRoomPayload): boolean {
  return Array.isArray(payload.dates) && payload.dates.length > 0;
}

function resolveRoomId(payload: PublicRoomPayload, index: number): number {
  const id = Number(payload.room_id);
  return Number.isFinite(id) && id > 0 ? id : -(index + 1);
}

function listRoomEntries(
  event: EventDetail,
): Array<{ name: string; payload: PublicRoomPayload }> {
  const rooms = event.rooms;
  if (!rooms || typeof rooms !== "object") return [];

  return Object.entries(rooms)
    .map(([name, payload]) => ({
      name: name.trim(),
      payload:
        payload && typeof payload === "object"
          ? (payload as PublicRoomPayload)
          : {},
    }))
    .filter((entry) => entry.name.length > 0);
}

/** Active rooms from the public event detail API (`rooms` keyed by name). */
export function listPublicEventRooms(event: EventDetail): PublicEventRoomRef[] {
  return listRoomEntries(event).map((entry, index) => ({
    room_id: resolveRoomId(entry.payload, index),
    name: entry.name || `Room ${index + 1}`,
    disabled: !roomHasBookableDates(entry.payload),
  }));
}

/**
 * Per-room card summaries for the public "Choose Your Room" section.
 * Derives a thumbnail and a "from" price from each room payload — no fabricated
 * metadata; fields fall back to `null` when the API does not provide them.
 * Rooms with an empty payload (or no dates) are included as `disabled`.
 */
export function listPublicEventRoomSummaries(
  event: EventDetail,
): EventRoomChooserItem[] {
  const bannerFallback =
    typeof event.event_banner_image === "string" &&
    event.event_banner_image.trim().length > 0
      ? event.event_banner_image.trim()
      : null;

  return listRoomEntries(event).map((entry, index) => {
    const { payload, name } = entry;
    const disabled = !roomHasBookableDates(payload);

    const galleryImage =
      payload.event_galley?.find((item) => item.url?.trim())?.url ?? null;

    const packageImage =
      typeof payload.package_image === "string" &&
      payload.package_image.trim().length > 0
        ? payload.package_image.trim()
        : null;

    const inclusionHighlights = pickRoomHighlights(
      (payload.package_details ?? []).map((detail) => detail.title),
      3,
    );
    const highlights =
      inclusionHighlights.length > 0
        ? inclusionHighlights
        : pickRoomHighlights(
            (payload.packages ?? []).map((pkg) => pkg.title),
            3,
          );

    return {
      room_id: resolveRoomId(payload, index),
      name: name || `Room ${index + 1}`,
      index,
      thumbnail: packageImage || galleryImage || bannerFallback,
      fromPrice: lowestPositivePrice(
        (payload.packages ?? []).map((pkg) => pkg.price),
      ),
      packageCount: payload.packages?.length ?? 0,
      highlights,
      disabled,
    };
  });
}

/** First room that still has dates; falls back to 0 when none are bookable. */
export function firstBookablePublicRoomIndex(event: EventDetail): number {
  const rooms = listPublicEventRooms(event);
  const idx = rooms.findIndex((room) => !room.disabled);
  return idx >= 0 ? idx : 0;
}

export function isPublicEventRoomMode(event: EventDetail): boolean {
  return (
    parseEventIsRoomsFlag(event.is_rooms) === 1 &&
    listPublicEventRooms(event).length > 0
  );
}

function roomPayloadAtIndex(
  event: EventDetail,
  roomIndex: number,
): PublicRoomPayload | null {
  const entries = listRoomEntries(event);
  if (entries.length === 0) return null;
  const safeIndex = Math.min(
    Math.max(roomIndex, 0),
    Math.max(entries.length - 1, 0),
  );
  return entries[safeIndex]?.payload ?? null;
}

function flatSlicesFromEvent(event: EventDetail): PublicEventActiveSlices {
  return {
    roomMode: false,
    rooms: [],
    activeRoom: null,
    event_schedular_title: event.event_schedular_title ?? "",
    event_schedular: event.event_schedular ?? [],
    event_schedular_background_image: event.event_schedular_background_image ?? null,
    package_title: event.package_title ?? "",
    package_description: (
      event.package_description ??
      event.package_sub_title ??
      ""
    ).trim(),
    package_image: event.package_image ?? "",
    package_details: event.package_details ?? [],
    package_button_name: event.package_button_name ?? "Book Now",
    dates: event.dates,
    event_galley: event.event_galley ?? [],
    menu_title: event.menu_title ?? "",
    menu_description: event.menu_description ?? "",
    menus: event.menus ?? [],
    menu_background_image: event.menu_background_image ?? null,
    drink_title: event.drink_title ?? "",
    drink_description: event.drink_description ?? "",
    packages: event.packages ?? [],
    brochure_pdf: event.brochure_pdf ?? null,
    brochure_pdf_2: event.brochure_pdf_2 ?? null,
    event_address: event.event_address ?? null,
    lat: event.lat ?? null,
    long: event.long ?? null,
  };
}

function roomSlicesFromPayload(
  event: EventDetail,
  room: PublicEventRoomRef,
  payload: PublicRoomPayload,
): PublicEventActiveSlices {
  return {
    roomMode: true,
    rooms: listPublicEventRooms(event),
    activeRoom: room,
    event_schedular_title: payload.event_schedular_title ?? "",
    event_schedular: payload.event_schedular ?? [],
    event_schedular_background_image:
      payload.event_schedular_background_image ?? null,
    package_title: payload.package_title ?? "",
    package_description: String(payload.package_description ?? "").trim(),
    package_image: payload.package_image ?? "",
    package_details: payload.package_details ?? [],
    package_button_name: event.package_button_name ?? "Book Now",
    dates: payload.dates,
    event_galley: payload.event_galley ?? [],
    menu_title: payload.menu_title ?? "",
    menu_description: payload.menu_description ?? "",
    menus: payload.menus ?? [],
    menu_background_image: payload.menu_background_image ?? null,
    drink_title: payload.drink_title ?? "",
    drink_description: payload.drink_description ?? "",
    packages: payload.packages ?? [],
    brochure_pdf: payload.brochure_pdf ?? null,
    brochure_pdf_2: payload.brochure_pdf_2 ?? null,
    event_address: payload.event_address ?? event.event_address ?? null,
    lat: payload.lat ?? event.lat ?? null,
    long: payload.long ?? event.long ?? null,
  };
}

/** Resolve room-aware section data for the live event detail page. */
export function resolvePublicEventActiveSlices(
  event: EventDetail,
  roomIndex: number,
): PublicEventActiveSlices {
  if (!isPublicEventRoomMode(event)) {
    return flatSlicesFromEvent(event);
  }

  const rooms = listPublicEventRooms(event);
  const requestedIndex = Math.min(
    Math.max(roomIndex, 0),
    Math.max(rooms.length - 1, 0),
  );
  // Never activate a date-less room — snap to the first bookable one.
  const safeIndex =
    rooms[requestedIndex]?.disabled
      ? firstBookablePublicRoomIndex(event)
      : requestedIndex;
  const activeRoom = rooms[safeIndex] ?? null;
  const payload = roomPayloadAtIndex(event, safeIndex);

  if (!activeRoom || !payload) {
    return flatSlicesFromEvent(event);
  }

  return roomSlicesFromPayload(event, activeRoom, payload);
}
